// Risk-related read queries for use in pages.
// All callers verify RBAC before calling — these are not self-guarding.

import { prisma } from "@/lib/prisma";
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
};

export async function getCaseloadWithRisk(
  schoolYearId: string,
): Promise<CaseloadRiskRow[]> {
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
      gradeLevel: e.section.gradeLevel,
      riskScore: latest?.score ?? null,
      riskBand: latest ? (latest.band as RiskBandLabel) : null,
      computedAt: latest?.computedAt.toISOString() ?? null,
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
