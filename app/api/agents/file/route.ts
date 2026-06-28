import { analyzeBatch } from "@/lib/agents/file-agent/analyze";
import { validateUploadFiles } from "@/lib/upload/validate";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// File Agent — read-only understanding. Accepts multipart/form-data `file`
// fields (same upload contract as /api/extract), returns structural context.
// No editing, no business reasoning.
export const POST = (req: Request) => withGuard(req, "upload", () => handlePOST(req));

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

  try {
    const context = await analyzeBatch(files);
    return Response.json({ context });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
