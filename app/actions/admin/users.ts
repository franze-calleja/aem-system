"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { Role } from "@prisma/client";

type Result = { ok: true } | { ok: false; error: string };

const createUserSchema = z.object({
  email: z.string().email("Invalid email").transform((v) => v.toLowerCase().trim()),
  name: z.string().min(1, "Name is required").max(120),
  role: z.nativeEnum(Role),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function createUserAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false, error: "A user with that email already exists." };

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      hashedPassword: hashed,
    },
    select: { id: true, email: true, role: true },
  });

  await logAudit({
    action: "CREATE",
    userId: session.user.id,
    resourceType: "User",
    resourceId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const idInput = z.object({ userId: z.string().min(1) });

export async function suspendUserAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");
  const parsed = idInput.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { ok: false, error: "Missing userId" };

  if (parsed.data.userId === session.user.id) {
    return { ok: false, error: "You cannot suspend your own account." };
  }

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { status: "SUSPENDED" },
    select: { id: true, email: true },
  });

  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "User",
    resourceId: user.id,
    metadata: { change: "suspended", email: user.email },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function reactivateUserAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");
  const parsed = idInput.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { ok: false, error: "Missing userId" };

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { status: "ACTIVE" },
    select: { id: true, email: true },
  });

  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "User",
    resourceId: user.id,
    metadata: { change: "reactivated", email: user.email },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function resetPasswordAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { hashedPassword: hashed },
    select: { id: true, email: true },
  });

  await logAudit({
    action: "UPDATE",
    userId: session.user.id,
    resourceType: "User",
    resourceId: user.id,
    metadata: { change: "password_reset", email: user.email },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

const addAssignmentSchema = z.object({
  userId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().optional(),
  schoolYearId: z.string().min(1),
  isAdviser: z.string().optional(),
});

export async function addAssignmentAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");

  const parsed = addAssignmentSchema.safeParse({
    userId: formData.get("userId"),
    sectionId: formData.get("sectionId"),
    subjectId: formData.get("subjectId") || undefined,
    schoolYearId: formData.get("schoolYearId"),
    isAdviser: formData.get("isAdviser") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { role: true, email: true },
  });
  if (!targetUser) return { ok: false, error: "User not found" };
  if (targetUser.role !== "TEACHER") {
    return { ok: false, error: "Only TEACHER users can be assigned to sections." };
  }

  const subjectId = parsed.data.subjectId && parsed.data.subjectId !== "" ? parsed.data.subjectId : null;
  const isAdviser = parsed.data.isAdviser === "on" || parsed.data.isAdviser === "true";

  // Verify section + subject belong to the school year.
  const section = await prisma.section.findUnique({ where: { id: parsed.data.sectionId } });
  if (!section || section.schoolYearId !== parsed.data.schoolYearId) {
    return { ok: false, error: "Section does not belong to that school year." };
  }
  if (subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.schoolYearId !== parsed.data.schoolYearId) {
      return { ok: false, error: "Subject does not belong to that school year." };
    }
  }

  try {
    const created = await prisma.teacherAssignment.create({
      data: {
        userId: parsed.data.userId,
        sectionId: parsed.data.sectionId,
        subjectId,
        schoolYearId: parsed.data.schoolYearId,
        isAdviser,
      },
      select: { id: true },
    });

    await logAudit({
      action: "CREATE",
      userId: session.user.id,
      resourceType: "TeacherAssignment",
      resourceId: created.id,
      metadata: {
        teacherEmail: targetUser.email,
        sectionId: parsed.data.sectionId,
        subjectId,
        schoolYearId: parsed.data.schoolYearId,
        isAdviser,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "Assignment already exists for this user/section/subject." };
    }
    return { ok: false, error: msg };
  }

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

const removeAssignmentSchema = z.object({ assignmentId: z.string().min(1) });

export async function removeAssignmentAction(formData: FormData): Promise<Result> {
  const session = await requireRole("ADMIN");
  const parsed = removeAssignmentSchema.safeParse({ assignmentId: formData.get("assignmentId") });
  if (!parsed.success) return { ok: false, error: "Missing assignmentId" };

  const before = await prisma.teacherAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    select: { id: true, userId: true, sectionId: true, subjectId: true, schoolYearId: true },
  });
  if (!before) return { ok: false, error: "Assignment not found" };

  await prisma.teacherAssignment.delete({ where: { id: before.id } });

  await logAudit({
    action: "DELETE",
    userId: session.user.id,
    resourceType: "TeacherAssignment",
    resourceId: before.id,
    metadata: {
      teacherUserId: before.userId,
      sectionId: before.sectionId,
      subjectId: before.subjectId,
      schoolYearId: before.schoolYearId,
    },
  });

  revalidatePath(`/admin/users/${before.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}
