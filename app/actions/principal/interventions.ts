"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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
