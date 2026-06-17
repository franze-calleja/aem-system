"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const inputSchema = z.object({
  enrollmentId: z.string().min(1),
  body: z.string().trim().min(1, "Note body is required.").max(8000, "Note is too long."),
});

export type CreateCounselingNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; error: string };

export async function createCounselingNoteAction(
  input: unknown,
): Promise<CreateCounselingNoteResult> {
  const session = await requireRole("COUNSELOR");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { enrollmentId, body } = parsed.data;

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, studentId: true },
  });
  if (!enrollment) return { ok: false, error: "Enrollment not found." };

  const note = await prisma.counselingNote.create({
    data: {
      enrollmentId,
      authorId: session.user.id,
      body,
    },
    select: { id: true },
  });

  await logAudit({
    action: "COUNSELING_NOTE_CREATED",
    userId: session.user.id,
    resourceType: "CounselingNote",
    resourceId: note.id,
    metadata: { enrollmentId },
  });

  revalidatePath(`/counselor/students/${enrollment.studentId}`);
  return { ok: true, noteId: note.id };
}
