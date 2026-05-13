import RoleOverview from "@/components/shell/role-overview";
import {
  TEACHER_TITLE,
  TEACHER_DESCRIPTION,
  TEACHER_THEME,
  TEACHER_METRICS,
  TEACHER_NAV,
} from "@/components/roles/teacher/teacher-config";

export default function TeacherPage() {
  return (
    <RoleOverview
      title={TEACHER_TITLE}
      description={TEACHER_DESCRIPTION}
      theme={TEACHER_THEME}
      metrics={TEACHER_METRICS}
      sections={TEACHER_NAV}
    />
  );
}
