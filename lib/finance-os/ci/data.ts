// Commercial Intelligence data model. ALL modules read from these four uploaded
// masters — there is NO seeded/sample data anywhere in CI. Everything is derived
// from what the user loads in the Data Hub. Browser-only; nothing leaves the device.

import { toNum, type Table } from "@/lib/finance/csv";
import type { ColumnMapping, FieldSpec } from "../types";

export type SalesRow = { date: string; region: string; customer: string; product: string; category: string; units: number; revenue: number; cost: number };
export type OppRow = {
  id: string; date: string; customer: string; region: string; product: string; category: string;
  competitor: string; listPrice: number; cost: number; competitorPrice: number;
  requestedDiscountPct: number; volume: number; status: "Open" | "Won" | "Lost"; reason: string;
};
export type OurSkuRow = { sku: string; product: string; category: string; features: string[]; capacity: number; warrantyMonths: number; price: number; cost: number; annualUnits: number };
export type CompetitorSkuRow = {
  competitor: string; sku: string; product: string; category: string; region: string;
  features: string[]; capacity: number; warrantyMonths: number; price: number; estRevenue: number; estMarginPct: number;
};

export type CiData = { sales: SalesRow[]; opps: OppRow[]; ourSkus: OurSkuRow[]; competitorSkus: CompetitorSkuRow[] };
export const EMPTY_CI_DATA: CiData = { sales: [], opps: [], ourSkus: [], competitorSkus: [] };

export type DatasetKey = keyof CiData;

const str = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");
const num = (row: string[], i: number) => (i >= 0 ? (Number.isFinite(toNum(row[i])) ? toNum(row[i]) : 0) : 0);
const list = (row: string[], i: number) => str(row, i).split(/[;|]/).map((s) => s.trim()).filter(Boolean);
const status = (s: string): OppRow["status"] => {
  const v = s.toLowerCase();
  if (v.startsWith("won")) return "Won";
  if (v.startsWith("lost")) return "Lost";
  return "Open";
};

export type DatasetSpec = {
  key: DatasetKey;
  label: string;
  hint: string;
  fields: FieldSpec[];
  template: string; // downloadable CSV (header + one illustrative row)
  parse: (t: Table, m: ColumnMapping) => unknown[];
};

export const CI_DATASETS: DatasetSpec[] = [
  {
    key: "sales",
    label: "Sales",
    hint: "Historical sales line items — drives territory, growth and our revenue.",
    fields: [
      { key: "date", label: "Date", synonyms: ["period", "month"] },
      { key: "region", label: "Region", synonyms: ["territory", "area", "geo"], required: true },
      { key: "customer", label: "Customer", synonyms: ["account", "client"], required: true },
      { key: "product", label: "Product", synonyms: ["item", "sku", "model"] },
      { key: "category", label: "Category", synonyms: ["line", "type", "segment"], required: true },
      { key: "units", label: "Units", synonyms: ["qty", "quantity", "volume"], numeric: true },
      { key: "revenue", label: "Revenue", synonyms: ["sales", "amount", "net"], numeric: true, required: true },
      { key: "cost", label: "Cost", synonyms: ["cogs", "cost of goods"], numeric: true, required: true },
    ],
    template: "date,region,customer,product,category,units,revenue,cost\n2026-01-15,Texas,Acme Wash,Tunnel System,Tunnel,1,84000,62000",
    parse: (t, m) =>
      t.rows.map<SalesRow>((r) => ({
        date: str(r, m.date), region: str(r, m.region), customer: str(r, m.customer), product: str(r, m.product),
        category: str(r, m.category), units: num(r, m.units), revenue: num(r, m.revenue), cost: num(r, m.cost),
      })),
  },
  {
    key: "opps",
    label: "Opportunities",
    hint: "Pipeline + closed deals (status Open/Won/Lost) — drives Deal Desk, Win/Loss, competitor threat.",
    fields: [
      { key: "id", label: "Deal ID", synonyms: ["opp", "opportunity", "ref"] },
      { key: "date", label: "Date", synonyms: ["closedate", "period"] },
      { key: "customer", label: "Customer", synonyms: ["account", "client"], required: true },
      { key: "region", label: "Region", synonyms: ["territory", "area"], required: true },
      { key: "product", label: "Product", synonyms: ["item", "model"] },
      { key: "category", label: "Category", synonyms: ["line", "type"] },
      { key: "competitor", label: "Competitor", synonyms: ["rival", "vs", "incumbent"], required: true },
      { key: "listPrice", label: "List Price", synonyms: ["list", "price"], numeric: true, required: true },
      { key: "cost", label: "Cost", synonyms: ["cogs"], numeric: true, required: true },
      { key: "competitorPrice", label: "Competitor Price", synonyms: ["compprice", "rivalprice", "theirprice"], numeric: true },
      { key: "requestedDiscountPct", label: "Requested Discount %", synonyms: ["discount", "disc"], numeric: true },
      { key: "volume", label: "Volume", synonyms: ["qty", "units"], numeric: true },
      { key: "status", label: "Status", synonyms: ["stage", "outcome", "result"], required: true },
      { key: "reason", label: "Win/Loss Reason", synonyms: ["reason", "notes"] },
    ],
    template: "id,date,customer,region,product,category,competitor,listPrice,cost,competitorPrice,requestedDiscountPct,volume,status,reason\nO-101,2026-05-12,Sparkle Wash,Texas,Tunnel System,Tunnel,CleanCo,100000,62000,95000,18,3,Open,",
    parse: (t, m) =>
      t.rows.map<OppRow>((r, i) => ({
        id: str(r, m.id) || `row-${i + 1}`, date: str(r, m.date), customer: str(r, m.customer), region: str(r, m.region),
        product: str(r, m.product), category: str(r, m.category), competitor: str(r, m.competitor),
        listPrice: num(r, m.listPrice), cost: num(r, m.cost), competitorPrice: num(r, m.competitorPrice),
        requestedDiscountPct: num(r, m.requestedDiscountPct), volume: num(r, m.volume) || 1, status: status(str(r, m.status)), reason: str(r, m.reason),
      })),
  },
  {
    key: "ourSkus",
    label: "Our SKU Master",
    hint: "Your product catalog — drives SKU Intelligence, Margin Optimizer, Price Scanner.",
    fields: [
      { key: "sku", label: "SKU", synonyms: ["code", "id"], required: true },
      { key: "product", label: "Product", synonyms: ["name", "model"], required: true },
      { key: "category", label: "Category", synonyms: ["line", "type"], required: true },
      { key: "features", label: "Features", synonyms: ["attributes", "specs"] },
      { key: "capacity", label: "Capacity", synonyms: ["throughput", "cph"], numeric: true },
      { key: "warrantyMonths", label: "Warranty (months)", synonyms: ["warranty"], numeric: true },
      { key: "price", label: "Price", synonyms: ["listprice", "current"], numeric: true, required: true },
      { key: "cost", label: "Cost", synonyms: ["cogs"], numeric: true, required: true },
      { key: "annualUnits", label: "Annual Units", synonyms: ["volume", "qty"], numeric: true },
    ],
    template: "sku,product,category,features,capacity,warrantyMonths,price,cost,annualUnits\nT-900,Tunnel System T-900,Tunnel,Touchless;LED Dry;Eco Rinse,120,36,84000,62000,18",
    parse: (t, m) =>
      t.rows.map<OurSkuRow>((r) => ({
        sku: str(r, m.sku), product: str(r, m.product), category: str(r, m.category), features: list(r, m.features),
        capacity: num(r, m.capacity), warrantyMonths: num(r, m.warrantyMonths), price: num(r, m.price), cost: num(r, m.cost), annualUnits: num(r, m.annualUnits),
      })),
  },
  {
    key: "competitorSkus",
    label: "Competitor Catalog",
    hint: "Competitor product lines + your revenue/margin estimates (incl. categories you don't sell) — drives Competitor Intelligence profit pools & white-space.",
    fields: [
      { key: "competitor", label: "Competitor", synonyms: ["vendor", "rival"], required: true },
      { key: "sku", label: "SKU", synonyms: ["code"] },
      { key: "product", label: "Product", synonyms: ["name", "model"], required: true },
      { key: "category", label: "Category", synonyms: ["line", "type"], required: true },
      { key: "region", label: "Region", synonyms: ["territory", "area"] },
      { key: "features", label: "Features", synonyms: ["attributes", "specs"] },
      { key: "capacity", label: "Capacity", synonyms: ["throughput"], numeric: true },
      { key: "warrantyMonths", label: "Warranty (months)", synonyms: ["warranty"], numeric: true },
      { key: "price", label: "Price", synonyms: ["listprice"], numeric: true },
      { key: "estRevenue", label: "Est. Revenue", synonyms: ["revenue", "estrev", "sales"], numeric: true, required: true },
      { key: "estMarginPct", label: "Est. Margin %", synonyms: ["margin", "estmargin", "gm"], numeric: true, required: true },
    ],
    template: "competitor,sku,product,category,region,features,capacity,warrantyMonths,price,estRevenue,estMarginPct\nCleanCo,TX-1000,RivalWash TX-1000,Tunnel,Texas,Touchless;LED Dry;Eco Rinse;Ceramic Coat,130,24,95000,18000000,34",
    parse: (t, m) =>
      t.rows.map<CompetitorSkuRow>((r) => ({
        competitor: str(r, m.competitor), sku: str(r, m.sku), product: str(r, m.product), category: str(r, m.category), region: str(r, m.region),
        features: list(r, m.features), capacity: num(r, m.capacity), warrantyMonths: num(r, m.warrantyMonths),
        price: num(r, m.price), estRevenue: num(r, m.estRevenue), estMarginPct: num(r, m.estMarginPct),
      })),
  },
];
