import { SYSTEM_INSTRUCTIONS, moduleContext } from "@/lib/fpa/context";
import { streamChatWithFallback, type ChatMsg } from "@/lib/llm/infer";
import { getDataset, datasetContext } from "@/lib/fpa/dataStore";
import { sessionFromRequest } from "@/lib/auth/session";
import { consumeQuota } from "@/lib/auth/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingMsg = { role: "user" | "ai"; text: string };

const encoder = new TextEncoder();

export async function POST(req: Request) {
  let body: { messages?: IncomingMsg[]; moduleSlug?: string | null };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const incoming = (body.messages ?? []).filter((m) => m.text?.trim());
  if (incoming.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  const session = await sessionFromRequest(req);
  if (session) {
    const q = consumeQuota(session.u, session.r, "text");
    if (!q.ok) {
      return new Response(
        `⚠ Guest message limit reached (${q.limit}/day). Resets in ~${Math.ceil((q.retryAfterSec ?? 0) / 3600)}h.`,
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
  }

  const messages: ChatMsg[] = incoming.map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.text,
  }));

  const context = moduleContext(body.moduleSlug ?? null);
  const dataset = await getDataset();
  const uploaded = dataset
    ? `\n\nThe user has UPLOADED their own data — prefer it over demo figures when they ask about "my data", "the upload", or this dataset:\n${datasetContext(dataset)}`
    : "";
  const system = `${SYSTEM_INSTRUCTIONS}\n\nCurrent view context:\n${context}${uploaded}`;

  const result = await streamChatWithFallback(system, messages);

  if (!result) {
    // Nothing configured anywhere → grounded demo stub.
    return streamFallback(context, incoming[incoming.length - 1].text);
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Copilot-Mode": "live",
      "X-Copilot-Provider": result.provider,
      "X-Copilot-Model": result.model,
      "X-Copilot-Fellback": result.fellBack ? "1" : "0",
    },
  });
}

// Streams a short, data-grounded canned answer (no provider configured).
function streamFallback(context: string, question: string): Response {
  const viewLine = context.split("\n")[0].replace("VIEW: ", "");
  const firstKpi =
    context.split("\n").find((l) => l.startsWith("- ")) ?? "- (no KPI on view)";

  const text = `**${viewLine.replace(/\.$/, "")}**
No model provider configured — this is a grounded stub.

Top signal on this view: ${firstKpi.replace(/^- /, "")}.

Your question: "${question}". Add a provider key in Admin → Providers (free clouds supported) or set ANTHROPIC_API_KEY to enable the real copilot.`;

  const words = text.split(/(\s+)/);
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w));
        await new Promise((r) => setTimeout(r, 16));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Copilot-Mode": "fallback",
    },
  });
}
