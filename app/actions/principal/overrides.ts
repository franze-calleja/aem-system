"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const BAND = z.enum(["LOW", "MODERATE", "HIGH"]);

const createSchema = z.object({
  enrollmentId: z.string().min(1),
  overrideBand: BAND,
  justification: z
    .string()
    .trim()
    .min(1, "Written justification is required for a risk override.")
    .max(4000),
});

const clearSchema = z.object({ overrideId: z.string().min(1) });

export type OverrideResult =
  | { ok: true; overrideId: string }
  | { ok: false; error: string };

export type ClearOverrideResult = { ok: true } | { ok: false; error: string };

export async function createRiskOverrideAction(input: unknown): Promise<OverrideResult> {
  const session = await requireRole("PRINCIPAL");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { enrollmentId, overrideBand, justification } = parsed.data;

  // Find the latest RiskAssessment for the enrollment — that's the score we
  // are overriding. Snapshot its band + score so the override remains
  // reproducible even after the engine recomputes.
  const latest = await prisma.riskAssessment.findFirst({
    where: { enrollmentId },
    orderBy: { computedAt: "desc" },
    select: { id: true, score: true, band: true },
  });
  if (!latest) {
    return {
      ok: false,
      error: "Cannot override — no risk assessment on file for this enrollment.",
    };
  }
  if (latest.band === overrideBand) {
    return {
      ok: false,
      error: "Override band must differ from the current band.",
    };
  }

  // At most one active override per enrollment. Clear any prior active one
  // first so the principal can effectively "replace" their decision.
  const existingActive = await prisma.riskOverride.findFirst({
    where: { enrollmentId, clearedAt: null },
    select: { id: true },
  });

  const created = await prisma.$transaction(async (tx) => {
    if (existingActive) {
      await tx.riskOverride.update({
        where: { id: existingActive.id },
        data: { clearedAt: new Date(), clearedById: session.user.id },
      });
    }
    return tx.riskOverride.create({
      data: {
        enrollmentId,
        overriddenById: session.user.id,
        originalScore: latest.score,
        originalBand: latest.band,
        overrideBand,
        justification,
      },
      select: { id: true },
    });
  });

  await logAudit({
    action: "RISK_OVERRIDE",
    userId: session.user.id,
    resourceType: "RiskOverride",
    resourceId: created.id,
    metadata: {
      enrollmentId,
      from: latest.band,
      to: overrideBand,
      replacedPriorOverride: existingActive?.id ?? null,
    },
  });

  // Revalidate every surface that may show this risk.
  revalidatePath(`/counselor/students`);
  revalidatePath(`/principal/students`);
  revalidatePath(`/counselor/caseload`);
  revalidatePath(`/principal/dashboard`);
  return { ok: true, overrideId: created.id };
}

export async function clearRiskOverrideAction(input: unknown): Promise<ClearOverrideResult> {
  const session = await requireRole("PRINCIPAL");

  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const override = await prisma.riskOverride.findUnique({
    where: { id: parsed.data.overrideId },
    select: { id: true, clearedAt: true, enrollmentId: true },
  });
  if (!override) return { ok: false, error: "Override not found." };
  if (override.clearedAt !== null) return { ok: false, error: "Override already cleared." };

  await prisma.riskOverride.update({
    where: { id: override.id },
    data: { clearedAt: new Date(), clearedById: session.user.id },
  });

  await logAudit({
    action: "RISK_OVERRIDE",
    userId: session.user.id,
    resourceType: "RiskOverride",
    resourceId: override.id,
    metadata: { cleared: true, enrollmentId: override.enrollmentId },
  });

  revalidatePath(`/counselor/students`);
  revalidatePath(`/principal/students`);
  revalidatePath(`/counselor/caseload`);
  revalidatePath(`/principal/dashboard`);
  return { ok: true };
}
