// Realistic dummy finance datasets, generated deterministically. Used both for
// the tools' "Load sample" buttons and the downloadable CSV / XLSX samples.

export type Dataset = { columns: string[]; rows: (string | number)[][] };
export type SampleSpec = {
  key: string;
  name: string;
  desc: string;
  build: () => Dataset;
};

// Small seeded PRNG so downloads are stable run-to-run.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const round = (n: number) => Math.round(n);

function pnlVariance(): Dataset {
  const r = rng(11);
  const lines: [string, number][] = [
    ["Net Revenue", 4_820_000],
    ["Services Revenue", 610_000],
    ["COGS", 1_910_000],
    ["Hosting & Infra", absVar(420_000)],
    ["Sales & Marketing", 720_000],
    ["R&D", 540_000],
    ["G&A", 410_000],
    ["Customer Success", 265_000],
    ["Professional Services", 180_000],
    ["Travel & Events", 95_000],
    ["Software & Tools", 132_000],
    ["Bad Debt", 28_000],
  ];
  function absVar(b: number) {
    return b;
  }
  const rows = lines.map(([item, budget]) => {
    const actual = round(budget * (0.9 + r() * 0.22));
    return [item, actual, budget];
  });
  return { columns: ["Line Item", "Actual", "Budget"], rows };
}

function salesCommission(): Dataset {
  const r = rng(23);
  const reps = [
    "A. Mehta", "J. Park", "L. Diaz", "S. Khan", "R. Cohen",
    "M. Ito", "T. Novak", "P. Singh", "N. Brooks", "C. Alvarez",
  ];
  const regions = ["West", "East", "North", "South"];
  const products = ["Platform", "Analytics", "Premium Support", "Integrations"];
  const rows: (string | number)[][] = [];
  let deal = 1000;
  for (const rep of reps) {
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      rows.push([
        rep,
        regions[Math.floor(r() * regions.length)],
        products[Math.floor(r() * products.length)],
        `D-${deal++}`,
        round(30_000 + r() * 180_000),
      ]);
    }
  }
  return { columns: ["Rep", "Region", "Product", "Deal", "Revenue"], rows };
}

function revenueForecast(): Dataset {
  const r = rng(37);
  const months = [
    "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  ];
  let v = 410_000;
  const rows = months.map((m) => {
    v = v * (1.03 + (r() - 0.5) * 0.04);
    return [m, round(v)];
  });
  return { columns: ["Month", "Revenue"], rows };
}

function productMargin(): Dataset {
  const r = rng(53);
  const products = [
    "Platform", "Analytics", "Premium Support", "Integrations",
    "Professional Services", "Training", "Add-ons", "Marketplace",
  ];
  const rows = products.map((p) => {
    const rev = round(200_000 + r() * 1_400_000);
    const cost = round(rev * (0.35 + r() * 0.4));
    return [p, rev, cost];
  });
  return { columns: ["Product", "Revenue", "Cost"], rows };
}

function glTransactions(): Dataset {
  const r = rng(71);
  const accounts = [
    "4000 Revenue", "5000 COGS", "6000 Payroll", "6100 Marketing",
    "6200 Software", "6300 Travel", "6400 Rent", "6500 Professional Fees",
  ];
  const depts = ["Sales", "Eng", "Marketing", "G&A", "Success", "Product"];
  const rows: (string | number)[][] = [];
  for (let i = 0; i < 200; i++) {
    const day = 1 + Math.floor(r() * 28);
    const month = 1 + Math.floor(r() * 6);
    const acct = accounts[Math.floor(r() * accounts.length)];
    const isRev = acct.startsWith("4000");
    const amt = round((isRev ? 1 : -1) * (500 + r() * 40_000));
    rows.push([
      `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      acct,
      depts[Math.floor(r() * depts.length)],
      `JE-${10_000 + i}`,
      amt,
    ]);
  }
  return { columns: ["Date", "Account", "Department", "Journal", "Amount"], rows };
}

export const SAMPLES: SampleSpec[] = [
  { key: "pnl-variance", name: "P&L — Actual vs Budget", desc: "12 line items for variance analysis", build: pnlVariance },
  { key: "sales-commission", name: "Sales bookings by rep", desc: "~40 deals across 10 reps for commissions", build: salesCommission },
  { key: "revenue-forecast", name: "Monthly revenue (18 mo)", desc: "Time series for forecasting", build: revenueForecast },
  { key: "product-margin", name: "Revenue & cost by product", desc: "8 segments for margin analysis", build: productMargin },
  { key: "gl-transactions", name: "GL transactions", desc: "200 journal lines — generic dummy data", build: glTransactions },
];

export const SAMPLE_BY_KEY: Record<string, SampleSpec> = Object.fromEntries(
  SAMPLES.map((s) => [s.key, s]),
);
