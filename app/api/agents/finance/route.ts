import { analyzeFinance } from "@/lib/agents/finance-agent/analyze";
import { validateUploadFiles } from "@/lib/upload/validate";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Finance Agent — FP&A reasoning over uploaded financial files. Same multipart
// upload contract as /api/extract. Reuses extraction + AI Router. High-level
// analysis only; no calculations/forecasting/ledger.
export const POST = (req: Request) => withGuard(req, "finance", () => handlePOST(req));

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
    const insights = await analyzeFinance(files);
    return Response.json({ insights });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
