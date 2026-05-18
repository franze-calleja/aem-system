import { prisma } from "@/lib/prisma";
import UsersManager from "@/components/roles/admin/users-manager";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import type { Role } from "@prisma/client";

const ROLE_FILTERS = ["ALL", "ADMIN", "TEACHER", "COUNSELOR", "PRINCIPAL"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawRole = typeof sp.role === "string" ? sp.role : "ALL";
  const role: RoleFilter = (ROLE_FILTERS as readonly string[]).includes(rawRole)
    ? (rawRole as RoleFilter)
    : "ALL";
  const page = parsePageParam(sp.page);

  const where = role === "ALL" ? {} : { role: role as Role };

  const total = await prisma.user.count({ where });
  const pagination = paginate(total, page, PAGE_SIZE);

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { name: "asc" }],
    skip: pagination.skip,
    take: pagination.take,
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
      currentRole={role}
      pagination={pagination}
    />
  );
}
