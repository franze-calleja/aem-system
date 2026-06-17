// Read-side queries for PatternMatch records (Phase 5 pattern inbox).
// Callers are role-guarded; queries here don't apply RBAC themselves.

import { prisma } from "@/lib/prisma";
import type { PatternScope, PatternStatus } from "@prisma/client";

export type PatternMatchRow = {
  id: string;
  scope: PatternScope;
  scopeTargetId: string;
  scopeLabel: string;
  ruleId: string;
  ruleLabel: string;
  status: PatternStatus;
  matchedAt: string;
  evidence: Record<string, unknown>;
  recommendationCount: number;
};

export async function getPatternMatchesForYear(
  schoolYearId: string,
  status: PatternStatus | "ALL" = "OPEN",
  opts?: { skip?: number; take?: number },
): Promise<PatternMatchRow[]> {
  const rows = await prisma.patternMatch.findMany({
    where: { schoolYearId, ...(status === "ALL" ? {} : { status }) },
    include: { _count: { select: { recommendations: true } } },
    orderBy: { matchedAt: "desc" },
    skip: opts?.skip,
    take: opts?.take,
  });

  const labelMap = await resolveScopeLabels(rows, schoolYearId);
  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeTargetId: r.scopeTargetId,
    scopeLabel: labelMap.get(`${r.scope}:${r.scopeTargetId}`) ?? r.scopeTargetId,
    ruleId: r.ruleId,
    ruleLabel: r.ruleId.replace(/_/g, " "),
    status: r.status,
    matchedAt: r.matchedAt.toISOString(),
    evidence: r.evidence as Record<string, unknown>,
    recommendationCount: r._count.recommendations,
  }));
}

export async function getPatternMatchesCountForYear(
  schoolYearId: string,
  status: PatternStatus | "ALL" = "OPEN",
): Promise<number> {
  return prisma.patternMatch.count({
    where: { schoolYearId, ...(status === "ALL" ? {} : { status }) },
  });
}

async function resolveScopeLabels(
  rows: { scope: PatternScope; scopeTargetId: string }[],
  schoolYearId: string,
): Promise<Map<string, string>> {
  const studentIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const r of rows) {
    if (r.scope === "STUDENT") studentIds.add(r.scopeTargetId);
    if (r.scope === "SECTION") sectionIds.add(r.scopeTargetId);
  }
  const [students, sections] = await Promise.all([
    studentIds.size === 0
      ? Promise.resolve([])
      : prisma.student.findMany({
          where: { id: { in: [...studentIds] } },
          select: { id: true, lastName: true, firstName: true },
        }),
    sectionIds.size === 0
      ? Promise.resolve([])
      : prisma.section.findMany({
          where: { id: { in: [...sectionIds] }, schoolYearId },
          select: { id: true, gradeLevel: true, name: true },
        }),
  ]);
  const map = new Map<string, string>();
  for (const s of students) {
    map.set(`STUDENT:${s.id}`, `${s.lastName}, ${s.firstName}`);
  }
  for (const sec of sections) {
    map.set(`SECTION:${sec.id}`, `${sec.gradeLevel} · ${sec.name}`);
  }
  for (const r of rows) {
    if (r.scope === "GRADE") map.set(`GRADE:${r.scopeTargetId}`, r.scopeTargetId);
    if (r.scope === "SCHOOL") map.set(`SCHOOL:${r.scopeTargetId}`, "School-wide");
  }
  return map;
}
