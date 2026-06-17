"use server";

// Server action to trigger risk score computation for a school year.
// Can compute for a single enrollment or all enrollments in a year.
// Orchestrates: score → pattern detection → recommendation generation → persist.

import { z } from "zod";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { computeRiskScore } from "@/lib/risk/engine";
import type { RiskWeights, RiskThresholds } from "@/lib/risk/types";
import { detectStudentPatterns, detectSectionPatterns } from "@/lib/patterns/detector";
import { generateRecommendation } from "@/lib/patterns/recommendations";
import type { PatternRuleConfig, PatternRuleId } from "@/lib/patterns/rules";

const ComputeInput = z.object({
  schoolYearId: z.string().min(1),
  enrollmentId: z.string().optional(), // if omitted, computes all in year
});

type ComputeResult =
  | { ok: true; computed: number; patternsFound: number; recommendationsCreated: number }
  | { ok: false; error: string };

export async function computeRiskAction(formData: FormData): Promise<ComputeResult> {
  const session = await requireRole(["COUNSELOR", "ADMIN", "PRINCIPAL"]);
  const raw = Object.fromEntries(formData);
  const parse = ComputeInput.safeParse(raw);
  if (!parse.success) return { ok: false, error: parse.error.issues[0].message };

  const { schoolYearId, enrollmentId } = parse.data;

  // Load active algorithm config.
  const config = await prisma.algorithmConfig.findFirst({ where: { isActive: true } });
  if (!config) return { ok: false, error: "No active AlgorithmConfig found. Please configure the algorithm first." };

  const weights = config.weights as unknown as RiskWeights;
  const thresholds = config.thresholds as unknown as RiskThresholds;
  const ruleConfig = config.ruleConfig as unknown as PatternRuleConfig;

  // Fetch enrollments to process.
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolYearId,
      status: "ACTIVE",
      ...(enrollmentId ? { id: enrollmentId } : {}),
    },
    include: {
      student: { select: { spedStatus: true } },
      grades: true,
      attendance: true,
      behavioralRecords: true,
    },
  });

  let computed = 0;
  for (const enrollment of enrollments) {
    const result = computeRiskScore({
      grades: enrollment.grades,
      attendance: enrollment.attendance,
      behavioral: enrollment.behavioralRecords,
      spedStatus: enrollment.student.spedStatus,
      learningModality: enrollment.learningModality,
      weights,
      thresholds,
    });

    await prisma.riskAssessment.create({
      data: {
        enrollmentId: enrollment.id,
        schoolYearId,
        score: result.score,
        band: result.band,
        factors: result.factors as object,
        configId: config.id,
        configVersion: config.version,
      },
    });
    computed++;
  }

  // Pattern detection — runs after all risk scores are persisted so band data is fresh.
  let patternsFound = 0;
  let recommendationsCreated = 0;

  if (!enrollmentId) {
    // Full-year detection run.
    const [studentPatterns, sectionPatterns] = await Promise.all([
      detectStudentPatterns(schoolYearId, ruleConfig),
      detectSectionPatterns(schoolYearId, ruleConfig),
    ]);

    const allPatterns = [...studentPatterns, ...sectionPatterns];

    for (const pattern of allPatterns) {
      // Upsert: one open pattern per (scope, scopeTargetId, ruleId, schoolYearId).
      const existing = await prisma.patternMatch.findFirst({
        where: {
          scope: pattern.scope,
          scopeTargetId: pattern.scopeTargetId,
          ruleId: pattern.ruleId,
          schoolYearId: pattern.schoolYearId,
          status: "OPEN",
        },
      });

      let patternId: string;
      if (existing) {
        await prisma.patternMatch.update({
          where: { id: existing.id },
          data: { evidence: pattern.evidence as object, matchedAt: new Date() },
        });
        patternId = existing.id;
      } else {
        const created = await prisma.patternMatch.create({
          data: {
            scope: pattern.scope,
            scopeTargetId: pattern.scopeTargetId,
            ruleId: pattern.ruleId,
            evidence: pattern.evidence as object,
            schoolYearId: pattern.schoolYearId,
            status: "OPEN",
          },
        });
        patternId = created.id;
        patternsFound++;
      }

      // Generate recommendation if one doesn't already exist for this pattern.
      const existingRec = await prisma.recommendationDraft.findFirst({
        where: { triggeringPatternId: patternId, status: "OPEN" },
      });
      if (!existingRec) {
        const rec = generateRecommendation({
          scope: pattern.scope,
          scopeTargetId: pattern.scopeTargetId,
          schoolYearId: pattern.schoolYearId,
          ruleId: pattern.ruleId as PatternRuleId,
          patternMatchId: patternId,
          evidence: pattern.evidence,
        });
        await prisma.recommendationDraft.create({
          data: {
            scope: rec.scope,
            scopeTargetId: rec.scopeTargetId,
            schoolYearId: rec.schoolYearId,
            suggestedType: rec.suggestedType,
            rationale: rec.rationale,
            evidence: rec.evidence as object,
            triggeringPatternId: rec.triggeringPatternId,
            status: "OPEN",
          },
        });
        recommendationsCreated++;
      }
    }
  }

  await logAudit({
    action: "RISK_RECOMPUTED",
    userId: session.user.id,
    resourceType: "RiskAssessment",
    metadata: { schoolYearId, enrollmentId: enrollmentId ?? "all", computed, patternsFound, recommendationsCreated },
  });

  return { ok: true, computed, patternsFound, recommendationsCreated };
}

// Server action to dismiss a recommendation draft.
const DismissInput = z.object({ id: z.string().min(1) });

export async function dismissRecommendationAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("COUNSELOR");
  const raw = Object.fromEntries(formData);
  const parse = DismissInput.safeParse(raw);
  if (!parse.success) return { ok: false, error: parse.error.issues[0].message };

  const draft = await prisma.recommendationDraft.findUnique({ where: { id: parse.data.id } });
  if (!draft) return { ok: false, error: "Recommendation not found." };

  await prisma.recommendationDraft.update({
    where: { id: draft.id },
    data: { status: "DISMISSED" },
  });

  await logAudit({
    action: "RECOMMENDATION_DISMISSED",
    userId: session.user.id,
    resourceType: "RecommendationDraft",
    resourceId: draft.id,
    metadata: { action: "DISMISSED" },
  });

  return { ok: true };
}
