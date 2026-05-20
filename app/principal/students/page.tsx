import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getCaseload, getCaseloadCount } from "@/lib/student/queries";
import { getSectionsAndGradesForYear } from "@/lib/risk/queries";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import { ListToolbar, toForwardParams, type FilterSpec } from "@/components/shell/list-toolbar";

const SPED_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "IEP", label: "IEP" },
  { value: "ACCOMMODATIONS", label: "Accommodations" },
];

function param(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

export default async function PrincipalStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">No active school year.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const requestedPage = parsePageParam(sp.page);
  const search = param(sp, "q");
  const sectionId = param(sp, "sectionId");
  const gradeLevel = param(sp, "gradeLevel");
  const spedStatus = param(sp, "spedStatus");

  const sectionsAndGrades = await getSectionsAndGradesForYear(sy.id);
  const filterArgs = { search, sectionId, gradeLevel, spedStatus };

  const [totalUnfiltered, totalFiltered] = await Promise.all([
    getCaseloadCount(sy.id),
    getCaseloadCount(sy.id, filterArgs),
  ]);
  const pagination = paginate(totalFiltered, requestedPage, PAGE_SIZE);
  const rows = await getCaseload(sy.id, {
    skip: pagination.skip,
    take: pagination.take,
    ...filterArgs,
  });

  const filters: FilterSpec[] = [
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
    { name: "spedStatus", label: "SPED", value: spedStatus, options: SPED_OPTIONS },
  ];
  const forwardParams = toForwardParams("q", search, filters);
  const filtered = totalFiltered !== totalUnfiltered;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Students — {sy.label}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Read-only oversight of all {totalUnfiltered.toLocaleString()} enrolled students.{" "}
            {filtered && (
              <span className="text-amber-700">
                {totalFiltered.toLocaleString()} match the current filter.
              </span>
            )}{" "}
            Click a row to open the full profile.
          </p>
        </div>
        <ListToolbar
          basePath="/principal/students"
          searchPlaceholder="Search name or LRN…"
          searchValue={search}
          filters={filters}
        />
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Section</th>
                <th className="px-3 py-2 font-medium">Sex</th>
                <th className="px-3 py-2 font-medium">Absence</th>
                <th className="px-3 py-2 font-medium">Behavioral</th>
                <th className="px-3 py-2 font-medium">SPED</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{pagination.skip + i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/principal/students/${r.studentId}`}
                      className="font-medium text-slate-900 hover:text-rose-700"
                    >
                      {r.lastName}, {r.firstName}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono">{r.lrn}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.gradeLevel} · {r.sectionName}</td>
                  <td className="px-3 py-2 text-slate-600">{r.sex}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.totalAttendanceDays === 0 ? "—" : `${(r.absenceRate * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.behavioralIncidentCount}</td>
                  <td className="px-3 py-2 text-slate-600">{r.spedStatus === "NONE" ? "—" : r.spedStatus}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={7}>
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
            basePath="/principal/students"
            forwardParams={forwardParams}
          />
        </div>
      </div>
    </div>
  );
}
