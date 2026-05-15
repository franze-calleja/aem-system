"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const baseSchema = z.object({ noteId: z.string().min(1) });
const incorporateSchema = baseSchema.extend({
  reason: z.string().trim().min(1, "Provide a short reason for the revision.").max(2000),
});

type DispositionResult = { ok: true } | { ok: false; error: string };

async function loadOwnedNote(noteId: string, counselorId: string) {
  const note = await prisma.interventionNote.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      status: true,
      interventionId: true,
      noteType: true,
      content: true,
      intervention: { select: { ownerId: true, status: true } },
    },
  });
  if (!note) return { ok: false as const, error: "Note not found." };
  if (note.intervention.ownerId !== counselorId) {
    return {
      ok: false as const,
      error: "This note belongs to another counselor's intervention.",
    };
  }
  return {
    ok: true as const,
    note: {
      id: note.id,
      status: note.status,
      interventionId: note.interventionId,
      noteType: note.noteType,
      content: note.content,
    },
  };
}

export async function acknowledgeNoteAction(input: unknown): Promise<DispositionResult> {
  const session = await requireRole("COUNSELOR");
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const loaded = await loadOwnedNote(parsed.data.noteId, session.user.id);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (loaded.note.status !== "OPEN") {
    return { ok: false, error: `Already ${loaded.note.status.toLowerCase()}.` };
  }
  await prisma.interventionNote.update({
    where: { id: loaded.note.id },
    data: { status: "ACKNOWLEDGED" },
  });
  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "InterventionNote",
    resourceId: loaded.note.id,
    metadata: { disposition: "ACKNOWLEDGED" },
  });
  revalidatePath("/counselor/feedback");
  return { ok: true };
}

export async function dismissNoteAction(input: unknown): Promise<DispositionResult> {
  const session = await requireRole("COUNSELOR");
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const loaded = await loadOwnedNote(parsed.data.noteId, session.user.id);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (loaded.note.status !== "OPEN") {
    return { ok: false, error: `Already ${loaded.note.status.toLowerCase()}.` };
  }
  await prisma.interventionNote.update({
    where: { id: loaded.note.id },
    data: { status: "DISMISSED" },
  });
  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "InterventionNote",
    resourceId: loaded.note.id,
    metadata: { disposition: "DISMISSED" },
  });
  revalidatePath("/counselor/feedback");
  return { ok: true };
}

// Incorporate — mark INCORPORATED, write an InterventionRevision linked to
// this note. Phase 3.5 minimal: revision captures the note content and the
// counselor's reason; isSignificant defaults to false. Auto-detection of
// significant scope/type/duration changes lands when the revision-mode edit
// form ships (deferred). Counselors can manually flag re-approval need by
// setting status PENDING_APPROVAL via a future edit flow.
export async function incorporateNoteAction(input: unknown): Promise<DispositionResult> {
  const session = await requireRole("COUNSELOR");
  const parsed = incorporateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const loaded = await loadOwnedNote(parsed.data.noteId, session.user.id);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (loaded.note.status !== "OPEN") {
    return { ok: false, error: `Already ${loaded.note.status.toLowerCase()}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.interventionNote.update({
      where: { id: loaded.note.id },
      data: { status: "INCORPORATED" },
    });
    await tx.interventionRevision.create({
      data: {
        interventionId: loaded.note.interventionId,
        changedById: session.user.id,
        diff: {
          incorporatedFrom: {
            noteId: loaded.note.id,
            noteType: loaded.note.noteType,
            noteContent: loaded.note.content,
          },
        },
        reason: parsed.data.reason,
        triggeringNoteId: loaded.note.id,
        isSignificant: false,
      },
    });
  });

  await logAudit({
    action: "INTERVENTION_REVISED",
    userId: session.user.id,
    resourceType: "Intervention",
    resourceId: loaded.note.interventionId,
    metadata: { source: "incorporated_feedback", noteId: loaded.note.id },
  });

  revalidatePath("/counselor/feedback");
  revalidatePath(`/counselor/interventions/${loaded.note.interventionId}`);
  return { ok: true };
}
