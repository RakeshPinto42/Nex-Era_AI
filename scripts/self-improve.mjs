#!/usr/bin/env node
/**
 * NEXERA Self-Improve Runner — the real autonomous loop.
 * ----------------------------------------------------------------------------
 * For each target in self-improve.config.json: gather the relevant repo files,
 * ask an OPEN-SOURCE model (via OpenRouter) for a concrete patch using the same
 * coding-agent contract the app uses, apply it to a fresh branch, commit, push,
 * and open a Pull Request. PR-GATED: nothing merges to your default branch
 * without your approval. Low-risk cosmetic changes MAY auto-merge only when you
 * explicitly opt in (EVOLUTION_AUTOMERGE=1); auth/security/trading/env/deps
 * NEVER auto-merge.
 *
 * Safety:
 *   - DRY RUN BY DEFAULT. No git push / PR unless EVOLUTION_LIVE=1.
 *   - Runs in a GitHub Action (token + OPENROUTER_API_KEY as repo secrets) or
 *     locally. Never bundled into the Next.js app.
 *
 * Env:
 *   OPENROUTER_API_KEY   required (open-source model access)
 *   EVOLUTION_LIVE=1     actually branch/commit/push/PR (else dry run)
 *   EVOLUTION_AUTOMERGE=1  allow auto-merge of LOW-risk PRs (default off)
 *   SELF_IMPROVE_MODEL   override model id
 *   GH_TOKEN / GITHUB_TOKEN  used by `gh` for PR creation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const ROOT = process.cwd();
const LIVE = process.env.EVOLUTION_LIVE === "1";
const AUTOMERGE = process.env.EVOLUTION_AUTOMERGE === "1";
const CONFIG = JSON.parse(readFileSync(join(ROOT, "scripts/self-improve.config.json"), "utf8"));
const MODEL = process.env.SELF_IMPROVE_MODEL || CONFIG.model || "qwen/qwen3-coder:free";
const MODEL_CHAIN = [MODEL, ...(CONFIG.modelFallbacks || [])];
const CONTEXT_BUDGET = 90_000;

// Areas that must NEVER auto-merge — mirrors lib/evolution/policy.ts.
const HIGH_RISK_RE = /(^|\/)(middleware|instrumentation)\.ts$|\/auth\/|\/security\/|\.env|package(-lock)?\.json|\/trading\/|\/broker\/|\/api\/auth\//i;
const LOW_RISK_RE = /\.(md|mdx|css)$|\/(docs|components)\//i;

const log = (...a) => console.log("[self-improve]", ...a);
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();

const CODE_SYSTEM = `You are NEXERA Coder, an autonomous coding agent working INSIDE a user's Next.js + TypeScript project (like Claude Code). You read existing files and create or edit files.

Respond with ONE JSON object and nothing else — no prose, no markdown fences. Schema:
{ "summary": "one sentence", "files": [ { "path": "relative/path.ext", "action": "create"|"edit", "content": "FULL new file content" } ], "deleted": [], "notes": "" }

Rules:
- Paths relative to project root, forward slashes, never absolute or "..".
- "content" is the COMPLETE file, not a diff.
- Only include files you actually change. Keep edits minimal and consistent with existing style.
- Never touch node_modules, .git, lockfiles, package.json, auth, security, middleware, or env files.
- Output valid JSON. Escape newlines in "content" as \\n.`;

function extractJson(text) {
  let body = text.trim();
  if (body.startsWith("```")) {
    const m = body.match(/```(?:json)?\s*([\s\S]*?)```\s*$/);
    if (m) body = m[1];
  }
  const start = body.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; }
    else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { if (--depth === 0) return body.slice(start, i + 1); }
  }
  return null;
}

function gatherFiles(globs, cap) {
  const seen = new Set();
  const files = [];
  let used = 0;
  for (const g of globs) {
    let matches = [];
    try { matches = globSync(g, { cwd: ROOT, nodir: true }); } catch { /* node <22 fallback below */ }
    for (const rel of matches) {
      if (seen.has(rel) || files.length >= cap) continue;
      seen.add(rel);
      try {
        const content = readFileSync(join(ROOT, rel), "utf8");
        if (used + content.length > CONTEXT_BUDGET) continue;
        used += content.length;
        files.push({ path: rel.replaceAll("\\", "/"), content });
      } catch { /* skip */ }
    }
  }
  return files;
}

async function planFor(target) {
  const files = gatherFiles(target.globs, CONFIG.maxFilesPerTarget || 18);
  const ctx = files.length
    ? files.map((f) => `\n--- ${f.path} ---\n${f.content.slice(0, CONTEXT_BUDGET)}`).join("\n")
    : "These files do not exist yet — scaffold them.";
  const userMsg = `${ctx}\n\n========\nTASK: ${target.instruction}`;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastErr = "";
  for (const model of MODEL_CHAIN) {
    // Free pool 429s often (shared quota). Retry the same model a couple times
    // with backoff before falling through to the next model in the chain.
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: CODE_SYSTEM }, { role: "user", content: userMsg }],
          max_tokens: 16000,
          temperature: 0.3,
        }),
      });
      if (res.status === 429) { lastErr = `${model} → 429 (rate limited)`; await sleep(4000 * (attempt + 1)); continue; }
      if (!res.ok) { lastErr = `${model} → ${res.status}: ${(await res.text()).slice(0, 120)}`; break; }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const json = extractJson(text);
      if (!json) { lastErr = `${model} → no JSON plan`; break; }
      log(`  model: ${model}`);
      return { plan: JSON.parse(json), model };
    }
  }
  throw new Error(`all free models failed: ${lastErr}`);
}

function safePath(p) {
  return typeof p === "string" && p.length > 0 && !p.startsWith("/") && !p.includes("..") && !/^[a-zA-Z]:/.test(p);
}

function riskOf(paths) {
  if (paths.some((p) => HIGH_RISK_RE.test(p))) return "high";
  if (paths.every((p) => LOW_RISK_RE.test(p))) return "low";
  return "medium";
}

function applyPlan(plan) {
  const written = [];
  for (const f of plan.files ?? []) {
    if (!safePath(f.path) || typeof f.content !== "string") continue;
    if (HIGH_RISK_RE.test(f.path)) { log("REFUSED high-risk path:", f.path); continue; }
    const abs = join(ROOT, f.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, f.content);
    written.push(f.path);
  }
  for (const d of plan.deleted ?? []) {
    if (safePath(d) && !HIGH_RISK_RE.test(d) && existsSync(join(ROOT, d))) {
      rmSync(join(ROOT, d)); written.push(`deleted ${d}`);
    }
  }
  return written;
}

async function runTarget(target) {
  log(`▶ ${target.agent}: ${target.title}`);
  const { plan, model } = await planFor(target);
  const paths = [...(plan.files ?? []).map((f) => f.path), ...(plan.deleted ?? [])];
  if (!paths.length) { log("  no changes proposed — skipping"); return null; }
  const risk = riskOf(paths);
  log(`  plan: ${plan.summary || "(no summary)"} — ${paths.length} file(s), risk=${risk}`);

  if (!LIVE) {
    log("  DRY RUN — not writing/pushing. Files that WOULD change:", paths.join(", "));
    return { agent: target.agent, model, risk, paths, summary: plan.summary, dryRun: true };
  }

  const branch = `evolve/${target.agent}-${Date.now().toString(36)}`;
  sh("git", ["checkout", "-b", branch]);
  const written = applyPlan(plan);
  if (!written.length) { log("  nothing applied"); sh("git", ["checkout", "-"]); return null; }

  // verify it still typechecks before opening a PR
  try { sh("npx", ["tsc", "--noEmit"], { stdio: "ignore" }); }
  catch { log("  ✗ typecheck failed — discarding branch"); sh("git", ["checkout", "."]); sh("git", ["checkout", "-"]); sh("git", ["branch", "-D", branch]); return null; }

  sh("git", ["add", "-A"]);
  sh("git", ["commit", "-m", `evolve(${target.agent}): ${plan.summary || target.title}\n\nAutonomous improvement by ${target.agent}. Risk: ${risk}.\nReview before merge.\n\nCo-Authored-By: NEXERA Evolution <evolution@nexera.local>`]);
  sh("git", ["push", "-u", "origin", branch]);

  const body = `**Autonomous improvement** by \`${target.agent}\`\n\n${plan.summary || target.title}\n\n**Risk:** ${risk}\n**Files:** ${paths.map((p) => `\`${p}\``).join(", ")}\n\n${plan.notes || ""}\n\n— Opened by the NEXERA self-improve loop. Typecheck passed. **Admin approval required to merge.**`;
  const prUrl = sh("gh", ["pr", "create", "--title", `evolve(${target.agent}): ${plan.summary || target.title}`, "--body", body, "--label", "evolution", "--base", baseBranch()]);
  log("  ✓ PR:", prUrl);

  if (risk === "low" && AUTOMERGE) { try { sh("gh", ["pr", "merge", "--auto", "--squash"]); log("  ⏩ low-risk auto-merge queued"); } catch (e) { log("  auto-merge skipped:", e.message); } }

  sh("git", ["checkout", "-"]);
  return { agent: target.agent, model, risk, paths, summary: plan.summary, pr: prUrl };
}

// Append a human-readable line to scripts/evolution-log.md and (best-effort)
// report the run to the live site so the website log updates.
async function recordRun(r) {
  const line = `- **${new Date().toISOString()}** · \`${r.agent}\` · model \`${r.model}\` · risk **${r.risk}** · ${r.dryRun ? "DRY-RUN" : (r.pr ? `[PR](${r.pr})` : "applied")} — ${r.summary || "(no summary)"} _(${r.paths.length} file(s): ${r.paths.join(", ")})_\n`;
  try {
    const logPath = join(ROOT, "scripts/evolution-log.md");
    const prev = existsSync(logPath)
      ? readFileSync(logPath, "utf8")
      : "# NEXERA Evolution Log\n\nAutonomous improvements built by free open-source models. Newest at bottom.\n\n";
    writeFileSync(logPath, prev + line);
  } catch (e) { log("  log write failed:", e.message); }

  const url = process.env.EVOLUTION_LOG_URL;
  if (url && process.env.CRON_SECRET) {
    try {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({ agent: r.agent, model: r.model, summary: r.summary, risk: r.risk, files: r.paths, pr: r.pr, dryRun: r.dryRun }) });
    } catch (e) { log("  log POST failed:", e.message); }
  }
}

function baseBranch() {
  try { return sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]); } catch { return "main"; }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) { console.error("OPENROUTER_API_KEY required"); process.exit(1); }
  log(`mode=${LIVE ? "LIVE" : "DRY-RUN"} automerge=${AUTOMERGE ? "on" : "off"} model=${MODEL}`);
  const results = [];
  for (const target of CONFIG.targets) {
    try { const r = await runTarget(target); if (r) { results.push(r); await recordRun(r); } }
    catch (e) { log(`  ✗ ${target.agent} failed:`, e.message); }
  }
  log(`done — ${results.length} change set(s)`);
  writeFileSync(join(ROOT, "scripts/.last-run.json"), JSON.stringify({ at: new Date().toISOString(), live: LIVE, results }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
