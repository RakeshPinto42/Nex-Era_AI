import { NextResponse } from "next/server";
import { PRESET_BY_ID } from "@/lib/llm/providers";
import { getKey } from "@/lib/llm/store";
import { checkAdmin } from "@/lib/llm/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pings a provider to validate the stored (or just-submitted) key.
export async function POST(req: Request) {
  const { ok } = await checkAdmin(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { providerId?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const preset = body.providerId ? PRESET_BY_ID[body.providerId] : null;
  if (!preset) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const key = body.apiKey?.trim() || (await getKey(preset.id)) || "";
  if (!key) {
    return NextResponse.json({ ok: false, error: "No key to test" });
  }

  try {
    if (preset.kind === "anthropic") {
      const res = await fetch(`${preset.baseUrl}/v1/models`, {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      return NextResponse.json(
        res.ok
          ? { ok: true, detail: "Authenticated" }
          : { ok: false, error: `HTTP ${res.status}` },
      );
    }

    // OpenAI-compatible: list models.
    const res = await fetch(`${preset.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        error: `HTTP ${res.status}${text ? ` · ${text.slice(0, 120)}` : ""}`,
      });
    }
    const data = await res.json().catch(() => null);
    const count = Array.isArray(data?.data) ? data.data.length : undefined;
    return NextResponse.json({
      ok: true,
      detail: count != null ? `${count} models available` : "Authenticated",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
