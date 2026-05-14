import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getCaseload } from "@/lib/student/queries";

export default async function PrincipalStudentsPage() {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">No active school year.</p>
      </div>
    );
  }

  const rows = await getCaseload(sy.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Students — {sy.label}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Read-only oversight view of all {rows.length} enrolled students. Click a row to open the full profile.
          Bias monitoring and school-wide pattern analytics arrive in later phases.
        </p>
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
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
