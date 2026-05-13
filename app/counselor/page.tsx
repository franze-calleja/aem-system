import RoleOverview from "@/components/shell/role-overview";
import {
  COUNSELOR_TITLE,
  COUNSELOR_DESCRIPTION,
  COUNSELOR_THEME,
  COUNSELOR_METRICS,
  COUNSELOR_NAV,
} from "@/components/roles/counselor/counselor-config";

export default function CounselorPage() {
  return (
    <RoleOverview
      title={COUNSELOR_TITLE}
      description={COUNSELOR_DESCRIPTION}
      theme={COUNSELOR_THEME}
      metrics={COUNSELOR_METRICS}
      sections={COUNSELOR_NAV}
    />
  );
}
