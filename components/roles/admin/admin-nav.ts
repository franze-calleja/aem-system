import type { NavItem } from "@/components/roles/shared/role-sidebar";

export const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: "home" },
  { label: "User Management", href: "/admin/users", icon: "users" },
  { label: "School Year Setup", href: "/admin/school-year", icon: "calendar" },
  { label: "Import Wizard", href: "/admin/import", icon: "upload" },
  { label: "Consent Records", href: "/admin/consent", icon: "shield" },
  { label: "Audit Log", href: "/admin/audit-log", icon: "list" },
  { label: "System Configuration", href: "/admin/configuration", icon: "settings" },
];
