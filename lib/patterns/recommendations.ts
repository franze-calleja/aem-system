// Recommendation engine — maps risk/pattern evidence to intervention type suggestions.
// Pure function; no I/O. Called after pattern detection to produce RecommendationDraft
// records that counselors review in their queue.

import type { PatternRuleId } from "./rules";

export interface RecommendationInput {
  scope: "STUDENT" | "SECTION";
  scopeTargetId: string;
  schoolYearId: string;
  ruleId: PatternRuleId;
  patternMatchId: string;
  evidence: Record<string, unknown>;
}

export interface RecommendationOutput {
  scope: "STUDENT" | "SECTION";
  scopeTargetId: string;
  schoolYearId: string;
  suggestedType: string;
  rationale: string;
  evidence: Record<string, unknown>;
  triggeringPatternId: string;
}

// Mapping: pattern rule → suggested intervention type + rationale template.
const RULE_TO_RECOMMENDATION: Record<
  PatternRuleId,
  { type: string; rationaleTemplate: (evidence: Record<string, unknown>) => string }
> = {
  ACADEMIC_DECLINE_CLUSTER: {
    type: "ACADEMIC_SUPPORT",
    rationaleTemplate: (e) => {
      const q = e.consecutiveQuartersDeclined;
      const a = e.absenceRate;
      return `Student shows ${q} consecutive quarter(s) of academic decline with an absence rate of ${a}%. Recommend structured academic support and attendance monitoring.`;
    },
  },
  DISENGAGEMENT_SIGNAL: {
    type: "COUNSELING_SESSION",
    rationaleTemplate: (e) => {
      return `Student exhibits multiple disengagement indicators: elevated tardiness (${e.tardyRate}%), absences (${e.absenceRate}%), and behavioral incidents. A check-in counseling session is recommended to explore underlying causes.`;
    },
  },
  CRISIS_WARNING: {
    type: "IMMEDIATE_COUNSELING",
    rationaleTemplate: (e) => {
      return `Student has ${e.consecutiveAbsences} consecutive absences and a behavioral severity score of ${e.behavioralWeightedCount}. Immediate counseling outreach is warranted.`;
    },
  },
  RECOVERY_TRACKING: {
    type: "POSITIVE_REINFORCEMENT",
    rationaleTemplate: (e) => {
      return `Student under active intervention shows ${e.consecutiveImprovements} consecutive quarter(s) of academic improvement. Positive reinforcement and continued support are recommended to sustain recovery.`;
    },
  },
  CHRONIC_CONCERN: {
    type: "CASE_REVIEW",
    rationaleTemplate: (e) => {
      return `Student has ${e.unfavorableOutcomes} past intervention(s) with unfavorable outcomes and remains in the HIGH risk band. A comprehensive case review with revised strategy is recommended.`;
    },
  },
  CONCENTRATED_RISK: {
    type: "SECTION_INTERVENTION",
    rationaleTemplate: (e) => {
      return `Section "${e.sectionName}" has ${e.riskConcentrationRate}% of students in MODERATE or HIGH risk bands (${e.moderateOrHighCount}/${e.totalStudents}). A section-level support program is recommended.`;
    },
  },
  SUBJECT_STRUGGLE: {
    type: "SUBJECT_REMEDIATION",
    rationaleTemplate: (e) => {
      const subjects = (e.strugglingSubjects as Array<{ subjectCode: string; failRate: number }>)
        .map((s) => `${s.subjectCode} (${Math.round(s.failRate * 100)}% failing)`)
        .join(", ");
      return `Section is struggling in: ${subjects}. Subject-specific remedial sessions or teacher consultation is recommended.`;
    },
  },
  ATTENDANCE_EROSION: {
    type: "ATTENDANCE_PROGRAM",
    rationaleTemplate: (e) => {
      return `Section "${e.sectionName}" absence rate (${e.sectionAbsenceRate}%) exceeds school average (${e.schoolAbsenceRate}%) by ${e.gap} percentage points. An attendance improvement initiative is recommended.`;
    },
  },
};

export function generateRecommendation(input: RecommendationInput): RecommendationOutput {
  const mapping = RULE_TO_RECOMMENDATION[input.ruleId];

  const rationale = mapping.rationaleTemplate(input.evidence);

  return {
    scope: input.scope,
    scopeTargetId: input.scopeTargetId,
    schoolYearId: input.schoolYearId,
    suggestedType: mapping.type,
    rationale,
    evidence: input.evidence,
    triggeringPatternId: input.patternMatchId,
  };
}
