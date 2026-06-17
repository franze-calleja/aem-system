"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { logAudit } from "@/lib/audit";
import { canTeacherReferStudent } from "@/lib/teacher/queries";

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

const inputSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  suggestedType: TYPE,
  rationale: z.string().trim().min(1, "Reason is required.").max(4000),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export type CreateReferralResult =
  | { ok: true; referralId: string }
  | { ok: false; error: string };

export async function createReferralAction(input: unknown): Promise<CreateReferralResult> {
  const session = await requireRole("TEACHER");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const sy = await getActiveSchoolYear();
  if (!sy) return { ok: false, error: "No active school year." };

  const allowed = await canTeacherReferStudent(session.user.id, data.studentId, sy.id);
  if (!allowed) {
    return { ok: false, error: "You can only refer students in your assigned sections." };
  }

  const referral = await prisma.interventionReferral.create({
    data: {
      referredById: session.user.id,
      studentId: data.studentId,
      schoolYearId: sy.id,
      suggestedType: data.suggestedType,
      rationale: data.rationale,
      urgency: data.urgency,
    },
    select: { id: true },
  });

  await logAudit({
    action: "REFERRAL_CREATED",
    userId: session.user.id,
    resourceType: "InterventionReferral",
    resourceId: referral.id,
    metadata: { studentId: data.studentId, suggestedType: data.suggestedType, urgency: data.urgency },
  });

  revalidatePath("/teacher/refer");
  revalidatePath("/counselor/referrals");
  return { ok: true, referralId: referral.id };
}
