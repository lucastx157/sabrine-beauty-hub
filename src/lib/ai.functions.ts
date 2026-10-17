import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listServices,
  getAvailableSlots,
  createBooking,
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
              price_min: s.price_min,
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
      case "create_booking": {
        if (
          typeof args["service_id"] !== "string" ||
          typeof args["date"] !== "string" ||
          typeof args["time"] !== "string" ||
          typeof args["client_name"] !== "string"
        ) {
          return {
            tool_call_id: call.id,
            role: "tool",
            content: JSON.stringify({ error: "Informações incompletas para agendar." }),
          };
        }
        const booking = await createBooking({
          data: {
            serviceId: args["service_id"],
            date: args["date"],
            time: args["time"],
            clientName: args["client_name"],
            clientPhone: typeof args["client_phone"] === "string" ? args["client_phone"] : undefined,
          },
        });
        return {
          tool_call_id: call.id,
          role: "tool",
          content: JSON.stringify({
            success: true,
            booking_id: (booking as { id: string }).id,
            date: args["date"],
            time: args["time"],
          }),
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
- Você apenas tira dúvidas sobre os procedimentos e indica o ideal. Use get_services para serviços e preços; nunca invente.
- Você NÃO mostra horários, NÃO marca e NÃO confirma agendamentos.
- Agendamentos são feitos somente pela agenda semanal online: https://claude.ai/artifact/9cetsC7qcS4TCiR9EXTsqz — lá a cliente vê os horários disponíveis, escolhe o procedimento, faz o pagamento antecipado via Pix e envia o comprovante pelo WhatsApp. A Sabrine confirma em até 2 horas. Sempre indique esse link quando a cliente quiser agendar.
- Política: consulte via get_cancellation_policy.`;

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
