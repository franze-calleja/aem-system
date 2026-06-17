// Wipes algorithm output + workflow + AI cache + audit log, leaving the
// "data + setup" baseline intact. Lets you walk through the system actions
// (run engine → see patterns → build interventions → close with outcomes)
// from a clean slate without re-importing students or losing accounts.
//
// Keeps:   Users, SchoolYears, Sections, Subjects, TeacherAssignments,
//          Students, ConsentRecords, StudentEnrollments,
//          Grade, Attendance, BehavioralRecord, AlgorithmConfig,
//          SpedStatusChange
//
// Wipes:   RiskAssessment, RiskOverride, PatternMatch, RecommendationDraft,
//          Intervention + InterventionSensitive + InterventionParticipation
//          + InterventionNote + InterventionRevision,
//          CounselingNote, AICache, AuditLog
//
// AuditLog is append-only at the row level via a Postgres trigger, but
// TRUNCATE bypasses row-level triggers in Postgres — exactly what we want
// here. Re-running this script is safe (idempotent — second run wipes zero
// rows from already-empty tables).
//
//   npx tsx scripts/reset-to-data-only.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function countAll() {
  const [
    users,
    years,
    sections,
    subjects,
    assignments,
    students,
    consents,
    enrollments,
    grades,
    attendance,
    behavioral,
    algorithmConfig,
    spedHistory,
    riskAssessment,
    riskOverride,
    patternMatch,
    recommendationDraft,
    intervention,
    interventionSensitive,
    interventionParticipation,
    interventionNote,
    interventionRevision,
    counselingNote,
    aiCache,
    auditLog,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.schoolYear.count(),
    prisma.section.count(),
    prisma.subject.count(),
    prisma.teacherAssignment.count(),
    prisma.student.count(),
    prisma.consentRecord.count(),
    prisma.studentEnrollment.count(),
    prisma.grade.count(),
    prisma.attendance.count(),
    prisma.behavioralRecord.count(),
    prisma.algorithmConfig.count(),
    prisma.spedStatusChange.count(),
    prisma.riskAssessment.count(),
    prisma.riskOverride.count(),
    prisma.patternMatch.count(),
    prisma.recommendationDraft.count(),
    prisma.intervention.count(),
    prisma.interventionSensitive.count(),
    prisma.interventionParticipation.count(),
    prisma.interventionNote.count(),
    prisma.interventionRevision.count(),
    prisma.counselingNote.count(),
    prisma.aICache.count(),
    prisma.auditLog.count(),
  ]);
  return {
    keep: {
      User: users,
      SchoolYear: years,
      Section: sections,
      Subject: subjects,
      TeacherAssignment: assignments,
      Student: students,
      ConsentRecord: consents,
      StudentEnrollment: enrollments,
      Grade: grades,
      Attendance: attendance,
      BehavioralRecord: behavioral,
      AlgorithmConfig: algorithmConfig,
      SpedStatusChange: spedHistory,
    },
    wipe: {
      RiskAssessment: riskAssessment,
      RiskOverride: riskOverride,
      PatternMatch: patternMatch,
      RecommendationDraft: recommendationDraft,
      Intervention: intervention,
      InterventionSensitive: interventionSensitive,
      InterventionParticipation: interventionParticipation,
      InterventionNote: interventionNote,
      InterventionRevision: interventionRevision,
      CounselingNote: counselingNote,
      AICache: aiCache,
      AuditLog: auditLog,
    },
  };
}

function printTable(title: string, rows: Record<string, number>) {
  console.log(`\n${title}`);
  const longest = Math.max(...Object.keys(rows).map((k) => k.length));
  for (const [k, v] of Object.entries(rows)) {
    console.log(`  ${k.padEnd(longest)}  ${v.toLocaleString().padStart(8)}`);
  }
}

async function main() {
  console.log("AEM — reset to data-only baseline");

  const before = await countAll();
  printTable("BEFORE — keep tables", before.keep);
  printTable("BEFORE — wipe tables", before.wipe);

  console.log("\nWiping…");

  // Delete in child-first order to respect FK constraints. Child rows that
  // cascade-on-delete will go automatically when the parent is removed, but
  // being explicit keeps this readable and avoids any onDelete: Restrict
  // surprises.
  await prisma.$transaction([
    // Intervention workflow children first
    prisma.interventionRevision.deleteMany({}),
    prisma.interventionNote.deleteMany({}),
    prisma.interventionParticipation.deleteMany({}),
    prisma.interventionSensitive.deleteMany({}),
    // Recommendation drafts have an optional FK to PatternMatch; null it via
    // delete order — drafts first so PatternMatch deletion doesn't need to
    // clear references.
    prisma.recommendationDraft.deleteMany({}),
    // Now the parent Intervention
    prisma.intervention.deleteMany({}),
    // Independent tables
    prisma.counselingNote.deleteMany({}),
    prisma.riskOverride.deleteMany({}),
    prisma.riskAssessment.deleteMany({}),
    prisma.patternMatch.deleteMany({}),
    prisma.aICache.deleteMany({}),
  ]);

  // AuditLog: row-level UPDATE/DELETE triggers reject normal deletes. TRUNCATE
  // bypasses row triggers in Postgres, so we use raw SQL here.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuditLog";');

  console.log("Wiped.");

  const after = await countAll();
  printTable("AFTER — keep tables", after.keep);
  printTable("AFTER — wipe tables", after.wipe);

  // Sanity assertions.
  const stillThere = Object.values(after.keep).some((v) => v === 0);
  if (stillThere) {
    console.warn(
      "\n⚠️  At least one 'keep' table is now empty. Did you mean to run scripts/seed-demo.ts to repopulate?",
    );
  }
  const wiped = Object.values(after.wipe).every((v) => v === 0);
  if (!wiped) {
    console.error("\n❌ At least one 'wipe' table still has rows. Investigate.");
    process.exit(1);
  }

  console.log("\nDone. You can now log in as any seeded role and exercise the workflow from scratch:");
  console.log("  - admin@school.edu     / admin123       (Algorithm → Run engine)");
  console.log("  - counselor@school.edu / counselor123   (Caseload → open profile → build intervention)");
  console.log("  - principal@school.edu / principal123   (Approvals queue, Override, Dashboard)");
  console.log("  - teacher@school.edu   / teacher123     (Daily capture, intervention feedback)");
  console.log("  - adviser@school.edu   / adviser123     (Adviser elevation for 9-Newton)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
