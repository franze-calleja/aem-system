"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const KIND = z.enum(["REGULAR", "QUIZ", "PERIODICAL", "PRE_TEST", "POST_TEST"]);

const inputSchema = z.object({
  assignmentId: z.string().min(1),
  enrollmentId: z.string().min(1),
  quarter: z.number().int().min(1).max(4),
  score: z.number().min(0),
  maxScore: z.number().positive(),
  assessmentKind: KIND.default("REGULAR"),
  label: z.string().optional(),
});

export type RecordGradeResult =
  | { ok: true; gradeId: string }
  | { ok: false; error: string };

export async function recordGradeAction(input: unknown): Promise<RecordGradeResult> {
  const session = await requireRole("TEACHER");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { assignmentId, enrollmentId, quarter, score, maxScore, assessmentKind, label } = parsed.data;

  if (score > maxScore) {
    return { ok: false, error: `score (${score}) cannot exceed maxScore (${maxScore})` };
  }

  const assignment = await prisma.teacherAssignment.findFirst({
    where: { id: assignmentId, userId: session.user.id },
    select: { id: true, sectionId: true, schoolYearId: true, subjectId: true },
  });
  if (!assignment) return { ok: false, error: "Class not found or not assigned to you." };
  if (!assignment.subjectId) {
    return { ok: false, error: "This is an adviser-only assignment; no subject to grade." };
  }

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { id: enrollmentId, sectionId: assignment.sectionId, schoolYearId: assignment.schoolYearId },
    select: { id: true },
  });
  if (!enrollment) return { ok: false, error: "Student not in this class." };

  const grade = await prisma.grade.create({
    data: {
      enrollmentId,
      subjectId: assignment.subjectId,
      quarter,
      score,
      maxScore,
      assessmentKind,
      label: label ?? null,
      recordedById: session.user.id,
    },
    select: { id: true },
  });

  await logAudit({
    action: "GRADE_RECORDED",
    userId: session.user.id,
    resourceType: "Grade",
    resourceId: grade.id,
    metadata: { assignmentId, enrollmentId, quarter, score, maxScore, assessmentKind, label: label ?? null },
  });

  revalidatePath(`/teacher/my-classes/${assignmentId}`);
  return { ok: true, gradeId: grade.id };
}
