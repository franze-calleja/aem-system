import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const ADMIN_BADGE = "Admin workspace";
export const ADMIN_TITLE = "Administrative control center";
export const ADMIN_DESCRIPTION =
  "Manage school-year setup, user access, import pipelines, and governance settings without exposing counseling details.";
export const ADMIN_THEME: ThemeName = "indigo";

export const ADMIN_NAV: NavSection[] = [
  {
    title: "User management",
    href: "/admin/users",
    description:
      "Create staff accounts, suspend access, reset passwords, and assign teachers to sections.",
  },
  {
    title: "School setup",
    href: "/admin/setup",
    description:
      "Create and activate school years, then add the sections and subjects each year offers.",
  },
  {
    title: "Import wizard",
    href: "/admin/import",
    description:
      "Load student rosters, grades, attendance, and behavioral records per school year.",
  },
  {
    title: "Consent management",
    href: "/admin/consent",
    description:
      "Review consent records per student and process revocations with written justification.",
  },
  {
    title: "Audit log",
    href: "/admin/audit",
    description:
      "Inspect the append-only audit trail of authentication events, data writes, and sensitive reads.",
  },
];

export const ADMIN_METRICS = [
  { label: "Governance scope", value: "System-wide" },
  { label: "Sensitive access", value: "Metadata only" },
  { label: "Core priority", value: "Audit and setup" },
];
