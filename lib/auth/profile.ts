// Display profiles per login. Keyed by the configured username (the default
// logins are admin / guest1 / guest2). Falls back to a sensible default if a
// login was renamed via env, so nothing breaks.

import type { Role } from "./session";

export type Profile = { displayName: string; title: string; avatar: string };

const PROFILES: Record<string, Profile> = {
  admin: { displayName: "Rak", title: "Administrator", avatar: "RP" },
  guest1: { displayName: "Tushar", title: "FP&A Manager", avatar: "TS" },
  guest2: { displayName: "Vivek", title: "Business Analyst", avatar: "VK" },
};

export function profileFor(username: string, role: Role): Profile {
  return (
    PROFILES[username] ?? {
      displayName: username,
      title: role === "admin" ? "Administrator" : "Member",
      avatar: username.slice(0, 2).toUpperCase(),
    }
  );
}
