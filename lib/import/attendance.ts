import type { AttendanceStatus } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

export const ATTENDANCE_COLUMNS = ["lrn", "date", "status", "notes"] as const;
export const ATTENDANCE_REQUIRED = ["lrn", "date", "status"] as const;

export type AttendanceRow = {
  lrn: string;
  enrollmentId: string;
  date: Date;
  status: AttendanceStatus;
  notes: string | null;
};

function normalizeStatus(v: string): AttendanceStatus | null {
  const x = v.trim().toUpperCase();
  if (x === "P" || x === "PRESENT") return "PRESENT";
  if (x === "A" || x === "ABSENT") return "ABSENT";
  if (x === "T" || x === "TARDY" || x === "LATE") return "TARDY";
  if (x === "E" || x === "EXCUSED") return "EXCUSED";
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

export function validateAttendanceCsv(parsed: ParsedCsv, refs: Refs): ValidationResult<AttendanceRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missing = ATTENDANCE_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));
  if (missing.length > 0) {
    return summarize<AttendanceRow>([
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

  const seenKeys = new Set<string>();

  const validated: ValidatedRow<AttendanceRow>[] = parsed.rows.map((raw, idx) => {
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

    const status = normalizeStatus(get(raw, "status"));
    if (!status) errors.push(`status must be PRESENT/ABSENT/TARDY/EXCUSED (got "${get(raw, "status")}")`);

    const notes = get(raw, "notes") || null;

    if (enrollmentId && date) {
      const key = `${enrollmentId}::${date.toISOString().slice(0, 10)}`;
      if (seenKeys.has(key)) {
        errors.push(`duplicate row for LRN ${lrn} on ${date.toISOString().slice(0, 10)} earlier in file`);
      }
      seenKeys.add(key);
    }

    if (errors.length > 0 || !enrollmentId || !date || !status) {
      return { ok: false, row: rowNum, errors, raw };
    }

    return {
      ok: true,
      row: rowNum,
      data: { lrn, enrollmentId, date, status, notes },
    };
  });

  return summarize(validated);
}
