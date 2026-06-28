// Analytics Studio — shared types. One intelligent workspace that fuses Excel AI
// + Power BI AI. All processing is browser-only (Analyze-Only by default).

export type ColType = "date" | "currency" | "percent" | "number" | "text";
export type ColRole = "measure" | "dimension" | "date" | "id";

export type Column = {
  name: string;
  index: number;
  type: ColType;
  role: ColRole;
  currency?: string;     // symbol, when type === "currency"
  nullPct: number;       // 0..100
  distinct: number;
  sample: string[];      // a few example values
};

export type Table = {
  name: string;          // sheet name
  columns: Column[];
  rows: string[][];      // raw cell strings (header excluded)
  rowCount: number;
};

export type Profile = {
  tables: Table[];
  primaryTable: string;          // the richest sheet
  dateColumns: string[];         // "Table.Column"
  measureColumns: string[];
  dimensionColumns: string[];
  entities: string[];            // business entities inferred from dimensions
  currency: string | null;       // dominant currency symbol
};

export type DashboardKind =
  | "executive" | "sales" | "finance" | "pricing" | "commission" | "operations" | "custom";

export type Agg = "sum" | "avg" | "count" | "distinct" | "ratio";

export type Kpi = {
  id: string;
  label: string;
  table: string;
  column: string;        // measure column (or "*" for count)
  agg: Agg;
  format: "currency" | "number" | "percent";
  num?: string;          // ratio numerator column
  den?: string;          // ratio denominator column
  dax: string;           // generated DAX measure
  explain: string;       // plain-English explanation
  aiExplain?: string;    // optional AI-enhanced explanation
};

export type DashboardSpec = {
  kind: DashboardKind;
  title: string;
  kpis: Kpi[];
  trendDate?: string;        // date column for the trend chart
  trendMeasureId?: string;   // KPI id charted over time
  breakdownDim?: string;     // dimension column for the breakdown chart
  breakdownMeasureId?: string;
};
