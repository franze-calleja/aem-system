import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCohortAnalysis, type CohortYearSlice } from "@/lib/risk/queries";
import CohortForm from "./cohort-form";

type SearchParams = {
  grade?: string;
  years?: string;
  format?: string;
};

export default async function PrincipalCohortAnalysisPage({
  searchParams,
}: {
  // Next 16: searchParams is async.
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("PRINCIPAL");

  const params = await searchParams;

  const allYears = await prisma.schoolYear.findMany({
    orderBy: { startDate: "asc" },
    select: { id: true, label: true, startDate: true, isActive: true },
  });

  // Grade levels we know about — pull distinct values from existing sections.
  const sectionGrades = await prisma.section.findMany({
    distinct: ["gradeLevel"],
    select: { gradeLevel: true },
    orderBy: { gradeLevel: "asc" },
  });
  const gradeOptions = sectionGrades.map((s) => s.gradeLevel);

  // Defaults: all years selected; grade = lowest available (alphabetical).
  const selectedGrade = params.grade && gradeOptions.includes(params.grade)
    ? params.grade
    : gradeOptions[0];
  const requestedYearIds = (params.years ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const selectedYearIds = requestedYearIds.length > 0
    ? requestedYearIds.filter((id) => allYears.some((y) => y.id === id))
    : allYears.map((y) => y.id);

  const slices = selectedGrade && selectedYearIds.length > 0
    ? await getCohortAnalysis(selectedYearIds, selectedGrade)
    : [];

  // CSV export — return early with text/csv response.
  if (params.format === "csv" && slices.length > 0) {
    const csv = toCsv(slices, selectedGrade ?? "");
    // Next 16 server components can't return a Response directly from the
    // page render — emit a downloadable link instead.
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">CSV ready</h1>
        <p className="mt-2 text-sm text-slate-600">
          Right-click and &ldquo;Save as&rdquo; on the link below, or paste this into a spreadsheet:
        </p>
        <a
          className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download={`cohort-${(selectedGrade ?? "grade").replace(/\s+/g, "-").toLowerCase()}.csv`}
        >
          Download CSV
        </a>
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">{csv}</pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Cohort analysis</h1>
        <p className="mt-1 text-sm text-slate-600">
          Compare a grade level across school years. Risk band distribution, intervention pipeline, and completed-intervention outcomes side by side. Year-over-year drift shows the change in HIGH-band rate vs. the prior year column.
        </p>
      </header>

      <CohortForm
        gradeOptions={gradeOptions}
        allYears={allYears}
        selectedGrade={selectedGrade}
        selectedYearIds={selectedYearIds}
        hasSlices={slices.length > 0}
        csvHref={`/principal/cohort-analysis?${buildQuery(selectedGrade ?? "", selectedYearIds, "csv")}`}
      />

      {slices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {gradeOptions.length === 0
            ? "No sections found in any school year. Run the demo seed first."
            : "Pick a grade level and one or more school years."}
        </div>
      ) : (
        <ResultsTable slices={slices} gradeLevel={selectedGrade ?? ""} />
      )}
    </div>
  );
}

function buildQuery(grade: string, yearIds: string[], format?: string) {
  const params = new URLSearchParams();
  if (grade) params.set("grade", grade);
  if (yearIds.length > 0) params.set("years", yearIds.join(","));
  if (format) params.set("format", format);
  return params.toString();
}

function ResultsTable({ slices, gradeLevel }: { slices: CohortYearSlice[]; gradeLevel: string }) {
  const highRate = (s: CohortYearSlice) => (s.total === 0 ? 0 : s.high / s.total);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{gradeLevel}</h2>
        <p className="mt-1 text-xs text-slate-500">{slices.length} school year{slices.length === 1 ? "" : "s"} compared</p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-slate-500">Metric</th>
              {slices.map((s) => (
                <th key={s.schoolYearId} className="px-4 py-2 text-left font-semibold uppercase tracking-wider text-[10px] text-slate-500">{s.schoolYearLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            <Row label="Enrollments" values={slices.map((s) => fmt(s.total))} />
            <Row label="LOW" values={slices.map((s) => `${s.low}  (${pct(s.low, s.total)})`)} />
            <Row label="MODERATE" values={slices.map((s) => `${s.moderate}  (${pct(s.moderate, s.total)})`)} />
            <Row
              label="HIGH"
              values={slices.map((s) => `${s.high}  (${pct(s.high, s.total)})`)}
              cellClassName="text-rose-700"
            />
            <Row label="Unscored" values={slices.map((s) => fmt(s.unscored))} />
            <tr>
              <td className="px-4 py-2 font-medium text-slate-700">YoY HIGH-rate drift</td>
              {slices.map((s, i) => {
                if (i === 0) return <td key={s.schoolYearId} className="px-4 py-2 text-slate-400">—</td>;
                const prev = slices[i - 1];
                const delta = highRate(s) - highRate(prev);
                const sign = delta > 0 ? "+" : "";
                const tone =
                  Math.abs(delta) < 0.005
                    ? "text-slate-500"
                    : delta > 0
                      ? "text-rose-700"
                      : "text-emerald-700";
                return (
                  <td key={s.schoolYearId} className={`px-4 py-2 font-mono text-xs ${tone}`}>
                    {sign}{(delta * 100).toFixed(1)}pp
                  </td>
                );
              })}
            </tr>

            <SectionHeader label="Intervention pipeline" cols={slices.length} />
            <Row label="Active" values={slices.map((s) => fmt(s.interventions.active))} />
            <Row label="Pending approval" values={slices.map((s) => fmt(s.interventions.pendingApproval))} />
            <Row label="Completed" values={slices.map((s) => fmt(s.interventions.completed))} />
            <Row label="Cancelled" values={slices.map((s) => fmt(s.interventions.cancelled))} />
            <Row label="Total touching grade" values={slices.map((s) => fmt(s.interventions.total))} />

            <SectionHeader label="Completed-intervention outcomes" cols={slices.length} />
            <Row label="Improving" values={slices.map((s) => fmt(s.outcomes.improving))} cellClassName="text-emerald-700" />
            <Row label="Stable" values={slices.map((s) => fmt(s.outcomes.stable))} />
            <Row label="Completed (closed without trend)" values={slices.map((s) => fmt(s.outcomes.completed))} />
            <Row label="Declining" values={slices.map((s) => fmt(s.outcomes.declining))} cellClassName="text-rose-700" />
            <Row label="Outcome not recorded" values={slices.map((s) => fmt(s.outcomes.unset))} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({
  label,
  values,
  cellClassName,
}: {
  label: string;
  values: string[];
  cellClassName?: string;
}) {
  return (
    <tr>
      <td className="px-4 py-2 font-medium text-slate-700">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`px-4 py-2 font-mono text-xs ${cellClassName ?? "text-slate-700"}`}>{v}</td>
      ))}
    </tr>
  );
}

function SectionHeader({ label, cols }: { label: string; cols: number }) {
  return (
    <tr className="bg-slate-50">
      <td
        colSpan={cols + 1}
        className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500"
      >
        {label}
      </td>
    </tr>
  );
}

function fmt(n: number) {
  return n.toLocaleString();
}

function pct(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function toCsv(slices: CohortYearSlice[], gradeLevel: string): string {
  const header = ["Metric", ...slices.map((s) => s.schoolYearLabel)];
  const rows: (string | number)[][] = [
    ["Grade level", ...slices.map(() => gradeLevel)],
    ["Enrollments", ...slices.map((s) => s.total)],
    ["LOW", ...slices.map((s) => s.low)],
    ["MODERATE", ...slices.map((s) => s.moderate)],
    ["HIGH", ...slices.map((s) => s.high)],
    ["Unscored", ...slices.map((s) => s.unscored)],
    ["HIGH rate", ...slices.map((s) => (s.total === 0 ? 0 : (s.high / s.total).toFixed(4)))],
    [
      "YoY HIGH-rate drift (pp)",
      ...slices.map((s, i) => {
        if (i === 0) return "";
        const prev = slices[i - 1];
        const rate = s.total === 0 ? 0 : s.high / s.total;
        const prevRate = prev.total === 0 ? 0 : prev.high / prev.total;
        return ((rate - prevRate) * 100).toFixed(2);
      }),
    ],
    ["Interventions / active", ...slices.map((s) => s.interventions.active)],
    ["Interventions / pending", ...slices.map((s) => s.interventions.pendingApproval)],
    ["Interventions / completed", ...slices.map((s) => s.interventions.completed)],
    ["Interventions / cancelled", ...slices.map((s) => s.interventions.cancelled)],
    ["Interventions / total", ...slices.map((s) => s.interventions.total)],
    ["Outcomes / improving", ...slices.map((s) => s.outcomes.improving)],
    ["Outcomes / stable", ...slices.map((s) => s.outcomes.stable)],
    ["Outcomes / completed", ...slices.map((s) => s.outcomes.completed)],
    ["Outcomes / declining", ...slices.map((s) => s.outcomes.declining)],
    ["Outcomes / unset", ...slices.map((s) => s.outcomes.unset)],
  ];
  const escape = (cell: string | number) => {
    const s = String(cell);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
