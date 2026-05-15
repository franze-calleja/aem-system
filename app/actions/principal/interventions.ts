"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import {
  buildDiff,
  detectSignificantChange,
  type InterventionSnapshot,
} from "@/lib/intervention/diff";

const approveSchema = z.object({
  interventionId: z.string().min(1),
});

const rejectSchema = z.object({
  interventionId: z.string().min(1),
  reason: z.string().trim().min(1, "A rejection reason is required.").max(2000),
});

export type ApprovalResult =
  | { ok: true }
  | { ok: false; error: string };

export async function approveInterventionAction(input: unknown): Promise<ApprovalResult> {
  const session = await requireRole("PRINCIPAL");

  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const intervention = await prisma.intervention.findUnique({
    where: { id: parsed.data.interventionId },
    select: { id: true, status: true },
  });
  if (!intervention) return { ok: false, error: "Intervention not found." };
  if (intervention.status !== "PENDING_APPROVAL") {
    return { ok: false, error: `Cannot approve from status ${intervention.status}.` };
  }

  await prisma.intervention.update({
    where: { id: intervention.id },
    data: { status: "ACTIVE" },
  });

  await logAudit({
    action: "INTERVENTION_APPROVED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: intervention.id,
    metadata: { from: "PENDING_APPROVAL", to: "ACTIVE" },
  });
  await logAudit({
    action: "INTERVENTION_ACTIVATED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: intervention.id,
    metadata: { reason: "principal_approval" },
  });

  revalidatePath("/principal/approvals");
  revalidatePath(`/counselor/interventions/${intervention.id}`);
  revalidatePath("/counselor/interventions");
  return { ok: true };
}

export async function rejectInterventionAction(input: unknown): Promise<ApprovalResult> {
  const session = await requireRole("PRINCIPAL");

  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { interventionId, reason } = parsed.data;

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: { id: true, status: true },
  });
  if (!intervention) return { ok: false, error: "Intervention not found." };
  if (intervention.status !== "PENDING_APPROVAL") {
    return { ok: false, error: `Cannot reject from status ${intervention.status}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.intervention.update({
      where: { id: interventionId },
      data: { status: "CANCELLED" },
    });
    await tx.interventionRevision.create({
      data: {
        interventionId,
        changedById: session.user.id,
        diff: { status: { from: "PENDING_APPROVAL", to: "CANCELLED" } },
        reason,
        isSignificant: true,
        approvedById: session.user.id,
      },
    });
  });

  await logAudit({
    action: "INTERVENTION_CANCELLED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: interventionId,
    metadata: { reason: "principal_reject" },
  });
  await logAudit({
    action: "INTERVENTION_REVISED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: interventionId,
    metadata: { kind: "principal_reject", reason },
  });

  revalidatePath("/principal/approvals");
  revalidatePath(`/counselor/interventions/${interventionId}`);
  revalidatePath("/counselor/interventions");
  return { ok: true };
}

// ─── Interim revision (principal-only override) ─────────────────────────────

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

const interimSchema = z.object({
  interventionId: z.string().min(1),
  scope: SCOPE,
  scopeTargetId: z.string().min(1),
  type: TYPE,
  startDate: DATE,
  endDate: DATE.optional().or(z.literal("")),
  schedule: z.string().trim().max(1000).optional().or(z.literal("")),
  accommodations: z.string().trim().max(2000).optional().or(z.literal("")),
  staffActions: z.string().trim().max(2000).optional().or(z.literal("")),
  targetOutcomes: z.string().trim().max(2000).optional().or(z.literal("")),
  rationale: z.string().trim().min(1).max(4000),
  counselingContext: z.string().trim().max(4000).optional().or(z.literal("")),
  justification: z
    .string()
    .trim()
    .min(1, "Justification is required for an interim revision.")
    .max(2000),
});

export type InterimReviseResult =
  | { ok: true; interventionId: string; isSignificant: boolean }
  | { ok: false; error: string };

export async function interimReviseInterventionAction(
  input: unknown,
): Promise<InterimReviseResult> {
  const session = await requireRole("PRINCIPAL");

  const parsed = interimSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const existing = await prisma.intervention.findUnique({
    where: { id: data.interventionId },
    include: { sensitive: true },
  });
  if (!existing) return { ok: false, error: "Intervention not found." };
  if (existing.status !== "ACTIVE") {
    return { ok: false, error: "Interim revisions only apply to ACTIVE plans." };
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
    schedule: emptyOrTrim(data.schedule),
    accommodations: emptyOrTrim(data.accommodations),
    staffActions: emptyOrTrim(data.staffActions),
    targetOutcomes: emptyOrTrim(data.targetOutcomes),
    rationale: data.rationale,
    counselingContext: emptyOrTrim(data.counselingContext),
  };

  const diff = buildDiff(before, after);
  if (Object.keys(diff).length === 0) {
    return { ok: false, error: "No changes to save." };
  }
  const isSignificant = detectSignificantChange(before, after);

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
    await tx.interventionRevision.create({
      data: {
        interventionId: existing.id,
        changedById: session.user.id,
        diff: diff as Prisma.InputJsonValue,
        reason: data.justification,
        isSignificant,
        isInterim: true,
        approvedById: session.user.id,
      },
    });
  });

  await logAudit({
    action: "INTERIM_REVISION",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: existing.id,
    metadata: { isSignificant, changedFields: Object.keys(diff) },
  });
  await logAudit({
    action: "INTERVENTION_REVISED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: existing.id,
    metadata: { interim: true, isSignificant },
  });

  revalidatePath(`/principal/interventions/${existing.id}`);
  revalidatePath(`/counselor/interventions/${existing.id}`);
  return { ok: true, interventionId: existing.id, isSignificant };
}

function emptyOrTrim(v: string | undefined): string | null {
  if (v === undefined) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
