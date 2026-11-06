import { createFileRoute } from "@tanstack/react-router";

// O Mercado Pago avisa que algo mudou; nunca confiamos no corpo do aviso:
// o status é sempre consultado na API do Mercado Pago com o nosso token.
export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = await request.json();
        } catch {
          // alguns avisos vêm só na URL
        }
        const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
        if (type !== "payment" || !/^\d{1,30}$/.test(id)) return new Response("ignored", { status: 200 });

        const { fetchPayment, applyPayment } = await import("@/lib/mercadopago.server");
        const payment = await fetchPayment(id);
        if (!payment) return new Response("not found", { status: 200 });
        await applyPayment(payment);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
