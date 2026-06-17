import { prisma } from "@/lib/prisma";
import { ConsentScope } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import ConsentManager from "@/components/roles/admin/consent-manager";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { ListToolbar, toForwardParams, type FilterSpec } from "@/components/shell/list-toolbar";

const STATUS_OPTIONS = [
  { value: "ANY_REVOKED", label: "Has revocation" },
  { value: "ALL_GRANTED", label: "All scopes granted" },
];

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

export default async function AdminConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requestedPage = parsePageParam(sp.page);
  const search = param(sp, "q");
  const status = param(sp, "status");

  // Build server-side filter. Search hits name + LRN. Status filter narrows
  // by whether at least one consent record is revoked.
  const where: Prisma.StudentWhereInput = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { lrn: { contains: search } },
    ];
  }
  if (status === "ANY_REVOKED") {
    where.consentRecords = { some: { status: "REVOKED" } };
  } else if (status === "ALL_GRANTED") {
    where.consentRecords = { none: { status: "REVOKED" } };
  }

  const totalUnfiltered = await prisma.student.count();
  const totalFiltered = await prisma.student.count({ where });
  const pagination = paginate(totalFiltered, requestedPage, PAGE_SIZE);

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: pagination.skip,
    take: pagination.take,
    select: {
      id: true,
      lrn: true,
      firstName: true,
      lastName: true,
      consentRecords: {
        select: { scope: true, status: true, revokedAt: true, grantedAt: true, notes: true },
      },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          gradeLevel: true,
          section: { select: { name: true } },
          schoolYear: { select: { label: true } },
        },
      },
    },
  });

  const allScopes = Object.values(ConsentScope);
  const filters: FilterSpec[] = [
    { name: "status", label: "Status", value: status, options: STATUS_OPTIONS },
  ];
  const forwardParams = toForwardParams("q", search, filters);
  const filtered = totalFiltered !== totalUnfiltered;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Consent management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Manage each student&apos;s consent for data processing, AI analysis, and intervention planning.
          Revocations require a written justification and are recorded in the audit log.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {totalUnfiltered.toLocaleString()} students total
          {filtered && (
            <span className="ml-1 text-amber-700">· {totalFiltered.toLocaleString()} match the current filter</span>
          )}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <ListToolbar
          basePath="/admin/consent"
          searchPlaceholder="Search by name or LRN…"
          searchValue={search}
          filters={filters}
        />
      </section>

      <ConsentManager
        scopes={allScopes}
        students={students.map((s) => {
          const byScope = new Map(s.consentRecords.map((c) => [c.scope, c]));
          const enrollment = s.enrollments[0];
          return {
            id: s.id,
            lrn: s.lrn,
            name: `${s.lastName}, ${s.firstName}`,
            context: enrollment
              ? `${enrollment.gradeLevel} · ${enrollment.section.name} · ${enrollment.schoolYear.label}`
              : "No active enrollment",
            consents: allScopes.map((scope) => {
              const c = byScope.get(scope);
              return {
                scope,
                status: c?.status ?? "GRANTED",
                hasRecord: !!c,
                revokedAt: c?.revokedAt ? c.revokedAt.toISOString() : null,
                grantedAt: c?.grantedAt ? c.grantedAt.toISOString() : null,
                notes: c?.notes ?? null,
              };
            }),
          };
        })}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <PaginationBar pagination={pagination} basePath="/admin/consent" forwardParams={forwardParams} />
      </div>
    </div>
  );
}
