import { formatDisplayDate } from "./dates";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

async function saveOutboundMessage(
  bookingId: string | undefined,
  recipient: string,
  payload: Record<string, unknown>,
  responseData: Record<string, unknown> | null,
) {
  const rawMessages = responseData?.["messages"];
  const messageId =
    (Array.isArray(rawMessages) && (rawMessages as Array<{ id?: string }>)[0]?.id) || null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("whatsapp_outbound_messages").insert({
    booking_id: bookingId ?? null,
    recipient,
    message_id: messageId,
    payload: payload as never,
    status: messageId ? "accepted" : "sent",
  });

  if (error) {
    console.error("[WhatsApp] failed to save outbound message", error);
  }
}

export async function sendWhatsAppNotification(
  toDigits: string,
  body: string,
  bookingId?: string,
) {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const whatsappApiKey = process.env["WHATSAPP_API_KEY"];

  if (!lovableApiKey || !whatsappApiKey) {
    console.warn("[WhatsApp] skipped: missing LOVABLE_API_KEY or WHATSAPP_API_KEY");
    return { ok: false, skipped: true, error: "WhatsApp not configured" };
  }

  const payload = {
    messaging_product: "whatsapp",
    to: toDigits.replace(/\D/g, ""),
    type: "text",
    text: { body },
  };

  const response = await fetch(`${GATEWAY_URL}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": whatsappApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`[WhatsApp] send failed (${response.status}): ${responseText}`);
    return { ok: false, skipped: false, error: responseText };
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(responseText);
  } catch {
    // ignore
  }

  await saveOutboundMessage(bookingId, toDigits, payload, data).catch((err) => {
    console.error("[WhatsApp] save outbound failed", err);
  });

  console.log("[WhatsApp] sent", data);
  return { ok: true, skipped: false, data };
}

export function bookingNotificationMessage(args: {
  type: "created" | "cancelled" | "rescheduled";
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  const { type, clientName, serviceName, date, time } = args;
  const displayDate = formatDisplayDate(date);

  switch (type) {
    case "created":
      return `Novo agendamento confirmado! ✨\n\nCliente: ${clientName}\nServiço: ${serviceName}\nData: ${displayDate}\nHorário: ${time}\n\nSabrine Beauty Flow`;
    case "cancelled":
      return `Agendamento cancelado. ❌\n\nCliente: ${clientName}\nServiço: ${serviceName}\nData: ${displayDate}\nHorário: ${time}\n\nSabrine Beauty Flow`;
    case "rescheduled":
      return `Agendamento reagendado. 🗓️\n\nCliente: ${clientName}\nServiço: ${serviceName}\nNova data: ${displayDate}\nNovo horário: ${time}\n\nSabrine Beauty Flow`;
  }
}
