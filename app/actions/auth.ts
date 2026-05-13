"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleLandingPath } from "@/lib/session";

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
