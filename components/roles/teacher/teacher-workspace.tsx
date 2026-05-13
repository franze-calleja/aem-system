import RoleWorkspace from "@/components/roles/shared/role-workspace";

const metrics = [
  { label: "Teaching scope", value: "Assigned sections" },
  { label: "Daily focus", value: "Attendance and grades" },
  { label: "Intervention access", value: "Public fields" },
];

const sections = [
  {
    title: "My Classes",
    href: "/teacher/my-classes",
    description:
      "Open handled sections, review rosters, and move quickly into attendance, grades, student risk, and behavioral logging.",
  },
  {
    title: "Intervention Feedback",
    href: "/teacher/intervention-feedback",
    description:
      "View active intervention plans, log sessions you personally conducted, submit observation notes, and request plan revisions.",
  },
];

export default async function TeacherWorkspace() {
  return (
    <RoleWorkspace
      role="teacher"
      badge="Teacher workspace"
      title="Classroom operations dashboard"
      description="Track daily academic data, stay aware of at-risk students, and coordinate on interventions from the teacher side."
      theme="emerald"
      metrics={metrics}
      sections={sections}
    />
  );
}