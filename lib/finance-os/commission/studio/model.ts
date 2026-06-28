// ============================================================================
// COMMISSION STUDIO — Domain Model (Phase 1). Types only; no UI, no logic.
// Enterprise ICM (Xactly Incent-class). Every financial number is produced by
// the deterministic engine (Phase 4) against these structures and is fully
// traceable. AI never writes to these. See FINANCE_OS_APPS_DESIGN.md + the
// approved Commission Studio architecture (Phase 5A).
// ============================================================================

/* ----------------------------------------------------------------- scalars */
export type ISODate = string;            // "2026-06-28"
export type ISODateTime = string;        // "2026-06-28T10:00:00Z"
export type Money = number;              // currency carried on aggregates
export type CurrencyCode = string;       // "USD", "INR", …
export type Percent = number;            // 0..100

// Entity id aliases (string at runtime; named for readability + intent).
export type PlanId = string;
export type PlanVersionId = string;
export type RuleId = string;
export type RateTableId = string;
export type QuotaId = string;
export type TerritoryId = string;
export type CreditRuleId = string;
export type AcceleratorId = string;
export type DrawId = string;
export type GuaranteeId = string;
export type PayeeId = string;
export type PositionId = string;
export type OrgUnitId = string;
export type HierarchyId = string;
export type TransactionId = string;
export type CreditId = string;
export type RunId = string;
export type PayoutLineId = string;
export type StatementId = string;
export type DisputeId = string;
export type AdjustmentId = string;
export type ApprovalId = string;
export type PeriodId = string;
export type AuditEventId = string;
export type QuotaTargetId = string;
export type ImportBatchId = string;
export type FxRateId = string;

/* ----------------------------------------------------------------- mixins */
export type Audited = {
  createdAt: ISODateTime;
  createdBy: PayeeId | string;
  updatedAt?: ISODateTime;
  updatedBy?: PayeeId | string;
};
export type EffectiveDated = {
  effectiveFrom: ISODate;
  effectiveTo?: ISODate | null;          // null/undefined = open-ended
};
// Reusable components are versioned. `key` is the stable logical thread that
// survives across versions; `id` is THIS specific version. A PlanVersion pins
// concrete component `id`s, so a calculation run is reproducible against the
// exact component versions that applied. Editing a published component creates
// a new version (new `id`, same `key`, `supersedesId` → prior).
export type Versioned = {
  key: string;
  version: number;
  status: "draft" | "published" | "retired";
  supersedesId?: string;
};
// Optional external-system key for natural SAP / Excel import mapping.
export type Importable = { externalId?: string; importBatchId?: ImportBatchId };

export type Role =
  | "comp_admin" | "comp_analyst" | "sales_ops" | "comp_manager" | "finance"
  | "manager" | "payee" | "auditor";

/* ================================================================= PERIODS */
export type PeriodStatus = "open" | "calculating" | "review" | "approved" | "locked";
export type PeriodType = "month" | "quarter" | "year";
export type Period = Audited & {
  id: PeriodId;
  label: string;                          // "FY26 Q2 — Jun 2026"
  type: PeriodType;
  fiscalYear: string;
  start: ISODate;
  end: ISODate;
  status: PeriodStatus;
  reportingCurrency?: CurrencyCode;       // roll-up currency for the period
  lockedAt?: ISODateTime;
  reopenApprovalId?: ApprovalId;
};

/* ================================================================== PLANS */
export type PlanStatus = "active" | "retired";
export type Plan = Audited & Importable & {
  id: PlanId;
  name: string;
  segment: string;                        // "AE — Enterprise", "SDR", …
  description?: string;
  status: PlanStatus;
  currentVersionId?: PlanVersionId;
};

export type PlanVersionStatus = "draft" | "in_review" | "approved" | "published" | "retired";
export type ComponentRefs = {
  rules: RuleId[];
  rateTables: RateTableId[];
  quotas: QuotaId[];
  territories: TerritoryId[];
  accelerators: AcceleratorId[];
  draws: DrawId[];
  guarantees: GuaranteeId[];
  creditRules: CreditRuleId[];
};
export type PlanVersion = Audited & EffectiveDated & {
  id: PlanVersionId;
  planId: PlanId;
  version: number;                        // 1, 2, 3…
  status: PlanVersionStatus;
  components: ComponentRefs;
  eligibility: EligibilityCriteria;       // who this version applies to
  notes?: string;
  approvalId?: ApprovalId;
  publishedAt?: ISODateTime;
};

/* ============================================================ COMPONENTS */
// Reusable, versioned building blocks referenced by plan versions.

export type RuleKind = "credit" | "measurement" | "payout";
export type RuleCondition = { field: string; op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains"; value: string | number | string[] };
export type RuleAction =
  | { type: "credit"; creditRuleId: CreditRuleId }
  | { type: "measure"; quotaId: QuotaId; measure: string }   // attainment vs quota
  | { type: "payout"; rateTableId: RateTableId; basis: "attainment" | "amount" };
export type Rule = Audited & Versioned & EffectiveDated & {
  id: RuleId;
  name: string;
  kind: RuleKind;
  description?: string;
  conditions: RuleCondition[];            // ALL must match (AND)
  action: RuleAction;
  // NOTE: "where used" is DERIVED from PlanVersion.components — never stored.
};

export type RateType = "percent" | "fixed" | "multiplier";
export type RateTier = {
  id: string;                             // stable key for UI edit + audit
  fromPct?: Percent; toPct?: Percent;     // when basis = attainment
  fromAmt?: Money; toAmt?: Money;         // when basis = amount
  rate: number;                           // % / fixed amount / multiplier
  rateType: RateType;
  cap?: Money;                            // optional per-tier cap
};
export type RateTable = Audited & Versioned & EffectiveDated & {
  id: RateTableId;
  name: string;
  basis: "attainment" | "amount";
  tiers: RateTier[];                      // ordered, non-overlapping
  currency?: CurrencyCode;
};

// QuotaTarget is a first-class, high-volume row (one per payee/territory) — NOT
// embedded — so a quota scales to tens of thousands of targets.
export type QuotaTarget = Importable & {
  id: QuotaTargetId;
  quotaId: QuotaId;
  periodId: PeriodId;
  payeeId?: PayeeId; positionId?: PositionId; territoryId?: TerritoryId;
  amount: Money;
};
export type Quota = Audited & Versioned & EffectiveDated & Importable & {
  id: QuotaId;
  name: string;
  periodId: PeriodId;
  measure: string;                        // "bookings", "revenue", "units"
  currency?: CurrencyCode;
  approvalId?: ApprovalId;                // manager roll-up approval
  // targets live in the `quotaTargets` collection, keyed by quotaId.
};

export type TerritoryDimension = "geo" | "account" | "product" | "segment" | "industry";
export type TerritoryScope = { dimension: TerritoryDimension; op: "in" | "eq" | "contains"; values: string[] };
export type Territory = Audited & Versioned & EffectiveDated & Importable & {
  id: TerritoryId;
  name: string;
  scope: TerritoryScope[];                // ALL must match
  assignedTo: Array<{ payeeId?: PayeeId; positionId?: PositionId }>;
};

export type CreditType = "direct" | "split" | "override" | "rollup";
export type CreditAllocation = { id: string; positionLevel?: number; role?: Role; payeeId?: PositionId; pct: Percent };
export type CreditRule = Audited & Versioned & EffectiveDated & {
  id: CreditRuleId;
  name: string;
  creditType: CreditType;
  match: RuleCondition[];                 // which transactions
  allocations: CreditAllocation[];        // who gets what share (sums to 100 for splits)
};

export type Accelerator = Audited & Versioned & EffectiveDated & {
  id: AcceleratorId;
  name: string;
  thresholdPct: Percent;                  // applies above this attainment
  multiplier: number;                     // e.g. 1.5×
  appliesToRuleId?: RuleId;
  cap?: Money;
  currency?: CurrencyCode;
};

export type Draw = Audited & Versioned & EffectiveDated & {
  id: DrawId;
  name: string;
  amount: Money;
  currency?: CurrencyCode;
  recoverable: boolean;                   // recoverable vs guaranteed advance
  recoveryPeriods?: number;               // over how many periods
  payeeScope: Array<{ payeeId?: PayeeId; positionId?: PositionId }>;
};

export type Guarantee = Audited & Versioned & EffectiveDated & {
  id: GuaranteeId;
  name: string;
  minimumAmount: Money;                   // floor payout
  currency?: CurrencyCode;
  periods: PeriodId[];
  payeeScope: Array<{ payeeId?: PayeeId; positionId?: PositionId }>;
};

/* ============================================================ ORGANIZATION */
export type EligibilityCriteria = {
  roles?: Role[];
  positionIds?: PositionId[];
  orgUnitIds?: OrgUnitId[];
  segments?: string[];
};

export type PayeeStatus = "active" | "inactive" | "terminated";
export type Payee = Audited & Importable & {
  id: PayeeId;
  name: string;
  employeeId: string;
  email: string;
  positionId?: PositionId;
  managerId?: PayeeId;
  status: PayeeStatus;
  hireDate: ISODate;
  termDate?: ISODate;
  planIds: PlanId[];                      // assigned plans
};

export type Position = Audited & EffectiveDated & Importable & {
  id: PositionId;
  title: string;
  level: number;                          // 1 = IC … higher = senior
  role?: Role;
  orgUnitId: OrgUnitId;
  planIds: PlanId[];
};

export type OrgUnit = {
  id: OrgUnitId;
  externalId?: string;
  name: string;
  parentId?: OrgUnitId;                   // tree
  positionIds: PositionId[];
};
export type Hierarchy = Audited & EffectiveDated & {
  id: HierarchyId;
  name: string;
  units: OrgUnit[];                       // effective-dated org tree snapshot
};

/* ================================================================ DATA */
export type Transaction = {
  id: TransactionId;
  externalId?: string;                    // source-system key (SAP doc no., etc.)
  importBatchId?: ImportBatchId;          // lineage to the import
  date: ISODate;
  periodId: PeriodId;
  amount: Money;
  currency: CurrencyCode;
  quantity?: number;
  productId?: string;
  accountId?: string;
  region?: string;
  ownerPayeeId?: PayeeId;                 // primary owner if known
  raw?: Record<string, string>;          // original row (Analyze-Only)
};

// Import lineage — a mapped batch from Excel / CSV / SAP extract. Reuses the
// shared Upload + ColumnMapper; Analyze-Only by default (temporary).
export type ImportBatch = Audited & {
  id: ImportBatchId;
  sourceSystem: "excel" | "csv" | "sap" | "api" | "other";
  fileName?: string;
  entity: "transaction" | "quota" | "payee" | "hierarchy" | "territory";
  mappingTemplate?: Record<string, string>; // sourceColumn → model field
  rowCount: number;
  periodId?: PeriodId;
  status: "staged" | "committed" | "discarded";
};

// FX rates for cross-currency commissions → conversion to a reporting currency.
export type FxRate = EffectiveDated & {
  id: FxRateId;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  periodId?: PeriodId;
};

export type Credit = {
  id: CreditId;
  transactionId: TransactionId;
  payeeId: PayeeId;
  creditRuleId: CreditRuleId;
  type: CreditType;
  amount: Money;                          // credited value
  splitPct: Percent;
  periodId: PeriodId;
};

/* ========================================================= CALCULATION */
export type RunStatus = "queued" | "running" | "done" | "error";
export type RunMode = "full" | "incremental";
export type CalculationRun = Audited & {
  id: RunId;
  periodId: PeriodId;
  planVersionIds: PlanVersionId[];        // exact versions snapshotted for this run
  status: RunStatus;
  mode: RunMode;
  startedAt?: ISODateTime;
  finishedAt?: ISODateTime;
  stats: { payees: number; transactions: number; payoutLines: number; exceptions: number };
  error?: string;
};

// One derivation step in a payout's trace — "where the number came from".
export type TraceStep = {
  id: string;                             // stable key for UI keying + linking
  step: string;                           // "Credit", "Attainment", "Rate tier", "Accelerator", "Cap", "Draw", "Guarantee", "Clawback"
  detail: string;                         // human-readable explanation
  input?: number;
  output?: number;
  ref?: { kind: "rule" | "rateTable" | "quota" | "territory" | "accelerator" | "draw" | "guarantee" | "creditRule" | "adjustment" | "transaction"; id: string };
};

// A PayoutLine is a DERIVED run output (never hand-edited; regenerated by a run)
// — so it is not Audited. It carries explicit foreign keys for the FULL chain
// (Transaction → Credit → Rule → RateTable → Accelerator → Draw/Guarantee →
// Payout) so traceability is queryable/indexable at enterprise scale, plus a
// human-readable `trace[]` for the UI.
export type PayoutLine = {
  id: PayoutLineId;
  runId: RunId;
  payeeId: PayeeId;
  periodId: PeriodId;
  // exact versions/components that produced this number (reproducibility):
  planVersionId: PlanVersionId;
  ruleId: RuleId;
  rateTableId?: RateTableId;
  acceleratorIds?: AcceleratorId[];
  drawId?: DrawId;
  guaranteeId?: GuaranteeId;
  // lineage FKs (queryable, not only in trace[]):
  sourceTransactionIds: TransactionId[];
  creditIds: CreditId[];
  adjustmentIds?: AdjustmentId[];
  // computed figures (run output):
  attainmentPct?: Percent;
  creditAmount: Money;
  rate: number;
  rateType: RateType;
  grossPayout: Money;
  accelerationApplied?: Money;
  capApplied?: Money;                     // amount reduced by a cap (if any)
  drawApplied?: Money;                    // recovered against draw
  guaranteeApplied?: Money;               // top-up to minimum
  clawback?: Money;
  adjustmentTotal?: Money;
  netPayout: Money;
  currency: CurrencyCode;
  // multi-currency: converted into a reporting currency for roll-ups:
  fxRateId?: FxRateId;
  reportingCurrency?: CurrencyCode;
  netPayoutReporting?: Money;
  trace: TraceStep[];                     // full, ordered derivation
};

/* ================================================================ STATEMENTS */
export type StatementStatus = "draft" | "published" | "acknowledged" | "reissued";
export type StatementTotals = { credit: Money; gross: Money; draw: Money; adjustment: Money; net: Money; ytdNet?: Money };
export type Statement = Audited & {
  id: StatementId;
  payeeId: PayeeId;
  periodId: PeriodId;
  runId: RunId;
  version: number;                        // reissued on adjustment
  status: StatementStatus;
  currency: CurrencyCode;
  payoutLineIds: PayoutLineId[];
  totals: StatementTotals;
  generatedAt: ISODateTime;
  publishedAt?: ISODateTime;
  acknowledgedAt?: ISODateTime;
  supersedesId?: StatementId;
};

/* ================================================================ DISPUTES */
export type DisputeStatus = "open" | "triage" | "investigating" | "resolved" | "rejected";
export type DisputeMessage = { id: string; at: ISODateTime; author: PayeeId | string; body: string; attachmentRef?: string };
export type Dispute = Audited & {
  id: DisputeId;
  payeeId: PayeeId;
  periodId: PeriodId;
  subject: { payoutLineId?: PayoutLineId; statementId?: StatementId };
  status: DisputeStatus;
  reason: string;
  ownerId?: PayeeId;                      // assigned analyst
  slaDueAt?: ISODateTime;
  thread: DisputeMessage[];
  resolutionAdjustmentId?: AdjustmentId;
  resolvedAt?: ISODateTime;
};

/* ============================================================== ADJUSTMENTS */
export type AdjustmentStatus = "pending" | "approved" | "rejected";
export type Adjustment = Audited & {
  id: AdjustmentId;
  payeeId: PayeeId;
  periodId: PeriodId;
  amount: Money;                          // signed delta
  currency: CurrencyCode;
  reason: string;                         // mandatory
  status: AdjustmentStatus;
  approvalId?: ApprovalId;
  relatedDisputeId?: DisputeId;
};

/* ================================================================ APPROVALS */
export type ApprovalSubjectType = "plan" | "quota" | "run" | "adjustment" | "statement" | "period_reopen";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalStep = {
  id: string;
  order: number;                          // explicit step ordering in the chain
  approverRole?: Role;
  approverPayeeId?: PayeeId;
  status: ApprovalStatus;
  decidedAt?: ISODateTime;
  comment?: string;
};
export type Approval = Audited & {
  id: ApprovalId;
  subjectType: ApprovalSubjectType;
  subjectId: string;
  requestedBy: PayeeId | string;
  route: ApprovalStep[];                  // ordered approval chain
  status: ApprovalStatus;
  autoApproved?: boolean;
};

/* ================================================================ AUDIT */
export type AuditAction =
  | "create" | "update" | "delete" | "publish" | "approve" | "reject"
  | "run" | "lock" | "unlock" | "assign" | "acknowledge" | "dispute" | "adjust";
export type AuditEntityType =
  | "plan" | "plan_version" | "rule" | "rate_table" | "quota" | "territory"
  | "credit_rule" | "accelerator" | "draw" | "guarantee" | "payee" | "position"
  | "hierarchy" | "transaction" | "credit" | "run" | "payout_line" | "statement"
  | "dispute" | "adjustment" | "approval" | "period";
export type AuditEvent = {
  id: AuditEventId;
  at: ISODateTime;
  actor: PayeeId | string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  periodId?: PeriodId;
  before?: unknown;                       // immutable snapshot
  after?: unknown;
  note?: string;
};

/* ============================================== AGGREGATE STORE SHAPE ====
   The full Commission Studio dataset. Phase 3+ persists this via the reused
   IndexedDB store (Analyze-Only by default). Listed here so later phases have a
   single source of truth for collections. ===================================== */
export type CommissionData = {
  periods: Period[];
  plans: Plan[];
  planVersions: PlanVersion[];
  rules: Rule[];
  rateTables: RateTable[];
  quotas: Quota[];
  quotaTargets: QuotaTarget[];
  territories: Territory[];
  creditRules: CreditRule[];
  accelerators: Accelerator[];
  draws: Draw[];
  guarantees: Guarantee[];
  payees: Payee[];
  positions: Position[];
  hierarchies: Hierarchy[];
  importBatches: ImportBatch[];
  fxRates: FxRate[];
  transactions: Transaction[];
  credits: Credit[];
  runs: CalculationRun[];
  payoutLines: PayoutLine[];
  statements: Statement[];
  disputes: Dispute[];
  adjustments: Adjustment[];
  approvals: Approval[];
  auditEvents: AuditEvent[];
};

export const EMPTY_COMMISSION_DATA: CommissionData = {
  periods: [], plans: [], planVersions: [], rules: [], rateTables: [], quotas: [],
  quotaTargets: [], territories: [], creditRules: [], accelerators: [], draws: [], guarantees: [],
  payees: [], positions: [], hierarchies: [], importBatches: [], fxRates: [],
  transactions: [], credits: [], runs: [],
  payoutLines: [], statements: [], disputes: [], adjustments: [], approvals: [], auditEvents: [],
};
