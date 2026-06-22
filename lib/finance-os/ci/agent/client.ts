"use client";

import type { ResearchResult } from "./types";

export class ResearchError extends Error {
  code: string;
  detail?: string;
  constructor(code: string, detail?: string) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({ error: "bad_response" }));
  if (!r.ok) throw new ResearchError(data.error ?? "error", data.detail);
  return data as T;
}

export async function researchCompetitor(input: { competitor: string; keywords?: string; region?: string }): Promise<ResearchResult & { backend: string }> {
  return postJson("/api/ci/competitor-research", input);
}

export type DiscoveredCompetitor = { name: string; descriptor: string; region: string | null; url: string | null };

export async function discoverCompetitors(input: { company: string; region?: string; keywords?: string }): Promise<{ company: string; competitors: DiscoveredCompetitor[]; sources: { title: string; url: string }[]; backend: string; model: string }> {
  return postJson("/api/ci/competitor-discovery", input);
}

export type SearchKeyStatus = { hasKey: boolean; mask: string; source: "store" | "env" | "none" };

export async function getSearchKeyStatus(): Promise<SearchKeyStatus> {
  try {
    const r = await fetch("/api/admin/ci-search-key");
    if (!r.ok) return { hasKey: false, mask: "", source: "none" }; // non-admin / not set
    return (await r.json()) as SearchKeyStatus;
  } catch {
    return { hasKey: false, mask: "", source: "none" };
  }
}

export async function setTavilyKey(apiKey: string): Promise<SearchKeyStatus> {
  return postJson("/api/admin/ci-search-key", { apiKey });
}

export type NewsItem = { headline: string; type: string; date: string | null; summary: string; url: string | null; assessment: "Threat" | "Opportunity" | "Neutral"; impact: "High" | "Medium" | "Low"; impactRationale: string; response: string };

export async function fetchCompetitorNews(competitor: string, region?: string): Promise<{ competitor: string; news: NewsItem[]; sources: { title: string; url: string }[]; backend: string; model: string; fetchedAt: string }> {
  return postJson("/api/ci/competitor-news", { competitor, region });
}
