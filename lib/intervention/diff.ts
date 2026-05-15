// Pure helpers for intervention revisions: build a structured diff and decide
// whether a change requires re-approval.

import type { InterventionType, PatternScope } from "@prisma/client";

const SIGNIFICANT_DURATION_DAYS = 30;

export type InterventionSnapshot = {
  scope: PatternScope;
  scopeTargetId: string;
  type: InterventionType;
  startDate: Date;
  endDate: Date | null;
  schedule: string | null;
  accommodations: string | null;
  staffActions: string | null;
  targetOutcomes: string | null;
  rationale: string;
  counselingContext: string | null;
};

export type FieldDiff = { from: unknown; to: unknown };
export type InterventionDiff = Record<string, FieldDiff>;

const PUBLIC_FIELDS = [
  "scope",
  "scopeTargetId",
  "type",
  "startDate",
  "endDate",
  "schedule",
  "accommodations",
  "staffActions",
  "targetOutcomes",
] as const;

const SENSITIVE_FIELDS = ["rationale", "counselingContext"] as const;

/**
 * Returns the set of fields that differ between two snapshots. Dates are
 * compared by ISO date (yyyy-mm-dd) so we ignore time-of-day noise; nulls
 * normalize to `null`.
 */
export function buildDiff(before: InterventionSnapshot, after: InterventionSnapshot): InterventionDiff {
  const diff: InterventionDiff = {};
  for (const f of [...PUBLIC_FIELDS, ...SENSITIVE_FIELDS]) {
    const a = normalize(before[f]);
    const b = normalize(after[f]);
    if (a !== b) {
      diff[f] = { from: a, to: b };
    }
  }
  return diff;
}

/**
 * A revision is "significant" — per spec §6.6 + handover 3.5 — when any of:
 *   - scope changes
 *   - type changes
 *   - target population changes (scopeTargetId)
 *   - end date extends original by more than 30 days (or vice versa)
 *
 * Significant revisions to broader-scope ACTIVE plans must re-enter the
 * principal approval queue. Pure function — caller decides what to do.
 */
export function detectSignificantChange(
  before: InterventionSnapshot,
  after: InterventionSnapshot,
): boolean {
  if (before.scope !== after.scope) return true;
  if (before.type !== after.type) return true;
  if (before.scopeTargetId !== after.scopeTargetId) return true;
  const beforeEnd = before.endDate?.getTime() ?? null;
  const afterEnd = after.endDate?.getTime() ?? null;
  if (beforeEnd === null && afterEnd !== null) {
    // Bounded → unbounded counts as significant only when the new end pushes
    // past +30 days from the original start.
    const startMs = before.startDate.getTime();
    const diffDays = (afterEnd - startMs) / (1000 * 60 * 60 * 24);
    return Math.abs(diffDays) > SIGNIFICANT_DURATION_DAYS;
  }
  if (beforeEnd !== null && afterEnd === null) {
    return true; // bounded → unbounded is always a meaningful schedule change
  }
  if (beforeEnd !== null && afterEnd !== null) {
    const diffDays = Math.abs(afterEnd - beforeEnd) / (1000 * 60 * 60 * 24);
    return diffDays > SIGNIFICANT_DURATION_DAYS;
  }
  return false;
}

/**
 * Whether the (potentially significant) revision should bounce the plan back
 * to PENDING_APPROVAL. STUDENT-scope plans never need re-approval — only
 * broader scopes do.
 */
export function shouldReenterApproval(scope: PatternScope, isSignificant: boolean): boolean {
  if (!isSignificant) return false;
  return scope !== "STUDENT";
}

function normalize(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.trim().length === 0 ? null : value.trim();
  return value;
}
