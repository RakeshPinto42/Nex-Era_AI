"use client";

import { useState } from "react";
import PageShell, { GridReveal, Reveal } from "@/components/dashboard/PageShell";
import Link from "next/link";
import { useDashboard, modelKey } from "@/components/dashboard/store";

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
        on ? "bg-navy" : "bg-black/15"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="rounded-2xl border border-black/10 bg-black/[0.03] p-5">
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </Reveal>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-black/85">{label}</p>
        {desc && <p className="text-xs text-black/40">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { availableModels, activeModel, setActiveModel, modelsLoaded } =
    useDashboard();
  const [stream, setStream] = useState(true);
  const [glass, setGlass] = useState(true);
  const [telemetry, setTelemetry] = useState(false);
  const [autoRoute, setAutoRoute] = useState(true);

  return (
    <PageShell title="Settings" subtitle="Workspace, models and appearance.">
      <GridReveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section title="Profile">
            <Row label="Name">
              <input
                defaultValue="Rakesh Pinto"
                className="w-48 rounded-lg border border-black/10 bg-black/[0.04] px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-navy/40"
              />
            </Row>
            <Row label="Email">
              <input
                defaultValue="rakesh.pinto42@gmail.com"
                className="w-48 rounded-lg border border-black/10 bg-black/[0.04] px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-navy/40"
              />
            </Row>
            <Row label="Plan" desc="Pro · renews monthly">
              <span className="rounded-full bg-navy/12 px-3 py-1 text-xs text-navy">
                Pro
              </span>
            </Row>
          </Section>

          <Section title="Models">
            <Row label="Active model">
              {availableModels.length === 0 ? (
                <Link
                  href="/admin"
                  className="text-sm text-navy hover:underline"
                >
                  {modelsLoaded ? "Configure providers →" : "Loading…"}
                </Link>
              ) : (
                <select
                  value={activeModel ? modelKey(activeModel) : ""}
                  onChange={(e) => setActiveModel(e.target.value)}
                  className="w-56 cursor-pointer rounded-lg border border-black/10 bg-black/[0.04] px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-navy/40"
                >
                  {availableModels.map((m) => (
                    <option
                      key={modelKey(m)}
                      value={modelKey(m)}
                      className="bg-white"
                    >
                      {m.label} · {m.providerName}
                    </option>
                  ))}
                </select>
              )}
            </Row>
            <Row
              label="Auto-route"
              desc="Let the router pick the optimal model per request"
            >
              <Toggle on={autoRoute} onChange={setAutoRoute} />
            </Row>
            <Row label="Stream responses" desc="Token-by-token output">
              <Toggle on={stream} onChange={setStream} />
            </Row>
          </Section>

          <Section title="Appearance">
            <Row label="Theme" desc="Obsidian dark is optimized for NEXERA">
              <span className="rounded-lg border border-black/10 bg-black/[0.04] px-3 py-1.5 text-sm text-neutral-900">
                Obsidian
              </span>
            </Row>
            <Row label="Glassmorphism" desc="Translucent panels and blur">
              <Toggle on={glass} onChange={setGlass} />
            </Row>
          </Section>

          <Section title="Privacy">
            <Row
              label="Usage telemetry"
              desc="Share anonymized metrics to improve routing"
            >
              <Toggle on={telemetry} onChange={setTelemetry} />
            </Row>
            <Row label="API key" desc="rak_live_••••••••4f2a">
              <button className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-black/70 transition-colors hover:bg-black/5">
                Rotate
              </button>
            </Row>
          </Section>
        </div>

        <Reveal className="mt-4 flex items-center justify-between rounded-2xl border border-[#ff8a8a]/20 bg-[#ff8a8a]/[0.04] p-5">
          <div>
            <p className="text-sm font-medium text-[#ff8a8a]">Delete workspace</p>
            <p className="text-xs text-black/40">
              Permanently removes all chats, files and agents.
            </p>
          </div>
          <button className="rounded-lg border border-[#ff8a8a]/40 px-4 py-2 text-sm text-[#ff8a8a] transition-colors hover:bg-[#ff8a8a]/10">
            Delete
          </button>
        </Reveal>
      </GridReveal>
    </PageShell>
  );
}
