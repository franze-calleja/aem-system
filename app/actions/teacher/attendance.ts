"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const STATUS = z.enum(["PRESENT", "ABSENT", "TARDY", "EXCUSED"]);

const inputSchema = z.object({
  assignmentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  entries: z.array(
    z.object({
      enrollmentId: z.string().min(1),
      status: STATUS,
      notes: z.string().optional(),
    }),
  ).min(1),
});

export type RecordAttendanceResult =
  | { ok: true; upserted: number }
  | { ok: false; error: string };

/**
 * Bulk attendance write for a single date for one of the teacher's assigned sections.
 * Validates that every enrollment in the payload belongs to a section the teacher is assigned to.
 */
export async function recordAttendanceAction(input: unknown): Promise<RecordAttendanceResult> {
  const session = await requireRole("TEACHER");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { assignmentId, date, entries } = parsed.data;

  // Confirm the teacher is assigned to a section, then constrain enrollments to it.
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { id: assignmentId, userId: session.user.id },
    select: { id: true, sectionId: true, schoolYearId: true },
  });
  if (!assignment) return { ok: false, error: "Class not found or not assigned to you." };

  const allowedEnrollmentIds = new Set(
    (
      await prisma.studentEnrollment.findMany({
        where: { sectionId: assignment.sectionId, schoolYearId: assignment.schoolYearId },
        select: { id: true },
      })
    ).map((e) => e.id),
  );

  for (const e of entries) {
    if (!allowedEnrollmentIds.has(e.enrollmentId)) {
      return { ok: false, error: `enrollment ${e.enrollmentId} not in this section` };
    }
  }

  const dateObj = new Date(date + "T00:00:00.000Z");

  await prisma.$transaction(async (tx) => {
    for (const e of entries) {
      await tx.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId: e.enrollmentId, date: dateObj } },
        update: { status: e.status, notes: e.notes ?? null, recordedById: session.user.id },
        create: {
          enrollmentId: e.enrollmentId,
          date: dateObj,
          status: e.status,
          notes: e.notes ?? null,
          recordedById: session.user.id,
        },
      });
    }
  });

  await logAudit({
    action: "ATTENDANCE_RECORDED",
    userId: session.user.id,
    resourceType: "TeacherAssignment",
    resourceId: assignmentId,
    metadata: { date, count: entries.length },
  });

  revalidatePath(`/teacher/my-classes/${assignmentId}`);
  return { ok: true, upserted: entries.length };
}
