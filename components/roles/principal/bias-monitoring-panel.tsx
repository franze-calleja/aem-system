"use client";

import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { biasMetrics } from "@/lib/mock-data";
import { principalNav } from "./principal-nav";

function disparityColor(disparity: boolean) {
  return disparity ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50";
}

export default function PrincipalBiasMonitoring() {
  const flagged = biasMetrics.filter((b) => b.disparity).length;

  return (
    <PageShell badge="P" title="Dr. Pedro Villareal" schoolYear="SY 2024-2025" theme="amber" navItems={principalNav}>
      <PageHeader
        backHref="/principal"
        backLabel="Principal workspace"
        title="Bias Monitoring"
        description="Monitors whether the risk model produces systematically different outputs across demographic groups. Flags dimensions where disparity exceeds the configured threshold."
      />

      {flagged > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">⚑ {flagged} disparity flag{flagged !== 1 ? "s" : ""} detected</p>
          <p className="mt-1 text-xs text-red-700">
            Review the flagged dimensions below. If disparities are systematic, notify the algorithm governance body and consider recalibration.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {biasMetrics.map((metric) => (
          <article key={metric.dimension} className={`rounded-2xl border p-5 ${disparityColor(metric.disparity)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {metric.disparity && (
                    <span className="inline-flex rounded-full bg-red-600 text-white px-2.5 py-0.5 text-xs font-semibold">Disparity detected</span>
                  )}
                  {!metric.disparity && (
                    <span className="inline-flex rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-xs font-semibold">Within threshold</span>
                  )}
                </div>
                <h2 className="mt-2 text-sm font-semibold text-slate-900">{metric.dimension}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-slate-900">{metric.disparityIndex.toFixed(2)}</p>
                <p className="text-xs text-slate-500">Disparity index</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {metric.groups.map((group) => (
                <div key={group.name} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-700">{group.name}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Students</p>
                      <p className="text-sm font-semibold text-slate-900">{group.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Avg score</p>
                      <p className="text-sm font-semibold text-slate-900">{group.avgScore.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">High-risk %</p>
                      <p className={`text-sm font-semibold ${group.highRiskRate > 0.3 ? "text-red-600" : "text-slate-900"}`}>{(group.highRiskRate * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${group.highRiskRate > 0.3 ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${group.highRiskRate * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-600">{metric.note}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-700">Threshold:</strong> Disparity index &gt; 0.15 triggers a flag. The disparity index measures the ratio of average risk scores between the highest- and lowest-scoring groups in a dimension, normalized to a 0–1 scale. This does not indicate the algorithm is wrong, but warrants investigation. The principal must log any calibration decisions in the governance review.
        </p>
      </div>
    </PageShell>
  );
}
