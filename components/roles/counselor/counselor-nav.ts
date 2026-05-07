import type { NavItem } from "@/components/roles/shared/role-sidebar";

export const counselorNav: NavItem[] = [
  { label: "Overview", href: "/counselor", icon: "home" },
  { label: "Caseload Dashboard", href: "/counselor/caseload", icon: "alert" },
  { label: "Student Profiles", href: "/counselor/students", icon: "users" },
  { label: "Counseling Notes", href: "/counselor/notes", icon: "book" },
  { label: "Interventions", href: "/counselor/interventions", icon: "clipboard" },
  { label: "Feedback Queue", href: "/counselor/feedback", icon: "message" },
  { label: "Recommendations", href: "/counselor/recommendations", icon: "check" },
  { label: "Pattern Alerts", href: "/counselor/patterns", icon: "alert" },
];
