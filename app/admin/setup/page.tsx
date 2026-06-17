import { prisma } from "@/lib/prisma";
import SetupManager from "@/components/roles/admin/setup-manager";

export default async function AdminSetupPage() {
  const years = await prisma.schoolYear.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      label: true,
      startDate: true,
      endDate: true,
      isActive: true,
      _count: { select: { sections: true, subjects: true, enrollments: true } },
    },
  });

  const sectionsByYear = await prisma.section.findMany({
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      schoolYearId: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  });

  const subjectsByYear = await prisma.subject.findMany({
    select: { id: true, code: true, name: true, schoolYearId: true },
    orderBy: { code: "asc" },
  });

  return (
    <SetupManager
      years={years.map((y) => ({
        id: y.id,
        label: y.label,
        startDate: y.startDate.toISOString().slice(0, 10),
        endDate: y.endDate.toISOString().slice(0, 10),
        isActive: y.isActive,
        sectionCount: y._count.sections,
        subjectCount: y._count.subjects,
        enrollmentCount: y._count.enrollments,
      }))}
      sections={sectionsByYear.map((s) => ({
        id: s.id,
        name: s.name,
        gradeLevel: s.gradeLevel,
        schoolYearId: s.schoolYearId,
        enrollmentCount: s._count.enrollments,
      }))}
      subjects={subjectsByYear.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        schoolYearId: s.schoolYearId,
      }))}
    />
  );
}
