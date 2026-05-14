import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getTeacherClasses } from "@/lib/teacher/queries";
import { getSectionRiskForTeacher } from "@/lib/risk/queries";
import { RiskBadge } from "@/components/shell/explainability-panel";
import Link from "next/link";

export default async function TeacherStudentRiskPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();

  if (!sy) {
    return <EmptyState>No active school year. Ask the admin to activate one.</EmptyState>;
  }

  const classes = await getTeacherClasses(session.user.id, sy.id);
  if (classes.length === 0) {
    return <EmptyState>You have no assigned classes for {sy.label}.</EmptyState>;
  }

  // Deduplicate sections.
  const seen = new Set<string>();
  const uniqueSections = classes.filter((c) => {
    if (seen.has(c.sectionId)) return false;
    seen.add(c.sectionId);
    return true;
  });

  // Fetch risk data for each unique section.
  const sectionRisks = await Promise.all(
    uniqueSections.map((c) =>
      getSectionRiskForTeacher(session.user.id, c.sectionId, sy.id).then((rows) => ({
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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Student Risk</h1>
        <p className="mt-1 text-sm text-slate-600">
          Risk scores and factor breakdowns for students in your sections.{" "}
          {scoredStudents === 0
            ? "No scores computed yet — run computation from the admin panel."
            : `${scoredStudents} of ${totalStudents} students scored for ${sy.label}.`}
        </p>
      </header>

      {sectionRisks.map(({ sectionName, gradeLevel, rows }) => (
        <section key={sectionName}>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            {gradeLevel} · {sectionName}
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

