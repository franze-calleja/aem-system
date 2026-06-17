"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

type Result = { ok: true } | { ok: false; error: string };

const dateString = z
  .string()
  .min(1, "Date is required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

const createYearSchema = z
  .object({
    label: z.string().min(1, "Label is required").max(40),
    startDate: dateString,
    endDate: dateString,
    activate: z.string().optional(),
  })
  .refine((v) => new Date(v.endDate) > new Date(v.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export async function createSchoolYearAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = createYearSchema.safeParse({
    label: formData.get("label"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    activate: formData.get("activate") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.schoolYear.findUnique({ where: { label: parsed.data.label } });
  if (existing) return { ok: false, error: "A school year with that label already exists." };

  const activate = parsed.data.activate === "on" || parsed.data.activate === "true";

  const sy = await prisma.$transaction(async (tx) => {
    if (activate) {
      await tx.schoolYear.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    return tx.schoolYear.create({
      data: {
        label: parsed.data.label,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        isActive: activate,
      },
      select: { id: true, label: true, isActive: true },
    });
  });

  await logAudit({
    action: "CREATE",
    userId: session.user.id,
    resourceType: "SchoolYear",
    resourceId: sy.id,
    metadata: { label: sy.label, isActive: sy.isActive },
  });

  revalidatePath("/admin/setup");
  return { ok: true };
}

const activateYearSchema = z.object({ schoolYearId: z.string().min(1) });

export async function activateSchoolYearAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = activateYearSchema.safeParse({ schoolYearId: formData.get("schoolYearId") });
  if (!parsed.success) return { ok: false, error: "Missing school year id" };

  const sy = await prisma.$transaction(async (tx) => {
    await tx.schoolYear.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.schoolYear.update({
      where: { id: parsed.data.schoolYearId },
      data: { isActive: true },
      select: { id: true, label: true },
    });
  });

  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "SchoolYear",
    resourceId: sy.id,
    metadata: { change: "activated", label: sy.label },
  });

  revalidatePath("/admin/setup");
  revalidatePath("/", "layout");
  return { ok: true };
}

const createSectionSchema = z.object({
  schoolYearId: z.string().min(1),
  gradeLevel: z.string().min(1, "Grade level is required").max(40),
  name: z.string().min(1, "Section name is required").max(40),
});

export async function createSectionAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = createSectionSchema.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    gradeLevel: formData.get("gradeLevel"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const sec = await prisma.section.create({
      data: parsed.data,
      select: { id: true, name: true, gradeLevel: true },
    });
    await logAudit({
      action: "CREATE",
      userId: session.user.id,
      resourceType: "Section",
      resourceId: sec.id,
      metadata: {
        schoolYearId: parsed.data.schoolYearId,
        gradeLevel: sec.gradeLevel,
        name: sec.name,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "A section with that grade level and name already exists for this year." };
    }
    return { ok: false, error: msg };
  }

  revalidatePath("/admin/setup");
  return { ok: true };
}

const createSubjectSchema = z.object({
  schoolYearId: z.string().min(1),
  code: z.string().min(1, "Subject code is required").max(20).transform((v) => v.toUpperCase().trim()),
  name: z.string().min(1, "Subject name is required").max(80),
});

export async function createSubjectAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = createSubjectSchema.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const sub = await prisma.subject.create({
      data: parsed.data,
      select: { id: true, code: true, name: true },
    });
    await logAudit({
      action: "CREATE",
      userId: session.user.id,
      resourceType: "Subject",
      resourceId: sub.id,
      metadata: {
        schoolYearId: parsed.data.schoolYearId,
        code: sub.code,
        name: sub.name,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "A subject with that code already exists for this year." };
    }
    return { ok: false, error: msg };
  }

  revalidatePath("/admin/setup");
  return { ok: true };
}
