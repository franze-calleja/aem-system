import { prisma } from "@/lib/prisma";
import UsersManager from "@/components/roles/admin/users-manager";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { teacherAssignments: true } },
    },
  });

  return (
    <UsersManager
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
        assignmentCount: u._count.teacherAssignments,
      }))}
    />
  );
}
