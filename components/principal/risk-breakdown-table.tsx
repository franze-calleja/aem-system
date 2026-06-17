import type { BreakdownGroup } from "@/lib/risk/queries";

type Props = {
  title: string;
  description?: string;
  rows: BreakdownGroup[];
  /** When set, flags rows whose HIGH rate exceeds this value (0..1). */
  highRateAlert?: number;
};

export default function RiskBreakdownTable({ title, description, rows, highRateAlert }: Props) {
  const totalAll = rows.reduce((acc, r) => acc + r.total, 0);
  const totalHigh = rows.reduce((acc, r) => acc + r.high, 0);
  const overallHighRate = totalAll === 0 ? 0 : totalHigh / totalAll;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        <p className="text-xs text-slate-500">
          {totalAll} students · {(overallHighRate * 100).toFixed(1)}% HIGH overall
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
          No data.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
                <th className="px-3 py-2 font-medium text-right">HIGH</th>
                <th className="px-3 py-2 font-medium text-right">MODERATE</th>
                <th className="px-3 py-2 font-medium text-right">LOW</th>
                <th className="px-3 py-2 font-medium text-right">Unscored</th>
                <th className="px-3 py-2 font-medium">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const highRate = r.total === 0 ? 0 : r.high / r.total;
                const isDisparityFlag =
                  highRateAlert !== undefined &&
                  r.total > 0 &&
                  highRate > 0 &&
                  highRate > overallHighRate * (1 + highRateAlert);
                return (
                  <tr key={r.key} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{r.label}</span>
                        {isDisparityFlag && (
                          <span
                            title="HIGH rate exceeds school average by the configured margin."
                            className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700"
                          >
                            Flag
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {(highRate * 100).toFixed(1)}% HIGH
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.total}</td>
                    <td className="px-3 py-2 text-right text-rose-700">{r.high}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{r.moderate}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{r.low}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{r.unscored}</td>
                    <td className="px-3 py-2 w-48">
                      <DistributionBar group={r} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DistributionBar({ group }: { group: BreakdownGroup }) {
  const total = group.total;
  if (total === 0) return <span className="text-xs text-slate-300">—</span>;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <span className="bg-rose-500" style={{ width: `${pct(group.high)}%` }} title={`HIGH ${group.high}`} />
      <span className="bg-amber-400" style={{ width: `${pct(group.moderate)}%` }} title={`MODERATE ${group.moderate}`} />
      <span className="bg-emerald-500" style={{ width: `${pct(group.low)}%` }} title={`LOW ${group.low}`} />
      <span className="bg-slate-300" style={{ width: `${pct(group.unscored)}%` }} title={`Unscored ${group.unscored}`} />
    </div>
  );
}
