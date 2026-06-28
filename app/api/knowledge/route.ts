import { sessionFromRequest } from "@/lib/auth/session";
import {
  getKnowledge, listKnowledge, searchKnowledge, relatedTo, knowledgeStats, upsertKnowledge,
} from "@/lib/knowledge/store";
import type { KnowledgeInput, KnowledgeType } from "@/lib/knowledge/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// READS — open to any signed-in user (middleware already requires a session).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const q = url.searchParams.get("q");
  const type = (url.searchParams.get("type") as KnowledgeType | null) ?? undefined;

  if (id) {
    const object = getKnowledge(id);
    if (!object) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ object, related: relatedTo(id) });
  }
  if (q !== null) {
    return Response.json({ results: searchKnowledge(q, { type }), stats: knowledgeStats() });
  }
  return Response.json({ objects: listKnowledge(type ? { type } : undefined), stats: knowledgeStats() });
}

// WRITES — authorized workflows only. Via the API this means an admin session
// (agents write server-side through the store with their own writer id).
export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (session?.r !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: KnowledgeInput;
  try {
    body = (await req.json()) as KnowledgeInput;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.id || !body?.type || !body?.title) {
    return Response.json({ error: "id, type and title are required" }, { status: 400 });
  }
  try {
    const object = upsertKnowledge("admin", body);
    return Response.json({ ok: true, object });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
