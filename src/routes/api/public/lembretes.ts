import { createFileRoute } from "@tanstack/react-router";

// Disparado 1x por dia pelo GitHub Actions (.github/workflows/lembretes.yml).
// Manda o lembrete do dia seguinte para as clientes e o resumo para a Sabrine.
// Se a variável REMINDERS_TOKEN existir, exige "Authorization: Bearer <token>".
// Sem ela, a rota continua segura o bastante: só envia uma vez por agendamento.
async function handle(request: Request) {
  const expected = process.env["REMINDERS_TOKEN"];
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { runDayBeforeReminders } = await import("@/lib/reminders.server");
    const result = await runDayBeforeReminders();
    return Response.json(result);
  } catch (err) {
    console.error("[Lembretes] falhou", err);
    return new Response("Erro ao enviar lembretes", { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/lembretes")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
