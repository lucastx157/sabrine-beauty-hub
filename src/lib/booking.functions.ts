import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addDays, addMinutes, format, isAfter, isBefore, parseISO, set, startOfDay } from "date-fns";
import {
  nowInBrazil,
  formatDisplayDate,
  formatPhone,
  isAtLeastHoursBefore,
  formatBrazilDate,
} from "./dates";
import { sendWhatsAppNotification, bookingNotificationMessage } from "./whatsapp.server";

const getAdminClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};

const getAdvanceDays = async () => {
  const supabaseAdmin = await getAdminClient();
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", "advance_booking_days")
    .single();
  return parseInt(data?.value ?? "7", 10) || 7;
};

const getNotificationNumber = async () => {
  const supabaseAdmin = await getAdminClient();
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", "notification_whatsapp_number")
    .single();
  return data?.value?.replace(/\D/g, "") ?? "";
};

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await getAdminClient();
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const slotSchema = z.object({
  serviceId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

function timeStrToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
  return h! * 60 + m!;
}

function minutesToTimeStr(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export const getAvailableSlots = createServerFn({ method: "POST" })
  .inputValidator((data) => slotSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const advanceDays = await getAdvanceDays();

    const now = nowInBrazil();
    const earliest = addDays(now, advanceDays);
    const from = data.from ? parseISO(data.from) : earliest;
    const effectiveFrom = isAfter(from, earliest) ? from : earliest;
    const to = data.to ? parseISO(data.to) : addDays(effectiveFrom, 13);

    const { data: availability, error: availError } = await supabaseAdmin
      .from("availability")
      .select("*")
      .eq("active", true);
    if (availError) throw new Error(availError.message);

    const { data: bookings, error: bookError } = await supabaseAdmin
      .from("bookings")
      .select("booking_date, start_time, end_time, status")
      .gte("booking_date", formatBrazilDate(effectiveFrom))
      .lte("booking_date", formatBrazilDate(to))
      .in("status", ["confirmed", "rescheduled"]);
    if (bookError) throw new Error(bookError.message);

    const booked = (bookings ?? []).map((b) => ({
      date: b.booking_date,
      start: timeStrToMinutes(b.start_time),
      end: timeStrToMinutes(b.end_time),
    }));

    const slots: { date: string; time: string; serviceId?: string; label: string }[] = [];

    for (let d = new Date(effectiveFrom); !isBefore(to, d); d = addDays(d, 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = formatBrazilDate(d);
      const daySlots = new Set<string>();

      for (const a of availability ?? []) {
        if (a.day_of_week !== dayOfWeek) continue;
        const startMin = timeStrToMinutes(a.start_time);
        const endMin = timeStrToMinutes(a.end_time);
        const interval = a.slot_interval_minutes ?? 30;

        for (let t = startMin; t < endMin; t += interval) {
          const slotStart = set(d, {
            hours: Math.floor(t / 60),
            minutes: t % 60,
            seconds: 0,
            milliseconds: 0,
          });
          if (isBefore(slotStart, earliest)) continue;

          const timeStr = minutesToTimeStr(t);
          const isBooked = booked.some(
            (b) => b.date === dateStr && t >= b.start && t < b.end,
          );
          if (!isBooked) {
            daySlots.add(timeStr);
          }
        }
      }

        Array.from(daySlots)
          .sort((a, b) => timeStrToMinutes(a) - timeStrToMinutes(b))
          .forEach((time) =>
            slots.push({
              date: dateStr,
              time,
              ...(data.serviceId ? { serviceId: data.serviceId } : {}),
              label: `${formatDisplayDate(dateStr)} às ${time}`,
            }),
          );
    }

    return slots;
  });

const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2).max(100),
  clientPhone: z.string().min(10).max(20).optional(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data) => createBookingSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const [hour, minute] = data.time.split(":").map((v) => parseInt(v, 10));

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("name, duration_min, duration_max")
      .eq("id", data.serviceId)
      .single();
    if (serviceError || !service) throw new Error("Serviço não encontrado");

    const duration = service.duration_min ?? 30;
    const endMinutes = hour! * 60 + minute! + duration;
    const endTime = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    // Validate slot is still free
    const slots = await getAvailableSlots({
      data: { serviceId: data.serviceId, from: data.date, to: data.date },
    });
    const isAvailable = slots.some((s) => s.time === data.time);
    if (!isAvailable) throw new Error("Esse horário não está mais disponível. Escolha outro, por favor.");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        service_id: data.serviceId,
        client_name: data.clientName.trim(),
        client_phone: data.clientPhone?.replace(/\D/g, "") ?? null,
        booking_date: data.date,
        start_time: data.time,
        end_time: endTime,
        status: "confirmed",
      })
      .select("id, booking_date, start_time, services(name)")
      .single();
    if (error) throw new Error(error.message);

    const notificationNumber = await getNotificationNumber();
    if (notificationNumber) {
      await sendWhatsAppNotification(
        notificationNumber,
        bookingNotificationMessage({
          type: "created",
          clientName: data.clientName.trim(),
          serviceName: service.name,
          date: data.date,
          time: data.time,
        }),
        booking.id,
      );
    }

    return booking;
  });

const myBookingsSchema = z.object({
  phone: z.string().min(10).max(20),
});

export const getMyBookings = createServerFn({ method: "POST" })
  .inputValidator((data) => myBookingsSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const digits = data.phone.replace(/\D/g, "");
    const today = startOfDay(nowInBrazil());

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("*, services(name)")
      .eq("client_phone", digits)
      .or(`status.eq.confirmed,status.eq.rescheduled`)
      .gte("booking_date", formatBrazilDate(today))
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);

    return (bookings ?? []).map((b) => ({
      id: b.id,
      serviceName: (b.services as { name: string } | null)?.name ?? "Serviço",
      date: b.booking_date,
      time: b.start_time,
      status: b.status,
      canCancel: isAtLeastHoursBefore(b.booking_date, b.start_time, 24),
    }));
  });

const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().min(10).max(20),
});

export const cancelBooking = createServerFn({ method: "POST" })
  .inputValidator((data) => cancelBookingSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*, services(name)")
      .eq("id", data.bookingId)
      .eq("client_phone", data.phone.replace(/\D/g, ""))
      .single();
    if (fetchError || !booking) throw new Error("Agendamento não encontrado.");

    if (!isAtLeastHoursBefore(booking.booking_date, booking.start_time, 24)) {
      throw new Error("Cancelamento só é permitido até 24 horas antes do horário marcado.");
    }

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);

    const notificationNumber = await getNotificationNumber();
    if (notificationNumber) {
      await sendWhatsAppNotification(
        notificationNumber,
        bookingNotificationMessage({
          type: "cancelled",
          clientName: booking.client_name,
          serviceName: (booking.services as { name: string } | null)?.name ?? "Serviço",
          date: booking.booking_date,
          time: booking.start_time,
        }),
        booking.id,
      );
    }

    return { ok: true };
  });

const rescheduleBookingSchema = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().min(10).max(20),
  newDate: z.string().date(),
  newTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const rescheduleBooking = createServerFn({ method: "POST" })
  .inputValidator((data) => rescheduleBookingSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const digits = data.phone.replace(/\D/g, "");

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*, services(name, duration_min)")
      .eq("id", data.bookingId)
      .eq("client_phone", digits)
      .single();
    if (fetchError || !booking) throw new Error("Agendamento não encontrado.");

    if (!isAtLeastHoursBefore(booking.booking_date, booking.start_time, 24)) {
      throw new Error("Reagendamento só é permitido até 24 horas antes do horário marcado.");
    }

    const service = booking.services as { name: string; duration_min: number | null } | null;
    const duration = service?.duration_min ?? 30;
    const [hour, minute] = data.newTime.split(":") as [string, string];
    const startMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);
    const endMinutes = startMinutes + duration;
    const endTime = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    const slots = await getAvailableSlots({
      data: { serviceId: booking.service_id!, from: data.newDate, to: data.newDate },
    });
    const isAvailable = slots.some((s) => s.time === data.newTime);
    if (!isAvailable) throw new Error("O novo horário não está mais disponível. Escolha outro, por favor.");

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({
        booking_date: data.newDate,
        start_time: data.newTime,
        end_time: endTime,
        status: "rescheduled",
        original_booking_id: booking.original_booking_id ?? booking.id,
      })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);

    const notificationNumber = await getNotificationNumber();
    if (notificationNumber) {
      await sendWhatsAppNotification(
        notificationNumber,
        bookingNotificationMessage({
          type: "rescheduled",
          clientName: booking.client_name,
          serviceName: service?.name ?? "Serviço",
          date: data.newDate,
          time: data.newTime,
        }),
      );
    }

    return { ok: true };
  });

export const getCancellationPolicy = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await getAdminClient();
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", "cancellation_policy_text")
    .single();
  return data?.value ?? "Cancelamento ou reagendamento só é permitido até 24 horas antes do horário marcado.";
});
