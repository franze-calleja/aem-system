"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  patternId: z.string().min(1),
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

export type PatternDispositionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setPatternStatusAction(
  input: unknown,
): Promise<PatternDispositionResult> {
  const session = await requireRole("COUNSELOR");
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { patternId, status } = parsed.data;

  const pattern = await prisma.patternMatch.findUnique({
    where: { id: patternId },
    select: { id: true, status: true },
  });
  if (!pattern) return { ok: false, error: "Pattern match not found." };
  if (pattern.status !== "OPEN") {
    return { ok: false, error: `Already ${pattern.status.toLowerCase()}.` };
  }

  await prisma.patternMatch.update({
    where: { id: pattern.id },
    data: { status },
  });
  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "PatternMatch",
    resourceId: pattern.id,
    metadata: { from: "OPEN", to: status },
  });

  revalidatePath("/counselor/patterns");
  revalidatePath("/counselor/caseload");
  return { ok: true };
}
