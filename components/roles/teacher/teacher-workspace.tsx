import RoleWorkspace from "@/components/roles/shared/role-workspace";
import { patternMatches, riskAssessments } from "@/lib/mock-data";

// Teacher's scope: sections 9-newton and 11-einstein (Ms. Maria Cruz — t1)
const teacherStudentIds = ["stu1", "stu2", "stu3", "stu4", "stu14", "stu15", "stu16"];
const teacherRisks = riskAssessments.filter((r) => teacherStudentIds.includes(r.studentId));
const highRisk = teacherRisks.filter((r) => r.band === "high").length;
const activeAlerts = patternMatches.filter((p) => p.status === "active" && (p.routed.includes("teacher") || p.affectedSectionId === "9-newton")).length;

const metrics = [
  { label: "Assigned sections", value: "3 sections", sub: "9-Newton · 11-Einstein (adviser)" },
  { label: "At-risk students", value: `${highRisk} high-risk`, sub: `${teacherRisks.filter((r) => r.band === "moderate").length} moderate` },
  { label: "Active alerts", value: `${activeAlerts}`, sub: "Pattern detections for your sections" },
];

const navItems = [
  { label: "Overview", href: "/teacher", icon: "home" as const },
  { label: "My Classes", href: "/teacher/my-classes", icon: "folder" as const },
  { label: "At-Risk Students", href: "/teacher/at-risk", icon: "alert" as const },
  { label: "Behavioral Log", href: "/teacher/behavioral", icon: "clipboard" as const },
  { label: "Interventions & Feedback", href: "/teacher/interventions", icon: "message" as const },
];

export default function TeacherWorkspace() {
  return (
    <RoleWorkspace
      badge="Teacher workspace"
      title="Classroom operations dashboard"
      description="Track daily academic data, stay aware of at-risk students, and coordinate on interventions from the teacher side. Your data feeds the school's support system."
      schoolYear="SY 2024-2025"
      theme="emerald"
      metrics={metrics}
      navItems={navItems}
    />
  );
}