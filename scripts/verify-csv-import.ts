// Unified verification harness for all CSV imports.
// Usage: tsx scripts/verify-csv-import.ts <kind> <csv-path>
//   <kind> = roster | grades | attendance | behavioral

import "dotenv/config";
import fs from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseCsv } from "../lib/import/csv";
import { validateRosterCsv } from "../lib/import/roster";
import { validateGradesCsv } from "../lib/import/grades";
import { validateAttendanceCsv } from "../lib/import/attendance";
import { validateBehavioralCsv } from "../lib/import/behavioral";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function refs(schoolYearId: string) {
  const [enrollments, subjects] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { schoolYearId },
      select: { id: true, student: { select: { lrn: true } } },
    }),
    prisma.subject.findMany({ where: { schoolYearId }, select: { id: true, code: true } }),
  ]);
  const enrollmentByLrn = new Map<string, string>();
  for (const e of enrollments) enrollmentByLrn.set(e.student.lrn, e.id);
  const subjectByCode = new Map<string, string>();
  for (const s of subjects) subjectByCode.set(s.code.toUpperCase(), s.id);
  return { enrollmentByLrn, subjectByCode };
}

async function main() {
  const kind = process.argv[2];
  const csvPath = process.argv[3];
  if (!kind || !csvPath) {
    console.error("Usage: tsx scripts/verify-csv-import.ts <roster|grades|attendance|behavioral> <csv-path>");
    process.exit(1);
  }

  const sy =
    (await prisma.schoolYear.findFirst({ where: { isActive: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } }));
  if (!sy) throw new Error("No school year");
  console.log(`Target SY: ${sy.label}`);

  const parsed = parseCsv(fs.readFileSync(csvPath, "utf-8"));
  const r = await refs(sy.id);

  switch (kind) {
    case "roster": {
      const v = validateRosterCsv(parsed);
      report(v);
      break;
    }
    case "grades": {
      const v = validateGradesCsv(parsed, r);
      report(v);
      if (v.invalid.length === 0 && v.valid.length > 0) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          for (const row of v.valid) {
            await tx.grade.create({
              data: {
                enrollmentId: row.data.enrollmentId,
                subjectId: row.data.subjectId,
                quarter: row.data.quarter,
                score: row.data.score,
                maxScore: row.data.maxScore,
                assessmentKind: row.data.assessmentKind,
                label: row.data.label,
              },
            });
          }
        });
        console.log(`Committed: ${v.valid.length} grade row(s)`);
      }
      break;
    }
    case "attendance": {
      const v = validateAttendanceCsv(parsed, r);
      report(v);
      if (v.invalid.length === 0 && v.valid.length > 0) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          for (const row of v.valid) {
            await tx.attendance.upsert({
              where: { enrollmentId_date: { enrollmentId: row.data.enrollmentId, date: row.data.date } },
              update: { status: row.data.status, notes: row.data.notes },
              create: {
                enrollmentId: row.data.enrollmentId,
                date: row.data.date,
                status: row.data.status,
                notes: row.data.notes,
              },
            });
          }
        });
        console.log(`Upserted: ${v.valid.length} attendance row(s)`);
      }
      break;
    }
    case "behavioral": {
      const v = validateBehavioralCsv(parsed, r);
      report(v);
      if (v.invalid.length === 0 && v.valid.length > 0) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          for (const row of v.valid) {
            await tx.behavioralRecord.create({
              data: {
                enrollmentId: row.data.enrollmentId,
                date: row.data.date,
                category: row.data.category,
                severity: row.data.severity,
                description: row.data.description,
              },
            });
          }
        });
        console.log(`Created: ${v.valid.length} behavioral row(s)`);
      }
      break;
    }
    default:
      throw new Error(`unknown kind: ${kind}`);
  }
}

function report<T>(v: { total: number; valid: { row: number; data: T }[]; invalid: { row: number; errors: string[] }[] }) {
  console.log(`total=${v.total} valid=${v.valid.length} invalid=${v.invalid.length}`);
  if (v.invalid.length > 0) {
    console.log("Invalid rows:");
    for (const r of v.invalid) console.log(`  row ${r.row}: ${r.errors.join("; ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
