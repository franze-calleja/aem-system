import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session;
}

export async function requireRole(roles: Role | Role[]) {
  const session = await requireSession();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.user.role)) {
    redirect("/");
  }
  return session;
}

export function roleLandingPath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    case "COUNSELOR":
      return "/counselor";
    case "PRINCIPAL":
      return "/principal";
  }
}
