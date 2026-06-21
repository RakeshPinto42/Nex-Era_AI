import { NextResponse } from "next/server";
import {
  getDataset,
  saveDataset,
  clearDataset,
  buildDataset,
} from "@/lib/fpa/dataStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the currently-loaded dataset (or null). Trims rows for a light preview.
export async function GET() {
  const ds = await getDataset();
  if (!ds) return NextResponse.json({ dataset: null });
  return NextResponse.json({
    dataset: {
      ...ds,
      rows: ds.rows.slice(0, 100), // preview cap for the client
    },
  });
}

// Uploads a dataset. Accepts multipart/form-data (file) or JSON { name, text }.
export async function POST(req: Request) {
  try {
    let name = "uploaded";
    let text = "";

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      name = file.name || name;
      text = await file.text();
    } else {
      const body = (await req.json()) as { name?: string; text?: string };
      name = body.name || name;
      text = body.text || "";
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const ds = buildDataset(name, text);
    await saveDataset(ds);
    return NextResponse.json({
      ok: true,
      dataset: {
        name: ds.name,
        uploadedAt: ds.uploadedAt,
        columns: ds.columns,
        rowCount: ds.rowCount,
        rows: ds.rows.slice(0, 100),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to parse data" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  await clearDataset();
  return NextResponse.json({ ok: true });
}
