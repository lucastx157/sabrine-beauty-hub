import { addDays, isBefore, parseISO, set, startOfDay } from "date-fns";
import { nowInBrazil, formatBrazilDate, formatDisplayDate } from "./dates";
import { ensureMondaySlots } from "./monday-slots.server";
import { OCCUPYING_STATUSES, occupiesSlot } from "./booking-occupancy";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const getAdminClient = async () => supabaseAdmin;
function timeStrToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTimeStr(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}


export async function loadAvailableSlots(data: { serviceId?: string | undefined; from?: string | undefined; to?: string | undefined; includeOccupied?: boolean | undefined }) {
    const supabaseAdmin = await getAdminClient();

    const now = nowInBrazil();
    const today = startOfDay(now);
    const from = data.from ? parseISO(data.from) : today;
    const effectiveFrom = isBefore(from, today) ? today : from;
    const to = data.to ? parseISO(data.to) : addDays(effectiveFrom, 120);

    // A agenda vem só de availability_overrides (horários por data).
    // As segundas recebem automaticamente a grade fixa de MONDAY_SLOTS.
    await ensureMondaySlots(
      supabaseAdmin,
      formatBrazilDate(effectiveFrom),
      formatBrazilDate(to),
      formatBrazilDate(today),
    );

    const { data: bookings, error: bookError } = await supabaseAdmin
      .from("bookings")
      .select("booking_date, start_time, end_time, status, reserved_until")
      .gte("booking_date", formatBrazilDate(effectiveFrom))
      .lte("booking_date", formatBrazilDate(to))
      .in("status", OCCUPYING_STATUSES);
    if (bookError) throw new Error(bookError.message);

    const { data: overrides, error: overrideError } = await supabaseAdmin
      .from("availability_overrides")
      .select("available_date, start_time, is_blocked")
      .eq("active", true)
      .gte("available_date", formatBrazilDate(effectiveFrom))
      .lte("available_date", formatBrazilDate(to));
    if (overrideError) throw new Error(overrideError.message);

    const nowMs = Date.now();
    const booked = (bookings ?? [])
      // Reserva aguardando Mercado Pago expira em 20 min e libera o horário.
      .filter((b) => occupiesSlot(b, nowMs))
      .map((b) => ({
      date: b.booking_date,
      start: timeStrToMinutes(b.start_time),
      end: timeStrToMinutes(b.end_time),
    }));

    const { data: service } = data.serviceId
      ? await supabaseAdmin.from("services").select("duration_min").eq("id", data.serviceId).maybeSingle()
      : { data: null };
    const duration = service?.duration_min ?? 0;

    const slots: {
      date: string;
      time: string;
      serviceId?: string;
      label: string;
      occupied: boolean;
    }[] = [];

    for (let d = new Date(effectiveFrom); !isBefore(to, d); d = addDays(d, 1)) {
      const dateStr = formatBrazilDate(d);
      const daySlots = new Set<string>();
      const occupiedSlots = new Set<string>();

      const dateOverrides = (overrides ?? []).filter(
        (o) => o.available_date === dateStr,
      );

      if (dateOverrides.length > 0) {
        // Horários cadastrados individualmente para essa data: aparecem na
        // hora, sem esperar a janela de antecedência semanal.
        for (const o of dateOverrides) {
          const t = timeStrToMinutes(o.start_time.slice(0, 5));
          const slotStart = set(d, {
            hours: Math.floor(t / 60),
            minutes: t % 60,
            seconds: 0,
            milliseconds: 0,
          });
          if (isBefore(slotStart, now)) continue;

          const isBooked = booked.some(
            (b) => b.date === dateStr && t < b.end && (duration > 0 ? t + duration > b.start : t >= b.start),
          );
          if (o.is_blocked || isBooked) {
            occupiedSlots.add(minutesToTimeStr(t));
          } else {
            daySlots.add(minutesToTimeStr(t));
          }
        }
      }
      // Datas sem horários cadastrados não aparecem.

      const entries = [
        ...Array.from(daySlots).map((time) => ({ time, occupied: false })),
        ...(data.includeOccupied
          ? Array.from(occupiedSlots)
              .filter((t) => !daySlots.has(t))
              .map((time) => ({ time, occupied: true }))
          : []),
      ];
      entries
        .sort((a, b) => timeStrToMinutes(a.time) - timeStrToMinutes(b.time))
        .forEach(({ time, occupied }) =>
          slots.push({
            date: dateStr,
            time,
            ...(data.serviceId ? { serviceId: data.serviceId } : {}),
            label: `${formatDisplayDate(dateStr)} às ${time}`,
            occupied,
          }),
        );
    }

    return slots;
}
