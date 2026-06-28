"use client";

import * as React from "react";
import "@/components/ds/tokens.css";
import {
  NexButton,
  NexCard,
  NexCardHeader,
  NexCardTitle,
  NexCardDescription,
  NexCardBody,
  NexCardFooter,
  NexInput,
  NexTextarea,
  NexSelect,
  NexField,
  NexSwitch,
  NexBadge,
  NexStatusDot,
  NexTag,
  NexProgress,
  NexRing,
  NexSteps,
  NexSpinner,
  NexOrbit,
  NexDots,
  NexSkeleton,
  NexModal,
  NexDialog,
  NexDropdown,
  NexSidebar,
  NexNavbar,
  NexTabs,
  NexTable,
  NexAreaChart,
  NexBarChart,
  NexDonut,
  NexAIResponseCard,
  NexAIAction,
  nexColors,
  type NexColumn,
} from "@/components/ds";

/* ------------------------------------------------------------------ *
 * Living style guide. Renders every primitive so the design language
 * can be reviewed in one place. This is a reference gallery — it does
 * NOT touch or replace any product page.
 * ------------------------------------------------------------------ */

const area = [
  { t: "Mon", build: 30, learn: 18 },
  { t: "Tue", build: 45, learn: 28 },
  { t: "Wed", build: 38, learn: 40 },
  { t: "Thu", build: 62, learn: 35 },
  { t: "Fri", build: 75, learn: 52 },
  { t: "Sat", build: 58, learn: 60 },
  { t: "Sun", build: 90, learn: 48 },
];
const donut = [
  { name: "Build", value: 38 },
  { name: "Research", value: 26 },
  { name: "Create", value: 20 },
  { name: "Automate", value: 16 },
];

type Agent = { name: string; task: string; status: string; load: number };
const agentRows: Agent[] = [
  { name: "Orion", task: "Code synthesis", status: "online", load: 72 },
  { name: "Vega", task: "Market research", status: "busy", load: 91 },
  { name: "Lyra", task: "Image render", status: "idle", load: 12 },
];
const agentCols: NexColumn<Agent>[] = [
  { key: "name", header: "Agent", render: (r) => <span className="font-medium text-[var(--nex-text)]">{r.name}</span> },
  { key: "task", header: "Task" },
  { key: "status", header: "Status", render: (r) => <NexStatusDot status={r.status as any} /> },
  { key: "load", header: "Load", align: "right", render: (r) => `${r.load}%` },
];

function Section({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        {kicker && <div className="mb-1 text-[var(--nex-text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--nex-accent)]">{kicker}</div>}
        <h2 className="nex-display text-[var(--nex-text-3xl)] font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [modal, setModal] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [tab, setTab] = React.useState("overview");
  const [nav, setNav] = React.useState("build");
  const [sw, setSw] = React.useState(true);

  return (
    <div className="nex nex-canvas min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <NexNavbar
          brand={<span className="nex-text-gradient nex-display text-[var(--nex-text-lg)]">NEX·ERA</span>}
          links={[
            { label: "Overview", active: true },
            { label: "Components" },
            { label: "Motion" },
          ]}
          actions={<NexButton size="sm" variant="primary">Launch OS</NexButton>}
        />

        <header className="py-16 text-center">
          <NexBadge tone="purple" dot className="mx-auto mb-5">
            Design Language v1
          </NexBadge>
          <h1 className="nex-display text-[var(--nex-text-6xl)] leading-none">
            <span className="nex-text-gradient">The AI Operating System</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[var(--nex-text-lg)] text-[var(--nex-text-muted)]">
            A premium, warm, friendly language. Cream surfaces, soft floating shadows, orange energy, cinematic motion. Build, learn, invest, research, create — together with AI.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <NexButton variant="primary" size="lg">Get Started</NexButton>
            <NexButton variant="glass" size="lg">Documentation</NexButton>
          </div>
        </header>

        {/* Colors */}
        <Section kicker="Foundation" title="Color · Warm Palette">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { n: "Orange", c: "#f2761c" },
              { n: "Coral", c: "#fb8c6a" },
              { n: "Warm White", c: "#fbf8f4" },
              { n: "Ink", c: "#2b2118" },
            ].map((s) => (
              <NexCard key={s.n} pad="none" className="overflow-hidden">
                <div className="h-24" style={{ background: s.c, boxShadow: `inset 0 0 60px -10px ${s.c}` }} />
                <div className="p-4">
                  <div className="text-[var(--nex-text-sm)] font-medium">{s.n}</div>
                  <div className="font-mono text-[var(--nex-text-xs)] text-[var(--nex-text-faint)]">{s.c}</div>
                </div>
              </NexCard>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section kicker="Atoms" title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <NexButton variant="primary">Primary</NexButton>
            <NexButton variant="glass">Glass</NexButton>
            <NexButton variant="outline">Outline</NexButton>
            <NexButton variant="ghost">Ghost</NexButton>
            <NexButton variant="danger">Danger</NexButton>
            <NexButton variant="primary" loading>Working</NexButton>
            <NexButton variant="glass" size="sm">Small</NexButton>
            <NexButton variant="glass" size="lg">Large</NexButton>
          </div>
        </Section>

        {/* Cards */}
        <Section kicker="Surfaces" title="Floating Cards">
          <div className="grid gap-5 md:grid-cols-3">
            <NexCard glow="purple" float>
              <NexCardHeader>
                <NexCardTitle>Glass · Floating</NexCardTitle>
              </NexCardHeader>
              <NexCardDescription>Translucent panel with idle levitation and a soft purple bloom.</NexCardDescription>
              <NexCardFooter>
                <NexButton size="sm" variant="glass">Open</NexButton>
              </NexCardFooter>
            </NexCard>
            <NexCard variant="ring" glow="cyan" interactive>
              <NexCardTitle>Ring · Interactive</NexCardTitle>
              <NexCardBody className="mt-2">Animated gradient hairline. Hover lifts + glows.</NexCardBody>
            </NexCard>
            <NexCard variant="solid">
              <NexCardTitle>Solid</NexCardTitle>
              <NexCardBody className="mt-2">Opaque raised surface for dense data.</NexCardBody>
            </NexCard>
          </div>
        </Section>

        {/* Inputs */}
        <Section kicker="Atoms" title="Inputs & Controls">
          <div className="grid gap-5 md:grid-cols-2">
            <NexCard>
              <div className="flex flex-col gap-4">
                <NexField label="Prompt" hint="What should the OS build?">
                  <NexInput placeholder="Design a trading dashboard…" />
                </NexField>
                <NexField label="Model">
                  <NexSelect defaultValue="opus">
                    <option value="opus">Claude Opus 4.8</option>
                    <option value="sonnet">Claude Sonnet 4.6</option>
                  </NexSelect>
                </NexField>
                <NexField label="Notes" error="This field is required">
                  <NexTextarea placeholder="Context…" invalid />
                </NexField>
                <label className="flex items-center gap-3 text-[var(--nex-text-sm)] text-[var(--nex-text-muted)]">
                  <NexSwitch checked={sw} onChange={setSw} label="Autonomous mode" />
                  Autonomous mode
                </label>
              </div>
            </NexCard>
            <NexCard>
              <NexCardTitle>Status & Tags</NexCardTitle>
              <div className="mt-4 flex flex-wrap gap-2">
                <NexBadge tone="purple" dot>Reasoning</NexBadge>
                <NexBadge tone="blue" dot>Coding</NexBadge>
                <NexBadge tone="cyan" dot>General</NexBadge>
                <NexBadge tone="success">Live</NexBadge>
                <NexBadge tone="warning">Beta</NexBadge>
                <NexBadge tone="danger">Error</NexBadge>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <NexStatusDot status="online" />
                <NexStatusDot status="busy" />
                <NexStatusDot status="offline" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <NexTag onRemove={() => {}}>vision</NexTag>
                <NexTag onRemove={() => {}}>finance</NexTag>
                <NexTag>automation</NexTag>
              </div>
            </NexCard>
          </div>
        </Section>

        {/* Tabs + Dropdown + Overlays */}
        <Section kicker="Navigation" title="Tabs, Menus & Overlays">
          <div className="flex flex-wrap items-center gap-4">
            <NexTabs tabs={[{ id: "overview", label: "Overview" }, { id: "agents", label: "Agents" }, { id: "logs", label: "Logs" }]} value={tab} onChange={setTab} />
            <NexDropdown
              trigger={<NexButton variant="glass">Menu ▾</NexButton>}
              items={[
                { label: "New workspace", onSelect: () => {} },
                { label: "Invite", onSelect: () => {} },
                { divider: true, label: "" },
                { label: "Delete", danger: true, onSelect: () => {} },
              ]}
            />
            <NexButton variant="outline" onClick={() => setModal(true)}>Open Modal</NexButton>
            <NexButton variant="danger" onClick={() => setDialog(true)}>Confirm Dialog</NexButton>
          </div>
        </Section>

        {/* Sidebar */}
        <Section kicker="Shell" title="Sidebar Rail">
          <div className="h-[420px]">
            <NexSidebar
              header={<span className="nex-text-gradient nex-display text-[var(--nex-text-lg)]">NEX·ERA</span>}
              groups={[
                {
                  label: "Workspace",
                  items: [
                    { id: "build", label: "Build", icon: <Dot /> },
                    { id: "learn", label: "Learn", icon: <Dot /> },
                    { id: "invest", label: "Invest", icon: <Dot />, badge: <NexBadge size="sm" tone="cyan">3</NexBadge> },
                    { id: "research", label: "Research", icon: <Dot /> },
                  ],
                },
                { label: "System", items: [{ id: "settings", label: "Settings", icon: <Dot /> }] },
              ]}
              activeId={nav}
              onSelect={setNav}
              footer={<NexStatusDot status="online" label="All systems go" />}
            />
          </div>
        </Section>

        {/* Charts */}
        <Section kicker="Data" title="Charts">
          <div className="grid gap-5 lg:grid-cols-3">
            <NexCard className="lg:col-span-2">
              <NexCardTitle>Activity</NexCardTitle>
              <div className="mt-4">
                <NexAreaChart data={area} xKey="t" series={["build", "learn"]} />
              </div>
            </NexCard>
            <NexCard>
              <NexCardTitle>Allocation</NexCardTitle>
              <div className="mt-4">
                <NexDonut data={donut} nameKey="name" valueKey="value" />
              </div>
            </NexCard>
            <NexCard className="lg:col-span-3">
              <NexCardTitle>Throughput</NexCardTitle>
              <div className="mt-4">
                <NexBarChart data={area} xKey="t" series={["build", "learn"]} />
              </div>
            </NexCard>
          </div>
        </Section>

        {/* Table */}
        <Section kicker="Data" title="Tables">
          <NexTable columns={agentCols} rows={agentRows} getRowId={(r) => r.name} onRowClick={() => {}} />
        </Section>

        {/* Progress + Loaders */}
        <Section kicker="Feedback" title="Progress & Loading">
          <div className="grid gap-5 md:grid-cols-2">
            <NexCard className="flex flex-col gap-5">
              <NexProgress label="Indexing" value={68} showValue />
              <NexProgress label="Streaming" indeterminate />
              <NexSteps steps={["Connect", "Configure", "Deploy"]} current={1} />
            </NexCard>
            <NexCard className="flex items-center justify-around gap-6">
              <NexRing value={74} />
              <NexOrbit />
              <div className="flex flex-col items-center gap-4">
                <NexSpinner size={28} />
                <NexDots />
              </div>
            </NexCard>
            <NexCard className="md:col-span-2 flex flex-col gap-3">
              <NexSkeleton className="h-4 w-2/3" />
              <NexSkeleton className="h-4 w-1/2" />
              <NexSkeleton className="h-24 w-full" />
            </NexCard>
          </div>
        </Section>

        {/* AI Response */}
        <Section kicker="Signature" title="AI Response Cards">
          <div className="grid gap-5 md:grid-cols-2">
            <NexAIResponseCard
              model="Nex-Era · Orion"
              intent="reasoning"
              meta="1.2s · 482 tokens · routed → reasoning"
              actions={
                <>
                  <NexAIAction label="Copy"><IconCopy /></NexAIAction>
                  <NexAIAction label="Regenerate"><IconRefresh /></NexAIAction>
                  <NexAIAction label="Like"><IconUp /></NexAIAction>
                </>
              }
            >
              <p>Here&apos;s a strategy to model the portfolio: diversify across the neon triad of asset classes, then let the autonomous agents rebalance on volatility signals.</p>
            </NexAIResponseCard>

            <NexAIResponseCard model="Nex-Era · Vega" intent="coding" streaming>
              <p>Scaffolding the trading dashboard component tree</p>
            </NexAIResponseCard>
          </div>
        </Section>

        <footer className="border-t border-[var(--nex-border)] py-10 text-center text-[var(--nex-text-faint)]">
          Nex-Era Design System · cosmic glass language · v1
        </footer>
      </div>

      <NexModal
        open={modal}
        onClose={() => setModal(false)}
        title="Create Workspace"
        description="Spin up an isolated AI environment."
        footer={
          <>
            <NexButton variant="ghost" onClick={() => setModal(false)}>Cancel</NexButton>
            <NexButton variant="primary" onClick={() => setModal(false)}>Create</NexButton>
          </>
        }
      >
        <NexField label="Name">
          <NexInput placeholder="Apollo Lab" />
        </NexField>
      </NexModal>

      <NexDialog
        open={dialog}
        onClose={() => setDialog(false)}
        onConfirm={() => setDialog(false)}
        title="Delete workspace?"
        description="This permanently removes the environment and all its agents."
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}

/* tiny inline icons (placeholder glyphs for the gallery) */
function Dot() {
  return <span className="block h-2 w-2 rounded-full bg-current" />;
}
function IconCopy() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
}
function IconRefresh() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>;
}
function IconUp() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>;
}
