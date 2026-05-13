import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import RoleShell from "@/components/shell/role-shell";
import {
  COUNSELOR_BADGE,
  COUNSELOR_TITLE,
  COUNSELOR_THEME,
  COUNSELOR_NAV,
} from "@/components/roles/counselor/counselor-config";

export default async function CounselorLayout({ children }: { children: ReactNode }) {
  await requireRole("COUNSELOR");
  return (
    <RoleShell
      role="counselor"
      badge={COUNSELOR_BADGE}
      title={COUNSELOR_TITLE}
      theme={COUNSELOR_THEME}
      navSections={COUNSELOR_NAV}
    >
      {children}
    </RoleShell>
  );
}
