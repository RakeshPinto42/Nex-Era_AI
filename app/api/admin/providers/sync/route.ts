import { NextResponse } from "next/server";
import { PRESET_BY_ID } from "@/lib/llm/providers";
import { getKey, upsertProvider, listMasked } from "@/lib/llm/store";
import { fetchFreeIds } from "@/lib/llm/discovery";
import { checkAdmin } from "@/lib/llm/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Discovers every free model on an OpenAI-compatible gateway and enables them.
// "Free" = model id ends in ":free" (OpenRouter convention). Merges with any
// already-enabled models so manual picks are preserved.
export async function POST(req: Request) {
  const { ok } = await checkAdmin(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { providerId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const providerId = body.providerId || "openrouter";
  const preset = PRESET_BY_ID[providerId];
  if (!preset) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  if (preset.kind !== "openai") {
    return NextResponse.json(
      { error: "Sync only supports OpenAI-compatible gateways" },
      { status: 400 },
    );
  }

  const key = (await getKey(providerId)) || "";
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "Save a key first, then sync" },
      { status: 400 },
    );
  }

  let freeIds: string[];
  try {
    freeIds = await fetchFreeIds(providerId);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }

  // Merge with existing enabled models (preserve manual picks like openrouter/free).
  const state = await listMasked();
  const existing =
    state.providers.find((p) => p.providerId === providerId)?.models ?? [];
  const merged = Array.from(new Set([...existing, ...freeIds]));
  const added = freeIds.filter((id) => !existing.includes(id)).length;

  await upsertProvider({ providerId, models: merged, enabled: true });

  return NextResponse.json({
    ok: true,
    found: freeIds.length,
    added,
    total: merged.length,
    models: freeIds,
  });
}
