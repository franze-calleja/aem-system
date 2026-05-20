// Risk-related read queries for use in pages.
// All callers verify RBAC before calling — these are not self-guarding.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { RiskBandLabel } from "@/lib/risk/types";
import type { RiskFactors } from "@/lib/risk/types";

// ─── Latest risk assessment per enrollment ───────────────────────────────────

export type LatestRisk = {
  assessmentId: string;
  score: number;
  band: RiskBandLabel;
  computedAt: string; // ISO
  factors: RiskFactors;
};

export async function getLatestRiskForEnrollment(
  enrollmentId: string,
): Promise<LatestRisk | null> {
  const row = await prisma.riskAssessment.findFirst({
    where: { enrollmentId },
    orderBy: { computedAt: "desc" },
    take: 1,
  });
  if (!row) return null;
  return {
    assessmentId: row.id,
    score: row.score,
    band: row.band as RiskBandLabel,
    computedAt: row.computedAt.toISOString(),
    factors: row.factors as unknown as RiskFactors,
  };
}

// ─── Caseload with risk scores ───────────────────────────────────────────────

export type CaseloadRiskRow = {
  enrollmentId: string;
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  sectionName: string;
  gradeLevel: string;
  riskScore: number | null;
  riskBand: RiskBandLabel | null;
  computedAt: string | null;
  /** True when there is an uncleared RiskOverride on this enrollment.
   * `riskBand` already reflects the override band when set. */
  overridden: boolean;
};

// Page-aware caseload load. Returns the rows for the requested page (ordered
// by student name) + the total count so the caller can render pagination.
//
// Filters:
//   - `search` matches against student first/last name and LRN (case-insensitive)
//   - `sectionId` exact match
//   - `gradeLevel` exact match (e.g., "Grade 9")
//   - `band` filters on the *displayed* band — respects principal overrides.
//     Special value "UNSCORED" matches enrollments with no RiskAssessment.
//
// Band filtering uses a two-step approach: first resolve the candidate
// enrollment IDs (after override application), then `findMany({ where: { id: { in } } })`.
// Cheap up to a few thousand rows; for true scale this would become a raw
// SQL CTE with a window function over RiskAssessment.
export async function getCaseloadWithRiskPaged(
  schoolYearId: string,
  opts: {
    skip: number;
    take: number;
    search?: string | null;
    sectionId?: string | null;
    gradeLevel?: string | null;
    band?: string | null; // "LOW" | "MODERATE" | "HIGH" | "UNSCORED" | null
  },
): Promise<{ rows: CaseloadRiskRow[]; total: number }> {
  const search = opts.search?.trim();
  const baseWhere: Prisma.StudentEnrollmentWhereInput = {
    schoolYearId,
    status: "ACTIVE",
  };
  if (opts.sectionId) baseWhere.sectionId = opts.sectionId;
  if (opts.gradeLevel) baseWhere.gradeLevel = opts.gradeLevel;
  if (search) {
    baseWhere.student = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { lrn: { contains: search } },
      ],
    };
  }

  // Band filter — extra step. Resolve the enrollment IDs whose *displayed*
  // band matches, then constrain the main query to that set.
  if (opts.band) {
    const bandEnrollmentIds = await resolveEnrollmentIdsByDisplayedBand(
      schoolYearId,
      opts.band,
      baseWhere,
    );
    baseWhere.id = { in: bandEnrollmentIds };
  }

  const [total, enrollments] = await Promise.all([
    prisma.studentEnrollment.count({ where: baseWhere }),
    prisma.studentEnrollment.findMany({
      where: baseWhere,
      include: {
        student: { select: { id: true, lrn: true, firstName: true, lastName: true } },
        section: { select: { name: true, gradeLevel: true } },
        riskAssessments: {
          orderBy: { computedAt: "desc" },
          take: 1,
          select: { score: true, band: true, computedAt: true },
        },
        riskOverrides: {
          where: { clearedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { overrideBand: true },
        },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      skip: opts.skip,
      take: opts.take,
    }),
  ]);

  const rows: CaseloadRiskRow[] = enrollments.map((e) => {
    const latest = e.riskAssessments[0] ?? null;
    const ovr = e.riskOverrides[0] ?? null;
    return {
      enrollmentId: e.id,
      studentId: e.student.id,
      lrn: e.student.lrn,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      sectionName: e.section.name,
      gradeLevel: e.section.gradeLevel,
      riskScore: latest?.score ?? null,
      riskBand: ovr
        ? (ovr.overrideBand as RiskBandLabel)
        : latest
          ? (latest.band as RiskBandLabel)
          : null,
      computedAt: latest?.computedAt.toISOString() ?? null,
      overridden: ovr !== null,
    };
  });

  return { rows, total };
}

// Internal: given a desired displayed band (override-aware), find the matching
// enrollment IDs within the prefilter (so name search/section/grade already
// constrain the candidate set).
async function resolveEnrollmentIdsByDisplayedBand(
  schoolYearId: string,
  band: string,
  prefilter: Prisma.StudentEnrollmentWhereInput,
): Promise<string[]> {
  const candidates = await prisma.studentEnrollment.findMany({
    where: { ...prefilter, id: undefined }, // strip the band-constraint if any
    select: {
      id: true,
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { band: true },
      },
      riskOverrides: {
        where: { clearedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { overrideBand: true },
      },
    },
  });
  return candidates
    .filter((e) => {
      const displayed = e.riskOverrides[0]?.overrideBand ?? e.riskAssessments[0]?.band ?? null;
      if (band === "UNSCORED") return displayed === null;
      return displayed === band;
    })
    .map((e) => e.id);
}

// Sections + grade levels for use in filter dropdowns. Cheap, separate call.
export async function getSectionsAndGradesForYear(schoolYearId: string): Promise<{
  sections: Array<{ id: string; label: string; gradeLevel: string }>;
  gradeLevels: string[];
}> {
  const sections = await prisma.section.findMany({
    where: { schoolYearId },
    select: { id: true, name: true, gradeLevel: true },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });
  const gradeLevels = Array.from(new Set(sections.map((s) => s.gradeLevel))).sort();
  return {
    sections: sections.map((s) => ({
      id: s.id,
      label: `${s.gradeLevel} · ${s.name}`,
      gradeLevel: s.gradeLevel,
    })),
    gradeLevels,
  };
}

// Aggregate band counts across the entire caseload — independent of pagination
// so the header summary still reflects the full population, not just the page.
export async function getCaseloadBandSummary(schoolYearId: string): Promise<{
  scored: number;
  high: number;
  moderate: number;
  total: number;
}> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    select: {
      id: true,
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { band: true },
      },
      riskOverrides: {
        where: { clearedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { overrideBand: true },
      },
    },
  });
  let scored = 0, high = 0, moderate = 0;
  for (const e of enrollments) {
    const ovr = e.riskOverrides[0]?.overrideBand;
    const band = ovr ?? e.riskAssessments[0]?.band ?? null;
    if (band === null) continue;
    scored++;
    if (band === "HIGH") high++;
    else if (band === "MODERATE") moderate++;
  }
  return { scored, high, moderate, total: enrollments.length };
}

export async function getCaseloadWithRisk(
  schoolYearId: string,
): Promise<CaseloadRiskRow[]> {
  // Kept for the cohort/risk callers that still want the full list. Prefer
  // `getCaseloadWithRiskPaged` for any UI surface.
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    include: {
      student: { select: { id: true, lrn: true, firstName: true, lastName: true } },
      section: { select: { name: true, gradeLevel: true } },
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { score: true, band: true, computedAt: true },
      },
      riskOverrides: {
        where: { clearedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { overrideBand: true },
      },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return enrollments.map((e) => {
    const latest = e.riskAssessments[0] ?? null;
    const ovr = e.riskOverrides[0] ?? null;
    return {
      enrollmentId: e.id,
      studentId: e.student.id,
      lrn: e.student.lrn,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      sectionName: e.section.name,
      gradeLevel: e.section.gradeLevel,
      riskScore: latest?.score ?? null,
      riskBand: ovr
        ? (ovr.overrideBand as RiskBandLabel)
        : latest
          ? (latest.band as RiskBandLabel)
          : null,
      computedAt: latest?.computedAt.toISOString() ?? null,
      overridden: ovr !== null,
    };
  });
}

// ─── Teacher class with risk scores ─────────────────────────────────────────

export type TeacherStudentRisk = {
  enrollmentId: string;
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  sectionName: string;
  riskScore: number | null;
  riskBand: RiskBandLabel | null;
  factors: RiskFactors | null;
};

export async function getSectionRiskForTeacher(
  userId: string,
  sectionId: string,
  schoolYearId: string,
): Promise<TeacherStudentRisk[]> {
  // Verify teacher has an assignment in this section.
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { userId, sectionId, schoolYearId },
  });
  if (!assignment) return [];

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { sectionId, schoolYearId, status: "ACTIVE" },
    include: {
      student: { select: { id: true, lrn: true, firstName: true, lastName: true } },
      section: { select: { name: true } },
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { score: true, band: true, factors: true },
      },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return enrollments.map((e) => {
    const latest = e.riskAssessments[0] ?? null;
    return {
      enrollmentId: e.id,
      studentId: e.student.id,
      lrn: e.student.lrn,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      sectionName: e.section.name,
      riskScore: latest?.score ?? null,
      riskBand: latest ? (latest.band as RiskBandLabel) : null,
      factors: latest ? (latest.factors as unknown as RiskFactors) : null,
    };
  });
}

// ─── Open recommendations queue ─────────────────────────────────────────────

export type RecommendationRow = {
  id: string;
  scope: string;
  scopeTargetId: string;
  suggestedType: string;
  rationale: string;
  evidence: Record<string, unknown>;
  triggeringPatternId: string | null;
  triggeringRuleId: string | null;
  createdAt: string;
};

export async function getOpenRecommendations(
  schoolYearId: string,
): Promise<RecommendationRow[]> {
  const rows = await prisma.recommendationDraft.findMany({
    where: { schoolYearId, status: "OPEN" },
    include: {
      triggeringPattern: { select: { ruleId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeTargetId: r.scopeTargetId,
    suggestedType: r.suggestedType,
    rationale: r.rationale,
    evidence: r.evidence as Record<string, unknown>,
    triggeringPatternId: r.triggeringPatternId,
    triggeringRuleId: r.triggeringPattern?.ruleId ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ─── School-wide risk distribution ──────────────────────────────────────────

export type RiskDistribution = {
  low: number;
  moderate: number;
  high: number;
  unscored: number;
  total: number;
};

export async function getSchoolRiskDistribution(
  schoolYearId: string,
): Promise<RiskDistribution> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    include: {
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { band: true },
      },
    },
  });

  let low = 0, moderate = 0, high = 0, unscored = 0;
  for (const e of enrollments) {
    const band = e.riskAssessments[0]?.band;
    if (!band) { unscored++; continue; }
    if (band === "LOW") low++;
    else if (band === "MODERATE") moderate++;
    else high++;
  }

  return { low, moderate, high, unscored, total: enrollments.length };
}

// ─── Drill-down breakdowns (principal dashboard) ────────────────────────────

export type BreakdownGroup = {
  key: string;
  label: string;
  low: number;
  moderate: number;
  high: number;
  unscored: number;
  total: number;
};

type EnrollmentWithBand = {
  band: string | null;
  gradeLevel: string;
  sectionId: string;
  sectionName: string;
  sex: string;
  spedStatus: string;
  learningModality: string;
};

async function loadEnrollmentsWithLatestBand(
  schoolYearId: string,
): Promise<EnrollmentWithBand[]> {
  const rows = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    include: {
      student: { select: { sex: true, spedStatus: true } },
      section: { select: { id: true, name: true, gradeLevel: true } },
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { band: true },
      },
    },
  });
  return rows.map((r) => ({
    band: r.riskAssessments[0]?.band ?? null,
    gradeLevel: r.gradeLevel,
    sectionId: r.section.id,
    sectionName: `${r.section.gradeLevel} · ${r.section.name}`,
    sex: r.student.sex,
    spedStatus: r.student.spedStatus,
    learningModality: r.learningModality,
  }));
}

function groupBreakdown<T extends { band: string | null }>(
  items: T[],
  keyOf: (item: T) => { key: string; label: string },
): BreakdownGroup[] {
  const map = new Map<string, BreakdownGroup>();
  for (const item of items) {
    const { key, label } = keyOf(item);
    if (!map.has(key)) {
      map.set(key, { key, label, low: 0, moderate: 0, high: 0, unscored: 0, total: 0 });
    }
    const g = map.get(key)!;
    g.total++;
    if (item.band === "LOW") g.low++;
    else if (item.band === "MODERATE") g.moderate++;
    else if (item.band === "HIGH") g.high++;
    else g.unscored++;
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getRiskBreakdownByGrade(schoolYearId: string): Promise<BreakdownGroup[]> {
  const rows = await loadEnrollmentsWithLatestBand(schoolYearId);
  return groupBreakdown(rows, (r) => ({ key: r.gradeLevel, label: r.gradeLevel }));
}

export async function getRiskBreakdownBySection(
  schoolYearId: string,
): Promise<BreakdownGroup[]> {
  const rows = await loadEnrollmentsWithLatestBand(schoolYearId);
  return groupBreakdown(rows, (r) => ({ key: r.sectionId, label: r.sectionName }));
}

export type BiasBreakdowns = {
  bySex: BreakdownGroup[];
  bySpedStatus: BreakdownGroup[];
  byLearningModality: BreakdownGroup[];
};

export async function getBiasBreakdowns(schoolYearId: string): Promise<BiasBreakdowns> {
  const rows = await loadEnrollmentsWithLatestBand(schoolYearId);
  return {
    bySex: groupBreakdown(rows, (r) => ({ key: r.sex, label: r.sex })),
    bySpedStatus: groupBreakdown(rows, (r) => ({
      key: r.spedStatus,
      label: r.spedStatus.replace(/_/g, " "),
    })),
    byLearningModality: groupBreakdown(rows, (r) => ({
      key: r.learningModality,
      label: r.learningModality.replace(/_/g, " "),
    })),
  };
}

// ─── Intervention pipeline (counts by status) ───────────────────────────────

export type InterventionPipeline = {
  draft: number;
  pendingApproval: number;
  active: number;
  completed: number;
  cancelled: number;
  total: number;
};

export async function getInterventionPipeline(
  schoolYearId: string,
): Promise<InterventionPipeline> {
  const rows = await prisma.intervention.groupBy({
    by: ["status"],
    where: { schoolYearId },
    _count: { _all: true },
  });
  const out: InterventionPipeline = {
    draft: 0,
    pendingApproval: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  };
  for (const r of rows) {
    const c = r._count._all;
    out.total += c;
    if (r.status === "DRAFT") out.draft = c;
    else if (r.status === "PENDING_APPROVAL") out.pendingApproval = c;
    else if (r.status === "ACTIVE") out.active = c;
    else if (r.status === "COMPLETED") out.completed = c;
    else if (r.status === "CANCELLED") out.cancelled = c;
  }
  return out;
}

// ─── Cohort analysis (Phase 5.4) ────────────────────────────────────────────
// Compare the same grade level across multiple school years. Returns one row
// per SY with risk-band counts + intervention pipeline + completed-outcome
// distribution, ordered by the SY's chronological start date (oldest first).

export type CohortYearSlice = {
  schoolYearId: string;
  schoolYearLabel: string;
  startDate: Date;
  total: number;
  low: number;
  moderate: number;
  high: number;
  unscored: number;
  // Touching this grade level only.
  interventions: {
    active: number;
    completed: number;
    pendingApproval: number;
    cancelled: number;
    draft: number;
    total: number;
  };
  // From completed interventions where any participant in this grade level
  // was tracked.
  outcomes: {
    improving: number;
    stable: number;
    declining: number;
    completed: number;
    unset: number;
  };
};

export async function getCohortYearSlice(
  schoolYearId: string,
  gradeLevel: string,
): Promise<CohortYearSlice | null> {
  const sy = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { id: true, label: true, startDate: true },
  });
  if (!sy) return null;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, gradeLevel, status: "ACTIVE" },
    include: {
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { band: true },
      },
    },
  });

  let low = 0, moderate = 0, high = 0, unscored = 0;
  for (const e of enrollments) {
    const band = e.riskAssessments[0]?.band;
    if (band === "LOW") low++;
    else if (band === "MODERATE") moderate++;
    else if (band === "HIGH") high++;
    else unscored++;
  }

  // Interventions touching this grade in this SY: STUDENT-scope interventions
  // for any enrolled student here, SECTION-scope for any section at this grade,
  // GRADE-scope where scopeTargetId matches, SCHOOL-scope always counts.
  const enrollmentIds = enrollments.map((e) => e.id);
  const studentIds = await prisma.studentEnrollment.findMany({
    where: { id: { in: enrollmentIds } },
    select: { studentId: true },
  }).then((rows) => rows.map((r) => r.studentId));
  const sectionIds = await prisma.section.findMany({
    where: { schoolYearId, gradeLevel },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  const interventionRows = await prisma.intervention.findMany({
    where: {
      schoolYearId,
      OR: [
        { scope: "STUDENT", scopeTargetId: { in: studentIds } },
        { scope: "SECTION", scopeTargetId: { in: sectionIds } },
        { scope: "GRADE", scopeTargetId: gradeLevel },
        { scope: "SCHOOL" },
      ],
    },
    select: {
      id: true,
      status: true,
      participations: {
        where: { enrollmentId: { in: enrollmentIds } },
        select: { outcome: true },
      },
    },
  });

  const interventions = {
    active: 0,
    completed: 0,
    pendingApproval: 0,
    cancelled: 0,
    draft: 0,
    total: interventionRows.length,
  };
  const outcomes = { improving: 0, stable: 0, declining: 0, completed: 0, unset: 0 };
  for (const iv of interventionRows) {
    if (iv.status === "ACTIVE") interventions.active++;
    else if (iv.status === "COMPLETED") interventions.completed++;
    else if (iv.status === "PENDING_APPROVAL") interventions.pendingApproval++;
    else if (iv.status === "CANCELLED") interventions.cancelled++;
    else if (iv.status === "DRAFT") interventions.draft++;
    if (iv.status === "COMPLETED") {
      for (const p of iv.participations) {
        if (p.outcome === "IMPROVING") outcomes.improving++;
        else if (p.outcome === "STABLE") outcomes.stable++;
        else if (p.outcome === "DECLINING") outcomes.declining++;
        else if (p.outcome === "COMPLETED") outcomes.completed++;
        else outcomes.unset++;
      }
    }
  }

  return {
    schoolYearId: sy.id,
    schoolYearLabel: sy.label,
    startDate: sy.startDate,
    total: enrollments.length,
    low,
    moderate,
    high,
    unscored,
    interventions,
    outcomes,
  };
}

export async function getCohortAnalysis(
  schoolYearIds: string[],
  gradeLevel: string,
): Promise<CohortYearSlice[]> {
  const slices = await Promise.all(
    schoolYearIds.map((id) => getCohortYearSlice(id, gradeLevel)),
  );
  return slices
    .filter((s): s is CohortYearSlice => s !== null)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}
