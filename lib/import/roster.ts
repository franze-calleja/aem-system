import { z } from "zod";
import type { LearningModality, Sex, SpedStatus } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

export const ROSTER_COLUMNS = [
  "lrn",
  "firstName",
  "lastName",
  "middleName",
  "sex",
  "birthDate",
  "gradeLevel",
  "section",
  "learningModality",
  "spedStatus",
] as const;

export const ROSTER_REQUIRED = [
  "lrn",
  "firstName",
  "lastName",
  "sex",
  "birthDate",
  "gradeLevel",
  "section",
] as const;

export type RosterRow = {
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  sex: Sex;
  birthDate: Date;
  gradeLevel: string;
  section: string;
  learningModality: LearningModality;
  spedStatus: SpedStatus;
};

const sexSchema = z.union([z.literal("MALE"), z.literal("FEMALE"), z.literal("M"), z.literal("F"), z.literal("Male"), z.literal("Female")]);
const modalitySchema = z.union([
  z.literal("FACE_TO_FACE"),
  z.literal("MODULAR"),
  z.literal("ONLINE"),
  z.literal("BLENDED"),
  z.literal("Face-to-face"),
  z.literal("face-to-face"),
]);
const spedSchema = z.union([z.literal("NONE"), z.literal("IEP"), z.literal("ACCOMMODATIONS"), z.literal("none"), z.literal("iep"), z.literal("accommodations")]);

function normalizeSex(v: string): Sex | null {
  const x = v.trim().toUpperCase();
  if (x === "M" || x === "MALE") return "MALE";
  if (x === "F" || x === "FEMALE") return "FEMALE";
  return null;
}

function normalizeModality(v: string | undefined): LearningModality {
  if (!v) return "FACE_TO_FACE";
  const x = v.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (x === "FACE_TO_FACE" || x === "F2F") return "FACE_TO_FACE";
  if (x === "MODULAR") return "MODULAR";
  if (x === "ONLINE") return "ONLINE";
  if (x === "BLENDED") return "BLENDED";
  return "FACE_TO_FACE";
}

function normalizeSped(v: string | undefined): SpedStatus {
  if (!v) return "NONE";
  const x = v.trim().toUpperCase();
  if (x === "IEP") return "IEP";
  if (x === "ACCOMMODATIONS" || x === "ACCOMMODATION") return "ACCOMMODATIONS";
  return "NONE";
}

function parseDate(v: string): Date | null {
  if (!v) return null;
  // Accept YYYY-MM-DD, MM/DD/YYYY, etc.
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  let d: Date | null = null;
  if (iso.test(v)) d = new Date(v + "T00:00:00.000Z");
  else if (us.test(v)) {
    const m = v.match(us)!;
    const yyyy = m[3];
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  }
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

/**
 * Validate a parsed roster CSV. Returns per-row OK / errors. Does not touch the DB.
 */
export function validateRosterCsv(parsed: ParsedCsv): ValidationResult<RosterRow> {
  const seenLrn = new Set<string>();

  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missingHeaders = ROSTER_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));

  if (missingHeaders.length > 0) {
    const all: ValidatedRow<RosterRow>[] = [
      {
        ok: false,
        row: 0,
        errors: [`Missing required column(s): ${missingHeaders.join(", ")}`],
        raw: {},
      },
    ];
    return summarize(all);
  }

  // Build case-insensitive accessor.
  const get = (r: Record<string, string>, key: string): string => {
    const exact = r[key];
    if (exact !== undefined) return (exact ?? "").toString().trim();
    const lower = key.toLowerCase();
    for (const k of Object.keys(r)) {
      if (k.toLowerCase() === lower) return (r[k] ?? "").toString().trim();
    }
    return "";
  };

  const validated: ValidatedRow<RosterRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2; // header is row 1
    const errors: string[] = [];

    const lrn = get(raw, "lrn");
    if (!/^\d{12}$/.test(lrn)) errors.push("LRN must be exactly 12 digits");
    if (seenLrn.has(lrn)) errors.push(`Duplicate LRN ${lrn} earlier in file`);
    seenLrn.add(lrn);

    const firstName = get(raw, "firstName");
    if (!firstName) errors.push("firstName required");

    const lastName = get(raw, "lastName");
    if (!lastName) errors.push("lastName required");

    const middleName = get(raw, "middleName") || null;

    const sex = normalizeSex(get(raw, "sex"));
    if (!sex) errors.push(`sex must be MALE or FEMALE (got "${get(raw, "sex")}")`);

    const birthDate = parseDate(get(raw, "birthDate"));
    if (!birthDate) errors.push(`birthDate must be YYYY-MM-DD or MM/DD/YYYY (got "${get(raw, "birthDate")}")`);

    const gradeLevel = get(raw, "gradeLevel");
    if (!gradeLevel) errors.push("gradeLevel required");

    const section = get(raw, "section");
    if (!section) errors.push("section required");

    const learningModality = normalizeModality(get(raw, "learningModality"));
    const spedStatus = normalizeSped(get(raw, "spedStatus"));

    if (errors.length > 0) {
      return { ok: false, row: rowNum, errors, raw };
    }

    return {
      ok: true,
      row: rowNum,
      data: {
        lrn,
        firstName,
        lastName,
        middleName,
        sex: sex as Sex,
        birthDate: birthDate as Date,
        gradeLevel,
        section,
        learningModality,
        spedStatus,
      },
    };
  });

  return summarize(validated);
}
