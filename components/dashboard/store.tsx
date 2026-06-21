"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { classifyIntent } from "@/lib/router/intent";

export type AgentStatus = "idle" | "thinking" | "running" | "done";

export type WorkflowStep = {
  label: string;
  state: "pending" | "active" | "done";
};

export type LiveModelLite = {
  providerId: string;
  providerName: string;
  model: string;
  label: string;
  /** Routed-intent key (from the provider preset) — drives the palette dot. */
  intent?: string;
};

export const modelKey = (m: LiveModelLite) => `${m.providerId}:${m.model}`;

// ---- conversations (ChatGPT-style thread history) ----

export type ChatAttachment = { name: string; size: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  attachments?: ChatAttachment[];
};
export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

const CONVO_KEY = "mesh.conversations.v1";
const DEFAULT_TITLE = "New chat";

function deriveTitle(prev: string, messages: ChatMessage[]): string {
  if (prev && prev !== DEFAULT_TITLE) return prev;
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return prev || DEFAULT_TITLE;
  return firstUser.content.trim().replace(/\s+/g, " ").slice(0, 48);
}

type DashboardState = {
  /** Display label of the active model. */
  model: string;
  availableModels: LiveModelLite[];
  activeModel: LiveModelLite | null;
  setActiveModel: (key: string) => void;
  modelsLoaded: boolean;

  /** Auto mode: route each prompt to the best model for its task. */
  autoRoute: boolean;
  setAutoRoute: (v: boolean) => void;
  /** Last model the auto-router picked + the intent it classified. */
  routedModel: LiveModelLite | null;
  routedIntent: string | null;
  routedConfidence: number | null;
  routedReason: string | null;
  /** Resolve which model to send a prompt to (sets routed* in auto mode). */
  resolveSendModel: (prompt: string) => {
    providerId?: string;
    model?: string;
    label: string;
    intent: string;
  };

  tokensIn: number;
  tokensOut: number;
  addTokens: (input: number, output: number) => void;
  resetTokens: () => void;

  agentStatus: AgentStatus;
  setAgentStatus: (s: AgentStatus) => void;

  workflow: WorkflowStep[];
  setWorkflow: (w: WorkflowStep[]) => void;
  advanceWorkflow: () => void;

  conversations: Conversation[];
  activeId: string | null;
  activeConversation: Conversation | null;
  createConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateMessages: (
    id: string,
    updater: (prev: ChatMessage[]) => ChatMessage[],
  ) => void;
};

const Ctx = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [availableModels, setAvailableModels] = useState<LiveModelLite[]>([]);
  const [activeModel, setActive] = useState<LiveModelLite | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [convosLoaded, setConvosLoaded] = useState(false);

  const [tokensIn, setIn] = useState(0);
  const [tokensOut, setOut] = useState(0);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([
    { label: "Parse request", state: "done" },
    { label: "Select model", state: "done" },
    { label: "Generate response", state: "pending" },
    { label: "Verify output", state: "pending" },
  ]);

  // On chat-window open: refresh the free-model list (sync) and health-check
  // stale models, pruning dead ones, THEN load the cleaned list. Health pings
  // are TTL-cached server-side so this doesn't burn the daily free quota.
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      const d = await fetch("/api/models").then((r) => r.json());
      if (cancelled) return;
      const list: LiveModelLite[] = d.models ?? [];
      setAvailableModels(list);
      setActive((cur) => {
        if (cur && list.some((m) => modelKey(m) === modelKey(cur))) return cur;
        return (
          list.find(
            (m: LiveModelLite & { isDefault?: boolean }) =>
              (m as { isDefault?: boolean }).isDefault,
          ) ??
          list[0] ??
          null
        );
      });
    };

    (async () => {
      // Show the saved models immediately (fast) — don't block on refresh.
      await loadModels();
      if (!cancelled) setModelsLoaded(true);
      // Refresh free list + health in the background, then merge the result.
      fetch("/api/models/refresh", { method: "POST" })
        .then(() => {
          if (!cancelled) loadModels();
        })
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveModel = useCallback(
    (key: string) => {
      const found = availableModels.find((m) => modelKey(m) === key);
      if (found) setActive(found);
    },
    [availableModels],
  );

  // Auto-routing: classify the prompt and pick the best-fitting enabled model.
  const [autoRoute, setAutoRoute] = useState(true);
  const [routedModel, setRoutedModel] = useState<LiveModelLite | null>(null);
  const [routedIntent, setRoutedIntent] = useState<string | null>(null);
  const [routedConfidence, setRoutedConfidence] = useState<number | null>(null);
  const [routedReason, setRoutedReason] = useState<string | null>(null);

  const resolveSendModel = useCallback(
    (prompt: string) => {
      // Manual mode → use the explicitly picked model.
      if (!autoRoute && activeModel) {
        setRoutedConfidence(null);
        setRoutedReason("Manually selected");
        return {
          providerId: activeModel.providerId,
          model: activeModel.model,
          label: activeModel.label,
          intent: activeModel.intent ?? "general",
        };
      }
      // Auto mode → classify intent, match a model's capability.
      const cls = classifyIntent(prompt);
      const top = cls.top;
      // Image/video generation isn't a chat model — route those to a general chat.
      const wanted = top === "images" || top === "videos" ? "general" : top;
      const pick =
        availableModels.find((m) => m.intent === wanted) ??
        availableModels.find((m) => m.intent === "general") ??
        activeModel ??
        availableModels[0] ??
        null;
      setRoutedModel(pick);
      setRoutedIntent(top);
      setRoutedConfidence(cls.confidence);
      setRoutedReason(
        pick
          ? `Classified as ${top}; ${pick.label} scored best for this task.`
          : `Classified as ${top}.`,
      );
      if (!pick) return { providerId: undefined, model: undefined, label: "No model", intent: top };
      return {
        providerId: pick.providerId,
        model: pick.model,
        label: pick.label,
        intent: top,
      };
    },
    [autoRoute, activeModel, availableModels],
  );

  // Load persisted conversations once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONVO_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Conversation[];
        if (Array.isArray(saved) && saved.length) {
          setConversations(saved);
          setActiveId(saved[0].id);
        }
      }
    } catch {
      /* corrupt store — start fresh */
    }
    setConvosLoaded(true);
  }, []);

  // Persist on change (after initial load, so we don't clobber with []).
  useEffect(() => {
    if (!convosLoaded) return;
    try {
      // Drop transient streaming flags before saving (undefined → omitted by JSON).
      const clean = conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({ ...m, streaming: undefined })),
      }));
      localStorage.setItem(CONVO_KEY, JSON.stringify(clean));
    } catch {
      /* quota / unavailable — ignore */
    }
  }, [conversations, convosLoaded]);

  const createConversation = useCallback(() => {
    // Reuse an existing empty draft instead of stacking blank "New chat" rows.
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
      return existingEmpty.id;
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    setConversations((prev) => [
      { id, title: DEFAULT_TITLE, createdAt: now, updatedAt: now, messages: [] },
      ...prev,
    ]);
    setActiveId(id);
    return id;
  }, [conversations]);

  const selectConversation = useCallback((id: string) => setActiveId(id), []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }, []);

  const updateMessages = useCallback(
    (id: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const messages = updater(c.messages);
          return {
            ...c,
            messages,
            updatedAt: Date.now(),
            title: deriveTitle(c.title, messages),
          };
        }),
      );
    },
    [],
  );

  const activeConversation =
    conversations.find((c) => c.id === activeId) ?? null;

  const addTokens = useCallback((input: number, output: number) => {
    setIn((v) => v + input);
    setOut((v) => v + output);
  }, []);
  const resetTokens = useCallback(() => {
    setIn(0);
    setOut(0);
  }, []);

  const advanceWorkflow = useCallback(() => {
    setWorkflow((prev) => {
      const i = prev.findIndex((s) => s.state !== "done");
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = { ...next[i], state: "done" };
      if (next[i + 1]) next[i + 1] = { ...next[i + 1], state: "active" };
      return next;
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        model: activeModel?.label ?? "No model",
        availableModels,
        activeModel,
        setActiveModel,
        modelsLoaded,
        autoRoute,
        setAutoRoute,
        routedModel,
        routedIntent,
        routedConfidence,
        routedReason,
        resolveSendModel,
        tokensIn,
        tokensOut,
        addTokens,
        resetTokens,
        agentStatus,
        setAgentStatus,
        workflow,
        setWorkflow,
        advanceWorkflow,
        conversations,
        activeId,
        activeConversation,
        createConversation,
        selectConversation,
        deleteConversation,
        updateMessages,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDashboard() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDashboard must be used within DashboardProvider");
  return v;
}
