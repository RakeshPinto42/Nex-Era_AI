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
  },
};

export default nextConfig;
