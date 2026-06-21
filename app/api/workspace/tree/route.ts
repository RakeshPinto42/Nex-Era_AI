import { NextResponse } from "next/server";
import { readTree } from "@/lib/workspace/fsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { root, tree } = await readTree();
    return NextResponse.json({ root, tree });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
