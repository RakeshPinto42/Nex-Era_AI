import { sessionFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Real, recent headlines per asset via Google News RSS (keyless, India-localized).
// Used in the expandable "Why" to show actual catalysts instead of AI guesses.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function queryFor(name: string, kind: string): string {
  if (kind === "crypto") return `${name} cryptocurrency price`;
  if (kind === "metal") return `${name} price commodity`;
  return `${name} share price NSE`;
}

export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ items: [] });

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const kind = url.searchParams.get("kind") ?? "stock";
  if (!name) return Response.json({ items: [] });

  const q = encodeURIComponent(queryFor(name, kind));
  const feed = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const res = await fetch(feed, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return Response.json({ items: [] });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6).map((m) => {
      const b = m[1];
      const pick = (tag: string) => {
        const mm = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(b);
        return mm ? clean(mm[1]) : "";
      };
      return { title: pick("title"), url: pick("link"), source: pick("source"), time: pick("pubDate"), desc: pick("description").slice(0, 400) };
    });
    return Response.json({ items: items.filter((i) => i.title && i.url) });
  } catch {
    return Response.json({ items: [] });
  }
}
