import RoleOverview from "@/components/shell/role-overview";
import {
  PRINCIPAL_TITLE,
  PRINCIPAL_DESCRIPTION,
  PRINCIPAL_THEME,
  PRINCIPAL_METRICS,
  PRINCIPAL_NAV,
} from "@/components/roles/principal/principal-config";

export default function PrincipalPage() {
  return (
    <RoleOverview
      title={PRINCIPAL_TITLE}
      description={PRINCIPAL_DESCRIPTION}
      theme={PRINCIPAL_THEME}
      metrics={PRINCIPAL_METRICS}
      sections={PRINCIPAL_NAV}
    />
  );
}
