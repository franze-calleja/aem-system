import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

const AUDIT_ACTIONS: AuditAction[] = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "CONSENT_GRANTED",
  "CONSENT_REVOKED",
  "IMPORT",
  "GRADE_RECORDED",
  "ATTENDANCE_RECORDED",
  "BEHAVIORAL_INCIDENT_RECORDED",
  "RISK_OVERRIDE",
  "INTERVENTION_APPROVED",
  "INTERVENTION_REVISED",
  "INTERIM_REVISION",
  "YEAR_SWITCHED",
];

function parseDate(input: string | undefined): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const action = typeof sp.action === "string" ? (sp.action as AuditAction) : undefined;
  const resourceType = typeof sp.resourceType === "string" ? sp.resourceType : undefined;
  const userId = typeof sp.userId === "string" ? sp.userId : undefined;
  const from = parseDate(typeof sp.from === "string" ? sp.from : undefined);
  const to = parseDate(typeof sp.to === "string" ? sp.to : undefined);
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const detailId = typeof sp.detail === "string" ? sp.detail : undefined;

  const where: Prisma.AuditLogWhereInput = {};
  if (action && AUDIT_ACTIONS.includes(action)) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) {
      const toEnd = new Date(to);
      toEnd.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = toEnd;
    }
  }

  const [total, rows, users, resourceTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.auditLog
      .findMany({ where: { resourceType: { not: null } }, distinct: ["resourceType"], select: { resourceType: true } })
      .then((r) => r.map((x) => x.resourceType).filter((x): x is string => !!x).sort()),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const detailRow = detailId ? rows.find((r) => r.id === detailId) : null;

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      action,
      resourceType,
      userId,
      from: from ? from.toISOString().slice(0, 10) : undefined,
      to: to ? to.toISOString().slice(0, 10) : undefined,
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Audit log</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Append-only record of authentication events, data writes, and sensitive reads.
          Filters narrow the view; the underlying data is never modified.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <form method="GET" className="grid gap-3 md:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Action</span>
            <select
              name="action"
              defaultValue={action ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Resource type</span>
            <select
              name="resourceType"
              defaultValue={resourceType ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {resourceTypes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">User</span>
            <select
              name="userId"
              defaultValue={userId ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from ? from.toISOString().slice(0, 10) : ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to ? to.toISOString().slice(0, 10) : ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="md:col-span-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{total.toLocaleString()} matching entries</p>
            <div className="flex gap-2">
              <Link
                href="/admin/audit"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear filters
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Resource</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                    {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-3 py-2">
                    {r.user ? (
                      <>
                        <p className="font-medium text-slate-900">{r.user.name}</p>
                        <p className="text-xs text-slate-500">{r.user.email} · {r.user.role}</p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">— anonymous —</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.action}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {r.resourceType ?? <span className="text-slate-400">—</span>}
                    {r.resourceId && (
                      <span className="block font-mono text-[11px] text-slate-500">{r.resourceId}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-500">{r.ipAddress ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={buildHref({ detail: r.id })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    No audit entries match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={buildHref({ page: String(Math.max(1, page - 1)) })}
              aria-disabled={page === 1}
              className={`rounded-lg border px-2.5 py-1 ${
                page === 1
                  ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              ← Prev
            </Link>
            <Link
              href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}
              aria-disabled={page === totalPages}
              className={`rounded-lg border px-2.5 py-1 ${
                page === totalPages
                  ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next →
            </Link>
          </div>
        </div>
      </section>

      {detailRow && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Entry detail</h2>
            <Link
              href={buildHref({ detail: undefined })}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Close
            </Link>
          </div>
          <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <DetailItem label="Audit id" value={<span className="font-mono text-xs">{detailRow.id}</span>} />
            <DetailItem label="When" value={detailRow.createdAt.toISOString()} />
            <DetailItem label="Action" value={detailRow.action} />
            <DetailItem
              label="Actor"
              value={detailRow.user ? `${detailRow.user.name} (${detailRow.user.email})` : "—"}
            />
            <DetailItem label="Resource" value={detailRow.resourceType ?? "—"} />
            <DetailItem label="Resource id" value={<span className="font-mono text-xs">{detailRow.resourceId ?? "—"}</span>} />
            <DetailItem label="IP" value={<span className="font-mono text-xs">{detailRow.ipAddress ?? "—"}</span>} />
            <DetailItem label="User agent" value={<span className="text-xs text-slate-600">{detailRow.userAgent ?? "—"}</span>} />
          </dl>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Metadata</p>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(detailRow.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
