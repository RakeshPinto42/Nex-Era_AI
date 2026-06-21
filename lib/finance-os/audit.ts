// Audit Engine — every module run produces an immutable AuditRecord. Reused
// across all Finance OS modules. Persisted only inside a saved workspace.

import { uid } from "@/lib/utils";
import { countBySeverity, type Exception, type Severity } from "./validate";

export type AuditAction = { at: number; action: string; detail?: string };

export type AuditRecord = {
  runId: string;
  timestamp: number;
  module: string;
  filesProcessed: { name: string; role: string; rows: number }[];
  validationExceptions: number;
  exceptionsBySeverity: Record<Severity, number>;
  totals: Record<string, number>;
  userActions: AuditAction[];
};

export function newRunId(): string {
  return uid("run");
}

export function createAudit(params: {
  module: string;
  filesProcessed: { name: string; role: string; rows: number }[];
  exceptions: Exception[];
  totals: Record<string, number>;
  userActions?: AuditAction[];
}): AuditRecord {
  return {
    runId: newRunId(),
    timestamp: Date.now(),
    module: params.module,
    filesProcessed: params.filesProcessed,
    validationExceptions: params.exceptions.length,
    exceptionsBySeverity: countBySeverity(params.exceptions),
    totals: params.totals,
    userActions: params.userActions ?? [],
  };
}

/** Append a user action to a record (returns a new record). */
export function logAction(record: AuditRecord, action: string, detail?: string): AuditRecord {
  return {
    ...record,
    userActions: [...record.userActions, { at: Date.now(), action, detail }],
  };
}
