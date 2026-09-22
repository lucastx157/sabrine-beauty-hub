import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deliveryId = request.headers.get("x-lovable-delivery");
        const event = request.headers.get("x-lovable-event");

        if (!deliveryId || !event) {
          return new Response("Missing delivery or event header", { status: 400 });
        }

        const secret = process.env["WHATSAPP_API_KEY"];
        if (!secret) {
          return new Response("WhatsApp not configured", { status: 500 });
        }

        let verified: { body: string; payload: unknown; timestamp: string };
        try {
          verified = await verifyWebhookRequest({
            req: request,
            secret,
            maxBodyBytes: 4 * 1024 * 1024,
          });
        } catch (err) {
          console.error("[WhatsApp webhook] verification failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: insertError } = await supabaseAdmin.from("whatsapp_webhook_events").insert({
          delivery_id: deliveryId,
          event,
          payload: verified.payload as Record<string, unknown>,
        });

        if (insertError) {
          console.error("[WhatsApp webhook] failed to persist event", insertError);
          return new Response("Failed to persist event", { status: 500 });
        }

        if (event.startsWith("whatsapp.status")) {
          const payload = verified.payload as {
            entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id: string; status: string; errors?: unknown[] }> } }> }>;
          };
          const statuses = payload.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];
          for (const status of statuses) {
            if (status.id) {
              const { error: updateError } = await supabaseAdmin
                .from("whatsapp_outbound_messages")
                .update({ status: status.status, status_payload: status as unknown as Record<string, unknown> })
                .eq("message_id", status.id);
              if (updateError) {
                console.error("[WhatsApp webhook] status update failed", updateError);
              }
            }
          }
        }

        if (event.startsWith("whatsapp.message")) {
          const payload = verified.payload as {
            entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from: string; id: string; text?: { body?: string } }> } }> }>;
          };
          const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
          for (const message of messages) {
            console.log("[WhatsApp webhook] inbound message", message.from, message.text?.body);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
