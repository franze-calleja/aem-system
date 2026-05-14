// Verifies createInterventionAction across all four scopes (server actions
// need a request context for auth; this script mirrors the commit logic
// directly via Prisma and writes the same audit metadata).
//
// Run: npx tsx scripts/verify-interventions.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PatternScope } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function resolveTarget(
  scope: PatternScope,
  scopeTargetId: string,
  schoolYearId: string,
): Promise<string[]> {
  if (scope === "STUDENT") {
    const e = await prisma.studentEnrollment.findFirst({
      where: { studentId: scopeTargetId, schoolYearId, status: "ACTIVE" },
      select: { id: true },
    });
    return e ? [e.id] : [];
  }
  if (scope === "SECTION") {
    const rows = await prisma.studentEnrollment.findMany({
      where: { sectionId: scopeTargetId, schoolYearId, status: "ACTIVE" },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  if (scope === "GRADE") {
    const rows = await prisma.studentEnrollment.findMany({
      where: { gradeLevel: scopeTargetId, schoolYearId, status: "ACTIVE" },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  const rows = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function createOne(args: {
  counselorId: string;
  schoolYearId: string;
  scope: PatternScope;
  scopeTargetId: string;
  type: "ACADEMIC_SUPPORT" | "COUNSELING_SESSION" | "ATTENDANCE_PROGRAM" | "SECTION_INTERVENTION";
  rationale: string;
  triggeringRecommendationId?: string | null;
}) {
  const participantEnrollmentIds = await resolveTarget(
    args.scope,
    args.scopeTargetId,
    args.schoolYearId,
  );
  const status = args.scope === "STUDENT" ? "ACTIVE" : "PENDING_APPROVAL";

  const intervention = await prisma.$transaction(async (tx) => {
    const created = await tx.intervention.create({
      data: {
        scope: args.scope,
        scopeTargetId: args.scopeTargetId,
        type: args.type,
        status,
        schoolYearId: args.schoolYearId,
        ownerId: args.counselorId,
        startDate: new Date(),
        triggeringRecommendationId: args.triggeringRecommendationId ?? null,
      },
      select: { id: true },
    });
    await tx.interventionSensitive.create({
      data: {
        interventionId: created.id,
        rationale: args.rationale,
      },
    });
    if (participantEnrollmentIds.length > 0) {
      await tx.interventionParticipation.createMany({
        data: participantEnrollmentIds.map((enrollmentId) => ({
          interventionId: created.id,
          enrollmentId,
        })),
      });
    }
    if (args.triggeringRecommendationId) {
      await tx.recommendationDraft.update({
        where: { id: args.triggeringRecommendationId },
        data: { status: "INSTANTIATED" },
      });
    }
    return created;
  });

  await prisma.auditLog.create({
    data: {
      action: "INTERVENTION_CREATED",
      userId: args.counselorId,
      resourceType: "Intervention",
      resourceId: intervention.id,
      metadata: {
        scope: args.scope,
        type: args.type,
        status,
        participants: participantEnrollmentIds.length,
        fromRecommendation: args.triggeringRecommendationId ?? null,
      },
    },
  });
  if (status === "ACTIVE") {
    await prisma.auditLog.create({
      data: {
        action: "INTERVENTION_ACTIVATED",
        userId: args.counselorId,
        resourceType: "Intervention",
        resourceId: intervention.id,
        metadata: { reason: "individual_scope_auto_activate" },
      },
    });
  }

  return { id: intervention.id, status, participants: participantEnrollmentIds.length };
}

async function main() {
  const counselor = await prisma.user.findUniqueOrThrow({
    where: { email: "counselor@school.edu" },
  });
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });
  const maria = await prisma.student.findUniqueOrThrow({ where: { lrn: "100000000001" } });
  const newton = await prisma.section.findFirstOrThrow({
    where: { schoolYearId: sy.id, name: "Newton" },
  });

  console.log(`Counselor: ${counselor.name} · SY: ${sy.label}\n`);

  // 1. Individual (Maria) — should ACTIVE immediately + 1 participant
  const individual = await createOne({
    counselorId: counselor.id,
    schoolYearId: sy.id,
    scope: "STUDENT",
    scopeTargetId: maria.id,
    type: "COUNSELING_SESSION",
    rationale: "Verification script — individual scope.",
  });
  console.log(`[STUDENT]  id=${individual.id}  status=${individual.status}  participants=${individual.participants}`);

  // 2. Section (9-Newton) — PENDING_APPROVAL
  const section = await createOne({
    counselorId: counselor.id,
    schoolYearId: sy.id,
    scope: "SECTION",
    scopeTargetId: newton.id,
    type: "SECTION_INTERVENTION",
    rationale: "Verification script — section scope.",
  });
  console.log(`[SECTION]  id=${section.id}  status=${section.status}  participants=${section.participants}`);

  // 3. Grade level — PENDING_APPROVAL
  const grade = await createOne({
    counselorId: counselor.id,
    schoolYearId: sy.id,
    scope: "GRADE",
    scopeTargetId: newton.gradeLevel,
    type: "ACADEMIC_SUPPORT",
    rationale: "Verification script — grade scope.",
  });
  console.log(`[GRADE]    id=${grade.id}  status=${grade.status}  participants=${grade.participants}`);

  // 4. School-wide — PENDING_APPROVAL
  const school = await createOne({
    counselorId: counselor.id,
    schoolYearId: sy.id,
    scope: "SCHOOL",
    scopeTargetId: "school",
    type: "ATTENDANCE_PROGRAM",
    rationale: "Verification script — school-wide scope.",
  });
  console.log(`[SCHOOL]   id=${school.id}  status=${school.status}  participants=${school.participants}`);

  // 5. Recommendation prefill — instantiate a draft if any exists OPEN.
  const draft = await prisma.recommendationDraft.findFirst({
    where: { schoolYearId: sy.id, status: "OPEN" },
    select: { id: true, scope: true, scopeTargetId: true, suggestedType: true },
  });
  if (draft) {
    const fromDraft = await createOne({
      counselorId: counselor.id,
      schoolYearId: sy.id,
      scope: draft.scope,
      scopeTargetId: draft.scopeTargetId,
      type: "ACADEMIC_SUPPORT",
      rationale: "Verification script — from recommendation draft.",
      triggeringRecommendationId: draft.id,
    });
    const updated = await prisma.recommendationDraft.findUnique({
      where: { id: draft.id },
      select: { status: true },
    });
    console.log(
      `[FROM-DRAFT] id=${fromDraft.id}  status=${fromDraft.status}  draft now=${updated?.status}`,
    );
  } else {
    console.log(`[FROM-DRAFT] no OPEN recommendation drafts to test`);
  }

  const recent = await prisma.auditLog.findMany({
    where: {
      userId: counselor.id,
      action: { in: ["INTERVENTION_CREATED", "INTERVENTION_ACTIVATED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  console.log(`\nRecent audit rows:`);
  for (const a of recent) {
    console.log(`  ${a.createdAt.toISOString()}  ${a.action}  ${a.resourceId}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
