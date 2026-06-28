/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse pulls in pdfjs-dist + the @napi-rs/canvas backend it loads via a
  // runtime require the tracer can't follow. Keep them external and force the
  // native canvas package into the extract function, or PDF text comes back
  // empty on Vercel serverless.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
    outputFileTracingIncludes: {
      "/api/extract": ["./node_modules/@napi-rs/canvas*/**"],
    },
    // Runs instrumentation.ts at server startup — used to fail closed when
    // production credentials/secret are missing or weak.
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

// Defense-in-depth browser hardening. CSP allows Next's inline runtime + inline
// styles (framer-motion / style props) and external image/media hosts used by
// the generators; everything else is locked down. Tuned not to break existing
// functionality (same-origin API calls, blob workers, data: fonts/images).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

export default nextConfig;
