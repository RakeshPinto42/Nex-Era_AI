import { sessionFromRequest } from "@/lib/auth/session";
import { runCycle, processProposal, getReport, getDeployments } from "@/lib/evolution/director";
import { listModels, registerModel, recordBenchmark, BENCHMARK_CATEGORIES } from "@/lib/evolution/models";
import type { BenchmarkCategory } from "@/lib/evolution/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read the Evolution dashboard. Runs an initial cycle if none exists yet.
export async function GET() {
  const report = getReport() ?? runCycle();
  return Response.json({ report, deployments: getDeployments(), models: listModels(), categories: BENCHMARK_CATEGORIES });
}

// Mutations — admin only (the Director is an authorized, observable workflow).
export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (session?.r !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { action?: string; id?: string; provider?: string; category?: string; score?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "run":
        return Response.json({ ok: true, report: runCycle() });
      case "process":
        if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
        return Response.json({ ok: true, deployment: processProposal(body.id) });
      case "register-model":
        if (!body.id || !body.provider) return Response.json({ error: "id + provider required" }, { status: 400 });
        return Response.json({ ok: true, model: registerModel(body.id, body.provider) });
      case "benchmark":
        if (!body.id || !body.provider || !BENCHMARK_CATEGORIES.includes(body.category as BenchmarkCategory) || typeof body.score !== "number") {
          return Response.json({ error: "id, provider, valid category, numeric score required" }, { status: 400 });
        }
        recordBenchmark(body.id, body.provider, body.category as BenchmarkCategory, body.score);
        return Response.json({ ok: true });
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
