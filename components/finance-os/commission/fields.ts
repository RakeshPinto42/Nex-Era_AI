import type { FieldSpec } from "@/lib/finance-os/types";

// Canonical fields the Commission Hub maps onto uploaded columns.

export const SALES_FIELDS: FieldSpec[] = [
  { key: "rep", label: "Rep / Owner", synonyms: ["salesperson", "employee", "owner", "name", "agent", "associate", "advisor"], required: true },
  { key: "revenue", label: "Revenue", synonyms: ["sales", "amount", "bookings", "acv", "value", "mrr"], numeric: true },
  { key: "cost", label: "Cost (COGS)", synonyms: ["cogs", "cost of goods", "expense"], numeric: true },
  { key: "units", label: "Units", synonyms: ["qty", "quantity", "count", "volume", "memberships", "deals"], numeric: true },
  { key: "collections", label: "Collections", synonyms: ["collected", "cash", "received", "payment"], numeric: true },
  { key: "region", label: "Region", synonyms: ["territory", "geo", "area", "country", "site", "location", "store"] },
  { key: "product", label: "Product", synonyms: ["sku", "line", "category", "segment", "plan", "membership", "package", "service"] },
];

export const TARGET_FIELDS: FieldSpec[] = [
  { key: "rep", label: "Rep / Owner", synonyms: ["salesperson", "employee", "owner", "name", "agent", "associate", "advisor"], required: true },
  { key: "quota", label: "Quota / Target", synonyms: ["target", "goal", "plan", "budget", "mrr target", "membership target"], numeric: true, required: true },
];
