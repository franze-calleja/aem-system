// Server queries for the intervention module.
// Role-aware: getIntervention() strips sensitive fields based on viewerRole +
// ownership. Callers must still have requireRole-protected the route.

import { prisma } from "@/lib/prisma";
import type {
  InterventionStatus,
  InterventionType,
  PatternScope,
  Role,
} from "@prisma/client";

// ─── List ───────────────────────────────────────────────────────────────────

export type InterventionListRow = {
  id: string;
  scope: PatternScope;
  scopeTargetId: string;
  scopeLabel: string; // human label resolved (e.g. "Maria Santos", "9-Newton")
  type: InterventionType;
  status: InterventionStatus;
  ownerName: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  triggeringRecommendationId: string | null;
};

export async function getInterventionsForYear(
  schoolYearId: string,
): Promise<InterventionListRow[]> {
  const rows = await prisma.intervention.findMany({
    where: { schoolYearId },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const labelMap = await resolveScopeLabels(rows, schoolYearId);

  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeTargetId: r.scopeTargetId,
    scopeLabel: labelMap.get(`${r.scope}:${r.scopeTargetId}`) ?? r.scopeTargetId,
    type: r.type,
    status: r.status,
    ownerName: r.owner.name,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
    createdAt: r.createdAt.toISOString(),
    triggeringRecommendationId: r.triggeringRecommendationId,
  }));
}

async function resolveScopeLabels(
  rows: { scope: PatternScope; scopeTargetId: string }[],
  schoolYearId: string,
): Promise<Map<string, string>> {
  const studentIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const r of rows) {
    if (r.scope === "STUDENT") studentIds.add(r.scopeTargetId);
    if (r.scope === "SECTION") sectionIds.add(r.scopeTargetId);
  }
  const [students, sections] = await Promise.all([
    studentIds.size === 0
      ? Promise.resolve([])
      : prisma.student.findMany({
          where: { id: { in: [...studentIds] } },
          select: { id: true, lastName: true, firstName: true },
        }),
    sectionIds.size === 0
      ? Promise.resolve([])
      : prisma.section.findMany({
          where: { id: { in: [...sectionIds] }, schoolYearId },
          select: { id: true, gradeLevel: true, name: true },
        }),
  ]);

  const map = new Map<string, string>();
  for (const s of students) {
    map.set(`STUDENT:${s.id}`, `${s.lastName}, ${s.firstName}`);
  }
  for (const sec of sections) {
    map.set(`SECTION:${sec.id}`, `${sec.gradeLevel} · ${sec.name}`);
  }
  for (const r of rows) {
    if (r.scope === "GRADE") map.set(`GRADE:${r.scopeTargetId}`, r.scopeTargetId);
    if (r.scope === "SCHOOL") map.set(`SCHOOL:${r.scopeTargetId}`, "School-wide");
  }
  return map;
}

// ─── Targets for the builder picker ─────────────────────────────────────────

export type InterventionTargets = {
  students: Array<{ id: string; label: string; sectionLabel: string }>;
  sections: Array<{ id: string; label: string }>;
  gradeLevels: string[];
};

export async function getInterventionTargets(
  schoolYearId: string,
): Promise<InterventionTargets> {
  const [enrollments, sections] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { schoolYearId, status: "ACTIVE" },
      include: {
        student: { select: { id: true, lastName: true, firstName: true, lrn: true } },
        section: { select: { gradeLevel: true, name: true } },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.section.findMany({
      where: { schoolYearId },
      select: { id: true, gradeLevel: true, name: true },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
  ]);

  const students = enrollments.map((e) => ({
    id: e.student.id,
    label: `${e.student.lastName}, ${e.student.firstName} · ${e.student.lrn}`,
    sectionLabel: `${e.section.gradeLevel} · ${e.section.name}`,
  }));
  const sectionsOut = sections.map((s) => ({
    id: s.id,
    label: `${s.gradeLevel} · ${s.name}`,
  }));
  const gradeLevels = Array.from(new Set(sections.map((s) => s.gradeLevel))).sort();
  return { students, sections: sectionsOut, gradeLevels };
}

// ─── Detail (role-aware field stripping) ────────────────────────────────────

export type InterventionDetail = {
  id: string;
  scope: PatternScope;
  scopeTargetId: string;
  scopeLabel: string;
  type: InterventionType;
  status: InterventionStatus;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string | null;
  schedule: string | null;
  accommodations: string | null;
  staffActions: string | null;
  targetOutcomes: string | null;
  createdAt: string;
  updatedAt: string;
  triggeringRecommendationId: string | null;
  // Sensitive — null when the viewer is not authorised.
  sensitive: { rationale: string; counselingContext: string | null } | null;
  participants: Array<{
    enrollmentId: string;
    studentName: string;
    lrn: string;
    outcome: string | null;
  }>;
};

export async function getIntervention(
  id: string,
  viewerRole: Role,
  viewerUserId: string,
): Promise<InterventionDetail | null> {
  const row = await prisma.intervention.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      sensitive: true,
      participations: {
        include: {
          enrollment: {
            include: {
              student: { select: { lastName: true, firstName: true, lrn: true } },
            },
          },
        },
        orderBy: { enrollment: { student: { lastName: "asc" } } },
      },
    },
  });
  if (!row) return null;

  // Sensitive-field policy (Phase 3.3 baseline; expanded in Phase 3.6):
  //   COUNSELOR: visible only for interventions they own.
  //   PRINCIPAL: visible (read-only).
  //   TEACHER / ADMIN: never.
  const canSeeSensitive =
    (viewerRole === "COUNSELOR" && row.ownerId === viewerUserId) ||
    viewerRole === "PRINCIPAL";

  const labelMap = await resolveScopeLabels(
    [{ scope: row.scope, scopeTargetId: row.scopeTargetId }],
    row.schoolYearId,
  );

  return {
    id: row.id,
    scope: row.scope,
    scopeTargetId: row.scopeTargetId,
    scopeLabel: labelMap.get(`${row.scope}:${row.scopeTargetId}`) ?? row.scopeTargetId,
    type: row.type,
    status: row.status,
    ownerId: row.owner.id,
    ownerName: row.owner.name,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
    schedule: row.schedule,
    accommodations: row.accommodations,
    staffActions: row.staffActions,
    targetOutcomes: row.targetOutcomes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    triggeringRecommendationId: row.triggeringRecommendationId,
    sensitive:
      canSeeSensitive && row.sensitive
        ? {
            rationale: row.sensitive.rationale,
            counselingContext: row.sensitive.counselingContext,
          }
        : null,
    participants: row.participations.map((p) => ({
      enrollmentId: p.enrollmentId,
      studentName: `${p.enrollment.student.lastName}, ${p.enrollment.student.firstName}`,
      lrn: p.enrollment.student.lrn,
      outcome: p.outcome,
    })),
  };
}

// ─── Recommendation prefill ─────────────────────────────────────────────────

export type RecommendationPrefill = {
  id: string;
  scope: PatternScope;
  scopeTargetId: string;
  suggestedType: string;
  rationale: string;
  scopeLabel: string;
};

export async function getRecommendationForPrefill(
  id: string,
  schoolYearId: string,
): Promise<RecommendationPrefill | null> {
  const r = await prisma.recommendationDraft.findFirst({
    where: { id, status: "OPEN", schoolYearId },
  });
  if (!r) return null;
  const labelMap = await resolveScopeLabels(
    [{ scope: r.scope, scopeTargetId: r.scopeTargetId }],
    schoolYearId,
  );
  return {
    id: r.id,
    scope: r.scope,
    scopeTargetId: r.scopeTargetId,
    suggestedType: r.suggestedType,
    rationale: r.rationale,
    scopeLabel: labelMap.get(`${r.scope}:${r.scopeTargetId}`) ?? r.scopeTargetId,
  };
}
