// Risk narrative generator. Builds a deterministic prompt from algorithmic
// outputs, then calls Gemini via the cached wrapper. Pure-ish: returns
// { ok, text } | { ok: false, reason }; safe to call from any server context.

import { fallbackMessage, generateText, type GenerateResult } from "./gemini";
import type { RiskBandLabel, RiskFactors } from "@/lib/risk/types";

type RiskNarrativeInput = {
  // Identity is anonymised in the prompt — we use first name only so the
  // narrative reads naturally without sending the LRN or last name.
  firstName: string;
  gradeLabel: string; // e.g. "Grade 9"
  score: number;
  band: RiskBandLabel;
  factors: RiskFactors;
  consentRevoked?: boolean;
};

export async function generateRiskNarrative(input: RiskNarrativeInput): Promise<GenerateResult> {
  const { firstName, gradeLabel, score, band, factors, consentRevoked } = input;
  const a = factors.breakdown.academic;
  const at = factors.breakdown.attendance;
  const b = factors.breakdown.behavioral;
  const p = factors.breakdown.profile;

  // Prompt template — versioned implicitly via cache hash. Changing this text
  // invalidates cached narratives for the same input data, which is correct.
  const prompt = [
    `You are a school-counseling assistant. Produce a 2–3 sentence plain-language explanation of a student's risk profile for school staff. Be specific, factual, and non-alarming. Do NOT give clinical advice. Do NOT speculate about causes outside the data. End with a single concrete next step the counselor can consider.`,
    ``,
    `Student: ${firstName} (${gradeLabel})`,
    `Overall risk: ${score.toFixed(0)} / 100 — band ${band}`,
    ``,
    `Sub-scores (0–100, higher = more risk):`,
    `- Academic ${factors.academic}: GWA=${a.gwa ?? "n/a"}, failing subjects=${a.failingSubjectCount}, quarter trend slope=${a.trendSlope.toFixed(2)}`,
    `- Attendance ${factors.attendance}: ${at.absences}/${at.totalDays} absences (${(at.absenceRate * 100).toFixed(1)}%), tardies=${at.tardies}, longest consecutive absences=${at.consecutiveAbsences}`,
    `- Behavioral ${factors.behavioral}: ${b.totalIncidents} incidents (HIGH=${b.highCount}, MOD=${b.moderateCount}, LOW=${b.lowCount})`,
    `- Profile ${factors.profile}: SPED=${p.spedStatus}, modality=${p.learningModality}`,
    ``,
    `Write the explanation now. No headings, no bullet points, just the prose.`,
  ].join("\n");

  return generateText({
    prompt,
    kind: "RISK_NARRATIVE",
    consentRevoked,
  });
}

// ─── Recommendation narrative ───────────────────────────────────────────────

type RecommendationNarrativeInput = {
  scope: "STUDENT" | "SECTION" | "GRADE" | "SCHOOL";
  scopeLabel: string;
  suggestedType: string;
  rationale: string; // algorithmic rationale (deterministic template)
  evidence: Record<string, unknown>;
  triggeringRuleId: string | null;
  consentRevoked?: boolean;
};

export async function generateRecommendationNarrative(
  input: RecommendationNarrativeInput,
): Promise<GenerateResult> {
  const { scope, scopeLabel, suggestedType, rationale, evidence, triggeringRuleId, consentRevoked } =
    input;

  const prompt = [
    `You are a school-counseling assistant. Reframe an algorithmic intervention recommendation as a 3–4 sentence narrative a counselor can read to decide whether to act. Stay factual, reference the evidence, and end with a single concrete first step. No headings, no bullets.`,
    ``,
    `Scope: ${scope} — ${scopeLabel}`,
    `Suggested intervention type: ${suggestedType.replace(/_/g, " ")}`,
    `Triggering rule: ${triggeringRuleId ?? "(none)"}`,
    `Algorithm rationale: ${rationale}`,
    `Evidence (JSON): ${JSON.stringify(evidence)}`,
    ``,
    `Write the narrative now.`,
  ].join("\n");

  return generateText({
    prompt,
    kind: "RECOMMENDATION_NARRATIVE",
    consentRevoked,
  });
}

// ─── School summary (principal dashboard) ───────────────────────────────────

type SchoolSummaryInput = {
  schoolYearLabel: string;
  total: number;
  low: number;
  moderate: number;
  high: number;
  unscored: number;
  pendingApprovals: number;
  openRecommendations: number;
  topGradeLevels: Array<{ label: string; highRate: number; total: number }>;
};

export async function generateSchoolSummary(
  input: SchoolSummaryInput,
): Promise<GenerateResult> {
  const {
    schoolYearLabel,
    total,
    low,
    moderate,
    high,
    unscored,
    pendingApprovals,
    openRecommendations,
    topGradeLevels,
  } = input;

  const prompt = [
    `You are a school-counseling assistant. Write a 3–4 sentence executive summary of a school's current risk picture for the principal. Lead with the headline number, mention one notable distribution pattern, name the operational backlog (approvals + open recommendations), and close with the single most actionable item. No headings or bullets.`,
    ``,
    `School year: ${schoolYearLabel}`,
    `Enrolled: ${total} (LOW=${low}, MODERATE=${moderate}, HIGH=${high}, unscored=${unscored})`,
    `Approval queue: ${pendingApprovals} broader-scope interventions pending principal approval`,
    `Open recommendations: ${openRecommendations}`,
    `Grade-level HIGH rates: ${topGradeLevels.map((g) => `${g.label}=${(g.highRate * 100).toFixed(1)}% (${g.total})`).join(", ") || "n/a"}`,
    ``,
    `Write the summary now.`,
  ].join("\n");

  return generateText({
    prompt,
    kind: "SCHOOL_SUMMARY",
  });
}

export { fallbackMessage };
