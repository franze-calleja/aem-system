import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getCaseloadWithRisk } from "@/lib/risk/queries";
import { RiskBadge } from "@/components/shell/explainability-panel";

export default async function CaseloadPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <EmptyState>No active school year. Ask the admin to activate one.</EmptyState>
    );
  }

  const rows = await getCaseloadWithRisk(sy.id);

  // Sort by risk score descending (unscored last).
  const sorted = [...rows].sort((a, b) => {
    if (a.riskScore === null && b.riskScore === null) return 0;
    if (a.riskScore === null) return 1;
    if (b.riskScore === null) return -1;
    return b.riskScore - a.riskScore;
  });

  const scored = rows.filter((r) => r.riskScore !== null).length;
  const highCount = rows.filter((r) => r.riskBand === "HIGH").length;
  const moderateCount = rows.filter((r) => r.riskBand === "MODERATE").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Caseload Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          {rows.length} student{rows.length === 1 ? "" : "s"} enrolled in {sy.label}.{" "}
          {scored === 0
            ? "No risk scores computed yet — ask the admin to run the engine."
            : `${scored} scored · ${highCount} HIGH · ${moderateCount} MODERATE.`}
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
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Scored</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.studentId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
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
                    <RiskBadge band={r.riskBand} score={r.riskScore} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {r.computedAt ? new Date(r.computedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
