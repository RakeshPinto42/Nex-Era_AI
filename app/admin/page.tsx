"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import type { ProviderPreset } from "@/lib/llm/providers";

type Masked = {
  providerId: string;
  enabled: boolean;
  models: string[];
  keyMask: string;
  hasKey: boolean;
};

type State = {
  presets: ProviderPreset[];
  providers: Masked[];
  defaultProviderId: string | null;
  defaultModel: string | null;
  adminOpen: boolean;
};

type TestState = { status: "idle" | "testing" | "ok" | "fail"; msg?: string };
type SyncState = { status: "idle" | "syncing" | "ok" | "fail"; msg?: string };
type HealthState = { status: "idle" | "checking" | "ok" | "fail"; msg?: string };

const TOKEN_KEY = "rak_admin_token";

export default function AdminPage() {
  const [state, setState] = useState<State | null>(null);
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState(false);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [syncs, setSyncs] = useState<Record<string, SyncState>>({});
  const [healths, setHealths] = useState<Record<string, HealthState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Commercial Intelligence web-search (Tavily) key — separate from model providers.
  const [searchKey, setSearchKey] = useState<{ hasKey: boolean; mask: string; source: string } | null>(null);
  const [searchKeyInput, setSearchKeyInput] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const tok =
        token || (typeof window !== "undefined"
          ? sessionStorage.getItem(TOKEN_KEY) ?? ""
          : "");
      return fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { "x-admin-token": tok } : {}),
          ...(init?.headers ?? {}),
        },
      });
    },
    [token],
  );

  const load = useCallback(async () => {
    const res = await api("/api/admin/providers");
    if (res.status === 401) {
      setAuthError(true);
      return;
    }
    setAuthError(false);
    setState(await res.json());
    const sk = await api("/api/admin/ci-search-key");
    if (sk.ok) setSearchKey(await sk.json());
  }, [api]);

  const saveSearchKey = async () => {
    if (!searchKeyInput.trim()) return;
    setSavingSearch(true);
    const res = await api("/api/admin/ci-search-key", {
      method: "POST",
      body: JSON.stringify({ apiKey: searchKeyInput.trim() }),
    });
    if (res.ok) setSearchKey(await res.json());
    setSearchKeyInput("");
    setSavingSearch(false);
  };

  const removeSearchKey = async () => {
    const res = await api("/api/admin/ci-search-key", { method: "DELETE" });
    if (res.ok) setSearchKey(await res.json());
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfgFor = (id: string) =>
    state?.providers.find((p) => p.providerId === id);

  const save = async (preset: ProviderPreset, models: string[]) => {
    setSaving(preset.id);
    await api("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({
        providerId: preset.id,
        apiKey: keyInputs[preset.id] || undefined,
        models,
        enabled: true,
      }),
    });
    setKeyInputs((k) => ({ ...k, [preset.id]: "" }));
    setSaving(null);
    await load();
  };

  const test = async (preset: ProviderPreset) => {
    setTests((t) => ({ ...t, [preset.id]: { status: "testing" } }));
    const res = await api("/api/admin/providers/test", {
      method: "POST",
      body: JSON.stringify({
        providerId: preset.id,
        apiKey: keyInputs[preset.id] || undefined,
      }),
    });
    const data = await res.json();
    setTests((t) => ({
      ...t,
      [preset.id]: {
        status: data.ok ? "ok" : "fail",
        msg: data.detail || data.error,
      },
    }));
  };

  const sync = async (preset: ProviderPreset) => {
    setSyncs((s) => ({ ...s, [preset.id]: { status: "syncing" } }));
    const res = await api("/api/admin/providers/sync", {
      method: "POST",
      body: JSON.stringify({ providerId: preset.id }),
    });
    const data = await res.json();
    setSyncs((s) => ({
      ...s,
      [preset.id]: data.ok
        ? {
            status: "ok",
            msg: `Found ${data.found} free · added ${data.added} · ${data.total} enabled`,
          }
        : { status: "fail", msg: data.error },
    }));
    await load();
  };

  const health = async (preset: ProviderPreset) => {
    setHealths((h) => ({ ...h, [preset.id]: { status: "checking" } }));
    const res = await api("/api/models/refresh?force=1", { method: "POST" });
    const data = await res.json();
    setHealths((h) => ({
      ...h,
      [preset.id]: data.ok
        ? {
            status: "ok",
            msg: `Pinged ${data.checked} · live ${data.okModels.length} · rate-limited ${data.rateLimited.length} · pruned ${data.pruned.length} · ${data.enabled} enabled`,
          }
        : { status: "fail", msg: data.error },
    }));
    await load();
  };

  const remove = async (id: string) => {
    await api(`/api/admin/providers?id=${id}`, { method: "DELETE" });
    await load();
  };

  const makeDefault = async (providerId: string, model: string) => {
    await api("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({ action: "setDefault", providerId, model }),
    });
    await load();
  };

  const toggleModel = (preset: ProviderPreset, modelId: string) => {
    const cur = cfgFor(preset.id)?.models ?? [];
    const next = cur.includes(modelId)
      ? cur.filter((m) => m !== modelId)
      : [...cur, modelId];
    save(preset, next);
  };

  if (authError) {
    return (
      <Gate
        onSubmit={(t) => {
          sessionStorage.setItem(TOKEN_KEY, t);
          setToken(t);
          setTimeout(load, 0);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-ink">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-96 w-[500px] rounded-full bg-navy/10 blur-[150px]" />
      </div>

      <header className="flex h-14 items-center justify-between border-b border-line px-5">
        <div className="flex items-center gap-3">
          <Logo size={28} variant="terminal" />
          <span className="text-faint">/</span>
          <span className="text-sm font-medium">Admin · Model Providers</span>
        </div>
        <Link
          href="/fpa"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-black/65 hover:text-ink"
        >
          ← FP&A OS
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Model Providers
        </h1>
        <p className="mt-1 text-sm text-black/50">
          Add API keys for free cloud platforms. Keys are stored server-side and
          masked here. The copilot uses your selected default model.
        </p>

        {/* security banner */}
        {state?.adminOpen && (
          <div className="mt-4 rounded-xl border border-[#f0c178]/30 bg-[#f0c178]/[0.06] px-4 py-3 text-sm text-[#f0c178]">
            ⚠ Admin is unprotected (no <code className="font-mono">RAK_ADMIN_TOKEN</code>).
            Keys persist plaintext in <code className="font-mono">.rak/providers.json</code> (gitignored).
            Set a token + a real secrets store before sharing this deployment.
          </div>
        )}

        {/* active default */}
        {state?.defaultProviderId && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-navy/30 bg-navy/[0.06] px-4 py-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-navy" />
            <span className="text-black/70">Active copilot model:</span>
            <span className="font-medium text-navy">
              {state.presets.find((p) => p.id === state.defaultProviderId)?.name}
              {" · "}
              {state.defaultModel}
            </span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {state?.presets.map((preset) => {
            const cfg = cfgFor(preset.id);
            const t = tests[preset.id]?.status ?? "idle";
            const isDefault = state.defaultProviderId === preset.id;
            // Catalog presets + any synced/enabled ids not in the catalog.
            const presetIds = new Set(preset.models.map((m) => m.id));
            const extraModels = (cfg?.models ?? [])
              .filter((id) => !presetIds.has(id))
              .map((id) => ({
                id,
                label: id.split("/").pop() ?? id,
                intent: "general" as const,
              }));
            const chipModels = [...preset.models, ...extraModels];
            return (
              <div
                key={preset.id}
                className="rounded-2xl border border-line bg-surface-2/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-ink">{preset.name}</h2>
                      {preset.free && (
                        <span className="rounded-full bg-navy/12 px-2 py-0.5 font-mono text-[10px] uppercase text-navy">
                          free
                        </span>
                      )}
                      {cfg?.hasKey && (
                        <span className="rounded-full border border-black/15 px-2 py-0.5 font-mono text-[10px] text-muted">
                          key {cfg.keyMask}
                        </span>
                      )}
                      {isDefault && (
                        <span className="rounded-full bg-ice/15 px-2 py-0.5 font-mono text-[10px] uppercase text-ice">
                          default
                        </span>
                      )}
                    </div>
                    <a
                      href={preset.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-black/35 hover:text-muted"
                    >
                      {preset.baseUrl} · get key ↗
                    </a>
                  </div>
                  {cfg?.hasKey && (
                    <button
                      onClick={() => remove(preset.id)}
                      className="text-xs text-black/40 hover:text-[#ff8a8a]"
                    >
                      remove
                    </button>
                  )}
                </div>

                {/* key input + actions */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={keyInputs[preset.id] ?? ""}
                    onChange={(e) =>
                      setKeyInputs((k) => ({ ...k, [preset.id]: e.target.value }))
                    }
                    placeholder={cfg?.hasKey ? "Replace key…" : preset.keyHint}
                    className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-faint outline-none focus:border-navy/40"
                  />
                  <button
                    onClick={() => save(preset, cfg?.models ?? [])}
                    disabled={saving === preset.id || !keyInputs[preset.id]}
                    className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-30"
                  >
                    {saving === preset.id ? "Saving…" : "Save key"}
                  </button>
                  <button
                    onClick={() => test(preset)}
                    disabled={t === "testing"}
                    className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-surface-2 disabled:opacity-40"
                  >
                    {t === "testing" ? "Testing…" : "Test"}
                  </button>
                  {preset.kind === "openai" && cfg?.hasKey && (
                    <>
                      <button
                        onClick={() => sync(preset)}
                        disabled={syncs[preset.id]?.status === "syncing"}
                        className="rounded-lg border border-navy/30 px-4 py-2 text-sm text-navy hover:bg-navy/10 disabled:opacity-40"
                        title="Discover & enable every :free model on this gateway"
                      >
                        {syncs[preset.id]?.status === "syncing"
                          ? "Syncing…"
                          : "Sync free models"}
                      </button>
                      <button
                        onClick={() => health(preset)}
                        disabled={healths[preset.id]?.status === "checking"}
                        className="rounded-lg border border-ice/30 px-4 py-2 text-sm text-ice hover:bg-ice/10 disabled:opacity-40"
                        title="Say Hi to every free model and prune the dead ones (spends request quota)"
                      >
                        {healths[preset.id]?.status === "checking"
                          ? "Checking…"
                          : "Health check & prune"}
                      </button>
                    </>
                  )}
                </div>

                {healths[preset.id] &&
                  healths[preset.id].status !== "idle" &&
                  healths[preset.id].status !== "checking" && (
                    <p
                      className={`mt-2 text-xs ${healths[preset.id].status === "ok" ? "text-ice" : "text-[#ff8a8a]"}`}
                    >
                      {healths[preset.id].status === "ok" ? "✓ " : "✕ "}
                      {healths[preset.id].msg}
                    </p>
                  )}

                {syncs[preset.id] &&
                  syncs[preset.id].status !== "idle" &&
                  syncs[preset.id].status !== "syncing" && (
                    <p
                      className={`mt-2 text-xs ${syncs[preset.id].status === "ok" ? "text-navy" : "text-[#ff8a8a]"}`}
                    >
                      {syncs[preset.id].status === "ok" ? "✓ " : "✕ "}
                      {syncs[preset.id].msg}
                    </p>
                  )}

                {tests[preset.id] && t !== "idle" && t !== "testing" && (
                  <p
                    className={`mt-2 text-xs ${t === "ok" ? "text-navy" : "text-[#ff8a8a]"}`}
                  >
                    {t === "ok" ? "✓ " : "✕ "}
                    {tests[preset.id].msg}
                  </p>
                )}

                {/* models */}
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-black/35">
                    Models {cfg?.hasKey ? "· click to enable" : "· save a key first"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {chipModels.map((m) => {
                      const on = cfg?.models.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          disabled={!cfg?.hasKey}
                          onClick={() => toggleModel(preset, m.id)}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-30 ${
                            on
                              ? "border-navy/40 bg-navy/10 text-ink"
                              : "border-line text-black/55 hover:text-ink"
                          }`}
                          title={m.id}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${on ? "bg-navy" : "bg-surface-3"}`}
                          />
                          {m.label}
                          <span className="font-mono text-[10px] text-faint">
                            {m.intent}
                          </span>
                          {on && !isDefault && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                makeDefault(preset.id, m.id);
                              }}
                              className="ml-1 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-ice hover:bg-surface-3"
                            >
                              set default
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Commercial Intelligence web-search key (Tavily) */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">Web Search · Commercial Intelligence</h2>
          <p className="mt-1 text-sm text-black/50">
            Tavily key powers live competitor research &amp; news (web scraping → cited data).
            Without it, Commercial Intelligence has no live source and shows empty states.
          </p>
          <div className="mt-4 rounded-2xl border border-line bg-surface-2/60 p-5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink">Tavily</h3>
              <span className="rounded-full bg-navy/12 px-2 py-0.5 font-mono text-[10px] uppercase text-navy">free tier</span>
              {searchKey?.hasKey && (
                <span className="rounded-full border border-black/15 px-2 py-0.5 font-mono text-[10px] text-muted">
                  key {searchKey.mask} · {searchKey.source}
                </span>
              )}
              {searchKey?.hasKey && (
                <button onClick={removeSearchKey} className="ml-auto text-xs text-black/40 hover:text-[#ff8a8a]">
                  remove
                </button>
              )}
            </div>
            <a href="https://tavily.com" target="_blank" rel="noreferrer" className="font-mono text-[11px] text-black/35 hover:text-muted">
              tavily.com · get free key ↗
            </a>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={searchKeyInput}
                onChange={(e) => setSearchKeyInput(e.target.value)}
                placeholder={searchKey?.hasKey ? "Replace key…" : "tvly-…"}
                className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-faint outline-none focus:border-navy/40"
              />
              <button
                onClick={saveSearchKey}
                disabled={savingSearch || !searchKeyInput.trim()}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-30"
              >
                {savingSearch ? "Saving…" : "Save key"}
              </button>
            </div>
            {searchKey?.source === "env" && (
              <p className="mt-2 text-xs text-black/45">
                Currently using the <code className="font-mono">TAVILY_API_KEY</code> env var. Saving here overrides it.
              </p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-faint">
          Chat/reasoning/coding models run live. Image/video models (Flux, Wan)
          need a generation endpoint — chat inference only here.
        </p>
      </main>
    </div>
  );
}

function Gate({ onSubmit }: { onSubmit: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7f9] text-ink">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface-2/60 p-6">
        <Logo size={30} variant="terminal" />
        <h1 className="mt-4 text-lg font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-black/50">
          This deployment requires an admin token (
          <code className="font-mono">RAK_ADMIN_TOKEN</code>).
        </p>
        <input
          type="password"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && v && onSubmit(v)}
          placeholder="Admin token"
          className="mt-4 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-navy/40"
        />
        <button
          onClick={() => v && onSubmit(v)}
          className="mt-3 w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
