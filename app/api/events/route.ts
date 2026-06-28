import { sessionFromRequest } from "@/lib/auth/session";
import { recentEvents, eventStats, getSubscribers, publish } from "@/lib/events/bus";
import { EVENT_TYPES, type EventType } from "@/lib/events/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Observe the bus — recent events (replay), stats, subscribers.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);
  const type = url.searchParams.get("type") ?? undefined;
  return Response.json({
    events: recentEvents({ limit, type }),
    stats: eventStats(),
    subscribers: getSubscribers(),
  });
}

// Publish a client-originated event (e.g. BrokerConnected, WorkspaceCreated).
// Authenticated; only known event types accepted.
export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { type?: string; source?: string; payload?: unknown; workspaceId?: string | null; correlationId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!EVENT_TYPES.includes(body.type as EventType)) {
    return Response.json({ error: "Unknown event type" }, { status: 400 });
  }
  const record = await publish({
    type: body.type as EventType,
    source: body.source || `user:${session.u}`,
    payload: body.payload ?? {},
    workspaceId: body.workspaceId ?? null,
    correlationId: body.correlationId,
  });
  return Response.json({ ok: true, id: record.envelope.id });
}
