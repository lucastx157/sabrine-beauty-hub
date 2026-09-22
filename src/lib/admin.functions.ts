import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const getAdminClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};

const adminMiddleware = createMiddleware({ type: "function" }).server(
  async ({ context, next }) => {
    const supabaseAdmin = await getAdminClient();
    const userId = (context as unknown as { userId: string }).userId;
    const { data } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!data) {
      throw new Response("Forbidden", { status: 403 });
    }
    return next();
  },
);

export const getAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .handler(async () => {
    const supabaseAdmin = await getAdminClient();
    const { data, error } = await supabaseAdmin
      .from("availability")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const saveAvailabilitySchema = z.object({
  id: z.string().uuid().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotIntervalMinutes: z.number().int().min(5).max(240),
});

export const saveAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .inputValidator((data) => saveAvailabilitySchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();

    if (data.startTime >= data.endTime) {
      throw new Error("Horário de início deve ser antes do horário de término.");
    }

    const payload = {
      day_of_week: data.dayOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      slot_interval_minutes: data.slotIntervalMinutes,
      active: true,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("availability")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("availability").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

const deleteAvailabilitySchema = z.object({ id: z.string().uuid() });

export const deleteAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .inputValidator((data) => deleteAvailabilitySchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const { error } = await supabaseAdmin
      .from("availability")
      .update({ active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .handler(async () => {
    const supabaseAdmin = await getAdminClient();
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*, services(name)")
      .gte("booking_date", today)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const updateBookingStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmed", "cancelled", "rescheduled", "no_show"]),
});

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .inputValidator((data) => updateBookingStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAppConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .handler(async () => {
    const supabaseAdmin = await getAdminClient();
    const { data, error } = await supabaseAdmin.from("app_config").select("*");
    if (error) throw new Error(error.message);
    const config: Record<string, string> = {};
    for (const row of data ?? []) {
      config[row.key] = row.value ?? "";
    }
    return config;
  });

const updateAppConfigSchema = z.record(z.string().min(0).max(2000));

export const updateAppConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, adminMiddleware])
  .inputValidator((data) => updateAppConfigSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const rows = Object.entries(data).map(([key, value]) => ({ key, value }));
    const { error } = await supabaseAdmin.from("app_config").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  setupToken: z.string().min(1),
});

export const createAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) => createAdminSchema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_SETUP_TOKEN"];
    if (!expected || data.setupToken !== expected) {
      throw new Response("Token de setup inválido", { status: 401 });
    }

    const supabaseAdmin = await getAdminClient();

    // Only allow one admin setup if there is no admin already.
    const { data: existingAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if ((existingAdmins ?? []).length > 0) {
      throw new Response("Já existe um administrador configurado", { status: 409 });
    }

    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (signUpError || !userData.user) {
      throw new Error(signUpError?.message ?? "Erro ao criar usuário");
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userData.user.id,
      role: "admin",
    });
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });
