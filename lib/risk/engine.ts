// Risk-scoring engine — pure functions over raw student data rows.
// Every function is deterministic given the same inputs; no I/O.
// Callers are responsible for fetching data from DB and persisting results.

import type {
  Grade,
  Attendance,
  BehavioralRecord,
  SpedStatus,
  LearningModality,
} from "@prisma/client";
import type {
  RiskWeights,
  RiskThresholds,
  RiskBandLabel,
  RiskFactors,
  AcademicBreakdown,
  AttendanceBreakdown,
  BehavioralBreakdown,
  ProfileBreakdown,
} from "./types";

// ─── Constants ───────────────────────────────────────────────────────────────

// GWA below this percentage is "failing".
const FAILING_THRESHOLD_PCT = 75;

// Attendance rate above this is "at risk".
const HIGH_ABSENCE_RATE = 0.15;
const MODERATE_ABSENCE_RATE = 0.08;

// Behavioral incident severity weights.
const BEHAVIORAL_SEVERITY_WEIGHTS = { HIGH: 3, MODERATE: 2, LOW: 1 } as const;
// Score cap for behavioral incidents before hitting 100.
const BEHAVIORAL_INCIDENT_CAP = 12; // weighted count that maps to score 100

// ─── Academic Sub-score ──────────────────────────────────────────────────────

function computeAcademicBreakdown(grades: Grade[]): AcademicBreakdown {
  if (grades.length === 0) {
    return {
      gwa: null,
      failingSubjectCount: 0,
      trendSlope: 0,
      quarterlyAverages: [1, 2, 3, 4].map((q) => ({ quarter: q, avg: null })),
      subScore: 0, // no data → no risk from this dimension
    };
  }

  // Per-quarter overall average (across all subjects).
  const quarterlyAverages = [1, 2, 3, 4].map((q) => {
    const qs = grades.filter((g) => g.quarter === q);
    if (qs.length === 0) return { quarter: q, avg: null };
    const sum = qs.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
    return { quarter: q, avg: Math.round((sum / qs.length) * 10) / 10 };
  });

  // Overall GWA across all grades.
  const allPcts = grades.map((g) => (g.score / g.maxScore) * 100);
  const gwa = Math.round((allPcts.reduce((a, b) => a + b, 0) / allPcts.length) * 10) / 10;

  // Failing subject count — per subject, average across quarters < FAILING_THRESHOLD_PCT.
  const subjectMap = new Map<string, number[]>();
  for (const g of grades) {
    const sid = g.subjectId;
    if (!subjectMap.has(sid)) subjectMap.set(sid, []);
    subjectMap.get(sid)!.push((g.score / g.maxScore) * 100);
  }
  let failingSubjectCount = 0;
  for (const pcts of subjectMap.values()) {
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    if (avg < FAILING_THRESHOLD_PCT) failingSubjectCount++;
  }

  // Trend slope — linear regression on quarterly averages that have data.
  const pointsWithData = quarterlyAverages.filter((qa) => qa.avg !== null) as Array<{ quarter: number; avg: number }>;
  let trendSlope = 0;
  if (pointsWithData.length >= 2) {
    const n = pointsWithData.length;
    const xs = pointsWithData.map((p) => p.quarter);
    const ys = pointsWithData.map((p) => p.avg);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0);
    const den = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0);
    trendSlope = den === 0 ? 0 : Math.round((num / den) * 100) / 100;
  }

  // Sub-score calculation.
  // Base: invert GWA (lower GWA → higher risk).
  // GWA = 100% → subScore contribution from GWA = 0; GWA = 0% → 100.
  const gwaRisk = Math.max(0, 100 - gwa);

  // Trend penalty: each unit of decline (negative slope) adds to risk.
  // Slope unit is per quarter (e.g. -5 = losing 5 pct pts per quarter).
  const trendPenalty = Math.min(30, Math.max(0, -trendSlope * 3));

  // Failing subjects: 15 pts per failing subject, capped at 30.
  const failingPenalty = Math.min(30, failingSubjectCount * 15);

  const subScore = Math.min(100, Math.round(gwaRisk * 0.5 + trendPenalty + failingPenalty));

  return { gwa, failingSubjectCount, trendSlope, quarterlyAverages, subScore };
}

// ─── Attendance Sub-score ────────────────────────────────────────────────────

function computeAttendanceBreakdown(attendance: Attendance[]): AttendanceBreakdown {
  const total = attendance.length;
  if (total === 0) {
    return {
      totalDays: 0,
      absences: 0,
      tardies: 0,
      absenceRate: 0,
      tardyRate: 0,
      consecutiveAbsences: 0,
      subScore: 0,
    };
  }

  const absences = attendance.filter((a) => a.status === "ABSENT").length;
  const tardies = attendance.filter((a) => a.status === "TARDY").length;
  const absenceRate = absences / total;
  const tardyRate = tardies / total;

  // Longest consecutive absence run.
  const sorted = [...attendance].sort((a, b) => a.date.getTime() - b.date.getTime());
  let consecutiveAbsences = 0;
  let currentRun = 0;
  for (const a of sorted) {
    if (a.status === "ABSENT") {
      currentRun++;
      if (currentRun > consecutiveAbsences) consecutiveAbsences = currentRun;
    } else {
      currentRun = 0;
    }
  }

  // Sub-score.
  // Absence rate → 0–70 range.
  let absenceRisk = 0;
  if (absenceRate >= HIGH_ABSENCE_RATE) {
    absenceRisk = 70 + Math.min(30, (absenceRate - HIGH_ABSENCE_RATE) * 200);
  } else if (absenceRate >= MODERATE_ABSENCE_RATE) {
    absenceRisk = ((absenceRate - MODERATE_ABSENCE_RATE) / (HIGH_ABSENCE_RATE - MODERATE_ABSENCE_RATE)) * 70;
  }

  // Tardiness penalty: up to 15 extra points.
  const tardyRisk = Math.min(15, tardyRate * 100);

  // Consecutive absence bonus: each day in a run adds 5 pts (capped at 20).
  const consecutivePenalty = Math.min(20, consecutiveAbsences * 5);

  const subScore = Math.min(100, Math.round(absenceRisk + tardyRisk * 0.5 + consecutivePenalty));

  return { totalDays: total, absences, tardies, absenceRate, tardyRate, consecutiveAbsences, subScore };
}

// ─── Behavioral Sub-score ────────────────────────────────────────────────────

function computeBehavioralBreakdown(behavioral: BehavioralRecord[]): BehavioralBreakdown {
  const total = behavioral.length;
  if (total === 0) {
    return { totalIncidents: 0, highCount: 0, moderateCount: 0, lowCount: 0, severityWeightedCount: 0, subScore: 0 };
  }

  const highCount = behavioral.filter((b) => b.severity === "HIGH").length;
  const moderateCount = behavioral.filter((b) => b.severity === "MODERATE").length;
  const lowCount = behavioral.filter((b) => b.severity === "LOW").length;

  const severityWeightedCount =
    highCount * BEHAVIORAL_SEVERITY_WEIGHTS.HIGH +
    moderateCount * BEHAVIORAL_SEVERITY_WEIGHTS.MODERATE +
    lowCount * BEHAVIORAL_SEVERITY_WEIGHTS.LOW;

  const subScore = Math.min(100, Math.round((severityWeightedCount / BEHAVIORAL_INCIDENT_CAP) * 100));

  return { totalIncidents: total, highCount, moderateCount, lowCount, severityWeightedCount, subScore };
}

// ─── Profile Sub-score ───────────────────────────────────────────────────────

function computeProfileBreakdown(spedStatus: SpedStatus, learningModality: LearningModality): ProfileBreakdown {
  // SPED status bump.
  const spedBonus = spedStatus === "IEP" ? 20 : spedStatus === "ACCOMMODATIONS" ? 10 : 0;

  // Modality risk: MODULAR adds difficulty (less direct supervision).
  const modalityBonus = learningModality === "MODULAR" ? 15 : learningModality === "BLENDED" ? 5 : 0;

  const subScore = Math.min(100, spedBonus + modalityBonus);

  return { spedStatus, learningModality, subScore };
}

// ─── Main scoring function ───────────────────────────────────────────────────

export interface ScoringInput {
  grades: Grade[];
  attendance: Attendance[];
  behavioral: BehavioralRecord[];
  spedStatus: SpedStatus;
  learningModality: LearningModality;
  weights: RiskWeights;
  thresholds: RiskThresholds;
}

export interface ScoringResult {
  score: number;         // 0–100 rounded to 1 decimal
  band: RiskBandLabel;
  factors: RiskFactors;
}

export function computeRiskScore(input: ScoringInput): ScoringResult {
  const academic = computeAcademicBreakdown(input.grades);
  const attendance = computeAttendanceBreakdown(input.attendance);
  const behavioral = computeBehavioralBreakdown(input.behavioral);
  const profile = computeProfileBreakdown(input.spedStatus, input.learningModality);

  const { weights, thresholds } = input;
  const total = weights.academic + weights.attendance + weights.behavioral + weights.interventionHistory + weights.profile;
  const w = {
    academic: weights.academic / total,
    attendance: weights.attendance / total,
    behavioral: weights.behavioral / total,
    interventionHistory: weights.interventionHistory / total,
    profile: weights.profile / total,
  };

  const score = Math.round(
    (academic.subScore * w.academic +
      attendance.subScore * w.attendance +
      behavioral.subScore * w.behavioral +
      0 * w.interventionHistory + // Phase 3 — no intervention data yet
      profile.subScore * w.profile) *
      10,
  ) / 10;

  const band: RiskBandLabel =
    score >= thresholds.highMin
      ? "HIGH"
      : score >= thresholds.moderateMin
        ? "MODERATE"
        : "LOW";

  const factors: RiskFactors = {
    academic: academic.subScore,
    attendance: attendance.subScore,
    behavioral: behavioral.subScore,
    interventionHistory: 0,
    profile: profile.subScore,
    breakdown: { academic, attendance, behavioral, profile },
  };

  return { score, band, factors };
}

// ─── Band helpers (UI use) ───────────────────────────────────────────────────

export function bandColor(band: RiskBandLabel): "green" | "amber" | "red" {
  return band === "HIGH" ? "red" : band === "MODERATE" ? "amber" : "green";
}
