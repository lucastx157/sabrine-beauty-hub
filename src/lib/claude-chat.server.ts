/* Faz o Claude (Anthropic) responder no mesmo formato que o resto do código já espera
   (formato "chat completions": choices[0].message com content e tool_calls).
   Assim a assistente de agendamento troca de IA sem mudar o resto. */
import { claude, type ABloco, type AMensagem } from "./anthropic.server";

type OAIToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type OAIMsg = { role: string; content?: string | null; tool_calls?: OAIToolCall[]; tool_call_id?: string };
type OAITool = { type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } };

export async function chatCompletionViaClaude(messages: OAIMsg[], tools: OAITool[] = [], temperature = 0.4) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content ?? "")
    .join("\n\n");

  const msgs: AMensagem[] = [];
  const empurrar = (role: "user" | "assistant", blocos: ABloco[]) => {
    if (!blocos.length) return;
    const ult = msgs[msgs.length - 1];
    if (ult && ult.role === role) {
      const atual = typeof ult.content === "string" ? [{ type: "text", text: ult.content } as ABloco] : ult.content;
      ult.content = [...atual, ...blocos];
    } else {
      msgs.push({ role, content: blocos });
    }
  };

  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      empurrar("user", [{ type: "tool_result", tool_use_id: m.tool_call_id ?? "", content: m.content ?? "" }]);
    } else if (m.role === "assistant") {
      const blocos: ABloco[] = [];
      if (m.content && m.content.trim()) blocos.push({ type: "text", text: m.content });
      for (const tc of m.tool_calls ?? []) {
        let input: unknown = {};
        try {
          input = JSON.parse(tc.function.arguments || "{}");
        } catch {
          input = {};
        }
        blocos.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
      }
      empurrar("assistant", blocos);
    } else {
      if (m.content && m.content.trim()) empurrar("user", [{ type: "text", text: m.content }]);
    }
  }
  if (!msgs.length || msgs[0].role !== "user") msgs.unshift({ role: "user", content: "Olá" });

  const r = await claude({
    system: system || undefined,
    messages: msgs,
    ...(tools.length
      ? {
          tools: tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters ?? { type: "object", properties: {} },
          })),
        }
      : {}),
    temperature,
    max_tokens: 2048,
  });

  const toolCalls: OAIToolCall[] = r.content
    .filter((b) => b.type === "tool_use")
    .map((b) => {
      const u = b as { id: string; name: string; input: unknown };
      return { id: u.id, type: "function" as const, function: { name: u.name, arguments: JSON.stringify(u.input ?? {}) } };
    });

  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: r.text,
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: r.stop_reason === "tool_use" ? "tool_calls" : "stop",
      },
    ],
  };
}
