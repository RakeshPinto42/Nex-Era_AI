// NEX Code — Capability Engine. Derives technologies, conventions, skills, a
// technology graph and an architecture summary from the ALREADY-indexed project
// (ProjectInfo + scanned file list). No re-indexing, no re-parsing, no new AI.
// Pure module — imported by the client UI and the server persist route.

import type { ProjectInfo, TreeNode } from "./types";
import type { KnowledgeInput } from "@/lib/knowledge/types";

export type TechGroup =
  | "language" | "frontend" | "backend" | "database" | "infra"
  | "auth" | "testing" | "ai" | "finance" | "document";

type Signature = { name: string; group: TechGroup; deps?: string[]; files?: RegExp; exts?: string[] };

// Detection signatures — matched against deps (substring), file paths, or extensions.
const SIGNATURES: Signature[] = [
  // languages (also inferred from extension frequency)
  { name: "TypeScript", group: "language", exts: ["ts", "tsx"], files: /tsconfig\.json$/ },
  { name: "JavaScript", group: "language", exts: ["js", "jsx", "mjs", "cjs"] },
  { name: "Python", group: "language", exts: ["py"], files: /requirements\.txt$|pyproject\.toml$/ },
  { name: "Go", group: "language", exts: ["go"], files: /go\.mod$/ },
  { name: "Rust", group: "language", exts: ["rs"], files: /Cargo\.toml$/ },
  { name: "Java", group: "language", exts: ["java"], files: /pom\.xml$|build\.gradle$/ },
  { name: "C#", group: "language", exts: ["cs"], files: /\.csproj$/ },
  { name: "PHP", group: "language", exts: ["php"], files: /composer\.json$/ },
  { name: "C++", group: "language", exts: ["cpp", "cc", "hpp"] },
  { name: "Kotlin", group: "language", exts: ["kt"] },
  { name: "Swift", group: "language", exts: ["swift"] },
  { name: "SQL", group: "language", exts: ["sql"] },
  // frontend
  { name: "Next.js", group: "frontend", deps: ["next"] },
  { name: "React", group: "frontend", deps: ["react"] },
  { name: "Vue", group: "frontend", deps: ["vue"] },
  { name: "Angular", group: "frontend", deps: ["@angular/core"] },
  { name: "Svelte", group: "frontend", deps: ["svelte"] },
  { name: "Solid", group: "frontend", deps: ["solid-js"] },
  { name: "Astro", group: "frontend", deps: ["astro"] },
  { name: "TailwindCSS", group: "frontend", deps: ["tailwindcss"] },
  { name: "Material UI", group: "frontend", deps: ["@mui/material"] },
  { name: "shadcn/ui", group: "frontend", files: /components\/ui\// },
  { name: "Chakra", group: "frontend", deps: ["@chakra-ui/react"] },
  { name: "Bootstrap", group: "frontend", deps: ["bootstrap"] },
  // backend
  { name: "Node.js", group: "backend", files: /package\.json$/ },
  { name: "Express", group: "backend", deps: ["express"] },
  { name: "NestJS", group: "backend", deps: ["@nestjs/core"] },
  { name: "FastAPI", group: "backend", deps: ["fastapi"] },
  { name: "Flask", group: "backend", deps: ["flask"] },
  { name: "Django", group: "backend", deps: ["django"] },
  { name: "Spring Boot", group: "backend", deps: ["spring-boot"] },
  { name: "ASP.NET", group: "backend", files: /\.csproj$/ },
  { name: "Laravel", group: "backend", deps: ["laravel/framework"] },
  { name: "Rails", group: "backend", files: /Gemfile$/ },
  { name: "GraphQL", group: "backend", deps: ["graphql", "@apollo/server"] },
  { name: "gRPC", group: "backend", deps: ["@grpc/grpc-js"] },
  // databases
  { name: "PostgreSQL", group: "database", deps: ["pg", "postgres"] },
  { name: "MySQL", group: "database", deps: ["mysql", "mysql2"] },
  { name: "SQLite", group: "database", deps: ["better-sqlite3", "sqlite3"] },
  { name: "MongoDB", group: "database", deps: ["mongoose", "mongodb"] },
  { name: "Redis", group: "database", deps: ["redis", "@upstash/redis", "ioredis"] },
  { name: "Supabase", group: "database", deps: ["@supabase/supabase-js"] },
  { name: "Firebase", group: "database", deps: ["firebase"] },
  { name: "Prisma", group: "database", deps: ["prisma", "@prisma/client"] },
  { name: "Drizzle", group: "database", deps: ["drizzle-orm"] },
  // infra
  { name: "Docker", group: "infra", files: /Dockerfile$/i },
  { name: "Docker Compose", group: "infra", files: /docker-compose\.ya?ml$/ },
  { name: "Kubernetes", group: "infra", files: /\.ya?ml$/ }, // refined below by content rarely; keep heuristic via filename k8s
  { name: "GitHub Actions", group: "infra", files: /\.github\/workflows\// },
  { name: "GitLab CI", group: "infra", files: /\.gitlab-ci\.yml$/ },
  { name: "Terraform", group: "infra", files: /\.tf$/ },
  { name: "Vercel", group: "infra", files: /vercel\.json$|\.vercel\// , deps: ["@vercel/analytics"] },
  { name: "Netlify", group: "infra", files: /netlify\.toml$/ },
  // auth
  { name: "NextAuth", group: "auth", deps: ["next-auth"] },
  { name: "Clerk", group: "auth", deps: ["@clerk/nextjs"] },
  { name: "Firebase Auth", group: "auth", deps: ["firebase"] },
  { name: "Supabase Auth", group: "auth", deps: ["@supabase/supabase-js"] },
  { name: "Auth0", group: "auth", deps: ["@auth0/nextjs-auth0", "auth0"] },
  { name: "JWT", group: "auth", deps: ["jsonwebtoken", "jose"] },
  { name: "OAuth", group: "auth", deps: ["passport", "simple-oauth2"] },
  // testing
  { name: "Vitest", group: "testing", deps: ["vitest"] },
  { name: "Jest", group: "testing", deps: ["jest"] },
  { name: "Playwright", group: "testing", deps: ["@playwright/test", "playwright"] },
  { name: "Cypress", group: "testing", deps: ["cypress"] },
  { name: "Pytest", group: "testing", deps: ["pytest"] },
  { name: "Mocha", group: "testing", deps: ["mocha"] },
  { name: "RSpec", group: "testing", deps: ["rspec"] },
  // ai
  { name: "OpenRouter", group: "ai", deps: ["openrouter"], files: /openrouter/i },
  { name: "Ollama", group: "ai", deps: ["ollama"] },
  { name: "Claude", group: "ai", deps: ["@anthropic-ai/sdk"] },
  { name: "OpenAI", group: "ai", deps: ["openai"] },
  { name: "Gemini", group: "ai", deps: ["@google/generative-ai"] },
  { name: "LangChain", group: "ai", deps: ["langchain"] },
  { name: "LlamaIndex", group: "ai", deps: ["llamaindex"] },
  { name: "MCP", group: "ai", deps: ["@modelcontextprotocol/sdk"], files: /mcp/i },
  // finance
  { name: "Power BI", group: "finance", files: /\.pbix$/i },
  { name: "Excel", group: "finance", files: /\.xlsx?$/i },
  { name: "CSV", group: "finance", files: /\.csv$/i },
  { name: "Commission Engine", group: "finance", files: /commission/i },
  { name: "Pricing Engine", group: "finance", files: /pricing/i },
  { name: "FP&A Models", group: "finance", files: /forecast|budget|variance|fpa/i },
  // documents
  { name: "PDF", group: "document", files: /\.pdf$/i },
  { name: "Word", group: "document", files: /\.docx?$/i },
  { name: "PowerPoint", group: "document", files: /\.pptx?$/i },
  { name: "Markdown", group: "document", exts: ["md"] },
  { name: "JSON", group: "document", exts: ["json"] },
  { name: "YAML", group: "document", exts: ["yml", "yaml"] },
  { name: "XML", group: "document", exts: ["xml"] },
];

export type DetectedTech = { name: string; group: TechGroup; via: "deps" | "files" | "exts"; confidence: number };

export type ProjectConventions = {
  folderStructure: string;
  namingConvention: string;
  importStyle: string;
  formatting: string;
  componentStyle: string;
  apiStyle: string;
  databasePattern: string;
  stateManagement: string;
  architectureStyle: string;
  testingStrategy: string;
  envStructure: string;
};

export type ProjectSkill = { name: string; basis: string; confidence: number };

export type TechGraph = {
  nodes: { id: string; group: TechGroup }[];
  edges: { from: string; to: string; label: string }[];
};

export type RoutingHint = { agent: string; context: string };

export type ProjectCapabilities = {
  projectName: string;
  projectType: string;
  technologies: DetectedTech[];
  byGroup: Record<TechGroup, string[]>;
  conventions: ProjectConventions;
  skills: ProjectSkill[];
  technologyGraph: TechGraph;
  architectureSummary: string;
  routingHints: RoutingHint[];
  confidence: number;
  lastIndexed: string;
};

function dominantNaming(flat: TreeNode[]): string {
  let kebab = 0, camel = 0, pascal = 0;
  for (const f of flat) {
    const base = f.name.replace(/\.[^.]+$/, "");
    if (/[a-z0-9]-[a-z0-9]/.test(base)) kebab++;
    else if (/^[A-Z][a-zA-Z0-9]+$/.test(base)) pascal++;
    else if (/^[a-z][a-zA-Z0-9]+$/.test(base)) camel++;
  }
  const m = Math.max(kebab, camel, pascal);
  if (m === 0) return "mixed";
  return m === pascal ? "PascalCase (components)" : m === kebab ? "kebab-case" : "camelCase";
}

function inferProjectType(p: ProjectInfo, byGroup: Record<TechGroup, string[]>, flat: TreeNode[]): string {
  const has = (g: TechGroup, n: string) => byGroup[g]?.includes(n);
  const names = flat.map((f) => f.path.toLowerCase());
  const any = (re: RegExp) => names.some((n) => re.test(n));
  if (byGroup.finance?.length && (has("frontend", "Next.js") || has("frontend", "React"))) return "Finance Platform";
  if (any(/invest|portfolio|market|ticker/) && (has("frontend", "Next.js") || has("frontend", "React"))) return "Investment Platform";
  if (byGroup.ai?.length && any(/agent|hermes|orchestrat|mcp/)) return "AI Agent Platform";
  if (any(/erp|sap|jde|oracle/)) return "ERP Integration";
  if (has("frontend", "Next.js")) return "Next.js SaaS";
  if (byGroup.backend?.length && !byGroup.frontend?.length) return "API";
  if (p.entryPoints.some((e) => /bin|cli/.test(e))) return "CLI";
  if (!byGroup.frontend?.length && !byGroup.backend?.length) return "Library";
  return "Application";
}

const SKILL_MAP: Record<string, string> = {
  "React": "React Expert", "Next.js": "Next.js Expert", "FastAPI": "FastAPI Expert",
  "TailwindCSS": "Tailwind Expert", "Prisma": "Prisma Expert", "Drizzle": "Drizzle Expert",
  "Docker": "Docker Expert", "Power BI": "Power BI Expert", "Excel": "Excel Expert",
  "MCP": "MCP Expert", "Claude": "AI Agent Expert", "OpenRouter": "AI Agent Expert",
  "GraphQL": "GraphQL Expert", "PostgreSQL": "PostgreSQL Expert", "Vitest": "Testing Expert",
  "Playwright": "E2E Testing Expert", "Vercel": "Vercel Deployment Expert",
};

export function analyzeCapabilities(project: ProjectInfo, flat: TreeNode[]): ProjectCapabilities {
  const deps = new Set(project.dependencies.map((d) => d.toLowerCase()));
  const paths = flat.map((f) => f.path);
  const exts = new Set(flat.map((f) => f.ext).filter(Boolean) as string[]);

  const technologies: DetectedTech[] = [];
  for (const sig of SIGNATURES) {
    let via: DetectedTech["via"] | null = null;
    if (sig.deps?.some((d) => [...deps].some((x) => x.includes(d.toLowerCase())))) via = "deps";
    else if (sig.files && paths.some((p) => sig.files!.test(p))) via = "files";
    else if (sig.exts?.some((e) => exts.has(e))) via = "exts";
    if (via) technologies.push({ name: sig.name, group: sig.group, via, confidence: via === "deps" ? 0.9 : via === "files" ? 0.75 : 0.6 });
  }
  // dedupe by name (keep highest confidence)
  const byName = new Map<string, DetectedTech>();
  for (const t of technologies) {
    const cur = byName.get(t.name);
    if (!cur || t.confidence > cur.confidence) byName.set(t.name, t);
  }
  const techs = [...byName.values()];

  const byGroup = {} as Record<TechGroup, string[]>;
  for (const g of ["language", "frontend", "backend", "database", "infra", "auth", "testing", "ai", "finance", "document"] as TechGroup[]) {
    byGroup[g] = techs.filter((t) => t.group === g).map((t) => t.name);
  }

  const projectType = inferProjectType(project, byGroup, flat);

  const conventions: ProjectConventions = {
    folderStructure: paths.some((p) => p.startsWith("app/")) ? "Next.js App Router (app/)" : paths.some((p) => p.startsWith("src/")) ? "src/ layout" : paths.some((p) => p.startsWith("packages/")) ? "monorepo (packages/)" : "flat",
    namingConvention: dominantNaming(flat),
    importStyle: project.configFiles.some((c) => /tsconfig/.test(c)) ? "path alias (@/) likely" : "relative imports",
    formatting: project.configFiles.some((c) => /prettier/i.test(c)) ? "Prettier" : project.configFiles.some((c) => /eslint/i.test(c)) ? "ESLint" : "not detected",
    componentStyle: byGroup.frontend.includes("React") ? "function components" + (byGroup.frontend.includes("TailwindCSS") ? " + Tailwind" : "") : "n/a",
    apiStyle: paths.some((p) => /app\/api\/.*route\.(t|j)s$/.test(p)) ? "Next.js route handlers" : byGroup.backend.includes("GraphQL") ? "GraphQL" : byGroup.backend.length ? "REST" : "n/a",
    databasePattern: byGroup.database.includes("Prisma") ? "Prisma ORM" : byGroup.database.includes("Drizzle") ? "Drizzle ORM" : project.detectedDatabase ?? "not detected",
    stateManagement: [...deps].some((d) => d.includes("zustand")) ? "Zustand" : [...deps].some((d) => d.includes("redux")) ? "Redux" : [...deps].some((d) => d.includes("jotai")) ? "Jotai" : "React state / context",
    architectureStyle: paths.some((p) => p.startsWith("packages/")) ? "monorepo" : byGroup.frontend.includes("Next.js") ? "modular feature-based (Next App Router)" : "layered",
    testingStrategy: byGroup.testing.length ? byGroup.testing.join(", ") : "no tests detected",
    envStructure: project.envFiles.length ? `${project.envFiles.length} env file(s)` : "no .env files",
  };

  const skills: ProjectSkill[] = [];
  const seenSkill = new Set<string>();
  for (const t of techs) {
    const skill = SKILL_MAP[t.name];
    if (skill && !seenSkill.has(skill)) { seenSkill.add(skill); skills.push({ name: skill, basis: t.name, confidence: t.confidence }); }
  }
  if (byGroup.finance.length && !seenSkill.has("Finance Expert")) skills.push({ name: "Finance Expert", basis: byGroup.finance.join(", "), confidence: 0.7 });
  if (projectType === "Investment Platform") skills.push({ name: "Investment Expert", basis: projectType, confidence: 0.7 });

  const nodes: TechGraph["nodes"] = techs.map((t) => ({ id: t.name, group: t.group }));
  const edges: TechGraph["edges"] = [];
  const add = (from: string, to: string, label: string) => { if (byName.has(from) && byName.has(to)) edges.push({ from, to, label }); };
  add("Next.js", "React", "built on");
  add("Prisma", "PostgreSQL", "connects");
  add("Drizzle", "PostgreSQL", "connects");
  add("NextAuth", "Next.js", "secures");
  add("TailwindCSS", "React", "styles");

  const architectureSummary = `${projectType} — ${project.framework} (${project.language}). ${conventions.architectureStyle}; ${conventions.apiStyle}; data via ${conventions.databasePattern}; ${conventions.testingStrategy}. ${techs.length} technologies detected across ${Object.values(byGroup).filter((g) => g.length).length} groups.`;

  const routingHints = routingHintsFor(projectType, byGroup);
  const confidence = Math.min(0.95, 0.4 + techs.length * 0.03);

  return {
    projectName: project.name, projectType, technologies: techs, byGroup, conventions,
    skills, technologyGraph: { nodes, edges }, architectureSummary, routingHints,
    confidence: +confidence.toFixed(2), lastIndexed: new Date().toISOString(),
  };
}

/** Map detected capabilities → Hermes routing hints (which agent gets what context). */
export function routingHintsFor(projectType: string, byGroup: Record<TechGroup, string[]>): RoutingHint[] {
  const hints: RoutingHint[] = [];
  if (byGroup.frontend?.length || byGroup.backend?.length) hints.push({ agent: "coding", context: `${byGroup.frontend.concat(byGroup.backend).join(", ")} project` });
  if (byGroup.finance?.length || projectType === "Finance Platform") hints.push({ agent: "finance", context: "FP&A / finance platform context" });
  if (projectType === "Investment Platform") hints.push({ agent: "market", context: "market / investment context" });
  if (byGroup.ai?.length) hints.push({ agent: "hermes", context: `AI stack: ${byGroup.ai.join(", ")}` });
  return hints;
}

/** Build the reusable Knowledge Objects (stored via the Knowledge Layer). */
export function toKnowledgeObjects(caps: ProjectCapabilities): KnowledgeInput[] {
  const base = `project:${caps.projectName}`;
  const tags = caps.technologies.slice(0, 12).map((t) => t.name);
  return [
    {
      id: `${base}:capabilities`, type: "project", title: `Project Capabilities — ${caps.projectName}`,
      summary: `${caps.projectType}: ${caps.technologies.length} technologies. ${caps.architectureSummary}`,
      tags, confidence: caps.confidence, owner: "file",
      event: { kind: "capabilities_indexed", detail: `${caps.technologies.length} technologies, type ${caps.projectType}` },
    },
    {
      id: `${base}:conventions`, type: "project", title: `Project Conventions — ${caps.projectName}`,
      summary: `Structure: ${caps.conventions.folderStructure}; naming: ${caps.conventions.namingConvention}; API: ${caps.conventions.apiStyle}; DB: ${caps.conventions.databasePattern}; tests: ${caps.conventions.testingStrategy}.`,
      tags: ["conventions"], confidence: caps.confidence, owner: "file",
      event: { kind: "conventions_indexed", detail: caps.conventions.architectureStyle },
    },
    {
      id: `${base}:skills`, type: "project", title: `Project Skills — ${caps.projectName}`,
      summary: caps.skills.map((s) => s.name).join(", ") || "none inferred",
      tags: caps.skills.map((s) => s.name), confidence: caps.confidence, owner: "file",
      event: { kind: "skills_inferred", detail: `${caps.skills.length} skills` },
    },
    {
      id: `${base}:techgraph`, type: "project", title: `Technology Graph — ${caps.projectName}`,
      summary: `${caps.technologyGraph.nodes.length} nodes, ${caps.technologyGraph.edges.length} edges.`,
      tags, confidence: caps.confidence, owner: "file",
      event: { kind: "techgraph_built", detail: `${caps.technologyGraph.nodes.length} technologies` },
    },
    {
      id: `${base}:architecture`, type: "project", title: `Architecture Summary — ${caps.projectName}`,
      summary: caps.architectureSummary,
      tags: [caps.projectType], confidence: caps.confidence, owner: "file",
      event: { kind: "architecture_summarized", detail: caps.projectType },
    },
  ];
}
