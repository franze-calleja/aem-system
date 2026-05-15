// Verifies Phase 7 governance core: RiskOverride workflow + AuditLog
// append-only enforcement + AlgorithmConfig.biasThresholds default.
//
// Run: npx tsx scripts/verify-overrides-governance.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const principal = await prisma.user.findUniqueOrThrow({
    where: { email: "principal@school.edu" },
  });

  // 1. Active config exposes biasThresholds with default.
  const config = await prisma.algorithmConfig.findFirstOrThrow({ where: { isActive: true } });
  console.log(`AlgorithmConfig v${config.version} biasThresholds:`, config.biasThresholds);

  // 2. Pick an enrollment with a RiskAssessment.
  const assess = await prisma.riskAssessment.findFirst({
    orderBy: { computedAt: "desc" },
    include: { enrollment: { include: { student: { select: { firstName: true, lastName: true } } } } },
  });
  if (!assess) {
    console.log("No RiskAssessment on file — run scripts/run-risk-engine.ts first.");
    return;
  }
  console.log(
    `Working with ${assess.enrollment.student.lastName}, ${assess.enrollment.student.firstName} ` +
      `(current band ${assess.band}, score ${assess.score.toFixed(0)})`,
  );

  // Clear any leftover active overrides from previous runs.
  await prisma.riskOverride.updateMany({
    where: { enrollmentId: assess.enrollmentId, clearedAt: null },
    data: { clearedAt: new Date(), clearedById: principal.id },
  });

  // 3. Apply an override (HIGH → MODERATE or similar — pick something different).
  const overrideBand = assess.band === "HIGH" ? "MODERATE" : assess.band === "MODERATE" ? "LOW" : "MODERATE";
  const created = await prisma.riskOverride.create({
    data: {
      enrollmentId: assess.enrollmentId,
      overriddenById: principal.id,
      originalScore: assess.score,
      originalBand: assess.band,
      overrideBand,
      justification: "Verification script — contextual factors not captured by the algorithm.",
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "RISK_OVERRIDE",
      userId: principal.id,
      resourceType: "RiskOverride",
      resourceId: created.id,
      metadata: { enrollmentId: assess.enrollmentId, from: assess.band, to: overrideBand },
    },
  });
  console.log(`[Create]   ${created.id} → ${overrideBand} (was ${assess.band})`);

  // 4. Read it back via the query layer pattern.
  const active = await prisma.riskOverride.findFirst({
    where: { enrollmentId: assess.enrollmentId, clearedAt: null },
    include: { overriddenBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  console.log(`[Read]     active override by ${active?.overriddenBy.name} → ${active?.overrideBand}`);

  // 5. Verify AuditLog is append-only at the DB level.
  console.log(`[Trigger]  testing AuditLog append-only enforcement…`);
  const anyAudit = await prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" } });
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "AuditLog" SET action = 'LOGIN' WHERE id = '${anyAudit?.id ?? ""}'`,
    );
    console.log("  ✗ UPDATE succeeded (trigger missing?)");
  } catch (err) {
    console.log(`  ✓ UPDATE rejected: ${(err as Error).message.split("\n")[0]}`);
  }
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "AuditLog" WHERE id = '${anyAudit?.id ?? ""}'`,
    );
    console.log("  ✗ DELETE succeeded (trigger missing?)");
  } catch (err) {
    console.log(`  ✓ DELETE rejected: ${(err as Error).message.split("\n")[0]}`);
  }

  // 6. Clear the override and confirm.
  await prisma.riskOverride.update({
    where: { id: created.id },
    data: { clearedAt: new Date(), clearedById: principal.id },
  });
  await prisma.auditLog.create({
    data: {
      action: "RISK_OVERRIDE",
      userId: principal.id,
      resourceType: "RiskOverride",
      resourceId: created.id,
      metadata: { cleared: true },
    },
  });
  const stillActive = await prisma.riskOverride.findFirst({
    where: { enrollmentId: assess.enrollmentId, clearedAt: null },
  });
  console.log(`[Clear]    active override now: ${stillActive ? "still present (?)" : "none ✓"}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
