import RoleWorkspace from "@/components/roles/shared/role-workspace";
import { biasMetrics, interventions, riskAssessments } from "@/lib/mock-data";

const highRisk = riskAssessments.filter((r) => r.band === "high").length;
const disparities = biasMetrics.filter((b) => b.disparity).length;
const pendingApproval = interventions.filter((i) => i.requiresApproval && i.status === "planned" && !i.approvedAt).length;

const metrics = [
  { label: "Oversight level", value: "School-wide", sub: "All grades and sections" },
  { label: "High-risk students", value: `${highRisk}`, sub: "Requires monitoring" },
  { label: "Bias flags", value: `${disparities}`, sub: `${pendingApproval} interventions pending approval` },
];

const navItems = [
  { label: "Overview", href: "/principal", icon: "home" as const },
  { label: "School Dashboard", href: "/principal/school-dashboard", icon: "chart" as const },
  { label: "Bias Monitoring", href: "/principal/bias-monitoring", icon: "eye" as const },
  { label: "Approval Queue", href: "/principal/approvals", icon: "check" as const },
  { label: "Cohort Analysis", href: "/principal/cohort-analysis", icon: "chart" as const },
  { label: "Governance Review", href: "/principal/governance", icon: "shield" as const },
];

export default function PrincipalWorkspace() {
  return (
    <RoleWorkspace
      badge="Principal workspace"
      title="Oversight and decision dashboard"
      description="Monitor school-wide patterns, validate high-impact decisions, and keep governance visible across the system. Approval authority for broader-scope interventions."
      schoolYear="SY 2024-2025"
      theme="amber"
      metrics={metrics}
      navItems={navItems}
    />
  );
}