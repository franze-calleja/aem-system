// One-off: triggers the risk engine for all active enrollments in the active
// school year. Mirrors computeRiskAction's commit logic so dashboards have
// data to render.
//
// Run: npx tsx scripts/run-risk-engine.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeRiskScore } from "../lib/risk/engine";
import { detectStudentPatterns, detectSectionPatterns } from "../lib/patterns/detector";
import { generateRecommendation } from "../lib/patterns/recommendations";
import type { PatternRuleConfig, PatternRuleId } from "../lib/patterns/rules";
import type { RiskThresholds, RiskWeights } from "../lib/risk/types";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });
  const config = await prisma.algorithmConfig.findFirstOrThrow({ where: { isActive: true } });
  const weights = config.weights as unknown as RiskWeights;
  const thresholds = config.thresholds as unknown as RiskThresholds;
  const ruleConfig = config.ruleConfig as unknown as PatternRuleConfig;

  console.log(`SY: ${sy.label} · AlgorithmConfig v${config.version}\n`);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId: sy.id, status: "ACTIVE" },
    include: {
      student: { select: { id: true, spedStatus: true } },
      grades: true,
      attendance: true,
      behavioralRecords: true,
    },
  });
  console.log(`Computing for ${enrollments.length} enrollments…`);

  for (const e of enrollments) {
    const result = computeRiskScore({
      grades: e.grades,
      attendance: e.attendance,
      behavioral: e.behavioralRecords,
      spedStatus: e.student.spedStatus,
      learningModality: e.learningModality,
      weights,
      thresholds,
    });
    await prisma.riskAssessment.create({
      data: {
        enrollmentId: e.id,
        schoolYearId: sy.id,
        score: result.score,
        band: result.band,
        factors: result.factors as object,
        configId: config.id,
        configVersion: config.version,
      },
    });
  }

  // Pattern detection — student + section scope.
  const [studentMatches, sectionMatches] = await Promise.all([
    detectStudentPatterns(sy.id, ruleConfig),
    detectSectionPatterns(sy.id, ruleConfig),
  ]);
  const matches = [...studentMatches, ...sectionMatches];
  console.log(`Pattern matches found: ${matches.length} (student=${studentMatches.length}, section=${sectionMatches.length})`);

  for (const m of matches) {
    const created = await prisma.patternMatch.create({
      data: {
        scope: m.scope,
        scopeTargetId: m.scopeTargetId,
        ruleId: m.ruleId,
        evidence: m.evidence as object,
        schoolYearId: sy.id,
      },
    });
    if (created.scope === "STUDENT" || created.scope === "SECTION") {
      const rec = generateRecommendation({
        scope: created.scope,
        scopeTargetId: created.scopeTargetId,
        schoolYearId: sy.id,
        ruleId: m.ruleId as PatternRuleId,
        patternMatchId: created.id,
        evidence: m.evidence as Record<string, unknown>,
      });
      if (rec) {
        await prisma.recommendationDraft.create({
          data: {
            scope: rec.scope,
            scopeTargetId: rec.scopeTargetId,
            suggestedType: rec.suggestedType,
            rationale: rec.rationale,
            evidence: rec.evidence as object,
            triggeringPatternId: created.id,
            schoolYearId: sy.id,
          },
        });
      }
    }
  }

  const [risk, pm, recs] = await Promise.all([
    prisma.riskAssessment.count(),
    prisma.patternMatch.count(),
    prisma.recommendationDraft.count(),
  ]);
  console.log(`\nDB now: RiskAssessment=${risk}  PatternMatch=${pm}  RecommendationDraft=${recs}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
