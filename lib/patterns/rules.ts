// Pattern detection rules — pure type definitions and evaluation functions.
// Each rule function takes evidence data and returns matched evidence or null.
// No I/O here; the detector (detector.ts) fetches data and calls these.

export type PatternRuleId =
  | "ACADEMIC_DECLINE_CLUSTER"
  | "DISENGAGEMENT_SIGNAL"
  | "CRISIS_WARNING"
  | "RECOVERY_TRACKING"
  | "CHRONIC_CONCERN"
  | "CONCENTRATED_RISK"
  | "SUBJECT_STRUGGLE"
  | "ATTENDANCE_EROSION";

export interface PatternRuleConfig {
  [ruleId: string]: boolean;
}

// ─── Student-level rule inputs ───────────────────────────────────────────────

export interface StudentRuleInput {
  enrollmentId: string;
  studentId: string;
  schoolYearId: string;
  quarterlyAverages: Array<{ quarter: number; avg: number | null }>;
  absenceRate: number;
  tardyRate: number;
  consecutiveAbsences: number;
  behavioralSeverityWeightedCount: number;
  riskBand: "LOW" | "MODERATE" | "HIGH";
  hasActiveIntervention: boolean;
  priorInterventionOutcomes: Array<"IMPROVED" | "STABLE" | "DECLINED" | "NO_CHANGE">;
}

export type EvidencePayload = Record<string, unknown>;

export interface PatternRuleResult {
  ruleId: PatternRuleId;
  matched: boolean;
  evidence: EvidencePayload;
}

// ─── ACADEMIC_DECLINE_CLUSTER ────────────────────────────────────────────────
// Three consecutive quarters of declining grades + absence rate above 15%.

export function ruleAcademicDeclineCluster(input: StudentRuleInput): PatternRuleResult {
  const avgs = input.quarterlyAverages
    .filter((qa) => qa.avg !== null)
    .map((qa) => ({ quarter: qa.quarter, avg: qa.avg as number }))
    .sort((a, b) => a.quarter - b.quarter);

  let consecutiveDeclines = 0;
  for (let i = 1; i < avgs.length; i++) {
    if (avgs[i].avg < avgs[i - 1].avg) {
      consecutiveDeclines++;
    } else {
      consecutiveDeclines = 0;
    }
  }

  const matched = consecutiveDeclines >= 2 && input.absenceRate >= 0.15;

  return {
    ruleId: "ACADEMIC_DECLINE_CLUSTER",
    matched,
    evidence: {
      consecutiveQuartersDeclined: consecutiveDeclines,
      absenceRate: Math.round(input.absenceRate * 1000) / 10, // as percentage
      quarterlyAverages: avgs,
    },
  };
}

// ─── DISENGAGEMENT_SIGNAL ────────────────────────────────────────────────────
// Rising tardiness + behavioral incident + absence rate elevated.

export function ruleDisengagementSignal(input: StudentRuleInput): PatternRuleResult {
  const matched =
    input.tardyRate >= 0.10 &&
    input.behavioralSeverityWeightedCount >= 2 &&
    input.absenceRate >= 0.08;

  return {
    ruleId: "DISENGAGEMENT_SIGNAL",
    matched,
    evidence: {
      tardyRate: Math.round(input.tardyRate * 1000) / 10,
      absenceRate: Math.round(input.absenceRate * 1000) / 10,
      behavioralWeightedCount: input.behavioralSeverityWeightedCount,
    },
  };
}

// ─── CRISIS_WARNING ──────────────────────────────────────────────────────────
// Consecutive absences >= 5 AND HIGH behavioral incident in same period.

export function ruleCrisisWarning(input: StudentRuleInput): PatternRuleResult {
  const matched = input.consecutiveAbsences >= 5 && input.behavioralSeverityWeightedCount >= 3;

  return {
    ruleId: "CRISIS_WARNING",
    matched,
    evidence: {
      consecutiveAbsences: input.consecutiveAbsences,
      behavioralWeightedCount: input.behavioralSeverityWeightedCount,
    },
  };
}

// ─── RECOVERY_TRACKING ──────────────────────────────────────────────────────
// Post-intervention (active) + at least 2 quarters of improving grades.

export function ruleRecoveryTracking(input: StudentRuleInput): PatternRuleResult {
  if (!input.hasActiveIntervention) {
    return { ruleId: "RECOVERY_TRACKING", matched: false, evidence: {} };
  }

  const avgs = input.quarterlyAverages
    .filter((qa) => qa.avg !== null)
    .map((qa) => ({ quarter: qa.quarter, avg: qa.avg as number }))
    .sort((a, b) => a.quarter - b.quarter);

  let consecutiveImprovements = 0;
  for (let i = 1; i < avgs.length; i++) {
    if (avgs[i].avg > avgs[i - 1].avg) {
      consecutiveImprovements++;
    } else {
      consecutiveImprovements = 0;
    }
  }

  const matched = consecutiveImprovements >= 2;

  return {
    ruleId: "RECOVERY_TRACKING",
    matched,
    evidence: { consecutiveImprovements, hasActiveIntervention: true },
  };
}

// ─── CHRONIC_CONCERN ────────────────────────────────────────────────────────
// Multiple closed interventions with unfavorable outcomes AND still high-risk.

export function ruleChronicConcern(input: StudentRuleInput): PatternRuleResult {
  const unfavorable = input.priorInterventionOutcomes.filter(
    (o) => o === "NO_CHANGE" || o === "DECLINED",
  ).length;

  const matched = unfavorable >= 2 && input.riskBand === "HIGH";

  return {
    ruleId: "CHRONIC_CONCERN",
    matched,
    evidence: {
      unfavorableOutcomes: unfavorable,
      totalPriorInterventions: input.priorInterventionOutcomes.length,
      currentBand: input.riskBand,
    },
  };
}

// ─── Section-level rule inputs ───────────────────────────────────────────────

export interface SectionRuleInput {
  sectionId: string;
  schoolYearId: string;
  sectionName: string;
  gradeLevel: string;
  totalStudents: number;
  moderateOrHighCount: number;
  subjectFailRates: Array<{ subjectCode: string; subjectName: string; failRate: number }>;
  sectionAbsenceRate: number;
  schoolAbsenceRate: number;
}

// ─── CONCENTRATED_RISK ──────────────────────────────────────────────────────
// Over 30% of section in moderate or high risk band.

export function ruleConcentratedRisk(input: SectionRuleInput): PatternRuleResult {
  if (input.totalStudents === 0) return { ruleId: "CONCENTRATED_RISK", matched: false, evidence: {} };

  const rate = input.moderateOrHighCount / input.totalStudents;
  const matched = rate > 0.30;

  return {
    ruleId: "CONCENTRATED_RISK",
    matched,
    evidence: {
      moderateOrHighCount: input.moderateOrHighCount,
      totalStudents: input.totalStudents,
      riskConcentrationRate: Math.round(rate * 1000) / 10,
      sectionName: input.sectionName,
    },
  };
}

// ─── SUBJECT_STRUGGLE ────────────────────────────────────────────────────────
// Section average failing in a specific subject (fail rate > 40%).

export function ruleSubjectStruggle(input: SectionRuleInput): PatternRuleResult {
  const struggling = input.subjectFailRates.filter((s) => s.failRate > 0.40);
  const matched = struggling.length > 0;

  return {
    ruleId: "SUBJECT_STRUGGLE",
    matched,
    evidence: { strugglingSubjects: struggling },
  };
}

// ─── ATTENDANCE_EROSION ──────────────────────────────────────────────────────
// Section absence rate exceeds school average by > 5 percentage points.

export function ruleAttendanceErosion(input: SectionRuleInput): PatternRuleResult {
  const gap = input.sectionAbsenceRate - input.schoolAbsenceRate;
  const matched = gap > 0.05;

  return {
    ruleId: "ATTENDANCE_EROSION",
    matched,
    evidence: {
      sectionAbsenceRate: Math.round(input.sectionAbsenceRate * 1000) / 10,
      schoolAbsenceRate: Math.round(input.schoolAbsenceRate * 1000) / 10,
      gap: Math.round(gap * 1000) / 10,
      sectionName: input.sectionName,
    },
  };
}
