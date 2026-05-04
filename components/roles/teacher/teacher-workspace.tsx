import RoleWorkspace from "@/components/roles/shared/role-workspace";

const metrics = [
  { label: "Teaching scope", value: "Assigned sections" },
  { label: "Daily focus", value: "Attendance and grades" },
  { label: "Intervention access", value: "Public fields" },
];

const sections = [
  {
    title: "My classes",
    description:
      "Open handled sections, review rosters, and move quickly into daily classroom tasks for the active school year.",
  },
  {
    title: "Attendance entry",
    description:
      "Record present, absent, tardy, and excused statuses with a keyboard-friendly workflow built for speed.",
  },
  {
    title: "Student risk view",
    description:
      "See which students need attention, with transparent factor explanations but without private counseling content.",
  },
  {
    title: "Intervention feedback",
    description:
      "Submit observation notes, request revisions, and log sessions you personally conducted for active plans.",
  },
];

export default function TeacherWorkspace() {
  return (
    <RoleWorkspace
      badge="Teacher workspace"
      title="Classroom operations dashboard"
      description="Track daily academic data, stay aware of at-risk students, and coordinate on interventions from the teacher side."
      schoolYear="SY 2024-2025"
      theme="emerald"
      metrics={metrics}
      sections={sections}
    />
  );
}