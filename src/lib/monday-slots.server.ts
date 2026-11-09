import { addDays, isBefore, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Grade fixa das segundas-feiras.
 * Toda segunda (a partir de hoje) recebe automaticamente estes horários na
 * tabela availability_overrides, então eles aparecem no site, na IA e no
 * painel da Sabrine (onde ela pode bloquear ou apagar normalmente).
 */
export const MONDAY_SLOTS = ["07:30", "08:00", "10:00", "10:30", "12:00", "12:30"];

const TEMPLATE_KEY = "monday_template_v1_applied";

type AdminClient = SupabaseClient<Database>;

function mondaysBetween(from: string, to: string) {
  const out: string[] = [];
  const end = parseISO(to);
  for (let d = parseISO(from); !isBefore(end, d); d = addDays(d, 1)) {
    if (d.getDay() === 1) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      out.push(`${y}-${m}-${day}`);
    }
  }
  return out;
}

/**
 * Garante que cada segunda do intervalo tenha os horários de MONDAY_SLOTS.
 * - Só cria o horário se ele nunca existiu naquela data (se a Sabrine apagou
 *   um horário no painel, ele não volta sozinho).
 * - Na primeira execução, desativa nas segundas futuras os horários livres
 *   que não fazem parte da grade nova. Horários bloqueados (já pagos/ocupados)
 *   nunca são mexidos.
 */
export async function ensureMondaySlots(
  supabaseAdmin: AdminClient,
  from: string,
  to: string,
  today: string,
) {
  try {
    const start = from < today ? today : from;
    if (start > to) return;
    const mondays = mondaysBetween(start, to);
    if (mondays.length === 0) return;

    const { data: config } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", TEMPLATE_KEY)
      .maybeSingle();
    const templateApplied = config?.value === "true";

    if (!templateApplied) {
      // Limpeza única: todas as segundas futuras passam a seguir só a grade nova.
      const { data: futureRows } = await supabaseAdmin
        .from("availability_overrides")
        .select("id, available_date, start_time, is_blocked")
        .eq("active", true)
        .eq("is_blocked", false)
        .gte("available_date", today);
      const toDisable = (futureRows ?? [])
        .filter((r) => parseISO(r.available_date).getDay() === 1)
        .filter((r) => !MONDAY_SLOTS.includes(String(r.start_time).slice(0, 5)))
        .map((r) => r.id);
      if (toDisable.length > 0) {
        await supabaseAdmin
          .from("availability_overrides")
          .update({ active: false })
          .in("id", toDisable);
      }
      await supabaseAdmin
        .from("app_config")
        .upsert({ key: TEMPLATE_KEY, value: "true", updated_at: new Date().toISOString() });
    }

    // Na primeira vez considera só horários ativos (refaz a grade inteira);
    // depois respeita horários que a Sabrine apagou no painel.
    let existingQuery = supabaseAdmin
      .from("availability_overrides")
      .select("available_date, start_time")
      .in("available_date", mondays);
    if (!templateApplied) existingQuery = existingQuery.eq("active", true);
    const { data: existing } = await existingQuery;
    const has = new Set(
      (existing ?? []).map((r) => `${r.available_date} ${String(r.start_time).slice(0, 5)}`),
    );

    const toInsert = mondays.flatMap((date) =>
      MONDAY_SLOTS.filter((time) => !has.has(`${date} ${time}`)).map((time) => ({
        available_date: date,
        start_time: time,
      })),
    );
    if (toInsert.length > 0) {
      await supabaseAdmin.from("availability_overrides").insert(toInsert);
    }
  } catch (err) {
    // Nunca derruba a agenda por causa da grade de segunda.
    console.error("ensureMondaySlots", err);
  }
}
