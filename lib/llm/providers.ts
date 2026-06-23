// Catalog of supported model platforms. Most free clouds expose an
// OpenAI-compatible /chat/completions endpoint, so a single adapter covers
// them; Anthropic uses its native SDK.

export type ProviderKind = "openai" | "anthropic";

export type SuggestedModel = {
  id: string;
  label: string;
  /** Maps to the AI Router intents. */
  intent: "coding" | "reasoning" | "general" | "research" | "vision";
};

export type ProviderPreset = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  free: boolean;
  docsUrl: string;
  keyHint: string;
  /** Extra headers some gateways want (e.g. OpenRouter attribution). */
  extraHeaders?: Record<string, string>;
  models: SuggestedModel[];
};

// Free / free-tier platforms. Model ids reflect each platform's catalog.
export const PRESETS: ProviderPreset[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    free: true,
    docsUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-v1-…",
    extraHeaders: {
      "HTTP-Referer": "https://rak.os",
      "X-Title": "Mesh",
    },
    // OpenRouter free-tier pool (all carry the `:free` suffix). The fallback
    // walker rotates across these and skips any that 404/429 upstream, so a
    // retired id is harmless. Verified-live ids first (the default + early
    // fallbacks should be ones that currently respond). Refresh from
    // https://openrouter.ai/models?max_price=0 — or via Admin → Providers → Sync.
    models: [
      // Verified-live (currently respond 200) — default + early fallbacks.
      { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B (free)", intent: "reasoning" },
      { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B (free)", intent: "general" },
      { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (free)", intent: "reasoning" },
      { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B (free)", intent: "general" },
      // Rest of the live :free pool (rotated as fallbacks; walker skips any
      // that 404/429). content-safety:free is omitted — guardrail, not chat.
      { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron 3 Nano 30B (free)", intent: "general" },
      { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Nemotron 3 Nano Omni (free)", intent: "reasoning" },
      { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra 550B (free)", intent: "reasoning" },
      { id: "nvidia/nemotron-nano-12b-v2-vl:free", label: "Nemotron Nano 12B VL (free)", intent: "vision" },
      { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder (free)", intent: "coding" },
      { id: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B (free)", intent: "general" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)", intent: "general" },
      { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (free)", intent: "general" },
      { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 405B (free)", intent: "general" },
      { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)", intent: "general" },
      { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B (free)", intent: "general" },
      { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Dolphin Mistral 24B (free)", intent: "general" },
      { id: "cohere/north-mini-code:free", label: "Cohere North Mini Code (free)", intent: "coding" },
      { id: "liquid/lfm-2.5-1.2b-instruct:free", label: "LFM 2.5 1.2B (free)", intent: "general" },
      { id: "liquid/lfm-2.5-1.2b-thinking:free", label: "LFM 2.5 1.2B Thinking (free)", intent: "reasoning" },
      { id: "poolside/laguna-m.1:free", label: "Poolside Laguna M.1 (free)", intent: "coding" },
      { id: "poolside/laguna-xs.2:free", label: "Poolside Laguna XS.2 (free)", intent: "coding" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    free: true,
    docsUrl: "https://console.groq.com/keys",
    keyHint: "gsk_…",
    models: [
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B", intent: "reasoning" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", intent: "general" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B", intent: "coding" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    kind: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    free: true,
    docsUrl: "https://cloud.cerebras.ai/",
    keyHint: "csk-…",
    models: [
      { id: "llama-3.3-70b", label: "Llama 3.3 70B (fast)", intent: "general" },
      { id: "qwen-3-coder-480b", label: "Qwen 3 Coder", intent: "coding" },
    ],
  },
  {
    id: "google",
    name: "Google AI Studio",
    kind: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    free: true,
    docsUrl: "https://aistudio.google.com/apikey",
    keyHint: "AIza…",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (free)", intent: "general" },
      { id: "gemini-2.0-flash-thinking-exp", label: "Gemini 2.0 Flash Thinking", intent: "reasoning" },
    ],
  },
];

export const PRESET_BY_ID = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
) as Record<string, ProviderPreset>;
