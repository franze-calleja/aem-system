"use client";

import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { cohortData } from "@/lib/mock-data";
import { principalNav } from "./principal-nav";

export default function PrincipalCohort() {
  const years = [...new Set(cohortData.map((d) => d.schoolYear))].sort().reverse();
  const gradeGroups = [...new Set(cohortData.map((d) => d.gradeGroup))];

  return (
    <PageShell badge="P" title="Dr. Pedro Villareal" schoolYear="SY 2024-2025" theme="amber" navItems={principalNav}>
      <PageHeader
        backHref="/principal"
        backLabel="Principal workspace"
        title="Cohort Analysis"
        description="Year-over-year comparison of risk prevalence and intervention outcomes across student cohorts. Used to evaluate systemic effectiveness."
      />

      {gradeGroups.map((group) => {
        const groupData = cohortData.filter((d) => d.gradeGroup === group).sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));
        return (
          <section key={group} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">{group}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">School year</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Students</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">High risk</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Moderate</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Low</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Interventions</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Resolved</th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avg score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupData.map((row, idx) => {
                    const prev = groupData[idx + 1];
                    const delta = prev ? row.highRiskCount - prev.highRiskCount : null;
                    return (
                      <tr key={row.schoolYear} className={idx === 0 ? "bg-amber-50" : ""}>
                        <td className="py-3 font-medium text-slate-900">
                          {row.schoolYear}
                          {idx === 0 && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600">Current</span>}
                        </td>
                        <td className="py-3 text-center text-slate-700">{row.totalStudents}</td>
                        <td className="py-3 text-center">
                          <span className="font-semibold text-red-700">{row.highRiskCount}</span>
                          {delta !== null && (
                            <span className={`ml-1 text-xs ${delta > 0 ? "text-red-600" : delta < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center text-amber-700 font-medium">{row.moderateRiskCount}</td>
                        <td className="py-3 text-center text-emerald-700 font-medium">{row.lowRiskCount}</td>
                        <td className="py-3 text-center text-slate-700">{row.interventionCount}</td>
                        <td className="py-3 text-center text-slate-700">{row.resolvedInterventions}</td>
                        <td className="py-3 text-center">
                          <span className={`font-semibold ${row.avgRiskScore >= 60 ? "text-red-600" : row.avgRiskScore >= 40 ? "text-amber-600" : "text-emerald-600"}`}>
                            {row.avgRiskScore.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visual bars */}
            <div className="mt-5 space-y-3">
              {groupData.map((row) => {
                const hi = (row.highRiskCount / row.totalStudents) * 100;
                const mo = (row.moderateRiskCount / row.totalStudents) * 100;
                const lo = (row.lowRiskCount / row.totalStudents) * 100;
                return (
                  <div key={row.schoolYear} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-slate-500">{row.schoolYear}</span>
                    <div className="flex flex-1 h-4 rounded-full overflow-hidden">
                      {hi > 0 && <div className="bg-red-500" style={{ width: `${hi}%` }} title={`High: ${row.highRiskCount}`} />}
                      {mo > 0 && <div className="bg-amber-400" style={{ width: `${mo}%` }} title={`Moderate: ${row.moderateRiskCount}`} />}
                      {lo > 0 && <div className="bg-emerald-400" style={{ width: `${lo}%` }} title={`Low: ${row.lowRiskCount}`} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          Cohort data is aggregated at the grade-group level. Individual student data is not accessible from this view. &quot;Resolved&quot; refers to interventions that were marked completed within the school year.
        </p>
      </div>
    </PageShell>
  );
}
