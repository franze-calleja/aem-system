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

  // Visibility predicate (Phase 3.6 — full matrix).
  const canView = await canViewIntervention(
    {
      scope: row.scope,
      scopeTargetId: row.scopeTargetId,
      schoolYearId: row.schoolYearId,
      ownerId: row.ownerId,
    },
    viewerRole,
    viewerUserId,
  );
  if (!canView) return null;

  // Sensitive-field policy:
  //   COUNSELOR — visible only for interventions they own.
  //   PRINCIPAL — visible (full oversight).
  //   TEACHER / ADMIN — never.
  const canSeeSensitive =
    (viewerRole === "COUNSELOR" && row.ownerId === viewerUserId) ||
    viewerRole === "PRINCIPAL";

  // ADMIN sees metadata only — strip participants list as well.
  const showParticipants = viewerRole !== "ADMIN";

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
    participants: showParticipants
      ? row.participations.map((p) => ({
          enrollmentId: p.enrollmentId,
          studentName: `${p.enrollment.student.lastName}, ${p.enrollment.student.firstName}`,
          lrn: p.enrollment.student.lrn,
          outcome: p.outcome,
        }))
      : [],
  };
}

// ─── Visibility predicate ───────────────────────────────────────────────────

async function canViewIntervention(
  intervention: {
    scope: PatternScope;
    scopeTargetId: string;
    schoolYearId: string;
    ownerId: string;
  },
  viewerRole: Role,
  viewerUserId: string,
): Promise<boolean> {
  if (viewerRole === "COUNSELOR") return true;
  if (viewerRole === "PRINCIPAL") return true;
  if (viewerRole === "ADMIN") return true; // metadata-only, but allowed to read

  // TEACHER: scoped by their assignments.
  const assignments = await prisma.teacherAssignment.findMany({
    where: { userId: viewerUserId, schoolYearId: intervention.schoolYearId },
    select: { sectionId: true, section: { select: { gradeLevel: true } } },
  });
  if (assignments.length === 0) return false;

  if (intervention.scope === "SCHOOL") return true;
  if (intervention.scope === "SECTION") {
    return assignments.some((a) => a.sectionId === intervention.scopeTargetId);
  }
  if (intervention.scope === "GRADE") {
    return assignments.some((a) => a.section.gradeLevel === intervention.scopeTargetId);
  }
  if (intervention.scope === "STUDENT") {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: intervention.scopeTargetId,
        schoolYearId: intervention.schoolYearId,
      },
      select: { sectionId: true },
    });
    if (!enrollment) return false;
    return assignments.some((a) => a.sectionId === enrollment.sectionId);
  }
  return false;
}

// ─── Teacher view: active interventions touching their assignments ─────────

export type TeacherInterventionRow = {
  id: string;
  scope: PatternScope;
  scopeLabel: string;
  type: InterventionType;
  status: InterventionStatus;
  startDate: string;
  endDate: string | null;
  schedule: string | null;
  accommodations: string | null;
  staffActions: string | null;
  targetOutcomes: string | null;
};

export async function getInterventionsForTeacher(
  teacherUserId: string,
  schoolYearId: string,
): Promise<TeacherInterventionRow[]> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { userId: teacherUserId, schoolYearId },
    select: { sectionId: true, section: { select: { gradeLevel: true } } },
  });
  if (assignments.length === 0) return [];

  const sectionIds = Array.from(new Set(assignments.map((a) => a.sectionId)));
  const gradeLevels = Array.from(new Set(assignments.map((a) => a.section.gradeLevel)));

  // Students in any of the teacher's sections — for STUDENT-scope visibility.
  const studentEnrollments = await prisma.studentEnrollment.findMany({
    where: { sectionId: { in: sectionIds }, schoolYearId },
    select: { studentId: true },
  });
  const studentIds = studentEnrollments.map((e) => e.studentId);

  const rows = await prisma.intervention.findMany({
    where: {
      schoolYearId,
      status: { in: ["ACTIVE", "PENDING_APPROVAL"] },
      OR: [
        { scope: "SCHOOL" },
        { scope: "SECTION", scopeTargetId: { in: sectionIds } },
        { scope: "GRADE", scopeTargetId: { in: gradeLevels } },
        ...(studentIds.length > 0
          ? [{ scope: "STUDENT" as const, scopeTargetId: { in: studentIds } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const labelMap = await resolveScopeLabels(rows, schoolYearId);
  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeLabel: labelMap.get(`${r.scope}:${r.scopeTargetId}`) ?? r.scopeTargetId,
    type: r.type,
    status: r.status,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
    schedule: r.schedule,
    accommodations: r.accommodations,
    staffActions: r.staffActions,
    targetOutcomes: r.targetOutcomes,
  }));
}

// ─── Pending approvals (principal queue) ────────────────────────────────────

export type PendingApprovalRow = {
  id: string;
  scope: PatternScope;
  scopeTargetId: string;
  scopeLabel: string;
  type: InterventionType;
  ownerName: string;
  startDate: string;
  endDate: string | null;
  participantCount: number;
  sensitive: { rationale: string; counselingContext: string | null } | null;
};

export async function getPendingApprovals(
  schoolYearId: string,
): Promise<PendingApprovalRow[]> {
  const rows = await prisma.intervention.findMany({
    where: { schoolYearId, status: "PENDING_APPROVAL" },
    include: {
      owner: { select: { name: true } },
      sensitive: true,
      _count: { select: { participations: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const labelMap = await resolveScopeLabels(rows, schoolYearId);
  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeTargetId: r.scopeTargetId,
    scopeLabel: labelMap.get(`${r.scope}:${r.scopeTargetId}`) ?? r.scopeTargetId,
    type: r.type,
    ownerName: r.owner.name,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
    participantCount: r._count.participations,
    sensitive: r.sensitive
      ? {
          rationale: r.sensitive.rationale,
          counselingContext: r.sensitive.counselingContext,
        }
      : null,
  }));
}

// ─── Editable snapshot (for the edit form) ──────────────────────────────────

export type EditableIntervention = {
  interventionId: string;
  status: InterventionStatus;
  ownerId: string;
  scope: PatternScope;
  scopeTargetId: string;
  type: InterventionType;
  startDate: string;
  endDate: string | null;
  schedule: string | null;
  accommodations: string | null;
  staffActions: string | null;
  targetOutcomes: string | null;
  rationale: string;
  counselingContext: string | null;
};

/**
 * Returns the full editable snapshot of an intervention. Callers must be
 * authorised to edit (counselor owner OR principal — checked here). Returns
 * null when unauthorised or not found.
 */
export async function getEditableIntervention(
  id: string,
  viewerRole: Role,
  viewerUserId: string,
): Promise<EditableIntervention | null> {
  const row = await prisma.intervention.findUnique({
    where: { id },
    include: { sensitive: true },
  });
  if (!row) return null;
  if (viewerRole === "COUNSELOR" && row.ownerId !== viewerUserId) return null;
  if (viewerRole !== "COUNSELOR" && viewerRole !== "PRINCIPAL") return null;

  return {
    interventionId: row.id,
    status: row.status,
    ownerId: row.ownerId,
    scope: row.scope,
    scopeTargetId: row.scopeTargetId,
    type: row.type,
    startDate: row.startDate.toISOString().slice(0, 10),
    endDate: row.endDate?.toISOString().slice(0, 10) ?? null,
    schedule: row.schedule,
    accommodations: row.accommodations,
    staffActions: row.staffActions,
    targetOutcomes: row.targetOutcomes,
    rationale: row.sensitive?.rationale ?? "",
    counselingContext: row.sensitive?.counselingContext ?? null,
  };
}

// ─── Counselor feedback queue ───────────────────────────────────────────────

export type FeedbackQueueRow = {
  id: string;
  noteType: "OBSERVATION" | "REVISION_REQUEST" | "OUTCOME_OBSERVATION";
  content: string;
  authorName: string;
  createdAt: string;
  interventionId: string;
  interventionScopeLabel: string;
  interventionScope: PatternScope;
  interventionType: InterventionType;
};

export async function getOpenFeedbackForCounselor(
  counselorId: string,
  schoolYearId: string,
): Promise<FeedbackQueueRow[]> {
  const rows = await prisma.interventionNote.findMany({
    where: {
      status: "OPEN",
      intervention: { ownerId: counselorId, schoolYearId },
    },
    include: {
      author: { select: { name: true } },
      intervention: {
        select: { id: true, scope: true, scopeTargetId: true, type: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const labelMap = await resolveScopeLabels(
    rows.map((r) => ({ scope: r.intervention.scope, scopeTargetId: r.intervention.scopeTargetId })),
    schoolYearId,
  );
  return rows.map((r) => ({
    id: r.id,
    noteType: r.noteType,
    content: r.content,
    authorName: r.author.name,
    createdAt: r.createdAt.toISOString(),
    interventionId: r.intervention.id,
    interventionScopeLabel:
      labelMap.get(`${r.intervention.scope}:${r.intervention.scopeTargetId}`) ??
      r.intervention.scopeTargetId,
    interventionScope: r.intervention.scope,
    interventionType: r.intervention.type,
  }));
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
