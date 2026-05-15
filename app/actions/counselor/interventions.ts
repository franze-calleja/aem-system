"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  buildDiff,
  detectSignificantChange,
  shouldReenterApproval,
  type InterventionSnapshot,
} from "@/lib/intervention/diff";

const SCOPE = z.enum(["STUDENT", "SECTION", "GRADE", "SCHOOL"]);
const TYPE = z.enum([
  "ACADEMIC_SUPPORT",
  "COUNSELING_SESSION",
  "IMMEDIATE_COUNSELING",
  "POSITIVE_REINFORCEMENT",
  "CASE_REVIEW",
  "SECTION_INTERVENTION",
  "SUBJECT_REMEDIATION",
  "ATTENDANCE_PROGRAM",
]);
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

const inputSchema = z.object({
  scope: SCOPE,
  scopeTargetId: z.string().min(1, "Scope target is required."),
  type: TYPE,
  startDate: DATE,
  endDate: DATE.optional().or(z.literal("")),
  schedule: z.string().trim().max(1000).optional().or(z.literal("")),
  accommodations: z.string().trim().max(2000).optional().or(z.literal("")),
  staffActions: z.string().trim().max(2000).optional().or(z.literal("")),
  targetOutcomes: z.string().trim().max(2000).optional().or(z.literal("")),
  rationale: z.string().trim().min(1, "Rationale is required.").max(4000),
  counselingContext: z.string().trim().max(4000).optional().or(z.literal("")),
  triggeringRecommendationId: z.string().min(1).optional().or(z.literal("")),
});

export type CreateInterventionResult =
  | { ok: true; interventionId: string }
  | { ok: false; error: string };

export async function createInterventionAction(
  input: unknown,
): Promise<CreateInterventionResult> {
  const session = await requireRole("COUNSELOR");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const sy = await getActiveSchoolYear();
  if (!sy) return { ok: false, error: "No active school year." };

  // Resolve and validate the scope target inside the active year, and collect
  // the enrollment ids that will get participation rows.
  const targetCheck = await resolveScopeTarget(data.scope, data.scopeTargetId, sy.id);
  if (!targetCheck.ok) return { ok: false, error: targetCheck.error };
  const { participantEnrollmentIds } = targetCheck;

  // Optional draft prefill — validate it exists and is open before instantiating.
  let draftToInstantiate: { id: string } | null = null;
  if (data.triggeringRecommendationId) {
    const draft = await prisma.recommendationDraft.findFirst({
      where: { id: data.triggeringRecommendationId, status: "OPEN", schoolYearId: sy.id },
      select: { id: true },
    });
    if (!draft) {
      return { ok: false, error: "Recommendation draft not found or already instantiated." };
    }
    draftToInstantiate = draft;
  }

  const status = data.scope === "STUDENT" ? "ACTIVE" : "PENDING_APPROVAL";
  const startDate = new Date(data.startDate + "T00:00:00.000Z");
  const endDate = data.endDate ? new Date(data.endDate + "T00:00:00.000Z") : null;

  if (endDate && endDate < startDate) {
    return { ok: false, error: "End date cannot precede start date." };
  }

  const intervention = await prisma.$transaction(async (tx) => {
    const created = await tx.intervention.create({
      data: {
        scope: data.scope,
        scopeTargetId: data.scopeTargetId,
        type: data.type,
        status,
        schoolYearId: sy.id,
        ownerId: session.user.id,
        startDate,
        endDate,
        schedule: emptyToNull(data.schedule),
        accommodations: emptyToNull(data.accommodations),
        staffActions: emptyToNull(data.staffActions),
        targetOutcomes: emptyToNull(data.targetOutcomes),
        triggeringRecommendationId: draftToInstantiate?.id ?? null,
      },
      select: { id: true },
    });

    await tx.interventionSensitive.create({
      data: {
        interventionId: created.id,
        rationale: data.rationale,
        counselingContext: emptyToNull(data.counselingContext),
      },
    });

    if (participantEnrollmentIds.length > 0) {
      await tx.interventionParticipation.createMany({
        data: participantEnrollmentIds.map((enrollmentId) => ({
          interventionId: created.id,
          enrollmentId,
        })),
      });
    }

    if (draftToInstantiate) {
      await tx.recommendationDraft.update({
        where: { id: draftToInstantiate.id },
        data: { status: "INSTANTIATED" },
      });
    }

    return created;
  });

  await logAudit({
    action: "INTERVENTION_CREATED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: intervention.id,
    metadata: {
      scope: data.scope,
      type: data.type,
      status,
      participants: participantEnrollmentIds.length,
      fromRecommendation: draftToInstantiate?.id ?? null,
    },
  });
  if (status === "ACTIVE") {
    await logAudit({
      action: "INTERVENTION_ACTIVATED",
      userId: session.user.id,
      resourceType: "Intervention",
      resourceId: intervention.id,
      metadata: { reason: "individual_scope_auto_activate" },
    });
  }

  revalidatePath("/counselor/interventions");
  revalidatePath(`/counselor/interventions/${intervention.id}`);
  return { ok: true, interventionId: intervention.id };
}

function emptyToNull(v: string | undefined): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// ─── Update (revision mode) ─────────────────────────────────────────────────

const updateSchema = inputSchema.extend({
  interventionId: z.string().min(1),
  reason: z.string().trim().min(1, "Provide a short reason for the revision.").max(2000),
  triggeringNoteId: z.string().min(1).optional().or(z.literal("")),
});

export type UpdateInterventionResult =
  | { ok: true; interventionId: string; isSignificant: boolean; reenteredApproval: boolean }
  | { ok: false; error: string };

export async function updateInterventionAction(
  input: unknown,
): Promise<UpdateInterventionResult> {
  const session = await requireRole("COUNSELOR");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const existing = await prisma.intervention.findUnique({
    where: { id: data.interventionId },
    include: { sensitive: true },
  });
  if (!existing) return { ok: false, error: "Intervention not found." };
  if (existing.ownerId !== session.user.id) {
    return { ok: false, error: "Only the owning counselor can edit this plan." };
  }
  if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
    return { ok: false, error: `Cannot edit a ${existing.status.toLowerCase()} plan.` };
  }

  // Validate the new scope target (in case scope/target was edited).
  const targetCheck = await resolveScopeTarget(data.scope, data.scopeTargetId, existing.schoolYearId);
  if (!targetCheck.ok) return { ok: false, error: targetCheck.error };

  // Optional triggering note — must belong to this intervention and be OPEN.
  let triggeringNote: { id: string } | null = null;
  if (data.triggeringNoteId) {
    const note = await prisma.interventionNote.findFirst({
      where: { id: data.triggeringNoteId, interventionId: existing.id, status: "OPEN" },
      select: { id: true },
    });
    if (!note) {
      return { ok: false, error: "Triggering note not found or already actioned." };
    }
    triggeringNote = note;
  }

  const startDate = new Date(data.startDate + "T00:00:00.000Z");
  const endDate = data.endDate ? new Date(data.endDate + "T00:00:00.000Z") : null;
  if (endDate && endDate < startDate) {
    return { ok: false, error: "End date cannot precede start date." };
  }

  const before: InterventionSnapshot = {
    scope: existing.scope,
    scopeTargetId: existing.scopeTargetId,
    type: existing.type,
    startDate: existing.startDate,
    endDate: existing.endDate,
    schedule: existing.schedule,
    accommodations: existing.accommodations,
    staffActions: existing.staffActions,
    targetOutcomes: existing.targetOutcomes,
    rationale: existing.sensitive?.rationale ?? "",
    counselingContext: existing.sensitive?.counselingContext ?? null,
  };
  const after: InterventionSnapshot = {
    scope: data.scope,
    scopeTargetId: data.scopeTargetId,
    type: data.type,
    startDate,
    endDate,
    schedule: emptyToNull(data.schedule),
    accommodations: emptyToNull(data.accommodations),
    staffActions: emptyToNull(data.staffActions),
    targetOutcomes: emptyToNull(data.targetOutcomes),
    rationale: data.rationale,
    counselingContext: emptyToNull(data.counselingContext),
  };

  const diff = buildDiff(before, after);
  if (Object.keys(diff).length === 0 && !triggeringNote) {
    return { ok: false, error: "No changes to save." };
  }

  const isSignificant = detectSignificantChange(before, after);
  const reenteredApproval =
    existing.status === "ACTIVE" && shouldReenterApproval(after.scope, isSignificant);
  const nextStatus = reenteredApproval ? "PENDING_APPROVAL" : existing.status;

  // If scope or target changed, reset the participant set to match the new
  // target. Otherwise leave participations alone — outcomes accumulated.
  const targetChanged =
    before.scope !== after.scope || before.scopeTargetId !== after.scopeTargetId;

  await prisma.$transaction(async (tx) => {
    await tx.intervention.update({
      where: { id: existing.id },
      data: {
        scope: after.scope,
        scopeTargetId: after.scopeTargetId,
        type: after.type,
        startDate,
        endDate,
        schedule: after.schedule,
        accommodations: after.accommodations,
        staffActions: after.staffActions,
        targetOutcomes: after.targetOutcomes,
        status: nextStatus,
      },
    });
    await tx.interventionSensitive.upsert({
      where: { interventionId: existing.id },
      update: { rationale: after.rationale, counselingContext: after.counselingContext },
      create: {
        interventionId: existing.id,
        rationale: after.rationale,
        counselingContext: after.counselingContext,
      },
    });
    if (targetChanged) {
      await tx.interventionParticipation.deleteMany({
        where: { interventionId: existing.id },
      });
      if (targetCheck.participantEnrollmentIds.length > 0) {
        await tx.interventionParticipation.createMany({
          data: targetCheck.participantEnrollmentIds.map((enrollmentId) => ({
            interventionId: existing.id,
            enrollmentId,
          })),
        });
      }
    }
    await tx.interventionRevision.create({
      data: {
        interventionId: existing.id,
        changedById: session.user.id,
        diff: diff as Prisma.InputJsonValue,
        reason: data.reason,
        triggeringNoteId: triggeringNote?.id ?? null,
        isSignificant,
        isInterim: false,
      },
    });
    if (triggeringNote) {
      await tx.interventionNote.update({
        where: { id: triggeringNote.id },
        data: { status: "INCORPORATED" },
      });
    }
  });

  await logAudit({
    action: "INTERVENTION_REVISED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: existing.id,
    metadata: {
      isSignificant,
      reenteredApproval,
      changedFields: Object.keys(diff),
      triggeringNoteId: triggeringNote?.id ?? null,
    },
  });
  if (reenteredApproval) {
    await logAudit({
      action: "INTERVENTION_CREATED",
      userId: session.user.id,
      resourceType: "Intervention",
      resourceId: existing.id,
      metadata: { reason: "significant_revision_reapproval" },
    });
  }

  revalidatePath("/counselor/interventions");
  revalidatePath(`/counselor/interventions/${existing.id}`);
  revalidatePath("/counselor/feedback");
  if (reenteredApproval) revalidatePath("/principal/approvals");

  return { ok: true, interventionId: existing.id, isSignificant, reenteredApproval };
}

type ScopeResolution =
  | { ok: true; participantEnrollmentIds: string[] }
  | { ok: false; error: string };

async function resolveScopeTarget(
  scope: "STUDENT" | "SECTION" | "GRADE" | "SCHOOL",
  scopeTargetId: string,
  schoolYearId: string,
): Promise<ScopeResolution> {
  switch (scope) {
    case "STUDENT": {
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: { studentId: scopeTargetId, schoolYearId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!enrollment) {
        return { ok: false, error: "Student is not actively enrolled in this school year." };
      }
      return { ok: true, participantEnrollmentIds: [enrollment.id] };
    }
    case "SECTION": {
      const section = await prisma.section.findFirst({
        where: { id: scopeTargetId, schoolYearId },
        select: { id: true },
      });
      if (!section) return { ok: false, error: "Section not found in this school year." };
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { sectionId: section.id, schoolYearId, status: "ACTIVE" },
        select: { id: true },
      });
      return { ok: true, participantEnrollmentIds: enrollments.map((e) => e.id) };
    }
    case "GRADE": {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { gradeLevel: scopeTargetId, schoolYearId, status: "ACTIVE" },
        select: { id: true },
      });
      if (enrollments.length === 0) {
        return { ok: false, error: `No active enrollments at grade level "${scopeTargetId}".` };
      }
      return { ok: true, participantEnrollmentIds: enrollments.map((e) => e.id) };
    }
    case "SCHOOL": {
      if (scopeTargetId !== "school") {
        return { ok: false, error: "School-wide scope target must be the literal \"school\"." };
      }
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { schoolYearId, status: "ACTIVE" },
        select: { id: true },
      });
      return { ok: true, participantEnrollmentIds: enrollments.map((e) => e.id) };
    }
  }
}
