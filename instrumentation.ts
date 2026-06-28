// Startup guard. In production the server REFUSES TO START when admin/guest
// credentials violate policy or AUTH_SECRET is missing — so a misconfigured
// deploy can never authenticate with a built-in default. No secret is logged.

export async function register() {
  // Only the Node.js server runtime; never the edge runtime or local dev.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { credentialConfigError } = await import("@/lib/auth/users");
  const credErr = credentialConfigError();
  if (credErr) {
    console.error(`[FATAL] NEX·ERA refusing to start: ${credErr}`);
    throw new Error(`Startup blocked: admin credential policy not satisfied (${credErr})`);
  }

  const { secretInsecure } = await import("@/lib/auth/session");
  if (secretInsecure()) {
    console.error("[FATAL] NEX·ERA refusing to start: AUTH_SECRET is not set to a strong value");
    throw new Error("Startup blocked: AUTH_SECRET must be set in production");
  }
}
