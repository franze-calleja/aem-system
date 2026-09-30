import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const PRINCIPAL_BADGE = "Principal workspace";
export const PRINCIPAL_TITLE = "Oversight and decision dashboard";
export const PRINCIPAL_THEME: ThemeName = "emerald";

export const PRINCIPAL_NAV: NavSection[] = [
  {
    title: "Students",
    href: "/principal/students",
    description:
      "Read-only oversight of all enrolled students — academic, attendance, and behavioral records (counseling note bodies remain private).",
  },
  {
    title: "School dashboard",
    href: "/principal/dashboard",
    description:
      "Review risk distribution across grade levels, sections, and learner groups with drill-down visibility. Includes bias monitoring and intervention pipeline counts.",
  },
  {
    title: "Approval queue",
    href: "/principal/approvals",
    description:
      "Approve broader-scope interventions, review significant revisions, and handle interim revisions when needed.",
  },
  {
    title: "Cohort analysis",
    href: "/principal/cohort-analysis",
    description:
      "Compare a grade level across school years — risk band distribution, intervention pipeline, average risk and sub-scores, completed-intervention outcomes, year-over-year drift, and an AI-written comparison of the scores. CSV export available.",
  },
  {
    title: "How this system works",
    href: "/learn",
    description:
      "Plain-language explanation of how the risk score is computed, what each pattern rule looks for, and what the system decides versus what you decide.",
  },
  {
    title: "Reports",
    href: "/reports",
    description:
      "Download CSV extracts of the data behind your screens — risk rosters, intervention outcomes, attendance, and governance breakdowns.",
  },
];

