import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listServices,
  getAvailableSlots,
  getCancellationPolicy,
} from "./booking.functions";
import { formatBrazilDate, formatDisplayDate, formatPhone, nowInBrazil } from "./dates";
import { addDays } from "date-fns";

const MODEL = "google/gemini-3.7-flash";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

const inputMessageSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal("function"),
        function: z.object({ name: z.string(), arguments: z.string() }),
      }),
    )
    .optional(),
  tool_call_id: z.string().optional(),
});

const chatSchema = z.object({
  messages: z.array(inputMessageSchema),
});

type ChatMessage =
  | { role: "system"; content: string }
  | {
      role: "user" | "assistant" | "tool";
      content: string;
      tool_calls?:
        | Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>
        | undefined;
      tool_call_id?: string | undefined;
    };

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_services",
      description: "Retorna a lista de serviços oferecidos, preços e duração.",
      parameters: { type: "object" as const, properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_available_slots",
      description: "Lista os horários LIVRES (datas YYYY-MM-DD). Apenas para informar; a cliente marca na seção de agendamento do site.",
      parameters: {
        type: "object" as const,
        properties: { date_from: { type: "string" }, date_to: { type: "string" } },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_cancellation_policy",
      description: "Retorna a política de cancelamento e reagendamento.",
      parameters: { type: "object" as const, properties: {}, required: [] },
    },
  },
];

async function callModel(messages: ChatMessage[]) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"] ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${text}`);
  }

  return (await response.json()) as {
    choices: Array<{
      message: {
        role: string;
        content?: string;
        tool_calls?: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }>;
      };
      finish_reason?: string;
    }>;
  };
}

async function executeTool(call: {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}) {
  const name = call.function.name;
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
  } catch {
    return { tool_call_id: call.id, role: "tool", content: "Argumentos inválidos." };
  }

  try {
    switch (name) {
      case "get_services": {
        const services = await listServices({ data: undefined });
        return {
          tool_call_id: call.id,
          role: "tool",
          content: JSON.stringify(
            services.map((s) => ({
              id: s.id,
              name: s.name,
              price: s.price_min,
              price_before_discount: s.price_max,
              pix_now: s.deposit_cents ?? s.price_min,
              notes: s.price_note,
              duration_min: s.duration_min,
              description: s.description,
            })),
          ),
        };
      }
      case "get_available_slots": {
        const from =
          typeof args["date_from"] === "string" && args["date_from"]
            ? args["date_from"]
            : formatBrazilDate(nowInBrazil());
        const to =
          typeof args["date_to"] === "string" && args["date_to"]
            ? args["date_to"]
            : formatBrazilDate(addDays(nowInBrazil(), 20));
        const slots = await getAvailableSlots({
          data: {
            serviceId: typeof args["service_id"] === "string" ? args["service_id"] : undefined,
            from,
            to,
          },
        });
        return {
          tool_call_id: call.id,
          role: "tool",
          content: JSON.stringify(
            slots.slice(0, 50).map((s) => ({
              date: s.date,
              time: s.time,
              label: s.label,
            })),
          ),
        };
      }
      case "get_cancellation_policy": {
        const policy = await getCancellationPolicy({ data: undefined });
        return { tool_call_id: call.id, role: "tool", content: policy };
      }
      default:
        return {
          tool_call_id: call.id,
          role: "tool",
          content: `Função desconhecida: ${name}`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { tool_call_id: call.id, role: "tool", content: `Erro: ${message}` };
  }
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((data) => chatSchema.parse(data))
  .handler(async ({ data }) => {
    const today = nowInBrazil();
    const system = `Você é a assistente virtual do Sabrine Beauty Flow, um estúdio sofisticado de design de sobrancelhas. Data e hora atuais: ${today.toLocaleString("pt-BR")}. Horário de Brasília.

Regras importantes:
- Use português brasileiro, tom acolhedor, elegante e direto.
- Tire dúvidas e indique o procedimento ideal. Use get_services para preços (valores em centavos); nunca invente.
- Pode informar horários livres com get_available_slots, mas você NÃO marca nem confirma agendamentos.
- Para agendar, oriente a cliente a usar a seção "Agendamento" deste site (role a página até "Agende seu horário" ou toque em "Agendar agora"): escolhe o procedimento, o dia e o horário, informa nome e WhatsApp, paga o valor no Pix (chave 37998598753, Sabrine) e toca em "Já paguei, enviar comprovante", que abre o WhatsApp da Sabrine.
- O horário só está marcado depois do ok da Sabrine (até 8 horas).
- Micropigmentação Labial (R$ 750) e de Sobrancelhas (de R$ 750 por R$ 679): paga-se sinal de R$ 100 no Pix e o restante no dia (Pix ou cartão). Retoque em 30 dias: labial R$ 150, sobrancelhas R$ 100. Labial ganha Hydra Gloss de brinde.
- Regras: vaga só com Pix + comprovante; remarcar com 24h de aviso (o valor vale para o novo horário); falta ou aviso com menos de 24h não tem devolução; tolerância de 15 minutos; se duas pessoas pagarem o mesmo horário, fica quem mandou o comprovante primeiro.`;

    const modelMessages: ChatMessage[] = [
      { role: "system", content: system },
      ...data.messages.map((m) => ({
        role: m.role,
        content: m.content ?? "",
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
      })),
    ];

    for (let i = 0; i < 5; i++) {
      const result = await callModel(modelMessages);
      const choice = result.choices[0];
      if (!choice) throw new Error("Resposta vazia da IA");

      const message = choice.message;

      if (!message.tool_calls?.length) {
        return {
          role: "assistant",
          content: message.content ?? "",
        };
      }

      modelMessages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      const toolResponses = await Promise.all(message.tool_calls.map(executeTool));
      for (const r of toolResponses) {
        modelMessages.push(r as ChatMessage);
      }
    }

    return {
      role: "assistant",
      content: "Desculpe, precisei de mais etapas do que esperado. Pode repetir o que deseja?",
    };
  });
