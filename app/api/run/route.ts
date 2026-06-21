import { streamChatWithFallback, type ChatMsg } from "@/lib/llm/infer";
import { getDataset, datasetContext } from "@/lib/fpa/dataStore";
import { sessionFromRequest } from "@/lib/auth/session";
import { consumeQuota } from "@/lib/auth/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

// A limit message rendered as a one-line text stream (the chat client streams
// the body as the assistant reply, so this shows inline).
function limitStream(text: string): Response {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Run-Mode": "limit" },
  });
}

type IncomingMsg = { role: "user" | "ai" | "assistant"; text?: string; content?: string };

// Generic inference by explicit provider+model (router / model selector / chat).
// Falls back to the configured default, then a stub, so it never hard-fails.
export async function POST(req: Request) {
  let body: {
    providerId?: string;
    model?: string;
    system?: string;
    messages?: IncomingMsg[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages: ChatMsg[] = (body.messages ?? [])
    .map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: (m.content ?? m.text ?? "").trim(),
    }))
    .filter((m) => m.content);

  if (messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  const session = await sessionFromRequest(req);
  if (session) {
    const q = consumeQuota(session.u, session.r, "text");
    if (!q.ok) {
      return limitStream(
        `⚠ You've hit the guest message limit (${q.limit}/day). It resets in ~${Math.ceil((q.retryAfterSec ?? 0) / 3600)} hours. Ask the workspace owner for an account with higher limits.`,
      );
    }
  }

  const base =
    body.system?.trim() ||
    "You are NEXERA, an autonomous AI assistant. Be precise, helpful and concise. Use markdown when useful.";
  const dataset = await getDataset();
  const system = dataset
    ? `${base}\n\nThe user has uploaded a dataset. Use it to answer questions about "my data" / "the upload":\n${datasetContext(dataset)}`
    : base;

  // Try the explicitly-picked model first, then auto-fall back across other
  // configured providers on 429 / quota errors.
  const result = await streamChatWithFallback(system, messages, {
    providerId: body.providerId,
    model: body.model,
  });

  if (!result) {
    return stub(messages[messages.length - 1].content);
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Run-Provider": result.provider,
      "X-Run-Model": result.model,
      "X-Run-Fellback": result.fellBack ? "1" : "0",
    },
  });
}

function stub(question: string): Response {
  const text = `No model provider configured. Add a free cloud key in Admin → Providers, then this will run on a live model.\n\n(You asked: "${question}".)`;
  const words = text.split(/(\s+)/);
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w));
        await new Promise((r) => setTimeout(r, 14));
      }
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Run-Mode": "stub",
    },
  });
}
