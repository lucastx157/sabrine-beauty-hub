import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendWhatsAppNotification } from "./whatsapp.server";

/**
 * Contatos (leads) de clientes interessadas, para o estúdio retornar depois.
 * Grava na tabela `leads`; se ela ainda não existir no banco, grava em
 * `app_config` com a chave `lead:<data>:<id>` para nenhum contato se perder.
 */

const LEAD_PREFIX = "lead:";

export const LEAD_STATUSES = ["novo", "contatado", "agendou", "sem_interesse"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  created_at: string;
  name: string;
  whatsapp: string;
  city: string | null;
  interest: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  follow_up_on: string | null;
  admin_note: string | null;
  storage: "table" | "config";
};

const getAdminClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};

// A tabela `leads` não está nos tipos gerados; acesso sem tipagem.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const leadsTable = async () => ((await getAdminClient()) as any).from("leads");

const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!data) throw new Response("Forbidden", { status: 403 });
    return next();
  });

const submitLeadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "Informe um WhatsApp com DDD"),
  city: z.string().trim().max(60).optional().default(""),
  interest: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().max(500).optional().default(""),
  source: z.string().trim().max(120).optional().default(""),
  // Campo invisível: robôs preenchem, pessoas não.
  website: z.string().max(200).optional().default(""),
});

function formatWhatsApp(digits: string) {
  const d = digits.replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data) => submitLeadSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true };

    const row = {
      name: data.name,
      whatsapp: data.whatsapp,
      city: data.city || null,
      interest: data.interest || null,
      message: data.message || null,
      source: data.source || null,
      status: "novo" as LeadStatus,
      follow_up_on: null,
      admin_note: null,
    };

    let saved = false;
    try {
      const { error } = await (await leadsTable()).insert(row);
      saved = !error;
      if (error) console.warn("[leads] tabela indisponível, usando app_config", error.message);
    } catch (err) {
      console.warn("[leads] falha na tabela, usando app_config", err);
    }

    if (!saved) {
      const supabaseAdmin = await getAdminClient();
      const created_at = new Date().toISOString();
      const id = crypto.randomUUID();
      const { error } = await supabaseAdmin.from("app_config").insert({
        key: `${LEAD_PREFIX}${created_at}:${id}`,
        value: JSON.stringify({ ...row, id, created_at }),
      });
      if (error) throw new Error("Não foi possível enviar agora. Tente de novo em instantes.");
    }

    // Aviso no WhatsApp do estúdio (quando configurado). Não bloqueia o envio.
    try {
      const supabaseAdmin = await getAdminClient();
      const { data: cfg } = await supabaseAdmin
        .from("app_config")
        .select("value")
        .eq("key", "notification_whatsapp_number")
        .maybeSingle();
      const to = cfg?.value?.replace(/\D/g, "");
      if (to) {
        await sendWhatsAppNotification(
          to,
          [
            "Novo contato pelo site",
            `Nome: ${data.name}`,
            `WhatsApp: ${formatWhatsApp(data.whatsapp)}`,
            data.city ? `Cidade: ${data.city}` : "",
            data.interest ? `Interesse: ${data.interest}` : "",
            data.message ? `Mensagem: ${data.message}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
    } catch (err) {
      console.warn("[leads] aviso de WhatsApp não enviado", err);
    }

    return { ok: true };
  });

export const getLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .handler(async () => {
    const leads: Lead[] = [];
    try {
      const { data, error } = await (
        await leadsTable()
      )
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error && Array.isArray(data)) {
        for (const r of data) leads.push({ ...r, storage: "table" });
      }
    } catch {
      // tabela ainda não existe
    }

    const supabaseAdmin = await getAdminClient();
    const { data: cfgRows } = await supabaseAdmin
      .from("app_config")
      .select("key,value")
      .like("key", `${LEAD_PREFIX}%`);
    for (const r of cfgRows ?? []) {
      try {
        leads.push({ ...JSON.parse(r.value), storage: "config" });
      } catch {
        // linha inválida
      }
    }

    leads.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return leads;
  });

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  storage: z.enum(["table", "config"]),
  status: z.enum(LEAD_STATUSES),
  follow_up_on: z.string().date().nullable(),
  admin_note: z.string().max(500).nullable(),
});

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .inputValidator((data) => updateLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const patch = {
      status: data.status,
      follow_up_on: data.follow_up_on,
      admin_note: data.admin_note,
    };
    if (data.storage === "table") {
      const { error } = await (await leadsTable()).update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const supabaseAdmin = await getAdminClient();
    const key = `${LEAD_PREFIX}${data.created_at}:${data.id}`;
    const { data: row, error: readError } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", key)
      .single();
    if (readError || !row) throw new Error("Contato não encontrado");
    const { error } = await supabaseAdmin
      .from("app_config")
      .update({ value: JSON.stringify({ ...JSON.parse(row.value), ...patch }) })
      .eq("key", key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
