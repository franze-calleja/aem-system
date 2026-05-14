// Verification harness for the roster import pipeline.
// Replicates the commit logic of app/actions/import/roster.ts in a runnable script,
// because server actions require a real request context (auth, audit, cookies).
//
// Usage:
//   tsx scripts/verify-roster-import.ts <csv-path>
// Uses the active school year (or first one) from the DB.

import "dotenv/config";
import fs from "node:fs";
import { PrismaClient, ConsentScope, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseCsv } from "../lib/import/csv";
import { validateRosterCsv } from "../lib/import/roster";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: tsx scripts/verify-roster-import.ts <csv-path>");
    process.exit(1);
  }

  const sy =
    (await prisma.schoolYear.findFirst({ where: { isActive: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } }));
  if (!sy) {
    console.error("No school year found");
    process.exit(1);
  }
  console.log(`Target school year: ${sy.label} (${sy.id})\n`);

  const text = fs.readFileSync(csvPath, "utf-8");
  const parsed = parseCsv(text);
  const result = validateRosterCsv(parsed);

  console.log(`Validation: total=${result.total} valid=${result.valid.length} invalid=${result.invalid.length}`);
  if (result.invalid.length > 0) {
    console.log("\nInvalid rows (would block commit):");
    for (const r of result.invalid) {
      console.log(`  row ${r.row}: ${r.errors.join("; ")}`);
    }
    console.log("\nNothing committed (matches commitRosterAction behavior).");
    return;
  }

  console.log("\nCommitting in transaction…");
  let createdStudents = 0;
  let createdEnrollments = 0;
  let createdConsents = 0;
  let createdSections = 0;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const sectionKey = (g: string, s: string) => `${g}::${s}`;
    const sectionsNeeded = new Map<string, { gradeLevel: string; name: string }>();
    for (const v of result.valid) {
      sectionsNeeded.set(sectionKey(v.data.gradeLevel, v.data.section), {
        gradeLevel: v.data.gradeLevel,
        name: v.data.section,
      });
    }
    const sectionIdByKey = new Map<string, string>();
    for (const [key, s] of sectionsNeeded) {
      const before = await tx.section.findUnique({
        where: {
          schoolYearId_gradeLevel_name: {
            schoolYearId: sy.id,
            gradeLevel: s.gradeLevel,
            name: s.name,
          },
        },
        select: { id: true },
      });
      const sec = await tx.section.upsert({
        where: {
          schoolYearId_gradeLevel_name: {
            schoolYearId: sy.id,
            gradeLevel: s.gradeLevel,
            name: s.name,
          },
        },
        update: {},
        create: { schoolYearId: sy.id, gradeLevel: s.gradeLevel, name: s.name },
        select: { id: true },
      });
      sectionIdByKey.set(key, sec.id);
      if (!before) createdSections++;
    }

    for (const v of result.valid) {
      const sectionId = sectionIdByKey.get(sectionKey(v.data.gradeLevel, v.data.section))!;

      const beforeStudent = await tx.student.findUnique({ where: { lrn: v.data.lrn }, select: { id: true } });
      const student = await tx.student.upsert({
        where: { lrn: v.data.lrn },
        update: {
          firstName: v.data.firstName,
          lastName: v.data.lastName,
          middleName: v.data.middleName,
          sex: v.data.sex,
          birthDate: v.data.birthDate,
          spedStatus: v.data.spedStatus,
        },
        create: {
          lrn: v.data.lrn,
          firstName: v.data.firstName,
          lastName: v.data.lastName,
          middleName: v.data.middleName,
          sex: v.data.sex,
          birthDate: v.data.birthDate,
          spedStatus: v.data.spedStatus,
        },
      });
      if (!beforeStudent) createdStudents++;

      const beforeEnrollment = await tx.studentEnrollment.findUnique({
        where: { studentId_schoolYearId: { studentId: student.id, schoolYearId: sy.id } },
        select: { id: true },
      });
      await tx.studentEnrollment.upsert({
        where: { studentId_schoolYearId: { studentId: student.id, schoolYearId: sy.id } },
        update: {
          sectionId,
          gradeLevel: v.data.gradeLevel,
          learningModality: v.data.learningModality,
        },
        create: {
          studentId: student.id,
          schoolYearId: sy.id,
          sectionId,
          gradeLevel: v.data.gradeLevel,
          learningModality: v.data.learningModality,
        },
      });
      if (!beforeEnrollment) createdEnrollments++;

      for (const scope of [ConsentScope.DATA_PROCESSING, ConsentScope.AI_ANALYSIS, ConsentScope.INTERVENTION_PLANNING]) {
        const beforeC = await tx.consentRecord.findUnique({
          where: { studentId_scope: { studentId: student.id, scope } },
          select: { id: true },
        });
        await tx.consentRecord.upsert({
          where: { studentId_scope: { studentId: student.id, scope } },
          update: {},
          create: { studentId: student.id, scope },
        });
        if (!beforeC) createdConsents++;
      }
    }
  });

  console.log(`Committed: sections=${createdSections} students=${createdStudents} enrollments=${createdEnrollments} consents=${createdConsents}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
