const MP_API = "https://api.mercadopago.com";
export const PUBLIC_SITE_URL = "https://sabrine-beauty-hub.lovable.app";

function token() {
  const t = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!t) throw new Error("Pagamento online ainda não configurado. Fale com a Sabrine pelo WhatsApp.");
  return t;
}

export async function createPreference(body: Record<string, unknown>) {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[MercadoPago] preference failed", res.status, text);
    throw new Error("Não foi possível iniciar o pagamento. Tente novamente.");
  }
  return JSON.parse(text) as { id: string; init_point: string };
}

export type MpPayment = { id: number; status: string; external_reference: string | null; transaction_amount: number };

export async function fetchPayment(paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPayment;
}

/** Aplica no agendamento o status real do pagamento, consultado na API do Mercado Pago. */
export async function applyPayment(payment: MpPayment) {
  const bookingId = payment.external_reference;
  if (!bookingId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, status, amount_cents")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const approved = payment.status === "approved";
  const rejected = ["rejected", "cancelled", "refunded", "charged_back"].includes(payment.status);
  const paymentStatus = approved ? "approved" : rejected ? "rejected" : "pending";
  const amountOk = Math.round(payment.transaction_amount * 100) >= (booking.amount_cents ?? 0);

  const update: Record<string, unknown> = { payment_status: paymentStatus, mp_payment_id: String(payment.id) };
  if (approved && amountOk && booking.status === "pending_payment") update["status"] = "confirmed";
  if (rejected && booking.status === "pending_payment") update["status"] = "cancelled";

  const { error } = await supabaseAdmin.from("bookings").update(update).eq("id", bookingId);
  if (error) {
    // Ex.: pago depois dos 20 min e o horário já foi ocupado por outra pessoa.
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: paymentStatus, mp_payment_id: String(payment.id), notes: "Pago após a reserva expirar — horário ocupado, combinar novo horário." })
      .eq("id", bookingId);
  }
  return paymentStatus;
}
