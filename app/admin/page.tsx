import RoleOverview from "@/components/shell/role-overview";
import {
  ADMIN_TITLE,
  ADMIN_DESCRIPTION,
  ADMIN_THEME,
  ADMIN_METRICS,
  ADMIN_NAV,
} from "@/components/roles/admin/admin-config";

export default function AdminPage() {
  return (
    <RoleOverview
      title={ADMIN_TITLE}
      description={ADMIN_DESCRIPTION}
      theme={ADMIN_THEME}
      metrics={ADMIN_METRICS}
      sections={ADMIN_NAV}
    />
  );
}
