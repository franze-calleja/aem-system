import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const COUNSELOR_BADGE = "Counselor workspace";
export const COUNSELOR_TITLE = "Student support and intervention hub";
export const COUNSELOR_DESCRIPTION =
  "Own the intervention lifecycle, maintain counseling context, and act on risk signals with accountable human decisions.";
export const COUNSELOR_THEME: ThemeName = "amber";

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
    title: "Pattern Inbox",
    href: "/counselor/patterns",
    description:
      "Resolve or dismiss algorithmic pattern matches across individual, section, grade, and school scopes.",
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
];

export const COUNSELOR_METRICS = [
  { label: "Caseload scope", value: "All students" },
  { label: "Primary action", value: "Intervention planning" },
  { label: "Sensitive access", value: "Full counseling view" },
];
