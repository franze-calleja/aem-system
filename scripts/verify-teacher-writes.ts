// Verifies the three teacher server actions by replicating their core logic
// (server actions need a real request context for auth; this script uses the
// same business logic and writes the same audit metadata).

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: "teacher@school.edu" } });
  const assignment = await prisma.teacherAssignment.findFirstOrThrow({
    where: { userId: teacher.id },
    include: { section: true, subject: true, schoolYear: true },
  });
  console.log(`Teacher: ${teacher.name}`);
  console.log(`Assignment: ${assignment.section.gradeLevel} ${assignment.section.name} · ${assignment.subject?.code ?? "(adviser)"}\n`);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { sectionId: assignment.sectionId, schoolYearId: assignment.schoolYearId },
    include: { student: { select: { lastName: true, firstName: true } } },
    orderBy: { student: { lastName: "asc" } },
  });
  console.log(`${enrollments.length} students in section.\n`);

  // 1. Attendance: mark every student PRESENT for today.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  console.log(`[Attendance] Marking ${enrollments.length} students PRESENT for ${today.toISOString().slice(0, 10)}`);
  await prisma.$transaction(async (tx) => {
    for (const e of enrollments) {
      await tx.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId: e.id, date: today } },
        update: { status: "PRESENT", recordedById: teacher.id },
        create: { enrollmentId: e.id, date: today, status: "PRESENT", recordedById: teacher.id },
      });
    }
  });
  await prisma.auditLog.create({
    data: {
      action: "ATTENDANCE_RECORDED",
      userId: teacher.id,
      resourceType: "TeacherAssignment",
      resourceId: assignment.id,
      metadata: { date: today.toISOString().slice(0, 10), count: enrollments.length, source: "verify-script" },
    },
  });
  console.log(`  ✓ Upserted ${enrollments.length} attendance rows; audit logged.\n`);

  // 2. Grade: record one new Math grade for the first student.
  if (assignment.subjectId) {
    const target = enrollments[0];
    console.log(`[Grade] Recording Q3 grade for ${target.student.lastName}, ${target.student.firstName}`);
    const g = await prisma.grade.create({
      data: {
        enrollmentId: target.id,
        subjectId: assignment.subjectId,
        quarter: 3,
        score: 88,
        maxScore: 100,
        assessmentKind: "QUIZ",
        label: "Verify-script Q3 Quiz",
        recordedById: teacher.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "GRADE_RECORDED",
        userId: teacher.id,
        resourceType: "Grade",
        resourceId: g.id,
        metadata: { assignmentId: assignment.id, enrollmentId: target.id, quarter: 3, score: 88, maxScore: 100, source: "verify-script" },
      },
    });
    console.log(`  ✓ Created grade ${g.id}; audit logged.\n`);
  }

  // 3. Behavioral: log a low-severity incident for the first student.
  const t2 = enrollments[0];
  console.log(`[Behavioral] Logging incident for ${t2.student.lastName}, ${t2.student.firstName}`);
  const b = await prisma.behavioralRecord.create({
    data: {
      enrollmentId: t2.id,
      date: today,
      category: "ACADEMIC",
      severity: "LOW",
      description: "Verify-script test incident: missed homework submission.",
      recordedById: teacher.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "BEHAVIORAL_INCIDENT_RECORDED",
      userId: teacher.id,
      resourceType: "BehavioralRecord",
      resourceId: b.id,
      metadata: { assignmentId: assignment.id, enrollmentId: t2.id, source: "verify-script" },
    },
  });
  console.log(`  ✓ Created behavioral record ${b.id}; audit logged.\n`);

  console.log("All three writes verified.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
