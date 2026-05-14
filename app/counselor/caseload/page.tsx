import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getCaseload } from "@/lib/student/queries";

export default async function CaseloadPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <EmptyState>No active school year. Ask the admin to activate one.</EmptyState>
    );
  }

  const rows = await getCaseload(sy.id);

  // Phase-4 risk band is unavailable; surface attendance/behavioral signal so the
  // counselor can prioritize manually until the engine ships.
  const sorted = [...rows].sort((a, b) => {
    const scoreA = a.absenceRate * 60 + a.tardyRate * 20 + Math.min(a.behavioralIncidentCount, 5) * 8;
    const scoreB = b.absenceRate * 60 + b.tardyRate * 20 + Math.min(b.behavioralIncidentCount, 5) * 8;
    return scoreB - scoreA;
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Caseload Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          {rows.length} student{rows.length === 1 ? "" : "s"} enrolled in {sy.label}. Sorted by manual attendance/behavioral signal until the Phase 4 risk engine ships.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Click a student to open the full academic + attendance + behavioral profile.
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
                <th className="px-3 py-2 font-medium">Absence</th>
                <th className="px-3 py-2 font-medium">Tardy</th>
                <th className="px-3 py-2 font-medium">Behavioral</th>
                <th className="px-3 py-2 font-medium">SPED</th>
                <th className="px-3 py-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const absencePct = r.totalAttendanceDays === 0 ? null : r.absenceRate * 100;
                const tardyPct = r.totalAttendanceDays === 0 ? null : r.tardyRate * 100;
                return (
                  <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/counselor/students/${r.studentId}`}
                        className="font-medium text-slate-900 hover:text-amber-700"
                      >
                        {r.lastName}, {r.firstName}{r.middleName ? ` ${r.middleName}` : ""}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">{r.lrn}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.gradeLevel} · {r.sectionName}</td>
                    <td className={`px-3 py-2 ${absencePct !== null && absencePct > 15 ? "font-semibold text-rose-700" : "text-slate-700"}`}>
                      {absencePct === null ? "—" : `${absencePct.toFixed(1)}%`}
                      <span className="ml-1 text-[10px] text-slate-400">({r.totalAttendanceDays}d)</span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {tardyPct === null ? "—" : `${tardyPct.toFixed(1)}%`}
                    </td>
                    <td className={`px-3 py-2 ${r.behavioralIncidentCount > 2 ? "font-semibold text-amber-700" : "text-slate-700"}`}>
                      {r.behavioralIncidentCount}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.spedStatus === "NONE" ? "—" : r.spedStatus}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">Phase 4</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Phase 4 will add: 0–100 risk score, Low/Moderate/High band, pattern matches, and recommendation drafts surfaced here.
      </p>
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
