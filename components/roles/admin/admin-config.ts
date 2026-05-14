import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const ADMIN_BADGE = "Admin workspace";
export const ADMIN_TITLE = "Administrative control center";
export const ADMIN_DESCRIPTION =
  "Manage school-year setup, user access, import pipelines, and governance settings without exposing counseling details.";
export const ADMIN_THEME: ThemeName = "indigo";

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Import wizard",
    href: "/admin/import",
    description:
      "Load student rosters, grades, attendance, behavioral records, and historical interventions per school year.",
  },
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
    title: "System configuration",
    description:
      "Maintain thresholds, risk-score weights, sections, subjects, and term setup with versioned governance controls.",
  },
];

export const ADMIN_METRICS = [
  { label: "Governance scope", value: "System-wide" },
  { label: "Sensitive access", value: "Metadata only" },
  { label: "Core priority", value: "Audit and setup" },
];
