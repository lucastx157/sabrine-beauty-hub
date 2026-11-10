import { formatDisplayDate } from "./dates";
import { sendWhatsAppNotification, sendWhatsAppTemplate } from "./whatsapp.server";

/**
 * Lembrete automático do dia anterior.
 * Chamado 1x por dia (por volta das 18h) pelo GitHub Actions (.github/workflows/lembretes.yml) na rota
 * /api/public/lembretes. Pega os agendamentos PAGOS de amanhã (confirmed/rescheduled)
 * que ainda não receberam lembrete e manda:
 *  - uma mensagem para cada cliente;
 *  - um resumo do dia seguinte para a Sabrine (número em app_config.notification_whatsapp_number).
 * É idempotente: quem já recebeu (reminder_sent_at preenchido) não recebe de novo.
 */

const TIMEZONE = "America/Sao_Paulo";

function dateInBrazil(offsetDays: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date(Date.now() + offsetDays * 24 * 3600_000),
  );
}

function hhmm(time: string) {
  return time.slice(0, 5);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Celular brasileiro com DDI 55 (o WhatsApp exige o número completo). */
function toWhatsAppDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function clientReminderMessage(args: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  return (
    `Olá, ${firstName(args.clientName)}! ✨\n\n` +
    `Passando para lembrar do seu horário amanhã na Sabrine Beauty:\n\n` +
    `Procedimento: ${args.serviceName}\n` +
    `Data: ${formatDisplayDate(args.date)}\n` +
    `Horário: ${hhmm(args.time)}\n\n` +
    `Chegue com alguns minutos de antecedência (tolerância de 15 minutos).\n` +
    `Te esperamos! 💛`
  );
}

export async function runDayBeforeReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tomorrow = dateInBrazil(1);

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, client_phone, attendee_name, booking_date, start_time, reminder_sent_at, services(name)")
    .eq("booking_date", tomorrow)
    .in("status", ["confirmed", "rescheduled"])
    .is("reminder_sent_at", null)
    .order("start_time");
  if (error) throw new Error(error.message);

  const pending = bookings ?? [];
  const results: Array<{ id: string; client: boolean }> = [];
  const templateName = process.env["WHATSAPP_REMINDER_TEMPLATE"];

  for (const b of pending) {
    const serviceName = (b.services as { name: string } | null)?.name ?? "Procedimento";
    const to = toWhatsAppDigits(b.client_phone);
    let ok = false;
    if (to) {
      const res = templateName
        ? await sendWhatsAppTemplate(
            to,
            templateName,
            [firstName(b.client_name), serviceName, formatDisplayDate(b.booking_date), hhmm(b.start_time)],
            b.id,
          )
        : await sendWhatsAppNotification(
            to,
            clientReminderMessage({
              clientName: b.client_name,
              serviceName,
              date: b.booking_date,
              time: b.start_time,
            }),
            b.id,
          );
      ok = res.ok;
    }
    results.push({ id: b.id, client: ok });
  }

  // Resumo para a Sabrine (sempre que houver alguém novo para amanhã).
  let ownerOk = false;
  if (pending.length > 0) {
    const { data: cfg } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "notification_whatsapp_number")
      .maybeSingle();
    const owner = toWhatsAppDigits(cfg?.value);
    if (owner) {
      const lines = pending.map((b) => {
        const serviceName = (b.services as { name: string } | null)?.name ?? "Procedimento";
        const status = results.find((r) => r.id === b.id)?.client ? "✅ lembrete enviado" : "⚠️ lembrar manualmente";
        return `• ${hhmm(b.start_time)} — ${b.client_name} (${serviceName}) — ${status}`;
      });
      const body =
        `Lembrete da agenda de amanhã — ${formatDisplayDate(tomorrow)} 🗓️\n\n` +
        `${lines.join("\n")}\n\n` +
        `Sabrine Beauty`;
      ownerOk = (await sendWhatsAppNotification(owner, body)).ok;
    }
  }

  // Marca como lembrado só quem recebeu de fato; as demais continuam pendentes na aba Lembretes.
  const toMark = results.filter((r) => r.client).map((r) => r.id);
  if (toMark.length > 0) {
    await supabaseAdmin
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .in("id", toMark);
  }

  return { date: tomorrow, total: pending.length, clientsSent: results.filter((r) => r.client).length, ownerSent: ownerOk };
}
