import { extractFile } from "@/lib/llm/extract";
import { validateUploadFiles } from "@/lib/upload/validate";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (req: Request) => withGuard(req, "upload", () => handlePOST(req));

// Accepts multipart/form-data with one or more `file` fields; returns extracted
// plain text per file so the client can fold it into a chat or code payload.
async function handlePOST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  const check = validateUploadFiles(files);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status });

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
