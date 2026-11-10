import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nowInBrazil, formatBrazilDate } from "./dates";

/**
 * Clube Sabrine Beauty — pontos e Cartão Brow Beauty.
 *
 * Tudo é calculado a partir dos agendamentos PAGOS (status confirmado ou
 * remarcado), sem tabela extra: pontos não podem ser "inventados" pela cliente.
 * - 1 ponto a cada R$ 1 pago pelo site.
 * - Cartão Brow Beauty: 6 meses seguidos com pelo menos um atendimento pago.
 */
export const POINTS_PER_REAL = 1;
export const BROW_BEAUTY_MONTHS = 6;

const PAID_STATUSES = ["confirmed", "rescheduled"];

const getAdminClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};

export function pointsForCents(cents: number) {
  return Math.floor((cents / 100) * POINTS_PER_REAL);
}

function monthIndex(dateStr: string) {
  const [y, m] = dateStr.split("-").map(Number);
  return y! * 12 + (m! - 1);
}

const loyaltySchema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10,11}$/, "WhatsApp com DDD inválido")),
});

export const getLoyalty = createServerFn({ method: "POST" })
  .inputValidator((data) => loyaltySchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("client_name, booking_date, amount_cents, status, created_at")
      .eq("client_phone", data.phone)
      .in("status", PAID_STATUSES)
      .order("booking_date", { ascending: true });
    if (error) throw new Error(error.message);

    const bookings = rows ?? [];
    const points = bookings.reduce((sum, b) => sum + pointsForCents(b.amount_cents ?? 0), 0);

    // Meses com atendimento pago (índice ano*12+mês).
    const months = Array.from(new Set(bookings.map((b) => monthIndex(b.booking_date)))).sort((a, b) => a - b);

    let best = 0;
    let run = 0;
    let prev = -Infinity;
    for (const m of months) {
      run = m === prev + 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = m;
    }

    // Sequência atual: só vale se o último mês com atendimento for este mês
    // (ou o anterior, para não "zerar" no começo do mês) — ou um mês futuro já pago.
    const thisMonth = monthIndex(formatBrazilDate(nowInBrazil()));
    const last = months[months.length - 1];
    const current = last !== undefined && last >= thisMonth - 1 ? run : 0;

    const firstName = (bookings[bookings.length - 1]?.client_name ?? "").trim().split(/\s+/)[0] ?? "";
    const memberSince = bookings[0]?.booking_date ?? null;

    return {
      found: bookings.length > 0,
      firstName,
      points,
      visits: bookings.length,
      currentStreak: current,
      bestStreak: best,
      unlocked: best >= BROW_BEAUTY_MONTHS,
      goal: BROW_BEAUTY_MONTHS,
      memberSince,
    };
  });
