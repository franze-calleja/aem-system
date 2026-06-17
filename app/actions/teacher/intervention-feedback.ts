"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Shared schema — the three teacher-side note types share the same shape.
const noteSchema = z.object({
  interventionId: z.string().min(1),
  content: z.string().trim().min(1, "Content is required.").max(4000),
});

type FeedbackResult = { ok: true; noteId: string } | { ok: false; error: string };

async function createNote(
  noteType: "OBSERVATION" | "REVISION_REQUEST" | "OUTCOME_OBSERVATION",
  input: unknown,
): Promise<FeedbackResult> {
  const session = await requireRole("TEACHER");

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { interventionId, content } = parsed.data;

  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: { id: true, status: true, schoolYearId: true, scope: true, scopeTargetId: true },
  });
  if (!intervention) return { ok: false, error: "Intervention not found." };

  // Teachers can submit feedback on any intervention in their assignment scope.
  // The visibility predicate is the same one as the read path — duplicate the
  // logic inline rather than expose canViewIntervention publicly.
  const allowed = await teacherCanReach(session.user.id, intervention);
  if (!allowed) return { ok: false, error: "You do not have access to this intervention." };

  const note = await prisma.interventionNote.create({
    data: {
      interventionId,
      authorId: session.user.id,
      noteType,
      content,
    },
    select: { id: true },
  });

  await logAudit({
    action: "CREATE",
    userId: session.user.id,
    resourceType: "InterventionNote",
    resourceId: note.id,
    metadata: { interventionId, noteType },
  });

  revalidatePath("/teacher/intervention-feedback");
  revalidatePath("/counselor/feedback");
  return { ok: true, noteId: note.id };
}

export async function logSessionAction(input: unknown) {
  return createNote("OBSERVATION", input);
}

export async function submitRevisionRequestAction(input: unknown) {
  return createNote("REVISION_REQUEST", input);
}

export async function submitOutcomeObservationAction(input: unknown) {
  return createNote("OUTCOME_OBSERVATION", input);
}

async function teacherCanReach(
  teacherUserId: string,
  intervention: { scope: string; scopeTargetId: string; schoolYearId: string },
): Promise<boolean> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { userId: teacherUserId, schoolYearId: intervention.schoolYearId },
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
