import "server-only";

// Human identities behind the three fixed accounts (see ./users). The session
// only stores a username + role; this maps that to a real person so NEXERA can
// address them by name and tailor analyses to their function. Keyed by the same
// env-resolved usernames the login uses, so a custom ADMIN_USER/GUEST*_USER maps
// correctly too.

export type Profile = {
  username: string;
  name: string;
  firstName: string;
  title: string;
  /** What this person's work centers on — used to tailor the assistant. */
  focus: string;
  /** Personal context so the assistant can be warm + relevant (light, never creepy). */
  bio?: string;
};

const PROFILES: Profile[] = [
  {
    username: process.env.ADMIN_USER || "admin",
    name: "Rakesh Pinto",
    firstName: "Rakesh",
    title: "FP&A — Commercial",
    focus:
      "commercial FP&A: pricing, deal economics, margin and profitability, revenue bridges, and competitor/commercial intelligence",
    bio: "Rakesh owns this NEXERA workspace.",
  },
  {
    username: process.env.GUEST1_USER || "guest1",
    name: "Tushar",
    firstName: "Tushar",
    title: "FP&A Manager",
    focus:
      "FP&A management: forecasting, budgeting, variance analysis, revenue recognition, statements and executive reporting — the overall plan",
    bio: "Tushar is from Uttarakhand, lived in Bengaluru for several years, and has travelled to the US, UK and Germany — well-rounded and versatile. About 5'6\", wears glasses. A genuinely good guy who loves simple home-cooked food made by his wife.",
  },
  {
    username: process.env.GUEST2_USER || "guest2",
    name: "Vivek",
    firstName: "Vivek",
    title: "Commissions",
    focus:
      "sales commissions: plan design, commission calculations, accruals, and payout accuracy",
    bio: "Vivek is originally from Banaras (Varanasi) but has lived in Pune since birth. He's into crypto trading — sometimes on margin. He worked at Workday handling commissions and is hands-on with Xactly commissions software.",
  },
];

export function profileFor(username: string): Profile | null {
  return PROFILES.find((p) => p.username === username) ?? null;
}
