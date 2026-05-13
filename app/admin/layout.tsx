import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import RoleShell from "@/components/shell/role-shell";
import {
  ADMIN_BADGE,
  ADMIN_TITLE,
  ADMIN_THEME,
  ADMIN_NAV,
} from "@/components/roles/admin/admin-config";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("ADMIN");
  return (
    <RoleShell
      role="admin"
      badge={ADMIN_BADGE}
      title={ADMIN_TITLE}
      theme={ADMIN_THEME}
      navSections={ADMIN_NAV}
    >
      {children}
    </RoleShell>
  );
}
