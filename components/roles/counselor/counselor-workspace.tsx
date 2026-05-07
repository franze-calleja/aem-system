import RoleWorkspace from "@/components/roles/shared/role-workspace";
import { interventions, patternMatches, recommendationDrafts, riskAssessments } from "@/lib/mock-data";

const highRisk = riskAssessments.filter((r) => r.band === "high").length;
const moderateRisk = riskAssessments.filter((r) => r.band === "moderate").length;
const activeInterventions = interventions.filter((i) => i.status === "active").length;
const pendingRecommendations = recommendationDrafts.filter((r) => r.status === "pending").length;
const activeAlerts = patternMatches.filter((p) => p.status === "active").length;

const metrics = [
  { label: "Caseload", value: `${highRisk + moderateRisk} students`, sub: `${highRisk} high · ${moderateRisk} moderate` },
  { label: "Active interventions", value: `${activeInterventions}`, sub: `${pendingRecommendations} recommendations pending` },
  { label: "Pattern alerts", value: `${activeAlerts} active`, sub: "Across all scopes" },
];

const navItems = [
  { label: "Overview", href: "/counselor", icon: "home" as const },
  { label: "Caseload Dashboard", href: "/counselor/caseload", icon: "alert" as const },
  { label: "Student Profiles", href: "/counselor/students", icon: "users" as const },
  { label: "Counseling Notes", href: "/counselor/notes", icon: "book" as const },
  { label: "Interventions", href: "/counselor/interventions", icon: "clipboard" as const },
  { label: "Feedback Queue", href: "/counselor/feedback", icon: "message" as const },
  { label: "Recommendations", href: "/counselor/recommendations", icon: "check" as const },
  { label: "Pattern Alerts", href: "/counselor/patterns", icon: "alert" as const },
];

export default function CounselorWorkspace() {
  return (
    <RoleWorkspace
      badge="Counselor workspace"
      title="Student support and intervention hub"
      description="Own the intervention lifecycle, maintain counseling context, and act on risk signals with accountable human decisions. All clinical decisions are yours."
      schoolYear="SY 2024-2025"
      theme="rose"
      metrics={metrics}
      navItems={navItems}
    />
  );
}