import { sessionFromRequest } from "@/lib/auth/session";
import { buildAdminIntel } from "@/lib/admin/reports";
import { runCycle } from "@/lib/evolution/director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin Intelligence Center — admin only. Aggregates Evolution + security +
// registries into reports/actions. Stores daily report in the Knowledge Layer.
export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (session?.r !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(buildAdminIntel());
}

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (session?.r !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  // Refresh = re-run an evolution cycle then rebuild intel.
  runCycle();
  return Response.json({ ok: true, intel: buildAdminIntel() });
}
