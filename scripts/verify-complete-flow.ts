// Verifies completeInterventionAction by replicating its commit logic +
// audit metadata. (Server actions require a real request context for auth;
// this script mirrors the same Prisma writes.)
//
// Run: npx tsx scripts/verify-complete-flow.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const counselor = await prisma.user.findUniqueOrThrow({
    where: { email: "counselor@school.edu" },
  });

  // Pick an ACTIVE intervention owned by the counselor with participants.
  const intervention = await prisma.intervention.findFirst({
    where: { ownerId: counselor.id, status: "ACTIVE" },
    include: { participations: true },
    orderBy: { createdAt: "asc" },
  });
  if (!intervention) {
    console.log("No ACTIVE plan owned by counselor. Skipping.");
    return;
  }
  if (intervention.participations.length === 0) {
    console.log(`No participations on ${intervention.id}. Skipping.`);
    return;
  }

  // Round-robin outcomes across the participants — gives the tracker UI a
  // mix of bands to show off.
  const OUTCOMES = ["IMPROVING", "STABLE", "DECLINING", "COMPLETED"] as const;
  const assignments = intervention.participations.map((p, i) => ({
    participationId: p.id,
    outcome: OUTCOMES[i % OUTCOMES.length],
  }));

  await prisma.$transaction(async (tx) => {
    await tx.intervention.update({
      where: { id: intervention.id },
      data: { status: "COMPLETED", endDate: intervention.endDate ?? new Date() },
    });
    for (const a of assignments) {
      await tx.interventionParticipation.update({
        where: { id: a.participationId },
        data: { outcome: a.outcome },
      });
    }
    await tx.interventionRevision.create({
      data: {
        interventionId: intervention.id,
        changedById: counselor.id,
        diff: { status: { from: "ACTIVE", to: "COMPLETED" } },
        reason: "Verification script — marked complete.",
        isSignificant: false,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      action: "INTERVENTION_REVISED",
      userId: counselor.id,
      resourceType: "Intervention",
      resourceId: intervention.id,
      metadata: {
        transition: "ACTIVE→COMPLETED",
        outcomes: assignments.reduce<Record<string, number>>((acc, a) => {
          acc[a.outcome] = (acc[a.outcome] ?? 0) + 1;
          return acc;
        }, {}),
      },
    },
  });

  const after = await prisma.intervention.findUnique({
    where: { id: intervention.id },
    include: { participations: { select: { outcome: true } } },
  });
  const dist = (after?.participations ?? []).reduce<Record<string, number>>((acc, p) => {
    const k = p.outcome ?? "UNSET";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Completed intervention ${intervention.id}`);
  console.log(`  status: ${after?.status}`);
  console.log(`  outcomes:`, dist);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
