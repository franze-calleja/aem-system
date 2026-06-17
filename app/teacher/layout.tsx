import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import RoleShell from "@/components/shell/role-shell";
import {
  TEACHER_BADGE,
  TEACHER_TITLE,
  TEACHER_THEME,
  TEACHER_NAV,
} from "@/components/roles/teacher/teacher-config";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireRole("TEACHER");
  return (
    <RoleShell
      role="teacher"
      badge={TEACHER_BADGE}
      title={TEACHER_TITLE}
      theme={TEACHER_THEME}
      navSections={TEACHER_NAV}
    >
      {children}
    </RoleShell>
  );
}
