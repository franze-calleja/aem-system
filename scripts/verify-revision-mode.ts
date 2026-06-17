// Verifies the revision-mode edit flow + auto significant detection +
// principal interim revision. Mirrors the server-action commit logic.
//
// Run: npx tsx scripts/verify-revision-mode.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  buildDiff,
  detectSignificantChange,
  shouldReenterApproval,
  type InterventionSnapshot,
} from "../lib/intervention/diff";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function loadSnapshot(id: string): Promise<InterventionSnapshot | null> {
  const row = await prisma.intervention.findUnique({
    where: { id },
    include: { sensitive: true },
  });
  if (!row) return null;
  return {
    scope: row.scope,
    scopeTargetId: row.scopeTargetId,
    type: row.type,
    startDate: row.startDate,
    endDate: row.endDate,
    schedule: row.schedule,
    accommodations: row.accommodations,
    staffActions: row.staffActions,
    targetOutcomes: row.targetOutcomes,
    rationale: row.sensitive?.rationale ?? "",
    counselingContext: row.sensitive?.counselingContext ?? null,
  };
}

async function main() {
  const counselor = await prisma.user.findUniqueOrThrow({ where: { email: "counselor@school.edu" } });
  const principal = await prisma.user.findUniqueOrThrow({ where: { email: "principal@school.edu" } });

  console.log("=== Counselor: minor revision on ACTIVE individual plan (stays ACTIVE) ===");
  const studentPlan = await prisma.intervention.findFirst({
    where: { scope: "STUDENT", status: "ACTIVE", ownerId: counselor.id },
    select: { id: true },
  });
  if (!studentPlan) {
    console.log("  no STUDENT/ACTIVE plan owned by counselor. Skipping.");
  } else {
    const before = (await loadSnapshot(studentPlan.id))!;
    const after: InterventionSnapshot = {
      ...before,
      schedule: "Mon/Wed 4pm (revised)",
      accommodations: "extended time on quizzes",
    };
    const diff = buildDiff(before, after);
    const isSig = detectSignificantChange(before, after);
    console.log(`  diff fields: ${Object.keys(diff).join(", ")} · isSignificant=${isSig}`);
    console.log(`  shouldReenterApproval=${shouldReenterApproval(after.scope, isSig)}`);
  }

  console.log("\n=== Counselor: SIGNIFICANT revision on ACTIVE section plan (re-enters approval) ===");
  const sectionPlan = await prisma.intervention.findFirst({
    where: { scope: "SECTION", status: "ACTIVE", ownerId: counselor.id },
    select: { id: true },
  });
  if (!sectionPlan) {
    console.log("  no SECTION/ACTIVE plan owned by counselor. Skipping.");
  } else {
    const before = (await loadSnapshot(sectionPlan.id))!;
    const newEnd = new Date(before.startDate);
    newEnd.setUTCDate(newEnd.getUTCDate() + 90); // duration extended significantly
    const after: InterventionSnapshot = {
      ...before,
      type: "SUBJECT_REMEDIATION",
      endDate: newEnd,
    };
    const diff = buildDiff(before, after);
    const isSig = detectSignificantChange(before, after);
    const reenter = shouldReenterApproval(after.scope, isSig);
    console.log(`  diff fields: ${Object.keys(diff).join(", ")} · isSignificant=${isSig} · reenter=${reenter}`);

    // Apply it like the action would.
    await prisma.$transaction(async (tx) => {
      await tx.intervention.update({
        where: { id: sectionPlan.id },
        data: {
          type: after.type,
          endDate: newEnd,
          status: reenter ? "PENDING_APPROVAL" : "ACTIVE",
        },
      });
      await tx.interventionRevision.create({
        data: {
          interventionId: sectionPlan.id,
          changedById: counselor.id,
          diff: JSON.parse(JSON.stringify(diff)),
          reason: "Verification script — extending duration + changing type.",
          isSignificant: isSig,
          isInterim: false,
        },
      });
    });
    const after2 = await prisma.intervention.findUnique({
      where: { id: sectionPlan.id },
      select: { status: true },
    });
    console.log(`  applied → status=${after2?.status} ✓`);
  }

  console.log("\n=== Principal: interim revision on ACTIVE plan (isInterim=true) ===");
  const anyActive = await prisma.intervention.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, scope: true },
  });
  if (!anyActive) {
    console.log("  no ACTIVE plan. Skipping.");
  } else {
    const before = (await loadSnapshot(anyActive.id))!;
    const after: InterventionSnapshot = {
      ...before,
      staffActions: "(interim) — adjusted while counselor on leave",
    };
    const diff = buildDiff(before, after);
    const isSig = detectSignificantChange(before, after);
    await prisma.$transaction(async (tx) => {
      await tx.intervention.update({
        where: { id: anyActive.id },
        data: { staffActions: after.staffActions },
      });
      await tx.interventionRevision.create({
        data: {
          interventionId: anyActive.id,
          changedById: principal.id,
          diff: JSON.parse(JSON.stringify(diff)),
          reason: "Verification script — counselor on leave; small fix.",
          isSignificant: isSig,
          isInterim: true,
          approvedById: principal.id,
        },
      });
    });
    console.log(`  applied interim revision on ${anyActive.id} · isSignificant=${isSig}`);
  }

  console.log("\n=== Recent revisions on Intervention rows ===");
  const recent = await prisma.interventionRevision.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      interventionId: true,
      isSignificant: true,
      isInterim: true,
      reason: true,
      changedById: true,
    },
  });
  for (const r of recent) {
    console.log(
      `  ${r.id}  intervention=${r.interventionId}  significant=${r.isSignificant} interim=${r.isInterim}`,
    );
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
