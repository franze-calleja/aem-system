// Verify the studentVisibilityFilter helper:
// - ADMIN / COUNSELOR / PRINCIPAL should see all students
// - TEACHER should only see students from sections they're assigned to (for the given school year)

import "dotenv/config";
import { PrismaClient, type Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { studentVisibilityFilter } from "../lib/rbac";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sy = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  if (!sy) throw new Error("No active school year");
  console.log(`School year: ${sy.label}\n`);

  const totalStudents = await prisma.student.count();
  console.log(`Total students in DB: ${totalStudents}\n`);

  const usersToTest: Array<{ email: string; expected: "all" | "scoped" }> = [
    { email: "admin@school.edu", expected: "all" },
    { email: "counselor@school.edu", expected: "all" },
    { email: "principal@school.edu", expected: "all" },
    { email: "teacher@school.edu", expected: "scoped" }, // 9-Newton Math only
    { email: "adviser@school.edu", expected: "scoped" }, // 9-Newton English + adviser
  ];

  for (const u of usersToTest) {
    const user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      console.log(`  ${u.email}: not found`);
      continue;
    }
    const caller = { userId: user.id, role: user.role as Role };
    const filter = studentVisibilityFilter(caller, sy.id);
    const visible = await prisma.student.findMany({
      where: filter,
      select: {
        lastName: true,
        firstName: true,
        enrollments: {
          where: { schoolYearId: sy.id },
          select: { section: { select: { gradeLevel: true, name: true } } },
        },
      },
      orderBy: { lastName: "asc" },
    });
    const sections = new Set<string>();
    visible.forEach((s) =>
      s.enrollments.forEach((e) => sections.add(`${e.section.gradeLevel} ${e.section.name}`))
    );
    console.log(
      `${user.role.padEnd(10)} ${u.email.padEnd(25)} sees ${visible.length} students across [${[...sections].join(", ")}]`
    );
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
