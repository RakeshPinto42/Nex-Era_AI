import { buildTerminalSnapshot } from "@/lib/investments/terminal/build";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = (req: Request) => withGuard(req, "terminal", () => handleGET());

// Live Market Terminal snapshot — polled by the client for incremental updates.
// Reuses the Market Intelligence Tool (cached). No advice, no trading.
async function handleGET() {
  try {
    return Response.json(await buildTerminalSnapshot());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
