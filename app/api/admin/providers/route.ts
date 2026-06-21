import { NextResponse } from "next/server";
import { PRESETS } from "@/lib/llm/providers";
import {
  listMasked,
  upsertProvider,
  removeProvider,
  setDefault,
} from "@/lib/llm/store";
import { checkAdmin } from "@/lib/llm/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(req: Request) {
  const { ok } = await checkAdmin(req);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;

  const state = await listMasked();
  return NextResponse.json({
    presets: PRESETS,
    ...state,
    adminOpen: false,
  });
}

export async function POST(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;

  let body: {
    action?: "upsert" | "setDefault";
    providerId?: string;
    apiKey?: string;
    enabled?: boolean;
    models?: string[];
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.providerId) {
    return NextResponse.json({ error: "providerId required" }, { status: 400 });
  }

  try {
    if (body.action === "setDefault") {
      await setDefault(body.providerId, body.model ?? "");
      return NextResponse.json({ ok: true });
    }
    const saved = await upsertProvider({
      providerId: body.providerId,
      apiKey: body.apiKey,
      enabled: body.enabled,
      models: body.models,
    });
    return NextResponse.json({ ok: true, provider: saved });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await removeProvider(id);
  return NextResponse.json({ ok: true });
}
