"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";
import { requireSession, roleLandingPath } from "@/lib/session";

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  try {
    // Success/failure both audited inside auth.ts (events.signIn / authorize).
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  return { ok: true, redirectTo: roleLandingPath(user.role) };
}

export async function logoutAction() {
  // Logout is audited via Auth.js `events.signOut`.
  await signOut({ redirect: false });
  redirect("/");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    // Mirrors the 8-character floor enforced by the two other paths that mint
    // a hashedPassword (app/actions/admin/users.ts, lib/import/staff.ts).
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "New password must differ from the current one",
    path: ["newPassword"],
  });

// Keyed per user, not per IP: the caller is already signed in, so the risk is a
// hijacked session guessing the current password to take the account over.
const CHANGE_PASSWORD_RATE_LIMIT = { limit: 5, windowSec: 15 * 60 };

export type ChangePasswordResult = { ok: true; redirectTo: string } | { ok: false; error: string };

export async function changePasswordAction(formData: FormData): Promise<ChangePasswordResult> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const gateKey = `change-password:${session.user.id}`;
  const gate = rateLimit(gateKey, CHANGE_PASSWORD_RATE_LIMIT);
  if (!gate.ok) {
    await logAudit({
      action: "LOGIN_FAILED",
      userId: session.user.id,
      resourceType: "User",
      resourceId: session.user.id,
      metadata: { reason: "rate_limited", context: "change_password", retryAfterSec: gate.retryAfterSec },
    });
    return {
      ok: false,
      error: `Too many attempts. Try again in ${Math.ceil(gate.retryAfterSec / 60)} minute(s).`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, hashedPassword: true },
  });
  if (!user) return { ok: false, error: "Account not found." };

  const currentOk = await bcrypt.compare(parsed.data.currentPassword, user.hashedPassword);
  if (!currentOk) {
    await logAudit({
      action: "LOGIN_FAILED",
      userId: user.id,
      resourceType: "User",
      resourceId: user.id,
      metadata: { reason: "bad_password", context: "change_password" },
    });
    return { ok: false, error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword: await bcrypt.hash(parsed.data.newPassword, 10),
      mustChangePassword: false,
    },
  });

  rateLimitReset(gateKey);

  await logAudit({
    action: "PASSWORD_CHANGED",
    userId: user.id,
    resourceType: "User",
    resourceId: user.id,
    metadata: { email: user.email, self_service: true },
  });

  // Refresh the JWT so the cleared flag takes effect immediately — otherwise
  // proxy.ts keeps redirecting back here on the stale token.
  await unstable_update({});

  return { ok: true, redirectTo: roleLandingPath(session.user.role) };
}
