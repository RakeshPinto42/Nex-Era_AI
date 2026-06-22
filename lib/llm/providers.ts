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
    // retired id is harmless. Refresh ids from https://openrouter.ai/models?max_price=0
    models: [
      { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (free)", intent: "reasoning" },
      { id: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 0528 (free)", intent: "reasoning" },
      { id: "deepseek/deepseek-chat-v3.1:free", label: "DeepSeek V3.1 (free)", intent: "general" },
      { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 0324 (free)", intent: "general" },
      { id: "qwen/qwen-2.5-coder-32b-instruct:free", label: "Qwen 2.5 Coder (free)", intent: "coding" },
      { id: "qwen/qwen3-coder:free", label: "Qwen3 Coder (free)", intent: "coding" },
      { id: "qwen/qwq-32b:free", label: "Qwen QwQ 32B (free)", intent: "reasoning" },
      { id: "qwen/qwen3-235b-a22b:free", label: "Qwen3 235B (free)", intent: "reasoning" },
      { id: "moonshotai/kimi-k2:free", label: "Kimi K2 (free)", intent: "general" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)", intent: "general" },
      { id: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick (free)", intent: "general" },
      { id: "mistralai/mistral-small-3.2-24b-instruct:free", label: "Mistral Small 3.2 (free)", intent: "general" },
      { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash Exp (free)", intent: "vision" },
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
