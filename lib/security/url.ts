// Shared URL sanitizer for rendered links. Prevents XSS via unsafe schemes in
// AI-generated, news, web-source and markdown links. Allow http/https/mailto and
// internal/relative paths; everything else (javascript / data / blob / file /
// vbscript / etc.) collapses to "#".

const ALLOWED_SCHEMES = new Set(["http", "https", "mailto"]);

// Drop chars with code <= 0x20 (control + space) and 0x7F (DEL). URLs have no
// legitimate raw control chars, and this blocks scheme smuggling such as a
// tab/newline inserted inside "javascript:".
function stripControl(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const n = raw.charCodeAt(i);
    if (n > 0x20 && n !== 0x7f) out += raw[i];
  }
  return out;
}

/** Return a safe href, or "#" if the URL uses a disallowed scheme. */
export function safeHref(raw: unknown): string {
  if (typeof raw !== "string") return "#";
  const s = stripControl(raw).trim();
  if (!s) return "#";

  // Internal / relative links are safe.
  if (/^[/#?]/.test(s) || s.startsWith("./") || s.startsWith("../")) return s;

  // Explicit scheme -> allowlist only.
  const m = s.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (m) {
    return ALLOWED_SCHEMES.has(m[1].toLowerCase()) ? s : "#";
  }

  // Schemeless but host-like (e.g. "example.com/x") -> assume https.
  if (/^[A-Za-z0-9_.-]+[.][a-z]{2,}([/:?#]|$)/i.test(s)) return `https://${s}`;

  return "#";
}
