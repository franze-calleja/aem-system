// Pattern detector — fetches data from DB and runs rules against it.
// Returns PatternMatch records to persist (caller decides whether to upsert).

import { prisma } from "@/lib/prisma";
import type { ParticipationOutcome } from "@prisma/client";
import type { PatternRuleConfig } from "./rules";
import {
  ruleAcademicDeclineCluster,
  ruleDisengagementSignal,
  ruleCrisisWarning,
  ruleRecoveryTracking,
  ruleChronicConcern,
  ruleConcentratedRisk,
  ruleSubjectStruggle,
  ruleAttendanceErosion,
} from "./rules";

export interface DetectedPattern {
  scope: "STUDENT" | "SECTION";
  scopeTargetId: string;
  ruleId: string;
  evidence: Record<string, unknown>;
  schoolYearId: string;
}

// Maps the persisted ParticipationOutcome enum to the legacy rule input enum.
// IMPROVING → IMPROVED (favorable); DECLINING → DECLINED (counted as
// "unfavorable" by CHRONIC_CONCERN); STABLE and COMPLETED are treated as
// neutral. Null outcomes (uncommon — only when a plan is marked COMPLETED
// without per-participant outcomes set) default to STABLE so they don't
// inflate the unfavorable count.
function mapOutcomeToRuleEnum(
  o: ParticipationOutcome | null,
): "IMPROVED" | "STABLE" | "DECLINED" | "NO_CHANGE" {
  if (o === "IMPROVING") return "IMPROVED";
  if (o === "DECLINING") return "DECLINED";
  return "STABLE";
}

// Run all student-level pattern rules for every active enrollment in a year.
export async function detectStudentPatterns(
  schoolYearId: string,
  ruleConfig: PatternRuleConfig,
): Promise<DetectedPattern[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    include: {
      grades: { select: { quarter: true, score: true, maxScore: true, subjectId: true } },
      attendance: { select: { status: true, date: true } },
      behavioralRecords: { select: { severity: true } },
      // Latest risk assessment for band.
      riskAssessments: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { band: true },
      },
    },
  });

  // Cross-year intervention history per student — needed for RECOVERY_TRACKING
  // (hasActiveIntervention in the current SY) and CHRONIC_CONCERN
  // (priorInterventionOutcomes across all years). Single bulk fetch, then
  // group in memory to avoid N+1 queries inside the per-enrollment loop.
  const studentIds = enrollments.map((e) => e.studentId);
  const participations = await prisma.interventionParticipation.findMany({
    where: { enrollment: { studentId: { in: studentIds } } },
    select: {
      outcome: true,
      enrollment: { select: { studentId: true } },
      intervention: { select: { status: true, schoolYearId: true } },
    },
  });
  const partsByStudent = new Map<string, typeof participations>();
  for (const p of participations) {
    const sid = p.enrollment.studentId;
    const arr = partsByStudent.get(sid);
    if (arr) arr.push(p);
    else partsByStudent.set(sid, [p]);
  }

  const results: DetectedPattern[] = [];

  for (const e of enrollments) {
    const total = e.attendance.length;
    const absences = e.attendance.filter((a) => a.status === "ABSENT").length;
    const tardies = e.attendance.filter((a) => a.status === "TARDY").length;

    const sorted = [...e.attendance].sort((a, b) => a.date.getTime() - b.date.getTime());
    let consecutiveAbsences = 0;
    let run = 0;
    for (const a of sorted) {
      if (a.status === "ABSENT") {
        run++;
        if (run > consecutiveAbsences) consecutiveAbsences = run;
      } else {
        run = 0;
      }
    }

    const severityWeightedCount =
      e.behavioralRecords.filter((b) => b.severity === "HIGH").length * 3 +
      e.behavioralRecords.filter((b) => b.severity === "MODERATE").length * 2 +
      e.behavioralRecords.filter((b) => b.severity === "LOW").length;

    const quarterlyAverages = [1, 2, 3, 4].map((q) => {
      const qs = e.grades.filter((g) => g.quarter === q);
      if (qs.length === 0) return { quarter: q, avg: null };
      const sum = qs.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
      return { quarter: q, avg: Math.round((sum / qs.length) * 10) / 10 };
    });

    const currentBand = (e.riskAssessments[0]?.band ?? "LOW") as "LOW" | "MODERATE" | "HIGH";

    const studentParts = partsByStudent.get(e.studentId) ?? [];
    const hasActiveIntervention = studentParts.some(
      (p) => p.intervention.status === "ACTIVE" && p.intervention.schoolYearId === schoolYearId,
    );
    const priorInterventionOutcomes = studentParts
      .filter((p) => p.intervention.status === "COMPLETED")
      .map((p) => mapOutcomeToRuleEnum(p.outcome));

    const input = {
      enrollmentId: e.id,
      studentId: e.studentId,
      schoolYearId,
      quarterlyAverages,
      absenceRate: total === 0 ? 0 : absences / total,
      tardyRate: total === 0 ? 0 : tardies / total,
      consecutiveAbsences,
      behavioralSeverityWeightedCount: severityWeightedCount,
      riskBand: currentBand,
      hasActiveIntervention,
      priorInterventionOutcomes,
    };

    const rules = [
      ruleAcademicDeclineCluster,
      ruleDisengagementSignal,
      ruleCrisisWarning,
      ruleRecoveryTracking,
      ruleChronicConcern,
    ];

    for (const rule of rules) {
      if (ruleConfig[rule(input).ruleId] === false) continue;
      const result = rule(input);
      if (result.matched) {
        results.push({
          scope: "STUDENT",
          scopeTargetId: e.studentId,
          ruleId: result.ruleId,
          evidence: result.evidence,
          schoolYearId,
        });
      }
    }
  }

  return results;
}

// Run section-level pattern rules for all sections in a year.
export async function detectSectionPatterns(
  schoolYearId: string,
  ruleConfig: PatternRuleConfig,
): Promise<DetectedPattern[]> {
  const sections = await prisma.section.findMany({
    where: { schoolYearId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          riskAssessments: {
            orderBy: { computedAt: "desc" },
            take: 1,
            select: { band: true },
          },
          attendance: { select: { status: true } },
          grades: { select: { score: true, maxScore: true, subjectId: true } },
        },
      },
    },
  });

  // School-wide absence rate baseline.
  const allEnrollments = sections.flatMap((s) => s.enrollments);
  const schoolTotalDays = allEnrollments.reduce((acc, e) => acc + e.attendance.length, 0);
  const schoolTotalAbsences = allEnrollments.reduce(
    (acc, e) => acc + e.attendance.filter((a) => a.status === "ABSENT").length,
    0,
  );
  const schoolAbsenceRate = schoolTotalDays === 0 ? 0 : schoolTotalAbsences / schoolTotalDays;

  const results: DetectedPattern[] = [];

  for (const section of sections) {
    const active = section.enrollments;
    const totalStudents = active.length;

    const moderateOrHighCount = active.filter((e) => {
      const band = e.riskAssessments[0]?.band;
      return band === "MODERATE" || band === "HIGH";
    }).length;

    // Per-subject fail rate.
    const subjectMap = new Map<string, { code: string; name: string; total: number; failing: number }>();
    for (const e of active) {
      for (const g of e.grades) {
        const sid = g.subjectId;
        if (!subjectMap.has(sid)) {
          subjectMap.set(sid, { code: sid, name: sid, total: 0, failing: 0 });
        }
        const entry = subjectMap.get(sid)!;
        entry.total++;
        if ((g.score / g.maxScore) * 100 < 75) entry.failing++;
      }
    }
    const subjectFailRates = Array.from(subjectMap.values()).map((s) => ({
      subjectCode: s.code,
      subjectName: s.name,
      failRate: s.total === 0 ? 0 : s.failing / s.total,
    }));

    const sectionTotalDays = active.reduce((acc, e) => acc + e.attendance.length, 0);
    const sectionAbsences = active.reduce(
      (acc, e) => acc + e.attendance.filter((a) => a.status === "ABSENT").length,
      0,
    );
    const sectionAbsenceRate = sectionTotalDays === 0 ? 0 : sectionAbsences / sectionTotalDays;

    const input = {
      sectionId: section.id,
      schoolYearId,
      sectionName: section.name,
      gradeLevel: section.gradeLevel,
      totalStudents,
      moderateOrHighCount,
      subjectFailRates,
      sectionAbsenceRate,
      schoolAbsenceRate,
    };

    const sectionRules = [ruleConcentratedRisk, ruleSubjectStruggle, ruleAttendanceErosion];

    for (const rule of sectionRules) {
      const result = rule(input);
      if (ruleConfig[result.ruleId] === false) continue;
      if (result.matched) {
        results.push({
          scope: "SECTION",
          scopeTargetId: section.id,
          ruleId: result.ruleId,
          evidence: result.evidence,
          schoolYearId,
        });
      }
    }
  }

  return results;
}
