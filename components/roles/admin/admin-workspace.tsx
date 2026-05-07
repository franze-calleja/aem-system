import RoleWorkspace from "@/components/roles/shared/role-workspace";

const metrics = [
  { label: "Active school year", value: "SY 2024-2025" },
  { label: "Governance scope", value: "System-wide" },
  { label: "Core priority", value: "Audit and setup" },
];

const sections = [
  {
    title: "User management",
    description:
      "Create staff accounts, suspend access, reset passwords, and keep role assignments aligned with school operations.",
  },
  {
    title: "Consent and audit",
    description:
      "Review consent records, process revocations, and inspect append-only audit trails for sensitive actions.",
  },
  {
    title: "Import wizard",
    description:
      "Load student rosters, grades, attendance, behavioral records, and historical interventions per school year.",
  },
  {
    title: "System configuration",
    description:
      "Maintain thresholds, risk-score weights, sections, subjects, and term setup with versioned governance controls.",
  },
];

export default function AdminWorkspace() {
  return (
    <RoleWorkspace
      badge="Admin workspace"
      title="Administrative control center"
      description="Manage school-year setup, user access, import pipelines, and governance settings without exposing counseling details."
      schoolYear="SY 2024-2025"
      theme="indigo"
      metrics={metrics}
      sections={sections}
    />
  );
}