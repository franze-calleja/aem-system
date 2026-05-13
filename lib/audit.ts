import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

type LogInput = {
  action: AuditAction;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logAudit(input: LogInput): Promise<void> {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  try {
    const h = await headers();
    ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      undefined;
    userAgent = h.get("user-agent") ?? undefined;
  } catch {
    // headers() unavailable outside request context (e.g. seed script) — skip.
  }

  await prisma.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId ?? undefined,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
      ipAddress,
      userAgent,
    },
  });
}
