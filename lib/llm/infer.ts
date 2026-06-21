// Unified streaming inference. Streams plain UTF-8 text chunks (the contract
// the client readers expect). Entry points:
//   streamChat()             → uses the admin-configured DEFAULT provider
//   streamChatWithFallback() → default first, hops to other providers on 429/quota
//   streamByProvider()       → explicit provider + model (router / model selector)

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PRESET_BY_ID, type ProviderPreset } from "./providers";
import { resolveActive, resolveCandidates, getKey } from "./store";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type InferResult = {
  stream: ReadableStream<Uint8Array>;
  provider: string;
  model: string;
};

// Outcome of attempting one provider+model connection.
type Attempt =
  | { ok: true; stream: ReadableStream<Uint8Array> }
  | { ok: false; status: number; dead: boolean; detail: string };

const encoder = new TextEncoder();

// Decide if a failure kills the WHOLE provider (skip its other models) or just
// this one model. Auth/billing → provider dead. A 429 is provider-dead only
// when it's an account/daily cap; a per-model "temporarily rate-limited
// upstream" 429 means sibling models on the same provider may still work.
function providerDead(status: number, detail = ""): boolean {
  if (status === 401 || status === 402 || status === 403) return true;
  if (status === 429) {
    return /per[-\s]?day|free-models-per-day|daily|requests?\s*per\s*day|insufficient|add\s+\d+\s+credits/i.test(
      detail,
    );
  }
  return false;
}

// ---- public entry points ----

export async function streamChat(
  system: string,
  messages: ChatMsg[],
): Promise<InferResult | null> {
  const active = await resolveActive();
  if (active) {
    const preset = PRESET_BY_ID[active.providerId];
    if (preset) {
      return {
        provider: preset.name,
        model: active.model,
        stream: build(preset, active.apiKey, active.model, system, messages),
      };
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "Anthropic (env)",
      model: "claude-opus-4-7",
      stream: build(
        PRESET_BY_ID["anthropic"],
        process.env.ANTHROPIC_API_KEY,
        "claude-opus-4-7",
        system,
        messages,
      ),
    };
  }
  return null;
}

/**
 * Tries the default model, then falls back across models/providers on
 * connect-time failures (429 quota, auth). Returns the first provider that
 * actually opens a stream. Errors after the first chunk still surface inline.
 */
export async function streamChatWithFallback(
  system: string,
  messages: ChatMsg[],
  preferred?: { providerId?: string; model?: string },
  opts?: { maxTokens?: number },
): Promise<(InferResult & { fellBack: boolean }) | null> {
  const maxTokens = opts?.maxTokens ?? 1500;
  let candidates = await resolveCandidates();

  // An explicitly-picked model (router / agent selector) goes first, then the
  // rest act as automatic fallbacks if it 429s.
  if (preferred?.providerId && preferred.model) {
    const key =
      preferred.providerId === "anthropic"
        ? (await getKey("anthropic")) || process.env.ANTHROPIC_API_KEY || ""
        : (await getKey(preferred.providerId)) || "";
    if (key) {
      const pid = preferred.providerId;
      const pmodel = preferred.model;
      candidates = [
        { providerId: pid, apiKey: key, model: pmodel },
        ...candidates.filter(
          (c) => !(c.providerId === pid && c.model === pmodel),
        ),
      ];
    }
  }

  const deadProviders = new Set<string>();
  let attempts = 0;
  let lastDetail = "";

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (deadProviders.has(c.providerId)) continue;
    const preset = PRESET_BY_ID[c.providerId];
    if (!preset) continue;

    attempts++;
    const res = await tryConnect(preset, c.apiKey, c.model, system, messages, maxTokens);
    if (res.ok) {
      return {
        provider: preset.name,
        model: c.model,
        stream: res.stream,
        fellBack: i > 0,
      };
    }
    lastDetail = res.detail;
    if (res.dead) deadProviders.add(c.providerId);
  }

  // Env Anthropic key as a last resort.
  if (process.env.ANTHROPIC_API_KEY) {
    const res = await tryConnect(
      PRESET_BY_ID["anthropic"],
      process.env.ANTHROPIC_API_KEY,
      "claude-opus-4-7",
      system,
      messages,
      maxTokens,
    );
    if (res.ok) {
      return {
        provider: "Anthropic (env)",
        model: "claude-opus-4-7",
        stream: res.stream,
        fellBack: attempts > 0,
      };
    }
    lastDetail = res.detail;
  }

  // Everything failed → surface the last error as a one-line stream so the
  // client still renders something instead of an empty bubble.
  if (attempts > 0) {
    return {
      provider: "none",
      model: "none",
      fellBack: true,
      stream: textStream(
        `[all providers unavailable — last error: ${lastDetail || "unknown"}]`,
      ),
    };
  }
  return null;
}

/**
 * Non-streaming convenience: runs the fallback walker and drains the result
 * into a single string. Used by the coding agent which needs the full response
 * (structured JSON) before acting.
 */
export async function completeWithFallback(
  system: string,
  messages: ChatMsg[],
  preferred?: { providerId?: string; model?: string },
  opts?: { maxTokens?: number },
): Promise<{ text: string; provider: string; model: string } | null> {
  const result = await streamChatWithFallback(system, messages, preferred, opts);
  if (!result) return null;
  const reader = result.stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return { text, provider: result.provider, model: result.model };
}

export async function streamByProvider(
  providerId: string,
  model: string,
  system: string,
  messages: ChatMsg[],
): Promise<InferResult | null> {
  const preset = PRESET_BY_ID[providerId];
  if (!preset) return null;

  const key =
    providerId === "anthropic"
      ? (await getKey("anthropic")) || process.env.ANTHROPIC_API_KEY || ""
      : (await getKey(providerId)) || "";
  if (!key) return null;

  return {
    provider: preset.name,
    model,
    stream: build(preset, key, model, system, messages),
  };
}

// ---- connect (eager, fallback-aware) ----

// Opens the connection and validates it BEFORE committing to a stream, so a
// 429/auth failure can be retried on another provider. On success returns a
// live stream; on failure returns the status so the caller can decide.
async function tryConnect(
  preset: ProviderPreset,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMsg[],
  maxTokens: number,
): Promise<Attempt> {
  return preset.kind === "anthropic"
    ? tryAnthropic(apiKey, model, system, messages, maxTokens)
    : tryOpenAI(preset, apiKey, model, system, messages, maxTokens);
}

async function tryOpenAI(
  preset: ProviderPreset,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMsg[],
  maxTokens: number,
): Promise<Attempt> {
  let res: Response;
  try {
    res = await fetch(`${preset.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(preset.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
  } catch (err) {
    return { ok: false, status: 0, dead: false, detail: (err as Error).message };
  }

  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    return {
      ok: false,
      status: res.status,
      dead: providerDead(res.status, detail),
      detail: `${res.status} ${detail || res.statusText}`,
    };
  }
  return { ok: true, stream: pumpOpenAI(res.body) };
}

async function tryAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMsg[],
  maxTokens: number,
): Promise<Attempt> {
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const iter = stream[Symbol.asyncIterator]();
  try {
    // Pull the first event so auth/quota errors throw here (before we commit).
    const first = await iter.next();
    return { ok: true, stream: pumpAnthropic(iter, first) };
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : 0;
    const detail =
      err instanceof Anthropic.APIError ? `${status} ${err.message}` : String(err);
    return { ok: false, status, dead: providerDead(status, detail), detail };
  }
}

// ---- pumps (drain an already-validated connection) ----

function pumpOpenAI(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* keep-alive / partial line */
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(errText(err)));
      } finally {
        controller.close();
      }
    },
  });
}

type AnthropicIter = AsyncIterator<Anthropic.MessageStreamEvent>;

function pumpAnthropic(
  iter: AnthropicIter,
  first: IteratorResult<Anthropic.MessageStreamEvent>,
): ReadableStream<Uint8Array> {
  const emit = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: Anthropic.MessageStreamEvent,
  ) => {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      controller.enqueue(encoder.encode(event.delta.text));
    }
  };
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) emit(controller, first.value);
        for (;;) {
          const { value, done } = await iter.next();
          if (done) break;
          emit(controller, value);
        }
      } catch (err) {
        controller.enqueue(encoder.encode(errText(err)));
      } finally {
        controller.close();
      }
    },
  });
}

// ---- legacy direct builders (no pre-check) used by streamChat/streamByProvider ----

function build(
  preset: ProviderPreset,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMsg[],
): ReadableStream<Uint8Array> {
  return preset.kind === "anthropic"
    ? anthropicStream(apiKey, model, system, messages)
    : openAIStream(preset, apiKey, model, system, messages);
}

function anthropicStream(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMsg[],
): ReadableStream<Uint8Array> {
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model,
    max_tokens: 1500,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(errText(err)));
      } finally {
        controller.close();
      }
    },
  });
}

function openAIStream(
  preset: ProviderPreset,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMsg[],
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(`${preset.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(preset.extraHeaders ?? {}),
          },
          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 1500,
            messages: [{ role: "system", content: system }, ...messages],
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          controller.enqueue(
            encoder.encode(
              `\n[provider error ${res.status}: ${detail.slice(0, 200) || res.statusText}]`,
            ),
          );
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* keep-alive / partial line */
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(errText(err)));
      } finally {
        controller.close();
      }
    },
  });
}

function textStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function errText(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    return `\n[copilot error ${err.status}: ${err.message}]`;
  }
  return `\n[copilot error: ${(err as Error)?.message ?? "stream failed"}]`;
}
