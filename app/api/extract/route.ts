import { extractFile } from "@/lib/llm/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepts multipart/form-data with one or more `file` fields; returns extracted
// plain text per file so the client can fold it into a chat or code payload.
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json({ error: "No files uploaded" }, { status: 400 });
  }

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const { kind, text, truncated } = await extractFile(file);
        return { name: file.name, kind, chars: text.length, truncated, text };
      } catch (err) {
        return { name: file.name, kind: "error", chars: 0, truncated: false, text: "", error: (err as Error).message };
      }
    }),
  );

  return Response.json({ files: results });
}
