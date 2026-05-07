import RoleWorkspace from "@/components/roles/shared/role-workspace";

const metrics = [
  { label: "Caseload scope", value: "All students" },
  { label: "Primary action", value: "Intervention planning" },
  { label: "Sensitive access", value: "Full counseling view" },
];

const sections = [
  {
    title: "Caseload dashboard",
    description:
      "Review moderate and high-risk students, sort by urgency, and track changes across the current school year.",
  },
  {
    title: "Counseling notes",
    description:
      "Manage private notes and counselor-only context that informs interventions without exposing note bodies elsewhere.",
  },
  {
    title: "Recommendation queue",
    description:
      "Review algorithmic and Gemini-assisted drafts, then convert them into actual interventions when appropriate.",
  },
  {
    title: "Revision workflow",
    description:
      "Process teacher and adviser feedback, create revisions, and manage approval flow for broader-scope plans.",
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
      theme="rose"
      metrics={metrics}
      sections={sections}
    />
  );
}