import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getCaseloadBandSummary,
  getCaseloadWithRiskPaged,
  getSectionsAndGradesForYear,
} from "@/lib/risk/queries";
import { RiskBadge } from "@/components/shell/explainability-panel";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import PrewarmCaseloadButton from "@/components/counselor/prewarm-caseload-button";
import { ListToolbar, toForwardParams, type FilterSpec } from "@/components/shell/list-toolbar";

const BAND_OPTIONS = [
  { value: "HIGH", label: "HIGH" },
  { value: "MODERATE", label: "MODERATE" },
  { value: "LOW", label: "LOW" },
  { value: "UNSCORED", label: "Unscored" },
];

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

export default async function CaseloadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <EmptyState>No active school year. Ask the admin to activate one.</EmptyState>
    );
  }

  const sp = await searchParams;
  const requestedPage = parsePageParam(sp.page);
  const search = param(sp, "q");
  const band = param(sp, "band");
  const sectionId = param(sp, "sectionId");
  const gradeLevel = param(sp, "gradeLevel");

  const [summary, sectionsAndGrades] = await Promise.all([
    getCaseloadBandSummary(sy.id),
    getSectionsAndGradesForYear(sy.id),
  ]);

  // Run the query once to get total + page rows under the active filters.
  const initial = await getCaseloadWithRiskPaged(sy.id, {
    skip: 0,
    take: 0, // probe count only
    search,
    sectionId,
    gradeLevel,
    band,
  });
  const pagination = paginate(initial.total, requestedPage, PAGE_SIZE);
  const { rows } = await getCaseloadWithRiskPaged(sy.id, {
    skip: pagination.skip,
    take: pagination.take,
    search,
    sectionId,
    gradeLevel,
    band,
  });

  // Within the visible page, surface higher-risk rows first. Full-population
  // ranking lives in the Pattern Inbox.
  const sorted = [...rows].sort((a, b) => {
    if (a.riskScore === null && b.riskScore === null) return 0;
    if (a.riskScore === null) return 1;
    if (b.riskScore === null) return -1;
    return b.riskScore - a.riskScore;
  });

  const filters: FilterSpec[] = [
    { name: "band", label: "Risk band", value: band, options: BAND_OPTIONS },
    {
      name: "gradeLevel",
      label: "Grade",
      value: gradeLevel,
      options: sectionsAndGrades.gradeLevels.map((g) => ({ value: g, label: g })),
    },
    {
      name: "sectionId",
      label: "Section",
      value: sectionId,
      options: sectionsAndGrades.sections.map((s) => ({ value: s.id, label: s.label })),
    },
  ];
  const forwardParams = toForwardParams("q", search, filters);

  const filtered = pagination.total !== summary.total;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Caseload Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {summary.total} student{summary.total === 1 ? "" : "s"} enrolled in {sy.label}.{" "}
            {summary.scored === 0
              ? "No risk scores computed yet — ask the admin to run the engine."
              : `${summary.scored} scored · ${summary.high} HIGH · ${summary.moderate} MODERATE.`}
            {filtered && (
              <span className="ml-1 text-amber-700">
                ({pagination.total} match{pagination.total === 1 ? "" : "es"} the current filter)
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Click a student to open the full academic + attendance + behavioral profile. For a global view of the highest-risk students across the whole caseload, open the Pattern Inbox.
          </p>
        </div>
        <ListToolbar
          basePath="/counselor/caseload"
          searchPlaceholder="Search name or LRN…"
          searchValue={search}
          filters={filters}
        />
        {summary.scored > 0 && (
          <PrewarmCaseloadButton schoolYearId={sy.id} page={pagination.page} />
        )}
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Section</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Scored</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{pagination.skip + i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/counselor/students/${r.studentId}`}
                      className="font-medium text-slate-900 hover:text-amber-700"
                    >
                      {r.lastName}, {r.firstName}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono">{r.lrn}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.gradeLevel} · {r.sectionName}</td>
                  <td className="px-3 py-2">
                    <RiskBadge band={r.riskBand} score={r.riskScore} overridden={r.overridden} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {r.computedAt ? new Date(r.computedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={5}>
                    {filtered
                      ? "No students match the current filter. Adjust or clear it above."
                      : "No students on this page."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-3 py-3">
          <PaginationBar
            pagination={pagination}
            basePath="/counselor/caseload"
            forwardParams={forwardParams}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}
