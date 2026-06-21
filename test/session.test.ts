import { describe, it, expect } from "vitest";
import { createToken, verifyToken } from "@/lib/auth/session";

describe("session token", () => {
  it("round-trips a valid token", async () => {
    const token = await createToken({ u: "admin", r: "admin" });
    const s = await verifyToken(token);
    expect(s).not.toBeNull();
    expect(s?.u).toBe("admin");
    expect(s?.r).toBe("admin");
    expect(s?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered signature", async () => {
    const token = await createToken({ u: "guest1", r: "guest" });
    const [p] = token.split(".");
    const forged = `${p}.${"A".repeat(43)}`;
    expect(await verifyToken(forged)).toBeNull();
  });

  it("rejects a tampered payload (signature no longer matches)", async () => {
    const token = await createToken({ u: "guest1", r: "guest" });
    const [, sig] = token.split(".");
    // swap in an admin payload but keep the old guest signature
    const fakePayload = Buffer.from(JSON.stringify({ u: "x", r: "admin", exp: 9e9 }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyToken(`${fakePayload}.${sig}`)).toBeNull();
  });

  it("rejects empty / malformed input", async () => {
    expect(await verifyToken(null)).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("garbage")).toBeNull();
    expect(await verifyToken("a.b.c")).toBeNull();
  });
});
