"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { computeRiskScore, type ScoringResult } from "@/lib/risk/engine";
import type { RiskThresholds, RiskWeights } from "@/lib/risk/types";
import type {
  Attendance,
  BehavioralRecord,
  Grade,
} from "@prisma/client";

// Helpers to build full Prisma-shaped rows with dummy values for fields the
// engine doesn't read. Keeps us off the `as unknown as` shortcut.
const NOW = new Date();
function makeGrade(subjectId: string, quarter: number, score: number): Grade {
  return {
    id: `whatif-${subjectId}-${quarter}`,
    enrollmentId: "whatif",
    subjectId,
    quarter,
    score,
    maxScore: 100,
    assessmentKind: "REGULAR",
    label: null,
    recordedById: null,
    recordedAt: NOW,
    updatedAt: NOW,
  };
}
function makeAttendance(date: Date, status: "PRESENT" | "ABSENT" | "TARDY"): Attendance {
  return {
    id: `whatif-att-${date.toISOString()}`,
    enrollmentId: "whatif",
    date,
    status,
    notes: null,
    recordedById: null,
    recordedAt: NOW,
    updatedAt: NOW,
  };
}
function makeBehavioral(severity: "HIGH" | "MODERATE" | "LOW", n: number): BehavioralRecord {
  return {
    id: `whatif-beh-${severity}-${n}`,
    enrollmentId: "whatif",
    date: NOW,
    category: "BEHAVIORAL",
    severity,
    description: "",
    recordedById: null,
    recordedAt: NOW,
    updatedAt: NOW,
  };
}

const inputSchema = z.object({
  // Academic: 4 quarter averages (0–100, or null when not entered). Failing
  // subject count is independent — it bumps the academic sub-score directly.
  quarterlyAverages: z.array(z.number().min(0).max(100).nullable()).length(4),
  failingSubjects: z.number().int().min(0).max(20),
  // Attendance
  totalDays: z.number().int().min(0).max(365),
  absences: z.number().int().min(0).max(365),
  tardies: z.number().int().min(0).max(365),
  consecutiveAbsences: z.number().int().min(0).max(365),
  // Behavioral
  behavioralHigh: z.number().int().min(0).max(50),
  behavioralModerate: z.number().int().min(0).max(50),
  behavioralLow: z.number().int().min(0).max(50),
  // Profile
  spedStatus: z.enum(["NONE", "IEP", "ACCOMMODATIONS"]),
  learningModality: z.enum(["FACE_TO_FACE", "MODULAR", "ONLINE", "BLENDED"]),
});

export type WhatIfInput = z.infer<typeof inputSchema>;
export type WhatIfResult =
  | { ok: true; result: ScoringResult }
  | { ok: false; error: string };

export async function whatIfRiskAction(input: unknown): Promise<WhatIfResult> {
  await requireRole(["COUNSELOR", "PRINCIPAL", "ADMIN", "TEACHER"]);
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const config = await prisma.algorithmConfig.findFirst({ where: { isActive: true } });
  if (!config) return { ok: false, error: "No active AlgorithmConfig." };
  const weights = config.weights as unknown as RiskWeights;
  const thresholds = config.thresholds as unknown as RiskThresholds;

  // Synthesise the minimal data rows the engine expects. The engine is pure
  // and only reads numeric fields — we don't need real Prisma rows.
  const today = new Date();
  const synthGrades = synthesiseGrades(data.quarterlyAverages, data.failingSubjects);
  const synthAttendance = synthesiseAttendance(
    data.totalDays,
    data.absences,
    data.tardies,
    data.consecutiveAbsences,
    today,
  );
  const synthBehavioral = synthesiseBehavioral(
    data.behavioralHigh,
    data.behavioralModerate,
    data.behavioralLow,
  );

  const result = computeRiskScore({
    grades: synthGrades,
    attendance: synthAttendance,
    behavioral: synthBehavioral,
    spedStatus: data.spedStatus,
    learningModality: data.learningModality,
    weights,
    thresholds,
  });
  return { ok: true, result };
}

// 6 passing subjects at the user's quarter averages, plus N "failing" subjects
// pinned at 60% — gives the engine the right inputs for both GWA + failing
// subject counts without us re-implementing the academic sub-score.
function synthesiseGrades(quarterly: (number | null)[], failingSubjects: number): Grade[] {
  const out: Grade[] = [];
  const PASS = 6;
  for (let i = 0; i < PASS; i++) {
    for (let q = 1; q <= 4; q++) {
      const avg = quarterly[q - 1];
      if (avg === null || avg === undefined) continue;
      out.push(makeGrade(`pass-${i}`, q, avg));
    }
  }
  for (let i = 0; i < failingSubjects; i++) {
    for (let q = 1; q <= 4; q++) {
      out.push(makeGrade(`fail-${i}`, q, 60));
    }
  }
  return out;
}

function synthesiseAttendance(
  total: number,
  absences: number,
  tardies: number,
  consecutiveAbsences: number,
  baseDate: Date,
): Attendance[] {
  const rows: Attendance[] = [];
  const safeTotal = Math.min(total, 365);
  const a = Math.min(absences, safeTotal);
  const t = Math.min(tardies, Math.max(0, safeTotal - a));
  const runLen = Math.min(consecutiveAbsences, a);
  let absencesLeft = a - runLen;
  let tardiesLeft = t;
  for (let d = 0; d < safeTotal; d++) {
    const date = new Date(baseDate);
    date.setUTCDate(baseDate.getUTCDate() - (safeTotal - d - 1));
    let status: "PRESENT" | "ABSENT" | "TARDY" = "PRESENT";
    if (d < runLen) status = "ABSENT";
    else if (absencesLeft > 0) {
      status = "ABSENT";
      absencesLeft--;
    } else if (tardiesLeft > 0) {
      status = "TARDY";
      tardiesLeft--;
    }
    rows.push(makeAttendance(date, status));
  }
  return rows;
}

function synthesiseBehavioral(
  high: number,
  moderate: number,
  low: number,
): BehavioralRecord[] {
  const rows: BehavioralRecord[] = [];
  for (let i = 0; i < high; i++) rows.push(makeBehavioral("HIGH", i));
  for (let i = 0; i < moderate; i++) rows.push(makeBehavioral("MODERATE", i));
  for (let i = 0; i < low; i++) rows.push(makeBehavioral("LOW", i));
  return rows;
}
