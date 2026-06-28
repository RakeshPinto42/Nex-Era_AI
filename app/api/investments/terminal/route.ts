import { buildTerminalSnapshot } from "@/lib/investments/terminal/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Live Market Terminal snapshot — polled by the client for incremental updates.
// Reuses the Market Intelligence Tool (cached). No advice, no trading.
export async function GET() {
  try {
    return Response.json(await buildTerminalSnapshot());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
