import RoleWorkspace from "@/components/roles/shared/role-workspace";

const metrics = [
  { label: "Caseload scope", value: "All students" },
  { label: "Primary action", value: "Intervention planning" },
  { label: "Sensitive access", value: "Full counseling view" },
];

const sections = [
  {
    title: "Caseload Dashboard",
    href: "/counselor/caseload",
    description:
      "Review moderate and high-risk students, sort by urgency, and track changes across the current school year.",
  },
  {
    title: "Intervention Builder",
    href: "/counselor/interventions",
    description:
      "Review AI-generated recommendation drafts and build formal individual, section, grade-level, or school-wide intervention plans.",
  },
  {
    title: "Feedback Queue",
    href: "/counselor/feedback",
    description:
      "Process observation notes and revision requests submitted by teachers. Acknowledge, incorporate, or discuss each item.",
  },
];

export default function CounselorWorkspace() {
  return (
    <RoleWorkspace
      role="counselor"
      badge="Counselor workspace"
      title="Student support and intervention hub"
      description="Own the intervention lifecycle, maintain counseling context, and act on risk signals with accountable human decisions."
      schoolYear="SY 2024-2025"
      theme="amber"
      metrics={metrics}
      sections={sections}
    />
  );
}