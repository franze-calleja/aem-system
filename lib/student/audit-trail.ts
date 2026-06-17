// Decision Audit Trail — assembles the chain of algorithmic decisions and
// human actions for one student inside one school year. Data only; the page
// arranges it chronologically.

import { prisma } from "@/lib/prisma";
import type {
  InterventionStatus,
  InterventionType,
  PatternScope,
  RiskBand,
} from "@prisma/client";

export type AuditTrailEvent =
  | {
      kind: "RISK_ASSESSMENT";
      at: string;
      score: number;
      band: RiskBand;
      configVersion: number;
    }
  | {
      kind: "PATTERN_MATCH";
      at: string;
      scope: PatternScope;
      ruleId: string;
      status: string;
    }
  | {
      kind: "RECOMMENDATION_DRAFT";
      at: string;
      suggestedType: string;
      status: string;
      rationale: string;
    }
  | {
      kind: "INTERVENTION";
      at: string;
      interventionId: string;
      scope: PatternScope;
      type: InterventionType;
      status: InterventionStatus;
      role: "OWNER" | "PARTICIPANT";
    }
  | {
      kind: "INTERVENTION_REVISION";
      at: string;
      interventionId: string;
      isSignificant: boolean;
      isInterim: boolean;
      reason: string;
    }
  | {
      kind: "INTERVENTION_NOTE";
      at: string;
      interventionId: string;
      noteType: string;
      content: string;
    };

export type AuditTrail = {
  studentName: string;
  events: AuditTrailEvent[];
};

export async function getDecisionAuditTrail(
  studentId: string,
  schoolYearId: string,
): Promise<AuditTrail | null> {
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    include: { student: { select: { firstName: true, lastName: true } } },
  });
  if (!enrollment) return null;
  const studentName = `${enrollment.student.lastName}, ${enrollment.student.firstName}`;

  const [risk, patterns, recs, participations, interventionsOwned] = await Promise.all([
    prisma.riskAssessment.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { computedAt: "asc" },
      select: { score: true, band: true, configVersion: true, computedAt: true },
    }),
    prisma.patternMatch.findMany({
      where: { schoolYearId, scope: "STUDENT", scopeTargetId: studentId },
      orderBy: { matchedAt: "asc" },
      select: { ruleId: true, matchedAt: true, scope: true, status: true },
    }),
    prisma.recommendationDraft.findMany({
      where: { schoolYearId, scope: "STUDENT", scopeTargetId: studentId },
      orderBy: { createdAt: "asc" },
      select: { suggestedType: true, status: true, rationale: true, createdAt: true },
    }),
    prisma.interventionParticipation.findMany({
      where: { enrollmentId: enrollment.id },
      include: {
        intervention: {
          include: {
            revisions: { orderBy: { createdAt: "asc" } },
            notes: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    }),
    prisma.intervention.findMany({
      where: { scope: "STUDENT", scopeTargetId: studentId, schoolYearId },
      include: {
        revisions: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  const events: AuditTrailEvent[] = [];
  for (const r of risk) {
    events.push({
      kind: "RISK_ASSESSMENT",
      at: r.computedAt.toISOString(),
      score: r.score,
      band: r.band,
      configVersion: r.configVersion,
    });
  }
  for (const p of patterns) {
    events.push({
      kind: "PATTERN_MATCH",
      at: p.matchedAt.toISOString(),
      scope: p.scope,
      ruleId: p.ruleId,
      status: p.status,
    });
  }
  for (const r of recs) {
    events.push({
      kind: "RECOMMENDATION_DRAFT",
      at: r.createdAt.toISOString(),
      suggestedType: r.suggestedType,
      status: r.status,
      rationale: r.rationale,
    });
  }
  // Interventions: union of owned-as-target (STUDENT scope) + participations.
  // Dedupe by id; the role flag indicates which path surfaced the row.
  const seenInterventions = new Set<string>();
  for (const iv of interventionsOwned) {
    seenInterventions.add(iv.id);
    events.push({
      kind: "INTERVENTION",
      at: iv.createdAt.toISOString(),
      interventionId: iv.id,
      scope: iv.scope,
      type: iv.type,
      status: iv.status,
      role: "OWNER",
    });
    for (const rev of iv.revisions) {
      events.push({
        kind: "INTERVENTION_REVISION",
        at: rev.createdAt.toISOString(),
        interventionId: iv.id,
        isSignificant: rev.isSignificant,
        isInterim: rev.isInterim,
        reason: rev.reason,
      });
    }
    for (const note of iv.notes) {
      events.push({
        kind: "INTERVENTION_NOTE",
        at: note.createdAt.toISOString(),
        interventionId: iv.id,
        noteType: note.noteType,
        content: note.content,
      });
    }
  }
  for (const p of participations) {
    if (seenInterventions.has(p.intervention.id)) continue;
    seenInterventions.add(p.intervention.id);
    events.push({
      kind: "INTERVENTION",
      at: p.intervention.createdAt.toISOString(),
      interventionId: p.intervention.id,
      scope: p.intervention.scope,
      type: p.intervention.type,
      status: p.intervention.status,
      role: "PARTICIPANT",
    });
    for (const rev of p.intervention.revisions) {
      events.push({
        kind: "INTERVENTION_REVISION",
        at: rev.createdAt.toISOString(),
        interventionId: p.intervention.id,
        isSignificant: rev.isSignificant,
        isInterim: rev.isInterim,
        reason: rev.reason,
      });
    }
    for (const note of p.intervention.notes) {
      events.push({
        kind: "INTERVENTION_NOTE",
        at: note.createdAt.toISOString(),
        interventionId: p.intervention.id,
        noteType: note.noteType,
        content: note.content,
      });
    }
  }

  events.sort((a, b) => a.at.localeCompare(b.at));
  return { studentName, events };
}
