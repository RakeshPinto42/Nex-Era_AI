import { sessionFromRequest } from "@/lib/auth/session";
import { upsertKnowledge } from "@/lib/knowledge/store";
import { toKnowledgeObjects, type ProjectCapabilities } from "@/lib/code/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Persist NEX Code capabilities into the Knowledge Layer. The NEX Code workflow
// is an authorized writer ("file"). Computed client-side from the indexed
// project; this route only stores the result. Emits KnowledgeUpdated per object.
export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let caps: ProjectCapabilities;
  try {
    caps = (await req.json()) as ProjectCapabilities;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!caps?.projectName || !Array.isArray(caps.technologies)) {
    return Response.json({ error: "Invalid capabilities payload" }, { status: 400 });
  }

  try {
    const ids = toKnowledgeObjects(caps).map((ko) => upsertKnowledge("file", ko).id);
    return Response.json({ ok: true, stored: ids });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
