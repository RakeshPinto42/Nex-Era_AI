import { describe, it, expect, afterAll } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { CalcOrchestrator, ExecutionGraph, buildStubPipeline } from "@/lib/finance-os/commission/studio/engine";
import { CASES } from "./golden-tests/cases";

const GOLDEN = path.join(process.cwd(), "test", "golden-tests", "expected.json");
const update = process.env.GOLDEN_UPDATE === "1";

type Golden = Record<string, unknown>;
const expected: Golden = existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, "utf8")) : {};
let changed = false;

const engine = () => new CalcOrchestrator(new ExecutionGraph(buildStubPipeline()));

describe("golden tests — payout regression / backward-compatibility guard", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const r = engine().run({ period: c.period, planVersionIds: c.planVersionIds, data: c.data });
      const actual = {
        runId: r.run.id,
        status: r.run.status,
        inputHash: r.manifest.inputHash,
        resultHash: r.manifest.resultHash,
        stageDigests: r.manifest.stageDigests,
        exceptions: r.exceptions.length,
        working: r.working, // captures payout structures once real stages land
      };
      if (update || expected[c.name] === undefined) {
        expected[c.name] = JSON.parse(JSON.stringify(actual));
        changed = true; // bootstrap / re-bless
      } else {
        expect(actual).toEqual(expected[c.name]);
      }
    });
  }
});

afterAll(() => {
  if (changed) {
    mkdirSync(path.dirname(GOLDEN), { recursive: true });
    writeFileSync(GOLDEN, JSON.stringify(expected, null, 2) + "\n");
  }
});
