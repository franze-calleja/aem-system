import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getTeacherClasses } from "@/lib/teacher/queries";
import { getSectionRiskForTeacher } from "@/lib/risk/queries";
import { RiskBadge } from "@/components/shell/explainability-panel";
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

export default async function TeacherStudentRiskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();

  if (!sy) {
    return <EmptyState>No active school year. Ask the admin to activate one.</EmptyState>;
  }

  const sp = await searchParams;
  const search = param(sp, "q");
  const band = param(sp, "band");
  const sectionFilter = param(sp, "sectionId");

  const classes = await getTeacherClasses(session.user.id, sy.id);
  if (classes.length === 0) {
    return <EmptyState>You have no assigned classes for {sy.label}.</EmptyState>;
  }

  const seen = new Set<string>();
  const uniqueSections = classes.filter((c) => {
    if (seen.has(c.sectionId)) return false;
    seen.add(c.sectionId);
    return true;
  });

  // Fetch risk data per assigned section (no DB-level filter — small N per
  // teacher, in-app filter is fine and lets one query power multiple toggles).
  const sectionRisks = await Promise.all(
    uniqueSections.map((c) =>
      getSectionRiskForTeacher(session.user.id, c.sectionId, sy.id).then((rows) => ({
        sectionId: c.sectionId,
        sectionName: c.sectionName,
        gradeLevel: c.gradeLevel,
        rows,
      }))
    )
  );

  const totalStudents = sectionRisks.reduce((acc, s) => acc + s.rows.length, 0);
  const scoredStudents = sectionRisks.reduce(
    (acc, s) => acc + s.rows.filter((r) => r.riskBand !== null).length,
    0,
  );

  // Apply search/filter to each section's rows.
  const searchLc = search?.toLowerCase() ?? "";
  const filteredSections = sectionRisks
    .filter((s) => !sectionFilter || s.sectionId === sectionFilter)
    .map((s) => ({
      ...s,
      rows: s.rows.filter((r) => {
        if (searchLc) {
          const matchName = `${r.firstName} ${r.lastName}`.toLowerCase().includes(searchLc);
          const matchLrn = r.lrn.includes(searchLc);
          if (!matchName && !matchLrn) return false;
        }
        if (band) {
          if (band === "UNSCORED") return r.riskBand === null;
          if (r.riskBand !== band) return false;
        }
        return true;
      }),
    }));

  const totalMatching = filteredSections.reduce((acc, s) => acc + s.rows.length, 0);
  const filtered = !!(search || band || sectionFilter);

  const filters: FilterSpec[] = [
    { name: "band", label: "Risk band", value: band, options: BAND_OPTIONS },
    {
      name: "sectionId",
      label: "Section",
      value: sectionFilter,
      options: uniqueSections.map((s) => ({
        value: s.sectionId,
        label: `${s.gradeLevel} · ${s.sectionName}`,
      })),
    },
  ];
  // (forwardParams unused here — page has no pagination — but kept for
  // consistency with the other paginated list pages.)
  void toForwardParams("q", search, filters);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Student Risk</h1>
          <p className="mt-1 text-sm text-slate-600">
            Risk scores and factor breakdowns for students in your sections.{" "}
            {scoredStudents === 0
              ? "No scores computed yet — ask the admin to run the engine."
              : `${scoredStudents} of ${totalStudents} students scored for ${sy.label}.`}
            {filtered && (
              <span className="ml-1 text-amber-700">
                {totalMatching} match{totalMatching === 1 ? "" : "es"} the current filter.
              </span>
            )}
          </p>
        </div>
        <ListToolbar
          basePath="/teacher/student-risk"
          searchPlaceholder="Search name or LRN…"
          searchValue={search}
          filters={filters}
        />
      </header>

      {filteredSections.map(({ sectionName, gradeLevel, rows }) => (
        <section key={`${gradeLevel}-${sectionName}`}>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {gradeLevel} · {sectionName} <span className="text-slate-400">({rows.length})</span>
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">LRN</th>
                    <th className="px-3 py-2 font-medium">Risk Band</th>
                    <th className="px-3 py-2 font-medium">Academic</th>
                    <th className="px-3 py-2 font-medium">Attendance</th>
                    <th className="px-3 py-2 font-medium">Behavioral</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .sort((a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1))
                    .map((r, i) => (
                      <tr key={r.enrollmentId} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {r.lastName}, {r.firstName}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.lrn}</td>
                        <td className="px-3 py-2">
                          <RiskBadge band={r.riskBand} score={r.riskScore} />
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {r.factors ? `${r.factors.academic}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {r.factors ? `${r.factors.attendance}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {r.factors ? `${r.factors.behavioral}` : "—"}
                        </td>
                      </tr>
                    ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-500">
                        No students in this section match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">
        Risk scores are recomputed by the admin. Factor columns show the 0–100 sub-score for each
        dimension. Full explainability is available in the Counselor/Principal student profile view.
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
      <p className="text-sm text-slate-600">{children}</p>
    </div>
  );
}
