import type { BehaviorCategory, BehaviorSeverity } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

export const BEHAVIORAL_COLUMNS = ["lrn", "date", "category", "severity", "description"] as const;
export const BEHAVIORAL_REQUIRED = ["lrn", "date", "category", "severity", "description"] as const;

export type BehavioralRow = {
  lrn: string;
  enrollmentId: string;
  date: Date;
  category: BehaviorCategory;
  severity: BehaviorSeverity;
  description: string;
};

function normalizeCategory(v: string): BehaviorCategory | null {
  const x = v.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (x === "ACADEMIC") return "ACADEMIC";
  if (x === "ATTENDANCE" || x === "ATTENDANCE_RELATED") return "ATTENDANCE_RELATED";
  if (x === "BEHAVIORAL" || x === "BEHAVIOR") return "BEHAVIORAL";
  if (x === "SOCIAL_EMOTIONAL" || x === "SEL") return "SOCIAL_EMOTIONAL";
  return null;
}

function normalizeSeverity(v: string): BehaviorSeverity | null {
  const x = v.trim().toUpperCase();
  if (x === "LOW" || x === "L") return "LOW";
  if (x === "MODERATE" || x === "MED" || x === "M" || x === "MEDIUM") return "MODERATE";
  if (x === "HIGH" || x === "H") return "HIGH";
  return null;
}

function parseDate(v: string): Date | null {
  if (!v) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  let d: Date | null = null;
  if (iso.test(v)) d = new Date(v + "T00:00:00.000Z");
  else if (us.test(v)) {
    const m = v.match(us)!;
    d = new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00.000Z`);
  }
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

type Refs = {
  enrollmentByLrn: Map<string, string>;
};

export function validateBehavioralCsv(parsed: ParsedCsv, refs: Refs): ValidationResult<BehavioralRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missing = BEHAVIORAL_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));
  if (missing.length > 0) {
    return summarize<BehavioralRow>([
      { ok: false, row: 0, errors: [`Missing required column(s): ${missing.join(", ")}`], raw: {} },
    ]);
  }

  const get = (r: Record<string, string>, key: string): string => {
    const exact = r[key];
    if (exact !== undefined) return (exact ?? "").toString().trim();
    const lower = key.toLowerCase();
    for (const k of Object.keys(r)) {
      if (k.toLowerCase() === lower) return (r[k] ?? "").toString().trim();
    }
    return "";
  };

  const validated: ValidatedRow<BehavioralRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const lrn = get(raw, "lrn");
    if (!/^\d{12}$/.test(lrn)) errors.push("LRN must be exactly 12 digits");
    const enrollmentId = refs.enrollmentByLrn.get(lrn);
    if (!enrollmentId && /^\d{12}$/.test(lrn)) {
      errors.push(`LRN ${lrn} is not enrolled in the target school year`);
    }

    const date = parseDate(get(raw, "date"));
    if (!date) errors.push(`date must be YYYY-MM-DD or MM/DD/YYYY (got "${get(raw, "date")}")`);

    const category = normalizeCategory(get(raw, "category"));
    if (!category) errors.push(`category must be ACADEMIC/ATTENDANCE_RELATED/BEHAVIORAL/SOCIAL_EMOTIONAL (got "${get(raw, "category")}")`);

    const severity = normalizeSeverity(get(raw, "severity"));
    if (!severity) errors.push(`severity must be LOW/MODERATE/HIGH (got "${get(raw, "severity")}")`);

    const description = get(raw, "description");
    if (!description) errors.push("description required");

    if (errors.length > 0 || !enrollmentId || !date || !category || !severity || !description) {
      return { ok: false, row: rowNum, errors, raw };
    }

    return {
      ok: true,
      row: rowNum,
      data: { lrn, enrollmentId, date, category, severity, description },
    };
  });

  return summarize(validated);
}
