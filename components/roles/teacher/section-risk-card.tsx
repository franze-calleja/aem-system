import Link from "next/link";
import type { TeacherStudentRisk } from "@/lib/risk/queries";

export default function SectionRiskCard({
  rows,
  sectionLabel,
}: {
  rows: TeacherStudentRisk[];
  sectionLabel: string;
}) {
  const total = rows.length;
  let high = 0,
    moderate = 0,
    low = 0,
    unscored = 0;
  for (const r of rows) {
    if (r.riskBand === "HIGH") high++;
    else if (r.riskBand === "MODERATE") moderate++;
    else if (r.riskBand === "LOW") low++;
    else unscored++;
  }
  const topAtRisk = rows
    .filter((r) => r.riskScore !== null)
    .sort((a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1))
    .slice(0, 3);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Risk distribution
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {sectionLabel} · {total} students · {high + moderate} at-risk
          </p>
        </div>
        <Link
          href="/teacher/student-risk"
          className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
        >
          Full student risk
        </Link>
      </header>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <Stat label="HIGH" value={high} tone="rose" />
        <Stat label="MODERATE" value={moderate} tone="amber" />
        <Stat label="LOW" value={low} tone="emerald" />
        <Stat label="Unscored" value={unscored} tone="slate" />
      </div>

      {total > 0 && (
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <span className="bg-rose-500" style={{ width: `${(high / total) * 100}%` }} />
          <span className="bg-amber-400" style={{ width: `${(moderate / total) * 100}%` }} />
          <span className="bg-emerald-500" style={{ width: `${(low / total) * 100}%` }} />
          <span className="bg-slate-300" style={{ width: `${(unscored / total) * 100}%` }} />
        </div>
      )}

      {topAtRisk.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Highest risk in this class
          </p>
          <ul className="mt-2 divide-y divide-slate-100">
            {topAtRisk.map((r) => (
              <li
                key={r.enrollmentId}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-slate-700">
                  {r.lastName}, {r.firstName}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {r.riskBand} · {r.riskScore?.toFixed(0) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "emerald" | "slate";
}) {
  const styles: Record<typeof tone, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <article className={`rounded-xl border p-2 text-center ${styles[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </article>
  );
}
