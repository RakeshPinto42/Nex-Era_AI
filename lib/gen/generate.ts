// Image + video generation against free cloud platforms.
// Image: Pollinations (keyless default) → Together / Hugging Face (env key).
// Video: Replicate (env key; free-tier credits). No reliable keyless t2v exists,
// so video degrades to a clear "needs key" result.

import "server-only";

export type GenResult = {
  ok: boolean;
  url?: string; // image data/URL or video URL
  provider: string;
  model: string;
  mode: "live" | "live-free" | "needs-key" | "error";
  error?: string;
};

// ---------- IMAGE ----------

export async function generateImage(
  prompt: string,
  opts: { width?: number; height?: number } = {},
): Promise<GenResult> {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;

  // 1) Together AI — FLUX.1 [schnell] free endpoint.
  if (process.env.TOGETHER_API_KEY) {
    try {
      const res = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell-Free",
          prompt,
          width,
          height,
          steps: 4,
          n: 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const item = data?.data?.[0];
        const url = item?.url ?? (item?.b64_json && `data:image/png;base64,${item.b64_json}`);
        if (url) return { ok: true, url, provider: "Together", model: "FLUX.1 schnell", mode: "live" };
      }
    } catch {
      /* fall through */
    }
  }

  // 2) Hugging Face Inference — FLUX.1-schnell (returns raw image bytes).
  if (process.env.HF_TOKEN) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "image/png",
          },
          body: JSON.stringify({ inputs: prompt }),
        },
      );
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const url = `data:image/png;base64,${buf.toString("base64")}`;
        return { ok: true, url, provider: "Hugging Face", model: "FLUX.1 schnell", mode: "live" };
      }
    } catch {
      /* fall through */
    }
  }

  // 3) Pollinations — keyless, free. Image is served directly on GET.
  const seed = Math.floor(Math.random() * 1e9);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
  return { ok: true, url, provider: "Pollinations", model: "Flux (free)", mode: "live-free" };
}

// ---------- VIDEO ----------

export async function generateVideo(prompt: string): Promise<GenResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return {
      ok: false,
      provider: "none",
      model: "—",
      mode: "needs-key",
      error:
        "Set REPLICATE_API_TOKEN (free-tier credits) to enable text-to-video. No keyless video provider is available.",
    };
  }

  // owner/model — overridable; defaults to a Wan text-to-video model.
  const model = process.env.REPLICATE_VIDEO_MODEL ?? "wan-video/wan-2.1-t2v-480p";

  try {
    // `Prefer: wait` blocks up to ~60s; if still processing, we poll.
    const create = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({ input: { prompt } }),
      },
    );

    if (!create.ok) {
      const detail = await create.text().catch(() => "");
      return {
        ok: false,
        provider: "Replicate",
        model,
        mode: "error",
        error: `HTTP ${create.status}: ${detail.slice(0, 160)}`,
      };
    }

    let pred = await create.json();
    const started = Date.now();
    // Poll until terminal state (max ~90s total).
    while (
      (pred.status === "starting" || pred.status === "processing") &&
      Date.now() - started < 90_000
    ) {
      await new Promise((r) => setTimeout(r, 2500));
      const poll = await fetch(pred.urls?.get, {
        headers: { Authorization: `Bearer ${token}` },
      });
      pred = await poll.json();
    }

    if (pred.status === "succeeded") {
      const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
      if (out) return { ok: true, url: out, provider: "Replicate", model, mode: "live" };
    }
    return {
      ok: false,
      provider: "Replicate",
      model,
      mode: "error",
      error: `Generation ${pred.status ?? "failed"}${pred.error ? `: ${pred.error}` : ""}`,
    };
  } catch (e) {
    return {
      ok: false,
      provider: "Replicate",
      model,
      mode: "error",
      error: (e as Error).message,
    };
  }
}
