// Shared types for the risk-scoring engine.
// All types are plain objects (no Prisma models) so they cross the
// server-action boundary safely.

export interface RiskWeights {
  academic: number;
  attendance: number;
  behavioral: number;
  interventionHistory: number;
  profile: number;
}

export interface RiskThresholds {
  moderateMin: number; // score >= this → MODERATE
  highMin: number;     // score >= this → HIGH
}

// Breakdown attached to every RiskAssessment.factors JSON.
export interface AcademicBreakdown {
  gwa: number | null;               // overall GWA across all quarters, null if no grades
  failingSubjectCount: number;      // subjects below 75%
  trendSlope: number;               // positive = improving, negative = declining
  quarterlyAverages: Array<{ quarter: number; avg: number | null }>;
  subScore: number;                 // 0–100
}

export interface AttendanceBreakdown {
  totalDays: number;
  absences: number;
  tardies: number;
  absenceRate: number;
  tardyRate: number;
  consecutiveAbsences: number;     // longest run of consecutive absences
  subScore: number;
}

export interface BehavioralBreakdown {
  totalIncidents: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  severityWeightedCount: number;   // HIGH=3, MODERATE=2, LOW=1
  subScore: number;
}

export interface ProfileBreakdown {
  spedStatus: string;
  learningModality: string;
  subScore: number;
}

export interface RiskFactors {
  academic: number;
  attendance: number;
  behavioral: number;
  interventionHistory: number;
  profile: number;
  breakdown: {
    academic: AcademicBreakdown;
    attendance: AttendanceBreakdown;
    behavioral: BehavioralBreakdown;
    profile: ProfileBreakdown;
  };
}

export type RiskBandLabel = "LOW" | "MODERATE" | "HIGH";
