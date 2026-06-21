// Admin-only management of the competitor-research web-search key (Tavily).
// Gated to admin role by middleware (/api/admin/*). The key is never returned
// unmasked.

import { NextRequest, NextResponse } from "next/server";
import { searchKeyStatus, setSearchKey, clearSearchKey } from "@/lib/finance-os/ci/agent/search-key";

export async function GET() {
  return NextResponse.json(await searchKeyStatus());
}

export async function POST(req: NextRequest) {
  let body: { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey) return NextResponse.json({ error: "key_required" }, { status: 400 });
  try {
    await setSearchKey(apiKey);
  } catch (e) {
    return NextResponse.json({ error: "store_failed", detail: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json(await searchKeyStatus());
}

export async function DELETE() {
  await clearSearchKey();
  return NextResponse.json(await searchKeyStatus());
}
