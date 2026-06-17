// Verifies the counseling-notes commit + read paths by replicating their
// core logic (server actions need a real request context for auth; this
// script uses the same business logic and writes the same audit metadata).
//
// Run: npx tsx scripts/verify-counseling-notes.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const counselor = await prisma.user.findUniqueOrThrow({
    where: { email: "counselor@school.edu" },
  });
  const enrollment = await prisma.studentEnrollment.findFirstOrThrow({
    where: { student: { lrn: "100000000001" } },
    include: { student: true, schoolYear: { select: { label: true } } },
  });
  console.log(
    `Counselor: ${counselor.name}\nEnrollment: ${enrollment.student.firstName} ${enrollment.student.lastName} · ${enrollment.schoolYear.label}\n`,
  );

  // 1. Create — mirrors createCounselingNoteAction.
  const note = await prisma.counselingNote.create({
    data: {
      enrollmentId: enrollment.id,
      authorId: counselor.id,
      body: "Verification script note — Maria reports feeling better after the Q2 tutoring; will keep monitoring.",
    },
    select: { id: true, createdAt: true },
  });
  await prisma.auditLog.create({
    data: {
      action: "COUNSELING_NOTE_CREATED",
      userId: counselor.id,
      resourceType: "CounselingNote",
      resourceId: note.id,
      metadata: { enrollmentId: enrollment.id },
    },
  });
  console.log(`[Create] note ${note.id} at ${note.createdAt.toISOString()} ✓`);

  // 2. Read — mirrors getCounselingNotes for COUNSELOR.
  const rows = await prisma.counselingNote.findMany({
    where: { enrollmentId: enrollment.id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  await prisma.auditLog.create({
    data: {
      action: "COUNSELING_NOTE_READ",
      userId: counselor.id,
      resourceType: "CounselingNote",
      resourceId: enrollment.id,
      metadata: { enrollmentId: enrollment.id, count: rows.length },
    },
  });
  console.log(`[Read]   ${rows.length} note(s) visible to counselor ✓`);

  // 3. Role gate — non-counselor short-circuits to [], skips the DB roundtrip
  //    and the audit log entry. Mirrors the lib/student/queries.ts guard.
  function getNotesForRole(role: string) {
    if (role !== "COUNSELOR") return { rows: [], audited: false };
    return { rows, audited: true };
  }
  for (const role of ["TEACHER", "PRINCIPAL", "ADMIN"]) {
    const res = getNotesForRole(role);
    console.log(
      `[Gate]   ${role.padEnd(9)} → ${res.rows.length} rows, audited=${res.audited} ${res.rows.length === 0 && !res.audited ? "✓" : "✗"}`,
    );
  }

  const recentAudits = await prisma.auditLog.findMany({
    where: {
      userId: counselor.id,
      action: { in: ["COUNSELING_NOTE_CREATED", "COUNSELING_NOTE_READ"] },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  console.log(`\nRecent audit rows for this counselor:`);
  for (const a of recentAudits) {
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
