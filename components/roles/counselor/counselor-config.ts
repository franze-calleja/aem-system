import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const COUNSELOR_BADGE = "Counselor workspace";
export const COUNSELOR_TITLE = "Student support and intervention hub";
export const COUNSELOR_DESCRIPTION =
  "Own the intervention lifecycle, maintain counseling context, and act on risk signals with accountable human decisions.";
export const COUNSELOR_THEME: ThemeName = "emerald";

export const COUNSELOR_NAV: NavSection[] = [
  {
    title: "Caseload Dashboard",
    href: "/counselor/caseload",
    description:
      "Review moderate and high-risk students, sort by urgency, and track changes across the current school year.",
  },
  {
    title: "Intervention Builder",
    href: "/counselor/interventions",
    description:
      "Review AI-generated recommendation drafts and build formal individual, section, grade-level, or school-wide intervention plans.",
  },
  {
    title: "Teacher Referrals",
    href: "/counselor/referrals",
    description:
      "Review pending teacher referrals. Accept to pre-fill a new intervention you own, or decline with a reason shared back to the referring teacher.",
  },
  {
    title: "Pattern Inbox",
    href: "/counselor/patterns",
    description:
      "Resolve or dismiss algorithmic pattern matches across individual, section, grade, and school scopes.",
  },
  {
    title: "Cohort Analysis",
    href: "/counselor/cohort-analysis",
    description:
      "Compare a grade level across school years — risk bands, average risk and sub-scores, intervention outcomes, year-over-year drift, and an AI-written comparison of the scores.",
  },
  {
    title: "What-If Simulator",
    href: "/counselor/what-if",
    description:
      "Tweak hypothetical risk inputs and see how the algorithm reacts. No data saved — a literacy tool for understanding the engine.",
  },
  {
    title: "Feedback Queue",
    href: "/counselor/feedback",
    description:
      "Process observation notes and revision requests submitted by teachers. Acknowledge, incorporate, or discuss each item.",
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

export const COUNSELOR_METRICS = [
  { label: "Caseload scope", value: "All students" },
  { label: "Primary action", value: "Intervention planning" },
  { label: "Sensitive access", value: "Full counseling view" },
];
