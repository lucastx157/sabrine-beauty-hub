/* Cliente mínimo da API da Anthropic (Claude), sem dependências extras.
   Usado quando o projeto tem o segredo ANTHROPIC_API_KEY configurado.
   - Escolhe sozinho o modelo Sonnet mais novo disponível na conta
     (ou use o segredo ANTHROPIC_MODEL pra fixar um modelo).
   - Faz streaming (texto aparecendo ao vivo) e devolve os blocos completos. */

const API = "https://api.anthropic.com/v1";
const MODELO_PADRAO = "claude-sonnet-4-5";
let modeloEmCache: string | null = null;

export function anthropicKey(): string {
  return process.env["ANTHROPIC_API_KEY"] ?? "";
}

function cabecalhos(key: string): Record<string, string> {
  return {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
}

export async function anthropicModel(key = anthropicKey()): Promise<string> {
  const fixo = process.env["ANTHROPIC_MODEL"];
  if (fixo) return fixo;
  if (modeloEmCache) return modeloEmCache;
  try {
    const r = await fetch(`${API}/models?limit=100`, { headers: cabecalhos(key) });
    if (r.ok) {
      const j = (await r.json()) as { data?: { id: string }[] };
      const ids = (j.data ?? []).map((m) => m.id);
      modeloEmCache = ids.find((i) => /sonnet/i.test(i)) ?? ids[0] ?? MODELO_PADRAO;
    } else {
      modeloEmCache = MODELO_PADRAO;
    }
  } catch {
    modeloEmCache = MODELO_PADRAO;
  }
  return modeloEmCache;
}

/* ------------------------------ tipos ------------------------------ */

export type ABloco =
  | { type: "text"; text: string; citations?: { url?: string }[] }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string }; title?: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string }
  | { type: string; [k: string]: unknown };

export type AMensagem = { role: "user" | "assistant"; content: string | ABloco[] };

export type AFerramenta =
  | { name: string; description?: string; input_schema: Record<string, unknown> }
  | { type: string; name: string; [k: string]: unknown };

export type ARequisicao = {
  system?: string;
  messages: AMensagem[];
  tools?: AFerramenta[];
  tool_choice?: { type: "auto" | "any" | "tool"; name?: string };
  max_tokens?: number;
  temperature?: number;
};

export type AResposta = {
  content: ABloco[];
  stop_reason: string | null;
  text: string;
  fontes: string[];
};

/* ------------------------------ chamada ------------------------------ */

export async function claude(
  req: ARequisicao,
  opts: { onDelta?: (t: string) => void; signal?: AbortSignal } = {},
): Promise<AResposta> {
  const key = anthropicKey();
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  const model = await anthropicModel(key);

  const resp = await fetch(`${API}/messages`, {
    method: "POST",
    headers: cabecalhos(key),
    signal: opts.signal,
    body: JSON.stringify({ model, stream: true, ...req, max_tokens: req.max_tokens ?? 8000 }),
  });
  if (!resp.ok || !resp.body) {
    const t = await resp.text().catch(() => "");
    if (resp.status === 404 && !process.env["ANTHROPIC_MODEL"]) modeloEmCache = null;
    throw new Error(`Claude (${resp.status}): ${t.slice(0, 300)}`);
  }

  const blocos: (ABloco & { _json?: string })[] = [];
  let stop: string | null = null;
  const leitor = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const evento = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const linha = evento.split("\n").find((l) => l.startsWith("data:"));
      if (!linha) continue;
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(linha.slice(5).trim()) as Record<string, unknown>;
      } catch {
        continue;
      }
      switch (ev.type) {
        case "content_block_start": {
          const b = { ...(ev.content_block as ABloco) } as ABloco & { _json?: string };
          if (b.type === "tool_use" || b.type === "server_tool_use") b._json = "";
          blocos[ev.index as number] = b;
          break;
        }
        case "content_block_delta": {
          const b = blocos[ev.index as number] as ABloco & { _json?: string; text?: string; citations?: unknown[] };
          const d = ev.delta as { type: string; text?: string; partial_json?: string; citation?: unknown };
          if (!b) break;
          if (d.type === "text_delta" && d.text) {
            b.text = (b.text ?? "") + d.text;
            opts.onDelta?.(d.text);
          } else if (d.type === "input_json_delta" && d.partial_json) {
            b._json = (b._json ?? "") + d.partial_json;
          } else if (d.type === "citations_delta" && d.citation) {
            b.citations = [...(b.citations ?? []), d.citation];
          }
          break;
        }
        case "content_block_stop": {
          const b = blocos[ev.index as number] as ABloco & { _json?: string; input?: unknown };
          if (b && b._json !== undefined) {
            try {
              b.input = b._json ? JSON.parse(b._json) : {};
            } catch {
              b.input = {};
            }
            delete b._json;
          }
          break;
        }
        case "message_delta": {
          const d = ev.delta as { stop_reason?: string };
          if (d?.stop_reason) stop = d.stop_reason;
          break;
        }
        case "error": {
          const e = ev.error as { message?: string } | undefined;
          throw new Error(`Claude: ${e?.message ?? "erro no streaming"}`);
        }
      }
    }
  }

  const content = blocos.filter(Boolean) as ABloco[];
  const text = content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  const fontes = new Set<string>();
  for (const b of content) {
    if (b.type === "web_search_tool_result" && Array.isArray((b as { content?: unknown }).content)) {
      for (const r of (b as { content: { url?: string }[] }).content) if (r.url) fontes.add(r.url);
    }
    if (b.type === "text") for (const c of (b as { citations?: { url?: string }[] }).citations ?? []) if (c.url) fontes.add(c.url);
  }
  return { content, stop_reason: stop, text, fontes: [...fontes].filter((u) => u.startsWith("http")).slice(0, 8) };
}

/* -------------- zod (v3) → JSON Schema simples, pra saída estruturada -------------- */

type ZDef = { typeName?: string; [k: string]: unknown };
export function zodParaJsonSchema(s: unknown): Record<string, unknown> {
  const def = ((s as { _def?: ZDef })?._def ?? {}) as ZDef;
  const desc = (def.description as string | undefined) ? { description: def.description } : {};
  switch (def.typeName) {
    case "ZodObject": {
      const forma = typeof def.shape === "function" ? (def.shape as () => Record<string, unknown>)() : (def.shape as Record<string, unknown>);
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(forma ?? {})) {
        properties[k] = zodParaJsonSchema(v);
        const t = (v as { _def?: ZDef })?._def?.typeName;
        if (t !== "ZodOptional" && t !== "ZodDefault") required.push(k);
      }
      return { type: "object", properties, required, ...desc };
    }
    case "ZodString":
      return { type: "string", ...desc };
    case "ZodNumber":
      return { type: "number", ...desc };
    case "ZodBoolean":
      return { type: "boolean", ...desc };
    case "ZodArray":
      return { type: "array", items: zodParaJsonSchema(def.type), ...desc };
    case "ZodEnum":
      return { type: "string", enum: def.values as string[], ...desc };
    case "ZodLiteral":
      return { const: def.value, ...desc };
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
      return zodParaJsonSchema(def.innerType);
    case "ZodEffects":
      return zodParaJsonSchema(def.schema);
    case "ZodUnion":
      return { anyOf: (def.options as unknown[]).map(zodParaJsonSchema), ...desc };
    case "ZodRecord":
      return { type: "object", additionalProperties: zodParaJsonSchema(def.valueType), ...desc };
    default:
      return { ...desc };
  }
}
