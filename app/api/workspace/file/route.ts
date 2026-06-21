import { NextResponse } from "next/server";
import { readFile, writeFile, deleteFile } from "@/lib/workspace/fsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rel = new URL(req.url).searchParams.get("path");
  if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
    return NextResponse.json({ path: rel, content: await readFile(rel) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  let body: { path?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.path) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
    await writeFile(body.path, body.content ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const rel = new URL(req.url).searchParams.get("path");
  if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
    await deleteFile(rel);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
