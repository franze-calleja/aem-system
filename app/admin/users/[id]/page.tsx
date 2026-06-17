import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserAssignmentsPanel from "@/components/roles/admin/user-assignments-panel";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, status: true },
  });
  if (!user) notFound();

  const [years, assignments] = await Promise.all([
    prisma.schoolYear.findMany({
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        label: true,
        isActive: true,
        sections: { select: { id: true, gradeLevel: true, name: true }, orderBy: [{ gradeLevel: "asc" }, { name: "asc" }] },
        subjects: { select: { id: true, code: true, name: true }, orderBy: { code: "asc" } },
      },
    }),
    prisma.teacherAssignment.findMany({
      where: { userId: id },
      select: {
        id: true,
        isAdviser: true,
        schoolYear: { select: { id: true, label: true } },
        section: { select: { id: true, gradeLevel: true, name: true } },
        subject: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ schoolYear: { startDate: "desc" } }, { section: { name: "asc" } }],
    }),
  ]);

  return (
    <UserAssignmentsPanel
      user={user}
      years={years}
      assignments={assignments.map((a) => ({
        id: a.id,
        isAdviser: a.isAdviser,
        schoolYearLabel: a.schoolYear.label,
        schoolYearId: a.schoolYear.id,
        section: { id: a.section.id, label: `${a.section.gradeLevel} · ${a.section.name}` },
        subject: a.subject ? { id: a.subject.id, label: `${a.subject.code} — ${a.subject.name}` } : null,
      }))}
    />
  );
}
