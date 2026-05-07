import RoleWorkspace from "@/components/roles/shared/role-workspace";
import { riskAssessments, staffUsers, students } from "@/lib/mock-data";

const activeUsers = staffUsers.filter((u) => u.status === "active").length;
const pendingConsent = 2; // stu13 has pending AI analysis consent
const highRisk = riskAssessments.filter((r) => r.band === "high").length;

const metrics = [
  { label: "Active school year", value: "SY 2024-2025", sub: "4 quarters configured" },
  { label: "Staff accounts", value: `${activeUsers} active`, sub: `${staffUsers.length} total users` },
  { label: "Students enrolled", value: `${students.length}`, sub: `${highRisk} flagged high-risk` },
];

const navItems = [
  { label: "Overview", href: "/admin", icon: "home" as const },
  { label: "User Management", href: "/admin/users", icon: "users" as const },
  { label: "School Year Setup", href: "/admin/school-year", icon: "calendar" as const },
  { label: "Import Wizard", href: "/admin/import", icon: "upload" as const },
  { label: "Consent Records", href: "/admin/consent", icon: "shield" as const },
  { label: "Audit Log", href: "/admin/audit-log", icon: "list" as const },
  { label: "System Configuration", href: "/admin/configuration", icon: "settings" as const },
];

export default function AdminWorkspace() {
  return (
    <RoleWorkspace
      badge="Admin workspace"
      title="Administrative control center"
      description="Manage school-year setup, user access, import pipelines, and governance settings. No clinical or counseling data is accessible from this workspace."
      schoolYear="SY 2024-2025"
      theme="indigo"
      metrics={metrics}
      navItems={navItems}
    />
  );
}