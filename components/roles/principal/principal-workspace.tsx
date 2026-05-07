import RoleWorkspace from "@/components/roles/shared/role-workspace";

const metrics = [
  { label: "Oversight level", value: "School-wide" },
  { label: "Approval scope", value: "Broad interventions" },
  { label: "Governance focus", value: "Bias and overrides" },
];

const sections = [
  {
    title: "School dashboard",
    description:
      "Review risk distribution across grade levels, sections, and learner groups with drill-down visibility.",
  },
  {
    title: "Bias monitoring",
    description:
      "Track disparity flags across demographic dimensions and inspect whether calibration changes are warranted.",
  },
  {
    title: "Approval queue",
    description:
      "Approve broader-scope interventions, review significant revisions, and handle interim revisions when needed.",
  },
  {
    title: "Governance review",
    description:
      "Inspect audit history, outcome trends, and risk overrides with mandatory written accountability.",
  },
];

export default function PrincipalWorkspace() {
  return (
    <RoleWorkspace
      role="principal"
      badge="Principal workspace"
      title="Oversight and decision dashboard"
      description="Monitor school-wide patterns, validate high-impact decisions, and keep governance visible across the system."
      schoolYear="SY 2024-2025"
      theme="amber"
      metrics={metrics}
      sections={sections}
    />
  );
}