"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { logAudit } from "@/lib/audit";

const inputSchema = z.object({
  referralId: z.string().min(1),
  reason: z.string().trim().min(1, "A reason is required.").max(2000),
});

export type DeclineReferralResult = { ok: true } | { ok: false; error: string };

export async function declineReferralAction(input: unknown): Promise<DeclineReferralResult> {
  const session = await requireRole("COUNSELOR");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { referralId, reason } = parsed.data;

  const sy = await getActiveSchoolYear();
  if (!sy) return { ok: false, error: "No active school year." };

  const referral = await prisma.interventionReferral.findFirst({
    where: { id: referralId, status: "PENDING", schoolYearId: sy.id },
    select: { id: true },
  });
  if (!referral) return { ok: false, error: "Referral not found or already reviewed." };

  await prisma.interventionReferral.update({
    where: { id: referral.id },
    data: {
      status: "DECLINED",
      declineReason: reason,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  await logAudit({
    action: "REFERRAL_DECLINED",
    userId: session.user.id,
    resourceType: "InterventionReferral",
    resourceId: referral.id,
    metadata: { reason },
  });

  revalidatePath("/counselor/referrals");
  revalidatePath("/teacher/refer");
  return { ok: true };
}
