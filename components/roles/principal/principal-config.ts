import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const PRINCIPAL_BADGE = "Principal workspace";
export const PRINCIPAL_TITLE = "Oversight and decision dashboard";
export const PRINCIPAL_DESCRIPTION =
  "Monitor school-wide patterns, validate high-impact decisions, and keep governance visible across the system.";
export const PRINCIPAL_THEME: ThemeName = "rose";

export const PRINCIPAL_NAV: NavSection[] = [
  {
    title: "Students",
    href: "/principal/students",
    description:
      "Read-only oversight of all enrolled students — academic, attendance, and behavioral records (counseling note bodies remain private).",
  },
  {
    title: "School dashboard",
    description:
      "Review risk distribution across grade levels, sections, and learner groups with drill-down visibility.",
  },
  {
    title: "Bias monitoring",
    description:
      "Track disparity flags across demographic dimensions and inspect whether calibration changes are warranted.",
  },
  {
    title: "Approval queue",
    href: "/principal/approvals",
    description:
      "Approve broader-scope interventions, review significant revisions, and handle interim revisions when needed.",
  },
  {
    title: "Governance review",
    description:
      "Inspect audit history, outcome trends, and risk overrides with mandatory written accountability.",
  },
];

export const PRINCIPAL_METRICS = [
  { label: "Oversight level", value: "School-wide" },
  { label: "Approval scope", value: "Broad interventions" },
  { label: "Governance focus", value: "Bias and overrides" },
];
