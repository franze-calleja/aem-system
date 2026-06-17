"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const baseSchema = z.object({ noteId: z.string().min(1) });

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

// Incorporate is now a redirect to /counselor/interventions/[id]/edit?fromNote=…
// where the counselor edits the plan and saves the revision via
// updateInterventionAction. That path handles the note → INCORPORATED
// transition + the InterventionRevision row + significant-change routing
// in a single transaction.
