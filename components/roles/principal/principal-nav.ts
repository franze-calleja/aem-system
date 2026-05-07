import type { NavItem } from "@/components/roles/shared/role-sidebar";

export const principalNav: NavItem[] = [
  { label: "Overview", href: "/principal", icon: "home" },
  { label: "School Dashboard", href: "/principal/school-dashboard", icon: "chart" },
  { label: "Bias Monitoring", href: "/principal/bias-monitoring", icon: "eye" },
  { label: "Approval Queue", href: "/principal/approvals", icon: "check" },
  { label: "Cohort Analysis", href: "/principal/cohort-analysis", icon: "calendar" },
  { label: "Governance Review", href: "/principal/governance", icon: "shield" },
];
