import { NextResponse } from "next/server";
import { getRoot, setRoot } from "@/lib/workspace/fsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ root: await getRoot() });
}

export async function POST(req: Request) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.path?.trim()) {
    return NextResponse.json({ error: "Folder path required" }, { status: 400 });
  }
  try {
    const root = await setRoot(body.path.trim());
    return NextResponse.json({ ok: true, root });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Could not open folder" },
      { status: 400 },
    );
  }
}
