import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import RoleShell from "@/components/shell/role-shell";
import {
  PRINCIPAL_BADGE,
  PRINCIPAL_TITLE,
  PRINCIPAL_THEME,
  PRINCIPAL_NAV,
} from "@/components/roles/principal/principal-config";

export default async function PrincipalLayout({ children }: { children: ReactNode }) {
  await requireRole("PRINCIPAL");
  return (
    <RoleShell
      role="principal"
      badge={PRINCIPAL_BADGE}
      title={PRINCIPAL_TITLE}
      theme={PRINCIPAL_THEME}
      navSections={PRINCIPAL_NAV}
    >
      {children}
    </RoleShell>
  );
}
