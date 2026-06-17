import type { AssessmentKind } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

export const GRADES_COLUMNS = [
  "lrn",
  "subjectCode",
  "quarter",
  "score",
  "maxScore",
  "assessmentKind",
  "label",
] as const;

export const GRADES_REQUIRED = ["lrn", "subjectCode", "quarter", "score", "maxScore"] as const;

export type GradesRow = {
  lrn: string;
  enrollmentId: string;
  subjectCode: string;
  subjectId: string;
  quarter: 1 | 2 | 3 | 4;
  score: number;
  maxScore: number;
  assessmentKind: AssessmentKind;
  label: string | null;
};

function normalizeAssessmentKind(v: string | undefined): AssessmentKind {
  if (!v) return "REGULAR";
  const x = v.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (x === "QUIZ") return "QUIZ";
  if (x === "PERIODICAL" || x === "EXAM") return "PERIODICAL";
  if (x === "PRE_TEST" || x === "PRETEST") return "PRE_TEST";
  if (x === "POST_TEST" || x === "POSTTEST") return "POST_TEST";
  return "REGULAR";
}

type Refs = {
  /** LRN → enrollmentId for the target school year */
  enrollmentByLrn: Map<string, string>;
  /** subject code → subjectId for the target school year */
  subjectByCode: Map<string, string>;
};

export function validateGradesCsv(parsed: ParsedCsv, refs: Refs): ValidationResult<GradesRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missing = GRADES_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));
  if (missing.length > 0) {
    return summarize<GradesRow>([
      {
        ok: false,
        row: 0,
        errors: [`Missing required column(s): ${missing.join(", ")}`],
        raw: {},
      },
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

  const validated: ValidatedRow<GradesRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2;
    const errors: string[] = [];

    const lrn = get(raw, "lrn");
    if (!/^\d{12}$/.test(lrn)) errors.push("LRN must be exactly 12 digits");
    const enrollmentId = refs.enrollmentByLrn.get(lrn);
    if (!enrollmentId && /^\d{12}$/.test(lrn)) {
      errors.push(`LRN ${lrn} is not enrolled in the target school year`);
    }

    const subjectCode = get(raw, "subjectCode").toUpperCase();
    if (!subjectCode) errors.push("subjectCode required");
    const subjectId = refs.subjectByCode.get(subjectCode);
    if (!subjectId && subjectCode) {
      errors.push(`subjectCode ${subjectCode} does not exist for the target school year`);
    }

    const qRaw = get(raw, "quarter");
    const q = Number(qRaw);
    if (!Number.isInteger(q) || q < 1 || q > 4) {
      errors.push(`quarter must be 1, 2, 3, or 4 (got "${qRaw}")`);
    }

    const scoreRaw = get(raw, "score");
    const score = Number(scoreRaw);
    if (!Number.isFinite(score) || score < 0) errors.push(`score must be a non-negative number (got "${scoreRaw}")`);

    const maxRaw = get(raw, "maxScore");
    const maxScore = Number(maxRaw);
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      errors.push(`maxScore must be a positive number (got "${maxRaw}")`);
    }

    if (Number.isFinite(score) && Number.isFinite(maxScore) && score > maxScore) {
      errors.push(`score (${score}) cannot exceed maxScore (${maxScore})`);
    }

    const assessmentKind = normalizeAssessmentKind(get(raw, "assessmentKind"));
    const label = get(raw, "label") || null;

    if (errors.length > 0 || !enrollmentId || !subjectId) {
      return { ok: false, row: rowNum, errors, raw };
    }

    return {
      ok: true,
      row: rowNum,
      data: {
        lrn,
        enrollmentId,
        subjectCode,
        subjectId,
        quarter: q as 1 | 2 | 3 | 4,
        score,
        maxScore,
        assessmentKind,
        label,
      },
    };
  });

  return summarize(validated);
}
