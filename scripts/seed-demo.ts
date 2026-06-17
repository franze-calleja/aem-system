// Phase 7.4 demo data generator.
//
// Produces 3 school years of synthetic data following a cohort progression
// (G7 → G8 → G9 across years), with fixture students + sections tuned to
// trip every pattern rule the detector currently surfaces, and one closed
// intervention per scope. Run after the regular seed.
//
//   npx tsx scripts/seed-demo.ts
//
// Safe to re-run: students/sections/subjects are keyed on deterministic
// codes (LRN range 300xxxxxxxxx, demo section names, code prefixes), and
// per-enrollment data is regenerated only if absent. The risk engine is
// then run once per SY so historical dashboards have something to render.

import "dotenv/config";
import {
  PrismaClient,
  Role,
  Sex,
  LearningModality,
  ConsentScope,
  type Prisma,
  type AssessmentKind,
  type AttendanceStatus,
  type BehaviorCategory,
  type BehaviorSeverity,
  type InterventionType,
  type ParticipationOutcome,
  type PatternScope,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { computeRiskScore } from "../lib/risk/engine";
import { detectStudentPatterns, detectSectionPatterns } from "../lib/patterns/detector";
import { generateRecommendation } from "../lib/patterns/recommendations";
import type { PatternRuleConfig, PatternRuleId } from "../lib/patterns/rules";
import type { RiskThresholds, RiskWeights } from "../lib/risk/types";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Tunables ───────────────────────────────────────────────────────────────

const STUDENTS_PER_SECTION = 40;
const DEMO_PASSWORD = "demo123";

// School years in chronological order. The third must match the active SY
// the regular seed creates so this script doesn't fight with it.
const YEARS = [
  { label: "SY 2023-2024", start: "2023-08-01", end: "2024-05-31", isActive: false },
  { label: "SY 2024-2025", start: "2024-08-01", end: "2025-05-31", isActive: false },
  { label: "SY 2025-2026", start: "2025-08-01", end: "2026-05-31", isActive: true },
] as const;

// Demo section names chosen to NOT collide with the regular seed's
// (G9 Newton, G9 Curie). Two sections per grade level, same names re-used
// across years per the spec (a section is a per-year object).
const SECTION_NAMES_BY_GRADE = {
  "Grade 7": ["Aristotle", "Bacon"],
  "Grade 8": ["Darwin", "Einstein"],
  "Grade 9": ["Faraday", "Galileo"],
} as const;

const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9"] as const;
type GradeLevel = (typeof GRADE_LEVELS)[number];

const SUBJECT_DEFS = ["MATH", "ENG", "SCI", "AP", "FIL"] as const;
const SUBJECT_FULL: Record<(typeof SUBJECT_DEFS)[number], string> = {
  MATH: "Mathematics",
  ENG: "English",
  SCI: "Science",
  AP: "Araling Panlipunan",
  FIL: "Filipino",
};

// Cohort = group of students that entered Grade 7 in a given SY. Encoded by
// the YEAR_INDEX (0..4) of their G7 year so we can compute which grade they
// are in for any of the YEARS rows.
//   cohortIndex -1: G9 in 23-24 only (graduated before history starts)
//   cohortIndex  0: G8 in 23-24, G9 in 24-25 (graduated; G7 year is pre-history)
//   cohortIndex  1: G7 in 23-24 ... G9 in 25-26 (full lineage we see)
//   cohortIndex  2: G7 in 24-25 ... G8 in 25-26
//   cohortIndex  3: G7 in 25-26 only
//
// Each cohort has STUDENTS_PER_SECTION * 2 students (so they fill 2 sections
// per grade level in any year they appear). The cohort-A / cohort-B split
// just keeps a stable section assignment across years.
const COHORTS = [
  { id: -1, label: "C2021", startYearIdx: -2 }, // G9 in 23-24
  { id: 0, label: "C2022", startYearIdx: -1 }, // G8 in 23-24, G9 in 24-25
  { id: 1, label: "C2023", startYearIdx: 0 }, // G7..G9 across 23-26
  { id: 2, label: "C2024", startYearIdx: 1 }, // G7..G8 across 24-26
  { id: 3, label: "C2025", startYearIdx: 2 }, // G7 in 25-26
] as const;

// ─── Seeded PRNG ────────────────────────────────────────────────────────────
// mulberry32 — small, deterministic, plenty of randomness for fixtures.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(...parts: (string | number)[]): number {
  // FNV-1a 32-bit, sufficient for PRNG seeding.
  let h = 2166136261;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Box-Muller for grade noise.
function gaussian(rng: () => number, mean: number, stdev: number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdev * z;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function gradeFromCohortYear(cohortStartYearIdx: number, yearIdx: number): GradeLevel | null {
  const offset = yearIdx - cohortStartYearIdx;
  if (offset === 0) return "Grade 7";
  if (offset === 1) return "Grade 8";
  if (offset === 2) return "Grade 9";
  return null; // not present in this year
}

function deterministicLrn(cohortId: number, index: number): string {
  // 12-digit LRN: prefix "3" marks demo data; cohort id offset by 5 to avoid
  // negative numbers; index zero-padded.
  const cohortPart = String(cohortId + 5).padStart(2, "0");
  const indexPart = String(index).padStart(8, "0");
  return `30${cohortPart}${indexPart}`;
}

const FIRST_NAMES_M = [
  "Mateo", "Lucas", "Diego", "Rafael", "Gabriel", "Daniel", "Ezekiel", "Liam",
  "Joaquin", "Sebastian", "Adrian", "Emilio", "Nathan", "Vincent", "Christian",
  "Lorenzo", "Felix", "Ronan", "Caleb", "Joshua", "Noel", "Ramon", "Eduardo",
];
const FIRST_NAMES_F = [
  "Sofia", "Isabella", "Maria", "Camille", "Beatriz", "Andrea", "Mikaela",
  "Therese", "Patricia", "Bianca", "Aurora", "Trinity", "Margarita", "Carmen",
  "Daniela", "Elena", "Francesca", "Luna", "Stella", "Yana", "Zara", "Esme",
];
const LAST_NAMES = [
  "Santos", "Reyes", "Garcia", "Cruz", "Mendoza", "Aquino", "Bautista",
  "Castillo", "Domingo", "Estrada", "Flores", "Gutierrez", "Hernandez",
  "Ibarra", "Jimenez", "Lopez", "Morales", "Navarro", "Ocampo", "Pascual",
  "Quintana", "Ramos", "Salazar", "Tolentino", "Uy", "Valdez", "Yap", "Zarate",
];

function nameFor(rng: () => number, sex: Sex): { first: string; last: string } {
  const first = sex === "MALE" ? pick(rng, FIRST_NAMES_M) : pick(rng, FIRST_NAMES_F);
  const last = pick(rng, LAST_NAMES);
  return { first, last };
}

// School-day calendar generator: weekdays only between two dates, capped.
function schoolDays(start: Date, end: Date, max = 200): Date[] {
  const out: Date[] = [];
  const d = new Date(start);
  d.setUTCHours(0, 0, 0, 0);
  while (d <= end && out.length < max) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// ─── Phase 1: ensure school years ───────────────────────────────────────────

async function ensureSchoolYears() {
  const yearMap = new Map<string, { id: string; startDate: Date; endDate: Date }>();
  for (const y of YEARS) {
    const row = await prisma.schoolYear.upsert({
      where: { label: y.label },
      update: { isActive: y.isActive, startDate: new Date(y.start), endDate: new Date(y.end) },
      create: {
        label: y.label,
        startDate: new Date(y.start),
        endDate: new Date(y.end),
        isActive: y.isActive,
      },
    });
    yearMap.set(y.label, { id: row.id, startDate: row.startDate, endDate: row.endDate });
  }
  return yearMap;
}

// ─── Phase 2: ensure sections per year ──────────────────────────────────────

async function ensureSections(yearMap: Map<string, { id: string }>) {
  // Returns Map<yearLabel, Map<gradeLevel, Map<sectionName, sectionId>>>
  const out = new Map<string, Map<GradeLevel, Map<string, string>>>();
  for (const y of YEARS) {
    const syId = yearMap.get(y.label)!.id;
    const gradeMap = new Map<GradeLevel, Map<string, string>>();
    for (const gradeLevel of GRADE_LEVELS) {
      const names = SECTION_NAMES_BY_GRADE[gradeLevel];
      const sectionMap = new Map<string, string>();
      for (const name of names) {
        const row = await prisma.section.upsert({
          where: {
            schoolYearId_gradeLevel_name: { schoolYearId: syId, gradeLevel, name },
          },
          update: {},
          create: { schoolYearId: syId, gradeLevel, name },
        });
        sectionMap.set(name, row.id);
      }
      gradeMap.set(gradeLevel, sectionMap);
    }
    out.set(y.label, gradeMap);
  }
  return out;
}

// ─── Phase 3: ensure subjects per year ──────────────────────────────────────

async function ensureSubjects(yearMap: Map<string, { id: string }>) {
  // Returns Map<yearLabel, Map<subjectCode, subjectId>>
  const out = new Map<string, Map<string, string>>();
  for (const y of YEARS) {
    const syId = yearMap.get(y.label)!.id;
    const codeMap = new Map<string, string>();
    for (const gradeLevel of GRADE_LEVELS) {
      const gradeNumber = gradeLevel.split(" ")[1]; // "7", "8", "9"
      for (const base of SUBJECT_DEFS) {
        const code = `${base}${gradeNumber}`;
        const row = await prisma.subject.upsert({
          where: { schoolYearId_code: { schoolYearId: syId, code } },
          update: {},
          create: {
            schoolYearId: syId,
            code,
            name: `${SUBJECT_FULL[base]} ${gradeNumber}`,
          },
        });
        codeMap.set(code, row.id);
      }
    }
    out.set(y.label, codeMap);
  }
  return out;
}

// ─── Phase 4: ensure demo teachers + assignments ────────────────────────────

const DEMO_TEACHERS: Array<{ email: string; name: string; subjectBase: (typeof SUBJECT_DEFS)[number] }> = [
  { email: "math.teacher@school.edu", name: "Mr. Aguilar (Math)", subjectBase: "MATH" },
  { email: "eng.teacher@school.edu", name: "Ms. Bautista (English)", subjectBase: "ENG" },
  { email: "sci.teacher@school.edu", name: "Mr. Chua (Science)", subjectBase: "SCI" },
  { email: "ap.teacher@school.edu", name: "Mrs. Dizon (AP)", subjectBase: "AP" },
  { email: "fil.teacher@school.edu", name: "Mr. Enriquez (Filipino)", subjectBase: "FIL" },
];

const DEMO_ADVISERS: Array<{ email: string; name: string; sectionName: string; gradeLevel: GradeLevel }> = [
  { email: "adviser.aristotle@school.edu", name: "Ms. Fajardo (G7 Aristotle Adviser)", sectionName: "Aristotle", gradeLevel: "Grade 7" },
  { email: "adviser.bacon@school.edu", name: "Mr. Galang (G7 Bacon Adviser)", sectionName: "Bacon", gradeLevel: "Grade 7" },
  { email: "adviser.darwin@school.edu", name: "Mrs. Herrera (G8 Darwin Adviser)", sectionName: "Darwin", gradeLevel: "Grade 8" },
  { email: "adviser.einstein@school.edu", name: "Ms. Inocencio (G8 Einstein Adviser)", sectionName: "Einstein", gradeLevel: "Grade 8" },
  { email: "adviser.faraday@school.edu", name: "Mr. Javier (G9 Faraday Adviser)", sectionName: "Faraday", gradeLevel: "Grade 9" },
  { email: "adviser.galileo@school.edu", name: "Ms. Katigbak (G9 Galileo Adviser)", sectionName: "Galileo", gradeLevel: "Grade 9" },
];

async function ensureDemoTeachers() {
  const teacherByEmail = new Map<string, string>();
  for (const t of [...DEMO_TEACHERS, ...DEMO_ADVISERS]) {
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name, role: Role.TEACHER, status: "ACTIVE" },
      create: { email: t.email, name: t.name, role: Role.TEACHER, hashedPassword: hashed },
    });
    teacherByEmail.set(t.email, u.id);
  }
  return teacherByEmail;
}

async function ensureTeacherAssignments(
  yearMap: Map<string, { id: string }>,
  sectionMap: Map<string, Map<GradeLevel, Map<string, string>>>,
  subjectMap: Map<string, Map<string, string>>,
  teacherByEmail: Map<string, string>,
) {
  for (const y of YEARS) {
    const syId = yearMap.get(y.label)!.id;
    const sectionsForYear = sectionMap.get(y.label)!;
    const subjectsForYear = subjectMap.get(y.label)!;

    // Subject teachers — each demo teacher teaches their subject in every demo
    // section (across all grade levels). Keeps assignment math simple.
    for (const t of DEMO_TEACHERS) {
      const userId = teacherByEmail.get(t.email)!;
      for (const gradeLevel of GRADE_LEVELS) {
        const gradeNumber = gradeLevel.split(" ")[1];
        const subjectCode = `${t.subjectBase}${gradeNumber}`;
        const subjectId = subjectsForYear.get(subjectCode);
        if (!subjectId) continue;
        const sections = sectionsForYear.get(gradeLevel)!;
        for (const [, sectionId] of sections) {
          await prisma.teacherAssignment.upsert({
            where: {
              userId_sectionId_subjectId_schoolYearId: {
                userId,
                sectionId,
                subjectId,
                schoolYearId: syId,
              },
            },
            update: {},
            create: { userId, sectionId, subjectId, schoolYearId: syId, isAdviser: false },
          });
        }
      }
    }

    // Advisers — one per demo section, no subject. (Adviser rows have
    // subjectId=null per the schema. The unique constraint includes
    // subjectId so we can't use upsert with null — query first.)
    for (const adv of DEMO_ADVISERS) {
      const userId = teacherByEmail.get(adv.email)!;
      const sectionId = sectionsForYear.get(adv.gradeLevel)!.get(adv.sectionName);
      if (!sectionId) continue;
      const existing = await prisma.teacherAssignment.findFirst({
        where: { userId, sectionId, subjectId: null, schoolYearId: syId },
        select: { id: true },
      });
      if (!existing) {
        await prisma.teacherAssignment.create({
          data: { userId, sectionId, subjectId: null, schoolYearId: syId, isAdviser: true },
        });
      }
    }
  }
}

// ─── Phase 5: ensure cohort students + consents ─────────────────────────────

type DemoStudent = {
  id: string;
  lrn: string;
  cohortId: number;
  indexInCohort: number;
  sex: Sex;
  spedStatus: "NONE" | "IEP" | "ACCOMMODATIONS";
  modality: LearningModality;
};

async function ensureCohortStudents(): Promise<Map<number, DemoStudent[]>> {
  const out = new Map<number, DemoStudent[]>();
  for (const cohort of COHORTS) {
    const rng = mulberry32(hashSeed("cohort", cohort.id));
    const students: DemoStudent[] = [];
    const count = STUDENTS_PER_SECTION * SECTION_NAMES_BY_GRADE["Grade 7"].length;
    for (let i = 0; i < count; i++) {
      const sex: Sex = rng() < 0.5 ? "FEMALE" : "MALE";
      const { first, last } = nameFor(rng, sex);
      const lrn = deterministicLrn(cohort.id, i + 1);
      // Light SPED distribution (~6% IEP, ~10% ACCOMMODATIONS, rest NONE).
      const spedRoll = rng();
      const spedStatus = spedRoll < 0.06 ? "IEP" : spedRoll < 0.16 ? "ACCOMMODATIONS" : "NONE";
      // Modality: most face-to-face, some blended, occasional modular.
      const modRoll = rng();
      const modality: LearningModality =
        modRoll < 0.85 ? "FACE_TO_FACE" : modRoll < 0.95 ? "BLENDED" : "MODULAR";

      // Birth date depends on cohort's G7 year. G7 students are ~12 y.o.
      const birthYear = 2023 + cohort.startYearIdx - 12;
      const birthMonth = randInt(rng, 1, 12);
      const birthDay = randInt(rng, 1, 28);
      const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

      const studentRow = await prisma.student.upsert({
        where: { lrn },
        update: { firstName: first, lastName: last, sex, birthDate, spedStatus },
        create: { lrn, firstName: first, lastName: last, sex, birthDate, spedStatus },
      });

      // Consents — all three scopes granted for demo students.
      for (const scope of [
        ConsentScope.DATA_PROCESSING,
        ConsentScope.AI_ANALYSIS,
        ConsentScope.INTERVENTION_PLANNING,
      ]) {
        await prisma.consentRecord.upsert({
          where: { studentId_scope: { studentId: studentRow.id, scope } },
          update: {},
          create: { studentId: studentRow.id, scope },
        });
      }

      students.push({
        id: studentRow.id,
        lrn,
        cohortId: cohort.id,
        indexInCohort: i,
        sex,
        spedStatus,
        modality,
      });
    }
    out.set(cohort.id, students);
  }
  return out;
}

// ─── Phase 6: enrollments (cohort progression) ──────────────────────────────

type DemoEnrollment = {
  id: string;
  studentId: string;
  schoolYearLabel: string;
  schoolYearId: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: GradeLevel;
  cohortId: number;
  indexInCohort: number;
  sex: Sex;
  spedStatus: "NONE" | "IEP" | "ACCOMMODATIONS";
  modality: LearningModality;
  isFixture: FixtureTag | null;
};

type FixtureTag =
  | "ACADEMIC_DECLINE"
  | "DISENGAGEMENT"
  | "CRISIS"
  | "RECOVERY"
  | "CHRONIC";

async function ensureEnrollments(
  yearMap: Map<string, { id: string }>,
  sectionMap: Map<string, Map<GradeLevel, Map<string, string>>>,
  cohortStudents: Map<number, DemoStudent[]>,
): Promise<DemoEnrollment[]> {
  const out: DemoEnrollment[] = [];
  for (const cohort of COHORTS) {
    const students = cohortStudents.get(cohort.id)!;
    for (let yearIdx = 0; yearIdx < YEARS.length; yearIdx++) {
      const grade = gradeFromCohortYear(cohort.startYearIdx, yearIdx);
      if (!grade) continue;
      const yearLabel = YEARS[yearIdx].label;
      const syId = yearMap.get(yearLabel)!.id;
      const sectionNames = SECTION_NAMES_BY_GRADE[grade];
      const sectionsByName = sectionMap.get(yearLabel)!.get(grade)!;

      for (const s of students) {
        // Stable section assignment: A = first half by index, B = second.
        const half = s.indexInCohort < students.length / 2 ? 0 : 1;
        const sectionName = sectionNames[half];
        const sectionId = sectionsByName.get(sectionName)!;

        const enrollment = await prisma.studentEnrollment.upsert({
          where: { studentId_schoolYearId: { studentId: s.id, schoolYearId: syId } },
          update: { sectionId, gradeLevel: grade, learningModality: s.modality },
          create: {
            studentId: s.id,
            schoolYearId: syId,
            sectionId,
            gradeLevel: grade,
            learningModality: s.modality,
          },
        });

        out.push({
          id: enrollment.id,
          studentId: s.id,
          schoolYearLabel: yearLabel,
          schoolYearId: syId,
          sectionId,
          sectionName,
          gradeLevel: grade,
          cohortId: cohort.id,
          indexInCohort: s.indexInCohort,
          sex: s.sex,
          spedStatus: s.spedStatus,
          modality: s.modality,
          isFixture: tagFixture(s, yearIdx),
        });
      }
    }
  }
  return out;
}

// Fixture tagging — by deterministic (cohortId, indexInCohort, yearIdx). One
// student per pattern rule, picked so the rule will fire when we generate
// data for them in the chosen year.
function tagFixture(s: DemoStudent, yearIdx: number): FixtureTag | null {
  // Maria-style academic decline: cohort C2023, student index 0, current SY
  // (25-26), Grade 9. Will get declining quarters + high absence rate.
  if (s.cohortId === 1 && s.indexInCohort === 0 && yearIdx === 2) return "ACADEMIC_DECLINE";
  // Disengagement: cohort C2023, index 1, same year.
  if (s.cohortId === 1 && s.indexInCohort === 1 && yearIdx === 2) return "DISENGAGEMENT";
  // Crisis warning: cohort C2024, index 0, current SY G8.
  if (s.cohortId === 2 && s.indexInCohort === 0 && yearIdx === 2) return "CRISIS";
  // Recovery tracking fixture — has an active intervention + improving
  // grades. Cohort C2023, index 2, current SY.
  if (s.cohortId === 1 && s.indexInCohort === 2 && yearIdx === 2) return "RECOVERY";
  // Chronic concern fixture — cohort C2023, index 3, full lineage with
  // unfavourable prior interventions seeded in history years.
  if (s.cohortId === 1 && s.indexInCohort === 3 && yearIdx === 2) return "CHRONIC";
  return null;
}

// ─── Phase 7: bulk-generate academic/attendance/behavioral ──────────────────

// Subject codes a student takes given their grade level.
function subjectCodesFor(grade: GradeLevel): string[] {
  const n = grade.split(" ")[1];
  return SUBJECT_DEFS.map((s) => `${s}${n}`);
}

// Which sections should be "stressed" to trip section-level rules. For each
// such section we boost absence + failing grades on every student in it.
// All in the current active SY so the principal dashboard shows live alerts.
type SectionFixture = {
  yearLabel: string;
  gradeLevel: GradeLevel;
  sectionName: string;
  rule: "CONCENTRATED_RISK" | "SUBJECT_STRUGGLE" | "ATTENDANCE_EROSION";
};

const SECTION_FIXTURES: SectionFixture[] = [
  // Concentrated risk on G9 Faraday (25-26) — boost absences + lower grades
  // so >30% land MODERATE/HIGH.
  { yearLabel: "SY 2025-2026", gradeLevel: "Grade 9", sectionName: "Faraday", rule: "CONCENTRATED_RISK" },
  // Subject struggle on G8 Darwin (25-26) — depress MATH8 specifically so
  // the section fail rate in MATH exceeds 40%.
  { yearLabel: "SY 2025-2026", gradeLevel: "Grade 8", sectionName: "Darwin", rule: "SUBJECT_STRUGGLE" },
  // Attendance erosion on G7 Bacon (25-26) — heavily elevate section
  // absence rate vs. the school average (G7 Bacon students get +20pp absences).
  { yearLabel: "SY 2025-2026", gradeLevel: "Grade 7", sectionName: "Bacon", rule: "ATTENDANCE_EROSION" },
];

function sectionFixtureFor(e: DemoEnrollment): SectionFixture | null {
  return (
    SECTION_FIXTURES.find(
      (sf) =>
        sf.yearLabel === e.schoolYearLabel &&
        sf.gradeLevel === e.gradeLevel &&
        sf.sectionName === e.sectionName,
    ) ?? null
  );
}

type GradeInsert = {
  enrollmentId: string;
  subjectId: string;
  quarter: number;
  score: number;
  maxScore: number;
  assessmentKind: AssessmentKind;
  label: string | null;
};

type AttendanceInsert = {
  enrollmentId: string;
  date: Date;
  status: AttendanceStatus;
};

type BehavioralInsert = {
  enrollmentId: string;
  date: Date;
  category: BehaviorCategory;
  severity: BehaviorSeverity;
  description: string;
};

async function generatePerEnrollmentData(
  enrollments: DemoEnrollment[],
  yearMap: Map<string, { id: string; startDate: Date; endDate: Date }>,
  subjectMap: Map<string, Map<string, string>>,
) {
  // Plan: skip enrollments that already have grades AND attendance (idempotency).
  // Collect inserts, then bulk-write in batches.
  const gradeInserts: GradeInsert[] = [];
  const attendanceInserts: AttendanceInsert[] = [];
  const behavioralInserts: BehavioralInsert[] = [];

  // Bulk pre-check existing data per enrollment so we don't double-generate.
  const ids = enrollments.map((e) => e.id);
  const existingGrades = new Set(
    (
      await prisma.grade.findMany({ where: { enrollmentId: { in: ids } }, select: { enrollmentId: true } })
    ).map((g) => g.enrollmentId),
  );
  const existingAttendance = new Set(
    (
      await prisma.attendance.findMany({
        where: { enrollmentId: { in: ids } },
        select: { enrollmentId: true },
        distinct: ["enrollmentId"],
      })
    ).map((a) => a.enrollmentId),
  );

  for (const e of enrollments) {
    const year = yearMap.get(e.schoolYearLabel)!;
    const subjectsForYear = subjectMap.get(e.schoolYearLabel)!;
    const codes = subjectCodesFor(e.gradeLevel);

    const sectionFixture = sectionFixtureFor(e);
    const fixture = e.isFixture;

    // Per-enrollment seeded RNG so reruns produce the same numbers.
    const rng = mulberry32(hashSeed("data", e.id));

    // ── Grades ─────────────────────────────────────────────────────────────
    if (!existingGrades.has(e.id)) {
      // Per-student academic baseline. Most kids cluster around 82.
      let baseline = clamp(gaussian(rng, 84, 6), 60, 96);

      // Adjust baseline for section fixture / student fixture.
      // CONCENTRATED_RISK needs >30% of the section into MODERATE/HIGH bands
      // (engine thresholds: MODERATE >=40, HIGH >=70). The earlier -10 / +0.08
      // tuning only landed ~15% into MODERATE — boost both academic + attendance
      // so the section reliably trips the rule.
      if (sectionFixture?.rule === "CONCENTRATED_RISK") baseline -= 22;
      if (sectionFixture?.rule === "SUBJECT_STRUGGLE") baseline -= 4;
      if (fixture === "ACADEMIC_DECLINE") baseline = 86; // starts high
      if (fixture === "CRISIS") baseline = 70;
      if (fixture === "DISENGAGEMENT") baseline = 76;
      // CHRONIC must land in HIGH band (score >=70) for CHRONIC_CONCERN to
      // match. Push academic + attendance + behavioral hard.
      if (fixture === "CHRONIC") baseline = 42;
      if (fixture === "RECOVERY") baseline = 68; // started low, will improve

      // Quarter modifiers per fixture type — applied to baseline per quarter.
      const quarterMods = [0, 0, 0, 0];
      if (fixture === "ACADEMIC_DECLINE") {
        quarterMods[0] = 0;
        quarterMods[1] = -6;
        quarterMods[2] = -10;
        quarterMods[3] = -14;
      } else if (fixture === "RECOVERY") {
        quarterMods[0] = 0;
        quarterMods[1] = +5;
        quarterMods[2] = +8;
        quarterMods[3] = +12;
      } else if (fixture === "DISENGAGEMENT") {
        quarterMods[2] = -3;
        quarterMods[3] = -4;
      }

      for (const code of codes) {
        const subjectId = subjectsForYear.get(code)!;
        // Per-subject affinity: random shift of +/- 4 points per subject.
        const subjectShift = (mulberry32(hashSeed("subj", e.id, code))() - 0.5) * 8;

        for (const quarter of [1, 2, 3, 4]) {
          let target = baseline + subjectShift + quarterMods[quarter - 1];

          // Specific subject struggle: MATH for SUBJECT_STRUGGLE section.
          if (sectionFixture?.rule === "SUBJECT_STRUGGLE" && code.startsWith("MATH")) {
            target -= 20; // depress MATH heavily in that section
          }

          const noise = (rng() - 0.5) * 6;
          const finalPct = clamp(Math.round(target + noise), 50, 99);
          gradeInserts.push({
            enrollmentId: e.id,
            subjectId,
            quarter,
            score: finalPct,
            maxScore: 100,
            assessmentKind: "REGULAR",
            label: `Q${quarter} Grade`,
          });
        }
      }
    }

    // ── Attendance ─────────────────────────────────────────────────────────
    if (!existingAttendance.has(e.id)) {
      const days = schoolDays(year.startDate, year.endDate, 180);
      // Per-student absence + tardy rates.
      let absenceRate = clamp(gaussian(rng, 0.04, 0.025), 0.0, 0.20);
      let tardyRate = clamp(gaussian(rng, 0.03, 0.02), 0.0, 0.15);

      // Section / fixture adjustments.
      if (sectionFixture?.rule === "ATTENDANCE_EROSION") absenceRate += 0.18;
      if (sectionFixture?.rule === "CONCENTRATED_RISK") absenceRate += 0.15;
      if (fixture === "ACADEMIC_DECLINE") absenceRate = 0.22;
      if (fixture === "DISENGAGEMENT") {
        absenceRate = 0.12;
        tardyRate = 0.14;
      }
      if (fixture === "CHRONIC") absenceRate = 0.32;

      // For CRISIS fixture, schedule a 6-day consecutive absence block partway
      // through the year on top of normal generation.
      const crisisBlockStart = fixture === "CRISIS" ? Math.floor(days.length * 0.55) : -1;
      const crisisBlockLen = 6;

      for (let i = 0; i < days.length; i++) {
        let status: AttendanceStatus = "PRESENT";
        if (crisisBlockStart >= 0 && i >= crisisBlockStart && i < crisisBlockStart + crisisBlockLen) {
          status = "ABSENT";
        } else {
          const roll = rng();
          if (roll < absenceRate) status = "ABSENT";
          else if (roll < absenceRate + tardyRate) status = "TARDY";
          else if (roll < absenceRate + tardyRate + 0.005) status = "EXCUSED";
        }
        attendanceInserts.push({ enrollmentId: e.id, date: days[i], status });
      }
    }

    // ── Behavioral ─────────────────────────────────────────────────────────
    // Lightweight: most kids get 0; some 1 LOW; fixtures get specific incidents.
    const wantBehavioral = !existingGrades.has(e.id); // generate only first time
    if (wantBehavioral) {
      const days = schoolDays(year.startDate, year.endDate, 180);
      const incidentCount =
        fixture === "CRISIS"
          ? 3
          : fixture === "DISENGAGEMENT"
            ? 2
            : fixture === "CHRONIC"
              ? 6 // CHRONIC needs higher behavioral weight to push into HIGH band
              : rng() < 0.15
                ? 1
                : 0;

      for (let k = 0; k < incidentCount; k++) {
        const date = days[Math.min(days.length - 1, randInt(rng, 20, days.length - 5))];
        let severity: BehaviorSeverity = "LOW";
        let category: BehaviorCategory = "BEHAVIORAL";
        if (fixture === "CRISIS") {
          severity = k === 0 ? "HIGH" : "MODERATE";
          category = "BEHAVIORAL";
        } else if (fixture === "DISENGAGEMENT") {
          severity = "MODERATE";
          category = "SOCIAL_EMOTIONAL";
        } else if (fixture === "CHRONIC") {
          // Mix: 1 HIGH + rest MODERATE to push weighted count to ~11.
          severity = k === 0 ? "HIGH" : "MODERATE";
          category = "BEHAVIORAL";
        } else {
          severity = "LOW";
          category = "ACADEMIC";
        }
        behavioralInserts.push({
          enrollmentId: e.id,
          date,
          category,
          severity,
          description: `Generated demo incident #${k + 1} (${severity.toLowerCase()})`,
        });
      }
    }
  }

  // ── Bulk-insert in batches ────────────────────────────────────────────────
  console.log(
    `  inserts queued: grades=${gradeInserts.length} attendance=${attendanceInserts.length} behavioral=${behavioralInserts.length}`,
  );
  await bulkInsert(prisma.grade, gradeInserts);
  await bulkInsert(prisma.attendance, attendanceInserts);
  await bulkInsert(prisma.behavioralRecord, behavioralInserts);
}

// createMany in 1,000-row batches so we don't blow query size.
async function bulkInsert<T>(
  model: { createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<unknown> },
  rows: T[],
) {
  const batchSize = 1000;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await model.createMany({ data: batch, skipDuplicates: true });
  }
}

// ─── Phase 8: closed interventions across all 4 scopes ──────────────────────

async function createDemoInterventions(
  yearMap: Map<string, { id: string }>,
  enrollments: DemoEnrollment[],
) {
  const counselor = await prisma.user.findUnique({ where: { email: "counselor@school.edu" } });
  if (!counselor) {
    console.warn("  counselor@school.edu not found; skipping interventions");
    return;
  }
  const principal = await prisma.user.findUnique({ where: { email: "principal@school.edu" } });

  // Marker we put in `staffActions` so we can detect existing demo
  // interventions on rerun (idempotency).
  const marker = "[DEMO]";

  // Helpers ────────────────────────────────────────────────────────────────
  type Plan = {
    scope: PatternScope;
    scopeTargetId: string;
    schoolYearLabel: string;
    type: InterventionType;
    startDate: Date;
    endDate: Date | null;
    participantEnrollmentIds: string[];
    status: "ACTIVE" | "COMPLETED";
    rationale: string;
    targetOutcomes: string;
    schedule: string;
    accommodations: string;
    staffActions: string;
    outcomes?: ParticipationOutcome[];
    closeReason?: string;
  };

  const plans: Plan[] = [];

  // (A) Closed INDIVIDUAL — one student from 23-24 cohort C2022 who has since
  // moved on. Outcome IMPROVING. Closed.
  const individualParticipant = enrollments.find(
    (e) => e.cohortId === 0 && e.indexInCohort === 0 && e.schoolYearLabel === "SY 2023-2024",
  );
  if (individualParticipant) {
    plans.push({
      scope: "STUDENT",
      scopeTargetId: individualParticipant.studentId,
      schoolYearLabel: "SY 2023-2024",
      type: "ACADEMIC_SUPPORT",
      startDate: new Date("2023-10-01T00:00:00Z"),
      endDate: new Date("2024-02-15T00:00:00Z"),
      participantEnrollmentIds: [individualParticipant.id],
      status: "COMPLETED",
      rationale: "Q1 math grade dropped 12 points; weekly 1:1 tutoring set up.",
      targetOutcomes: "Recover Q2 math average to within 5pts of Q1 baseline.",
      schedule: "Tue/Thu 4pm, 6 weeks",
      accommodations: "Extended quiz time; weekly progress check-in.",
      staffActions: `${marker} Math teacher submits weekly score notes; adviser monitors attendance.`,
      outcomes: ["IMPROVING"],
      closeReason: "Q3 average recovered above baseline; case closed.",
    });
  }

  // (B) Closed SECTION — G9 Faraday in 24-25 (cohort C2022 second-half). Mixed
  // outcomes. COMPLETED.
  const sectionFaradayEnrollments2425 = enrollments.filter(
    (e) =>
      e.schoolYearLabel === "SY 2024-2025" &&
      e.gradeLevel === "Grade 9" &&
      e.sectionName === "Faraday",
  );
  if (sectionFaradayEnrollments2425.length > 0) {
    plans.push({
      scope: "SECTION",
      scopeTargetId: sectionFaradayEnrollments2425[0].sectionId,
      schoolYearLabel: "SY 2024-2025",
      type: "SECTION_INTERVENTION",
      startDate: new Date("2024-11-01T00:00:00Z"),
      endDate: new Date("2025-04-15T00:00:00Z"),
      participantEnrollmentIds: sectionFaradayEnrollments2425.map((e) => e.id),
      status: "COMPLETED",
      rationale: "Concentrated risk across G9 Faraday — 32% in MODERATE/HIGH after Q2.",
      targetOutcomes: "Reduce MODERATE/HIGH share to <25% by end of SY.",
      schedule: "Weekly homeroom intervention block",
      accommodations: "Peer tutoring pairs; counselor visits Mondays.",
      staffActions: `${marker} Adviser facilitates homeroom block; counselor case-reviews monthly.`,
      outcomes: sectionFaradayEnrollments2425.map((_, i) =>
        i % 3 === 0 ? "IMPROVING" : i % 3 === 1 ? "STABLE" : "COMPLETED",
      ),
      closeReason: "End-of-year review: HIGH share down 11pts; plan retired.",
    });
  }

  // (C) Closed GRADE — Grade 8 in 23-24. COMPLETED with outcomes.
  const grade8In2324 = enrollments.filter(
    (e) => e.schoolYearLabel === "SY 2023-2024" && e.gradeLevel === "Grade 8",
  );
  if (grade8In2324.length > 0) {
    plans.push({
      scope: "GRADE",
      scopeTargetId: "Grade 8",
      schoolYearLabel: "SY 2023-2024",
      type: "ACADEMIC_SUPPORT",
      startDate: new Date("2023-09-15T00:00:00Z"),
      endDate: new Date("2024-03-31T00:00:00Z"),
      participantEnrollmentIds: grade8In2324.map((e) => e.id),
      status: "COMPLETED",
      rationale: "Grade-wide math fundamentals gap identified pre-Q1.",
      targetOutcomes: "All G8 students passing Q3 math (>=75).",
      schedule: "Twice-weekly remediation 4-5pm",
      accommodations: "Subject-coded study packets; small group tutoring.",
      staffActions: `${marker} All G8 advisers + math teachers coordinate weekly.`,
      outcomes: grade8In2324.map((_, i) => (i % 4 === 0 ? "COMPLETED" : i % 4 === 1 ? "IMPROVING" : i % 4 === 2 ? "STABLE" : "COMPLETED")),
      closeReason: "Q4 math pass rate 92%; objective met.",
    });
  }

  // (D) Closed SCHOOL — school-wide attendance program 23-24. COMPLETED.
  const allActive2324 = enrollments.filter((e) => e.schoolYearLabel === "SY 2023-2024");
  if (allActive2324.length > 0) {
    plans.push({
      scope: "SCHOOL",
      scopeTargetId: "school",
      schoolYearLabel: "SY 2023-2024",
      type: "ATTENDANCE_PROGRAM",
      startDate: new Date("2023-08-15T00:00:00Z"),
      endDate: new Date("2024-05-15T00:00:00Z"),
      participantEnrollmentIds: allActive2324.map((e) => e.id),
      status: "COMPLETED",
      rationale: "School-wide tardiness up 7pp y/y; rolling incentive program.",
      targetOutcomes: "Restore school average tardy rate to <5%.",
      schedule: "Year-long; monthly recognition",
      accommodations: "Section-level competitions; adviser-led morning huddles.",
      staffActions: `${marker} Advisers track daily; principal reviews monthly dashboard.`,
      outcomes: allActive2324.map(() => "COMPLETED"),
      closeReason: "Closing snapshot: tardy rate 4.6%; objective met.",
    });
  }

  // (E) CHRONIC fixture history — the CHRONIC_CONCERN rule fires when the
  // student has ≥2 prior interventions with DECLINED outcomes AND is currently
  // in the HIGH band. Seed two closed plans across prior years for the CHRONIC
  // fixture (cohort C2023, indexInCohort 3) — G7 in 23-24, G8 in 24-25.
  const chronicG7 = enrollments.find(
    (e) => e.cohortId === 1 && e.indexInCohort === 3 && e.schoolYearLabel === "SY 2023-2024",
  );
  if (chronicG7) {
    plans.push({
      scope: "STUDENT",
      scopeTargetId: chronicG7.studentId,
      schoolYearLabel: "SY 2023-2024",
      type: "ACADEMIC_SUPPORT",
      startDate: new Date("2023-11-01T00:00:00Z"),
      endDate: new Date("2024-04-30T00:00:00Z"),
      participantEnrollmentIds: [chronicG7.id],
      status: "COMPLETED",
      rationale: "G7 student persistently below 75 in MATH+SCI. Targeted tutoring.",
      targetOutcomes: "Reach passing in core subjects by Q4.",
      schedule: "Mon/Wed 4-5pm",
      accommodations: "Test re-take option; quiet workspace.",
      staffActions: `${marker} Subject teachers + adviser coordinate weekly.`,
      outcomes: ["DECLINING"],
      closeReason: "End-of-year review: trajectory worsened despite support. Plan retired pending counselor reassessment.",
    });
  }
  const chronicG8 = enrollments.find(
    (e) => e.cohortId === 1 && e.indexInCohort === 3 && e.schoolYearLabel === "SY 2024-2025",
  );
  if (chronicG8) {
    plans.push({
      scope: "STUDENT",
      scopeTargetId: chronicG8.studentId,
      schoolYearLabel: "SY 2024-2025",
      type: "COUNSELING_SESSION",
      startDate: new Date("2024-10-01T00:00:00Z"),
      endDate: new Date("2025-03-15T00:00:00Z"),
      participantEnrollmentIds: [chronicG8.id],
      status: "COMPLETED",
      rationale: "Continuing concern from G7. Engagement-focused counselling sessions.",
      targetOutcomes: "Restore weekly attendance and Q3 GWA above 78.",
      schedule: "Tue 3pm bi-weekly",
      accommodations: "Adviser quarterly review; parent comms loop.",
      staffActions: `${marker} Counsellor leads; adviser flags weekly attendance.`,
      outcomes: ["DECLINING"],
      closeReason: "Year-end: indicators continue to decline. Escalate to case review.",
    });
  }

  // (F) Active interventions for 25-26 so the live dashboards show pipeline.
  // (Not strictly required by 7.4 but cheap.)
  const academicDeclineFixture = enrollments.find(
    (e) => e.isFixture === "ACADEMIC_DECLINE" && e.schoolYearLabel === "SY 2025-2026",
  );
  if (academicDeclineFixture) {
    plans.push({
      scope: "STUDENT",
      scopeTargetId: academicDeclineFixture.studentId,
      schoolYearLabel: "SY 2025-2026",
      type: "ACADEMIC_SUPPORT",
      startDate: new Date("2025-11-15T00:00:00Z"),
      endDate: new Date("2026-03-31T00:00:00Z"),
      participantEnrollmentIds: [academicDeclineFixture.id],
      status: "ACTIVE",
      rationale: "Three quarters of declining math + elevated absences. Tutoring + check-ins.",
      targetOutcomes: "Recover GWA above 80 by Q4; reduce absence rate to <10%.",
      schedule: "Mon/Wed 3:30-4:30pm",
      accommodations: "Test re-take option; weekly counselor check-in.",
      staffActions: `${marker} Math teacher logs weekly observation; adviser flags absences same-day.`,
    });
  }
  const recoveryFixture = enrollments.find(
    (e) => e.isFixture === "RECOVERY" && e.schoolYearLabel === "SY 2025-2026",
  );
  if (recoveryFixture) {
    plans.push({
      scope: "STUDENT",
      scopeTargetId: recoveryFixture.studentId,
      schoolYearLabel: "SY 2025-2026",
      type: "COUNSELING_SESSION",
      startDate: new Date("2025-09-15T00:00:00Z"),
      endDate: null,
      participantEnrollmentIds: [recoveryFixture.id],
      status: "ACTIVE",
      rationale: "Post-Q1 recovery plan; counselor monitoring + monthly review.",
      targetOutcomes: "Sustain improving trajectory through Q4.",
      schedule: "Bi-weekly Fri 2pm",
      accommodations: "Adviser quarterly review.",
      staffActions: `${marker} Counselor leads; adviser provides quarterly note.`,
    });
  }

  // ── Persist ──────────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  for (const plan of plans) {
    const sy = yearMap.get(plan.schoolYearLabel);
    if (!sy) continue;
    // Idempotency: re-detect by (scope, target, year, type, status) +
    // [DEMO] marker in staffActions.
    const existing = await prisma.intervention.findFirst({
      where: {
        scope: plan.scope,
        scopeTargetId: plan.scopeTargetId,
        schoolYearId: sy.id,
        type: plan.type,
        status: plan.status,
        staffActions: { contains: marker },
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const intervention = await prisma.intervention.create({
      data: {
        scope: plan.scope,
        scopeTargetId: plan.scopeTargetId,
        type: plan.type,
        status: plan.status,
        schoolYearId: sy.id,
        ownerId: counselor.id,
        startDate: plan.startDate,
        endDate: plan.endDate,
        schedule: plan.schedule,
        accommodations: plan.accommodations,
        staffActions: plan.staffActions,
        targetOutcomes: plan.targetOutcomes,
        sensitive: {
          create: {
            rationale: plan.rationale,
            counselingContext: "Demo data — generated by seed-demo.ts.",
          },
        },
        participations: {
          create: plan.participantEnrollmentIds.map((eid, i) => ({
            enrollmentId: eid,
            outcome: plan.outcomes ? plan.outcomes[i] ?? null : null,
          })),
        },
      },
      select: { id: true },
    });

    if (plan.status === "COMPLETED" && plan.closeReason) {
      await prisma.interventionRevision.create({
        data: {
          interventionId: intervention.id,
          changedById: counselor.id,
          diff: { status: { from: "ACTIVE", to: "COMPLETED" } },
          reason: plan.closeReason,
          isSignificant: false,
        },
      });
    }

    if (plan.scope !== "STUDENT" && principal && plan.status === "COMPLETED") {
      // Record an approval revision so the audit trail is complete.
      await prisma.interventionRevision.create({
        data: {
          interventionId: intervention.id,
          changedById: principal.id,
          diff: { status: { from: "PENDING_APPROVAL", to: "ACTIVE" } },
          reason: "Approved (demo)",
          isSignificant: false,
          approvedById: principal.id,
        },
      });
    }

    created++;
  }
  console.log(`  interventions: ${created} created, ${skipped} skipped (already present)`);
}

// ─── Phase 9: run risk engine for every year ────────────────────────────────

async function runEngineForAllYears(yearMap: Map<string, { id: string }>) {
  const config = await prisma.algorithmConfig.findFirstOrThrow({ where: { isActive: true } });
  const weights = config.weights as unknown as RiskWeights;
  const thresholds = config.thresholds as unknown as RiskThresholds;
  const ruleConfig = config.ruleConfig as unknown as PatternRuleConfig;

  for (const y of YEARS) {
    const syId = yearMap.get(y.label)!.id;

    // Wipe existing assessments/patterns/drafts for this SY so we don't pile
    // up rows on every demo rerun. AuditLog is left intact (append-only).
    await prisma.riskAssessment.deleteMany({ where: { schoolYearId: syId } });
    await prisma.patternMatch.deleteMany({ where: { schoolYearId: syId } });
    await prisma.recommendationDraft.deleteMany({ where: { schoolYearId: syId } });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolYearId: syId, status: "ACTIVE" },
      include: {
        student: { select: { spedStatus: true } },
        grades: true,
        attendance: true,
        behavioralRecords: true,
      },
    });

    const assessmentRows: Prisma.RiskAssessmentCreateManyInput[] = [];
    for (const e of enrollments) {
      const result = computeRiskScore({
        grades: e.grades,
        attendance: e.attendance,
        behavioral: e.behavioralRecords,
        spedStatus: e.student.spedStatus,
        learningModality: e.learningModality,
        weights,
        thresholds,
      });
      assessmentRows.push({
        enrollmentId: e.id,
        schoolYearId: syId,
        score: result.score,
        band: result.band,
        factors: result.factors as unknown as Prisma.JsonObject,
        configId: config.id,
        configVersion: config.version,
      });
    }
    await bulkInsert(prisma.riskAssessment, assessmentRows);

    const [studentMatches, sectionMatches] = await Promise.all([
      detectStudentPatterns(syId, ruleConfig),
      detectSectionPatterns(syId, ruleConfig),
    ]);
    const matches = [...studentMatches, ...sectionMatches];
    for (const m of matches) {
      const created = await prisma.patternMatch.create({
        data: {
          scope: m.scope,
          scopeTargetId: m.scopeTargetId,
          ruleId: m.ruleId,
          evidence: m.evidence as Prisma.JsonObject,
          schoolYearId: syId,
        },
      });
      // generateRecommendation only knows about STUDENT/SECTION scopes today.
      // The detector also only returns those — defensive guard for the type.
      if (created.scope !== "STUDENT" && created.scope !== "SECTION") continue;
      const rec = generateRecommendation({
        scope: created.scope,
        scopeTargetId: created.scopeTargetId,
        schoolYearId: syId,
        ruleId: m.ruleId as PatternRuleId,
        patternMatchId: created.id,
        evidence: m.evidence as Record<string, unknown>,
      });
      if (rec) {
        await prisma.recommendationDraft.create({
          data: {
            scope: rec.scope,
            scopeTargetId: rec.scopeTargetId,
            suggestedType: rec.suggestedType,
            rationale: rec.rationale,
            evidence: rec.evidence as Prisma.JsonObject,
            triggeringPatternId: created.id,
            schoolYearId: syId,
          },
        });
      }
    }

    console.log(
      `  ${y.label}: enrollments=${enrollments.length} assessments=${assessmentRows.length} patterns=${matches.length} (S=${studentMatches.length} Sec=${sectionMatches.length})`,
    );
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding demo data (Phase 7.4)…\n");

  console.log("→ School years");
  const yearMap = await ensureSchoolYears();
  console.log(`  ${yearMap.size} years ensured`);

  console.log("→ Sections");
  const sectionMap = await ensureSections(yearMap);
  console.log(`  6 demo sections × ${yearMap.size} years`);

  console.log("→ Subjects");
  const subjectMap = await ensureSubjects(yearMap);
  console.log(`  15 subjects per year`);

  console.log("→ Demo teachers");
  const teacherByEmail = await ensureDemoTeachers();
  console.log(`  ${teacherByEmail.size} demo teachers (incl. advisers)`);

  console.log("→ Teacher assignments");
  await ensureTeacherAssignments(yearMap, sectionMap, subjectMap, teacherByEmail);

  console.log("→ Cohort students");
  const cohortStudents = await ensureCohortStudents();
  const totalStudents = Array.from(cohortStudents.values()).reduce((a, b) => a + b.length, 0);
  console.log(`  ${totalStudents} demo students across ${cohortStudents.size} cohorts`);

  console.log("→ Enrollments (cohort progression)");
  const enrollments = await ensureEnrollments(yearMap, sectionMap, cohortStudents);
  console.log(`  ${enrollments.length} enrollments`);

  console.log("→ Per-enrollment data (grades/attendance/behavioral)");
  await generatePerEnrollmentData(enrollments, yearMap, subjectMap);

  console.log("→ Demo interventions");
  await createDemoInterventions(yearMap, enrollments);

  console.log("→ Risk engine per year");
  await runEngineForAllYears(yearMap);

  console.log("\nDone.");

  console.log("\nDemo logins (all use password '" + DEMO_PASSWORD + "'):");
  for (const t of DEMO_TEACHERS) console.log(`  ${t.email}  ${t.name}`);
  for (const a of DEMO_ADVISERS) console.log(`  ${a.email}  ${a.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
