import "dotenv/config";
import { PrismaClient, Role, Sex, LearningModality, ConsentScope } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding AEM system…");

  // ── School year ─────────────────────────────────────────────────────────
  const sy = await prisma.schoolYear.upsert({
    where: { label: "SY 2025-2026" },
    update: { isActive: true },
    create: {
      label: "SY 2025-2026",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2026-05-31"),
      isActive: true,
    },
  });

  // ── Sections ────────────────────────────────────────────────────────────
  const newton = await prisma.section.upsert({
    where: {
      schoolYearId_gradeLevel_name: {
        schoolYearId: sy.id,
        gradeLevel: "Grade 9",
        name: "Newton",
      },
    },
    update: {},
    create: { schoolYearId: sy.id, gradeLevel: "Grade 9", name: "Newton" },
  });

  const curie = await prisma.section.upsert({
    where: {
      schoolYearId_gradeLevel_name: {
        schoolYearId: sy.id,
        gradeLevel: "Grade 9",
        name: "Curie",
      },
    },
    update: {},
    create: { schoolYearId: sy.id, gradeLevel: "Grade 9", name: "Curie" },
  });

  // ── Subjects ────────────────────────────────────────────────────────────
  const subjects = await Promise.all(
    [
      { code: "MATH9", name: "Mathematics 9" },
      { code: "ENG9", name: "English 9" },
      { code: "SCI9", name: "Science 9" },
      { code: "AP9", name: "Araling Panlipunan 9" },
      { code: "FIL9", name: "Filipino 9" },
    ].map((s) =>
      prisma.subject.upsert({
        where: { schoolYearId_code: { schoolYearId: sy.id, code: s.code } },
        update: { name: s.name },
        create: { schoolYearId: sy.id, code: s.code, name: s.name },
      })
    )
  );

  // ── Users ───────────────────────────────────────────────────────────────
  const accounts: Array<{ email: string; password: string; role: Role; name: string }> = [
    { email: "admin@school.edu", password: "admin123", role: "ADMIN", name: "Ms. Cruz (Admin)" },
    { email: "teacher@school.edu", password: "teacher123", role: "TEACHER", name: "Mr. Reyes" },
    { email: "adviser@school.edu", password: "adviser123", role: "TEACHER", name: "Mrs. Lim (9-Newton Adviser)" },
    { email: "counselor@school.edu", password: "counselor123", role: "COUNSELOR", name: "Ms. Santos" },
    { email: "principal@school.edu", password: "principal123", role: "PRINCIPAL", name: "Mr. Dela Cruz" },
  ];

  const userByEmail = new Map<string, string>();
  for (const a of accounts) {
    const hashed = await bcrypt.hash(a.password, 10);
    const u = await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, role: a.role, status: "ACTIVE", hashedPassword: hashed },
      create: {
        email: a.email,
        hashedPassword: hashed,
        role: a.role,
        name: a.name,
      },
    });
    userByEmail.set(a.email, u.id);
  }

  // ── Teacher assignments ─────────────────────────────────────────────────
  const teacherId = userByEmail.get("teacher@school.edu")!;
  const adviserId = userByEmail.get("adviser@school.edu")!;
  const math = subjects.find((s) => s.code === "MATH9")!;
  const eng = subjects.find((s) => s.code === "ENG9")!;

  // Mr. Reyes teaches Math in 9-Newton (no adviser flag)
  await prisma.teacherAssignment.upsert({
    where: {
      userId_sectionId_subjectId_schoolYearId: {
        userId: teacherId,
        sectionId: newton.id,
        subjectId: math.id,
        schoolYearId: sy.id,
      },
    },
    update: {},
    create: {
      userId: teacherId,
      sectionId: newton.id,
      subjectId: math.id,
      schoolYearId: sy.id,
      isAdviser: false,
    },
  });

  // Mrs. Lim teaches English in 9-Newton AND is adviser
  await prisma.teacherAssignment.upsert({
    where: {
      userId_sectionId_subjectId_schoolYearId: {
        userId: adviserId,
        sectionId: newton.id,
        subjectId: eng.id,
        schoolYearId: sy.id,
      },
    },
    update: { isAdviser: true },
    create: {
      userId: adviserId,
      sectionId: newton.id,
      subjectId: eng.id,
      schoolYearId: sy.id,
      isAdviser: true,
    },
  });

  // ── Students + enrollment + consent ─────────────────────────────────────
  const studentsSeed = [
    { lrn: "100000000001", first: "Maria", last: "Santos", sex: "FEMALE" as Sex, section: newton.id, birthDate: new Date("2010-04-15") },
    { lrn: "100000000002", first: "Juan", last: "Dela Cruz", sex: "MALE" as Sex, section: newton.id, birthDate: new Date("2010-07-21") },
    { lrn: "100000000003", first: "Ana", last: "Reyes", sex: "FEMALE" as Sex, section: newton.id, birthDate: new Date("2010-01-09") },
    { lrn: "100000000004", first: "Carlos", last: "Lim", sex: "MALE" as Sex, section: newton.id, birthDate: new Date("2010-11-30") },
    { lrn: "100000000005", first: "Sofia", last: "Garcia", sex: "FEMALE" as Sex, section: newton.id, birthDate: new Date("2010-03-12") },
    { lrn: "100000000006", first: "Miguel", last: "Torres", sex: "MALE" as Sex, section: curie.id, birthDate: new Date("2010-06-18") },
    { lrn: "100000000007", first: "Patricia", last: "Mendoza", sex: "FEMALE" as Sex, section: curie.id, birthDate: new Date("2010-09-25") },
    { lrn: "100000000008", first: "Jose", last: "Ramos", sex: "MALE" as Sex, section: curie.id, birthDate: new Date("2010-02-14") },
    { lrn: "100000000009", first: "Isabella", last: "Cruz", sex: "FEMALE" as Sex, section: curie.id, birthDate: new Date("2010-08-08") },
    { lrn: "100000000010", first: "Andres", last: "Bonifacio", sex: "MALE" as Sex, section: curie.id, birthDate: new Date("2010-12-03") },
  ];

  for (const s of studentsSeed) {
    const student = await prisma.student.upsert({
      where: { lrn: s.lrn },
      update: { firstName: s.first, lastName: s.last, sex: s.sex, birthDate: s.birthDate },
      create: {
        lrn: s.lrn,
        firstName: s.first,
        lastName: s.last,
        sex: s.sex,
        birthDate: s.birthDate,
      },
    });

    await prisma.studentEnrollment.upsert({
      where: { studentId_schoolYearId: { studentId: student.id, schoolYearId: sy.id } },
      update: { sectionId: s.section, gradeLevel: "Grade 9" },
      create: {
        studentId: student.id,
        schoolYearId: sy.id,
        sectionId: s.section,
        gradeLevel: "Grade 9",
        learningModality: LearningModality.FACE_TO_FACE,
      },
    });

    // Consents — all three scopes granted by default for seed data.
    for (const scope of [
      ConsentScope.DATA_PROCESSING,
      ConsentScope.AI_ANALYSIS,
      ConsentScope.INTERVENTION_PLANNING,
    ]) {
      await prisma.consentRecord.upsert({
        where: { studentId_scope: { studentId: student.id, scope } },
        update: {},
        create: { studentId: student.id, scope },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`  School year: ${sy.label}`);
  console.log(`  Users: ${accounts.length}`);
  console.log(`  Sections: 2 (Grade 9 Newton, Grade 9 Curie)`);
  console.log(`  Subjects: ${subjects.length}`);
  console.log(`  Students: ${studentsSeed.length}`);
  console.log("\nLogins:");
  for (const a of accounts) {
    console.log(`  ${a.email}  /  ${a.password}  (${a.role})`);
  }

  // ── Default AlgorithmConfig ──────────────────────────────────────────────
  // Version 1 ships with the Phase 4 engine. Exactly one row is active.
  const existingConfig = await prisma.algorithmConfig.findFirst({ where: { version: 1 } });
  if (!existingConfig) {
    await prisma.algorithmConfig.create({
      data: {
        version: 1,
        isActive: true,
        justification: "Initial Phase 4 default weights",
        weights: {
          academic: 0.40,
          attendance: 0.30,
          behavioral: 0.20,
          interventionHistory: 0.05,
          profile: 0.05,
        },
        thresholds: { moderateMin: 40, highMin: 70 },
        ruleConfig: {
          ACADEMIC_DECLINE_CLUSTER: true,
          DISENGAGEMENT_SIGNAL: true,
          CRISIS_WARNING: true,
          RECOVERY_TRACKING: true,
          CHRONIC_CONCERN: true,
          CONCENTRATED_RISK: true,
          SUBJECT_STRUGGLE: true,
          ATTENDANCE_EROSION: true,
        },
      },
    });
    console.log("  AlgorithmConfig: v1 seeded (active)");
  } else {
    console.log("  AlgorithmConfig: v1 already exists, skipped");
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
