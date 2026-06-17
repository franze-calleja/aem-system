"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const CATEGORY = z.enum(["ACADEMIC", "ATTENDANCE_RELATED", "BEHAVIORAL", "SOCIAL_EMOTIONAL"]);
const SEVERITY = z.enum(["LOW", "MODERATE", "HIGH"]);

const inputSchema = z.object({
  assignmentId: z.string().min(1),
  enrollmentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  category: CATEGORY,
  severity: SEVERITY,
  description: z.string().min(1, "description required"),
});

export type RecordBehavioralResult =
  | { ok: true; recordId: string }
  | { ok: false; error: string };

export async function recordBehavioralAction(input: unknown): Promise<RecordBehavioralResult> {
  const session = await requireRole("TEACHER");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { assignmentId, enrollmentId, date, category, severity, description } = parsed.data;

  const assignment = await prisma.teacherAssignment.findFirst({
    where: { id: assignmentId, userId: session.user.id },
    select: { id: true, sectionId: true, schoolYearId: true },
  });
  if (!assignment) return { ok: false, error: "Class not found or not assigned to you." };

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { id: enrollmentId, sectionId: assignment.sectionId, schoolYearId: assignment.schoolYearId },
    select: { id: true },
  });
  if (!enrollment) return { ok: false, error: "Student not in this class." };

  const record = await prisma.behavioralRecord.create({
    data: {
      enrollmentId,
      date: new Date(date + "T00:00:00.000Z"),
      category,
      severity,
      description,
      recordedById: session.user.id,
    },
    select: { id: true },
  });

  await logAudit({
    action: "BEHAVIORAL_INCIDENT_RECORDED",
    userId: session.user.id,
    resourceType: "BehavioralRecord",
    resourceId: record.id,
    metadata: { assignmentId, enrollmentId, date, category, severity },
  });

  revalidatePath(`/teacher/my-classes/${assignmentId}`);
  return { ok: true, recordId: record.id };
}
