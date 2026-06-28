import { sessionFromRequest } from "@/lib/auth/session";
import { tavilySearch } from "@/lib/finance-os/ci/agent/tavily";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gather research SOURCES for a query. The AI summary is streamed separately by
// the client via /api/run (reusing the model infra) with these sources as
// context — keeps model routing/streaming in one place.
//   mode "web"     → Tavily advanced search (many sources).
//   mode "website" → fetch + readable-text extract of a single URL.
//   mode "youtube" → fetch the video transcript (captions) as one source.

export type Source = { id: number; title: string; url: string; content: string; kind: string };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(html: string, fallback: string): string {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m ? m[1].trim().slice(0, 140) : fallback;
}

async function fetchWebsite(url: string): Promise<Source[]> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const text = stripHtml(html).slice(0, 12000);
  return [{ id: 1, title: titleOf(html, url), url, content: text, kind: "website" }];
}

function youtubeId(input: string): string | null {
  if (/^[\w-]{11}$/.test(input)) return input;
  const m = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

async function fetchTranscript(input: string): Promise<Source[]> {
  const id = youtubeId(input);
  if (!id) throw new Error("Could not parse a YouTube video id from that input.");
  const watch = await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: { "User-Agent": UA } }).then((r) => r.text());
  const title = titleOf(watch, `YouTube ${id}`).replace(/ - YouTube$/, "");
  // Find a caption track baseUrl in the page's player config.
  const m = watch.match(/"captionTracks":(\[.*?\])/);
  if (!m) throw new Error("No captions/transcript available for this video.");
  let tracks: { baseUrl: string; languageCode?: string }[] = [];
  try { tracks = JSON.parse(m[1].replace(/\\u0026/g, "&")); } catch { /* ignore */ }
  const track = tracks.find((t) => t.languageCode === "en") ?? tracks[0];
  if (!track?.baseUrl) throw new Error("No captions/transcript available for this video.");
  const xml = await fetch(track.baseUrl, { headers: { "User-Agent": UA } }).then((r) => r.text());
  const text = stripHtml(xml).slice(0, 14000);
  if (!text) throw new Error("Transcript was empty.");
  return [{ id: 1, title: `Transcript · ${title}`, url: `https://youtu.be/${id}`, content: text, kind: "youtube" }];
}

export const POST = (req: Request) => withGuard(req, "research", () => handlePOST(req));

async function handlePOST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { mode, query, url } = (await req.json().catch(() => ({}))) as { mode?: string; query?: string; url?: string };

  try {
    if (mode === "website") {
      if (!url) return Response.json({ error: "A URL is required for website analysis." }, { status: 400 });
      return Response.json({ sources: await fetchWebsite(url) });
    }
    if (mode === "youtube") {
      if (!url) return Response.json({ error: "A YouTube URL or id is required." }, { status: 400 });
      return Response.json({ sources: await fetchTranscript(url) });
    }
    // default: web search
    if (!query?.trim()) return Response.json({ error: "A search query is required." }, { status: 400 });
    const out = await tavilySearch(query, 8);
    if (!out.ok) {
      const msg = out.error === "search_key_missing"
        ? "Web search isn’t configured — add a Tavily key in Admin → Providers."
        : `Search failed${out.detail ? `: ${out.detail}` : ""}.`;
      return Response.json({ error: msg }, { status: out.status });
    }
    const sources: Source[] = out.results.map((r, i) => ({
      id: i + 1,
      title: r.title || r.url,
      url: r.url,
      content: (r.raw_content || r.content || "").slice(0, 6000),
      kind: "web",
    }));
    return Response.json({ sources });
  } catch (err) {
    return Response.json({ error: (err as Error).message || "Research failed." }, { status: 502 });
  }
}
