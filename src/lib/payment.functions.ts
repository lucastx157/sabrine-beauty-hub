import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requestBookingSchema, getAvailableSlots } from "./booking.functions";

const RESERVE_MINUTES = 20;

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((data) => requestBookingSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPreference, PUBLIC_SITE_URL } = await import("./mercadopago.server");

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("name, duration_min, price_min, deposit_cents")
      .eq("id", data.serviceId)
      .eq("active", true)
      .single();
    if (!service) throw new Error("Procedimento não encontrado");

    const slots = await getAvailableSlots({ data: { serviceId: data.serviceId, from: data.date, to: data.date } });
    if (!slots.some((s) => s.time === data.time && !s.occupied)) {
      throw new Error("Esse horário não está mais livre. Escolha outro, por favor.");
    }

    const [h, m] = data.time.split(":").map(Number);
    const end = Math.min(h! * 60 + m! + (service.duration_min ?? 30), 23 * 60 + 59);
    const endStr = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    const amount = service.deposit_cents ?? service.price_min ?? 0;
    if (amount <= 0) throw new Error("Valor do procedimento não definido.");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        service_id: data.serviceId,
        client_name: data.clientName,
        client_phone: data.clientPhone,
        attendee_name: data.attendeeName ?? null,
        booking_date: data.date,
        start_time: data.time,
        end_time: endStr,
        amount_cents: amount,
        status: "pending_payment",
        payment_status: "pending",
        reserved_until: new Date(Date.now() + RESERVE_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (error || !booking) throw new Error("Esse horário acabou de ser reservado. Escolha outro, por favor.");

    const origin = getRequestHeader("origin") ?? "";
    const base = origin.startsWith("https://") ? origin : PUBLIC_SITE_URL;

    try {
      const pref = await createPreference({
        items: [{
          title: `${service.name}${service.deposit_cents ? " (sinal)" : ""} - Sabrine Beauty`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount / 100,
        }],
        payer: { name: data.clientName },
        external_reference: booking.id,
        back_urls: {
          success: `${base}/pagamento/sucesso`,
          failure: `${base}/pagamento/falha`,
          pending: `${base}/pagamento/sucesso`,
        },
        auto_return: "approved",
        notification_url: `${PUBLIC_SITE_URL}/api/public/mercadopago/webhook`,
        date_of_expiration: new Date(Date.now() + RESERVE_MINUTES * 60_000).toISOString(),
        statement_descriptor: "SABRINE BEAUTY",
      });
      await supabaseAdmin.from("bookings").update({ mp_preference_id: pref.id }).eq("id", booking.id);
      return { url: pref.init_point };
    } catch (e) {
      await supabaseAdmin.from("bookings").update({ status: "cancelled", payment_status: "rejected" }).eq("id", booking.id);
      throw e;
    }
  });

/** Usada na página de retorno: confere o pagamento direto na API do Mercado Pago. */
export const checkPayment = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ paymentId: z.string().regex(/^\d{1,30}$/) }).parse(data))
  .handler(async ({ data }) => {
    const { fetchPayment, applyPayment } = await import("./mercadopago.server");
    const payment = await fetchPayment(data.paymentId);
    if (!payment) return { status: "unknown" as const };
    const status = await applyPayment(payment);
    return { status: (status ?? "unknown") as "approved" | "pending" | "rejected" | "unknown" };
  });

/** Diz ao site se o pagamento com cartão pelo Mercado Pago já está ativo (secret cadastrado). */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(async () => {
  return { cardOnline: Boolean(process.env["MERCADOPAGO_ACCESS_TOKEN"]) };
});
