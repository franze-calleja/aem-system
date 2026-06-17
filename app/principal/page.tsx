import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getSchoolRiskDistribution, getOpenRecommendations } from "@/lib/risk/queries";
import {
  PRINCIPAL_NAV,
} from "@/components/roles/principal/principal-config";
import Link from "next/link";

export default async function PrincipalPage() {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();

  let distribution: { low: number; moderate: number; high: number; unscored: number; total: number } | null = null;
  let openRecommendations = 0;

  if (sy) {
    distribution = await getSchoolRiskDistribution(sy.id);
    const recs = await getOpenRecommendations(sy.id);
    openRecommendations = recs.length;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Risk distribution summary */}
      {distribution && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">School-wide Risk Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">{sy?.label} · {distribution.total} enrolled students</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RiskStat label="HIGH" count={distribution.high} total={distribution.total} color="rose" />
            <RiskStat label="MODERATE" count={distribution.moderate} total={distribution.total} color="amber" />
            <RiskStat label="LOW" count={distribution.low} total={distribution.total} color="emerald" />
            <RiskStat label="Not scored" count={distribution.unscored} total={distribution.total} color="slate" />
          </div>
          {openRecommendations > 0 && (
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-semibold text-amber-700">{openRecommendations}</span> open recommendation draft{openRecommendations !== 1 ? "s" : ""} waiting for review.
            </p>
          )}
          {distribution.unscored === distribution.total && (
            <p className="mt-4 text-xs text-slate-400">
              No risk scores computed yet. Ask the admin to run the risk engine.
            </p>
          )}
        </div>
      )}

      {/* Standard nav overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PRINCIPAL_NAV.filter((s) => s.href).map((section) => (
          <Link
            key={section.href}
            href={section.href!}
            className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-rose-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-slate-900">{section.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{section.description}</p>
          </Link>
        ))}
        {PRINCIPAL_NAV.filter((s) => !s.href).map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 opacity-60"
          >
            <h3 className="font-semibold text-slate-700">{section.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{section.description}</p>
            <p className="mt-2 text-xs text-slate-400">Coming in a future phase.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskStat({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: "rose" | "amber" | "emerald" | "slate";
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  const styles = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${styles[color]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{count}</p>
      <p className="text-xs">{pct}% of enrolled</p>
    </div>
  );
}
