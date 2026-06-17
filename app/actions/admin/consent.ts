"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { ConsentScope, ConsentStatus } from "@prisma/client";

type Result = { ok: true } | { ok: false; error: string };

const setConsentSchema = z
  .object({
    studentId: z.string().min(1),
    scope: z.nativeEnum(ConsentScope),
    status: z.nativeEnum(ConsentStatus),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => v.status !== "REVOKED" || (v.notes && v.notes.trim().length > 0), {
    message: "Revoking consent requires a written justification.",
    path: ["notes"],
  });

export async function setConsentAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = setConsentSchema.safeParse({
    studentId: formData.get("studentId"),
    scope: formData.get("scope"),
    status: formData.get("status"),
    notes: (formData.get("notes") ?? "") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, lrn: true },
  });
  if (!student) return { ok: false, error: "Student not found" };

  const now = new Date();
  const isRevoke = parsed.data.status === "REVOKED";

  await prisma.consentRecord.upsert({
    where: { studentId_scope: { studentId: student.id, scope: parsed.data.scope } },
    update: {
      status: parsed.data.status,
      revokedAt: isRevoke ? now : null,
      grantedAt: isRevoke ? undefined : now,
      notes: parsed.data.notes ?? null,
    },
    create: {
      studentId: student.id,
      scope: parsed.data.scope,
      status: parsed.data.status,
      revokedAt: isRevoke ? now : null,
      grantedAt: isRevoke ? new Date(0) : now,
      notes: parsed.data.notes ?? null,
    },
  });

  await logAudit({
    action: isRevoke ? "CONSENT_REVOKED" : "CONSENT_GRANTED",
    userId: session.user.id,
    resourceType: "ConsentRecord",
    resourceId: student.id,
    metadata: {
      studentLrn: student.lrn,
      scope: parsed.data.scope,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath("/admin/consent");
  return { ok: true };
}
