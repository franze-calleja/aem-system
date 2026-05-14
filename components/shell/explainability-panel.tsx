// Explainability panel for a single risk assessment.
// Shows the score, band, and factor breakdown in human-readable form.
// Pure UI — accepts pre-fetched data; no I/O.

import type { RiskFactors, RiskBandLabel } from "@/lib/risk/types";

interface ExplainabilityPanelProps {
  score: number;
  band: RiskBandLabel;
  factors: RiskFactors;
  compact?: boolean; // smaller layout for inline use
}

const BAND_STYLES: Record<RiskBandLabel, { label: string; bg: string; text: string; border: string }> = {
  LOW: { label: "Low Risk", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  MODERATE: { label: "Moderate Risk", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  HIGH: { label: "High Risk", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const FACTOR_LABELS: Record<keyof Omit<RiskFactors, "breakdown">, string> = {
  academic: "Academic",
  attendance: "Attendance",
  behavioral: "Behavioral",
  interventionHistory: "Intervention History",
  profile: "Profile",
};

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value >= 70 ? "bg-rose-500" : value >= 40 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ExplainabilityPanel({ score, band, factors, compact = false }: ExplainabilityPanelProps) {
  const style = BAND_STYLES[band];
  const { breakdown } = factors;

  const dimensionKeys: Array<keyof Omit<RiskFactors, "breakdown">> = [
    "academic",
    "attendance",
    "behavioral",
    "interventionHistory",
    "profile",
  ];

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4 space-y-3`}>
      {/* Score header */}
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${style.bg} border ${style.border} ${style.text} font-bold text-lg`}>
          {score.toFixed(0)}
        </div>
        <div>
          <p className={`font-semibold ${style.text}`}>{style.label}</p>
          <p className="text-xs text-slate-500">Score: {score.toFixed(1)} / 100</p>
        </div>
      </div>

      {/* Factor bars */}
      <div className="space-y-2">
        {dimensionKeys.map((key) => {
          const sub = factors[key] as number;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                <span>{FACTOR_LABELS[key]}</span>
                <span className="font-mono">{sub}</span>
              </div>
              <ScoreBar value={sub} />
            </div>
          );
        })}
      </div>

      {!compact && (
        <>
          {/* Academic detail */}
          {breakdown.academic.gwa !== null && (
            <div className="rounded-lg bg-white/60 p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-700">Academic detail</p>
              <p className="text-xs text-slate-600">
                GWA: <span className="font-mono font-semibold">{breakdown.academic.gwa.toFixed(1)}%</span>
                {" · "}Trend slope: <span className={`font-mono font-semibold ${breakdown.academic.trendSlope < 0 ? "text-rose-600" : "text-emerald-600"}`}>{breakdown.academic.trendSlope > 0 ? "+" : ""}{breakdown.academic.trendSlope.toFixed(2)}/qtr</span>
                {breakdown.academic.failingSubjectCount > 0 && (
                  <> · <span className="text-rose-600 font-semibold">{breakdown.academic.failingSubjectCount} subject(s) below 75%</span></>
                )}
              </p>
              <div className="flex gap-1.5 mt-1">
                {breakdown.academic.quarterlyAverages.map((qa) => (
                  <div key={qa.quarter} className="text-center">
                    <div className="text-[10px] text-slate-400">Q{qa.quarter}</div>
                    <div className="text-xs font-mono font-semibold text-slate-700">
                      {qa.avg !== null ? `${qa.avg.toFixed(0)}%` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance detail */}
          {breakdown.attendance.totalDays > 0 && (
            <div className="rounded-lg bg-white/60 p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-700">Attendance detail</p>
              <p className="text-xs text-slate-600">
                Absent: <span className={`font-mono font-semibold ${breakdown.attendance.absenceRate > 0.15 ? "text-rose-600" : "text-slate-700"}`}>{(breakdown.attendance.absenceRate * 100).toFixed(1)}%</span>
                {" · "}Tardy: <span className="font-mono font-semibold">{(breakdown.attendance.tardyRate * 100).toFixed(1)}%</span>
                {breakdown.attendance.consecutiveAbsences >= 3 && (
                  <> · <span className="text-rose-600 font-semibold">max {breakdown.attendance.consecutiveAbsences} consecutive absences</span></>
                )}
              </p>
            </div>
          )}

          {/* Behavioral detail */}
          {breakdown.behavioral.totalIncidents > 0 && (
            <div className="rounded-lg bg-white/60 p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-700">Behavioral detail</p>
              <p className="text-xs text-slate-600">
                {breakdown.behavioral.totalIncidents} incident(s):
                {breakdown.behavioral.highCount > 0 && (
                  <span className="ml-1 rounded bg-rose-100 px-1 text-rose-700 font-semibold">{breakdown.behavioral.highCount} HIGH</span>
                )}
                {breakdown.behavioral.moderateCount > 0 && (
                  <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700 font-semibold">{breakdown.behavioral.moderateCount} MOD</span>
                )}
                {breakdown.behavioral.lowCount > 0 && (
                  <span className="ml-1 rounded bg-slate-100 px-1 text-slate-700 font-semibold">{breakdown.behavioral.lowCount} LOW</span>
                )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline risk badge for tables and lists.
export function RiskBadge({ band, score }: { band: RiskBandLabel | null; score: number | null }) {
  if (band === null || score === null) {
    return <span className="rounded px-2 py-0.5 text-xs bg-slate-100 text-slate-400">Not scored</span>;
  }
  const style = BAND_STYLES[band];
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {band} · {score.toFixed(0)}
    </span>
  );
}
