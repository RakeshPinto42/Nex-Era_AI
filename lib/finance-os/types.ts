// Shared types for the NEXERA Finance OS. Everything is browser-only — datasets
// live in memory and are persisted only when the user explicitly saves a
// workspace (see lib/finance-os/workspace.ts).

import type { Table } from "@/lib/finance/csv";

export type FileRole =
  | "sales"
  | "target"
  | "employee"
  | "actuals"
  | "budget"
  | "forecast"
  | "other";

export const FILE_ROLES: { value: FileRole; label: string; hint: string }[] = [
  { value: "sales", label: "Sales", hint: "Transactions / deals by rep" },
  { value: "target", label: "Targets", hint: "Quota per rep / period" },
  { value: "employee", label: "Employee Master", hint: "Reps, regions, products" },
  { value: "actuals", label: "Actuals", hint: "Realized financials" },
  { value: "budget", label: "Budget", hint: "Planned financials" },
  { value: "forecast", label: "Forecast", hint: "Projected financials" },
  { value: "other", label: "Other", hint: "Any supporting file" },
];

/** An uploaded, parsed file held in memory. */
export type Dataset = {
  id: string;
  name: string;
  role: FileRole;
  table: Table;
  addedAt: number;
};

/** A field the user maps a column onto, used across modules. */
export type FieldSpec = {
  key: string;
  label: string;
  synonyms: string[];
  required?: boolean;
  numeric?: boolean;
};

/** fieldKey → column index (-1 means unmapped). */
export type ColumnMapping = Record<string, number>;
