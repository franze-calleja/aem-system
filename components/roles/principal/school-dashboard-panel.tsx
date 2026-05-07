"use client";

import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  enrollments,
  riskAssessments,
  riskBandColor,
  riskBandLabel,
  sections,
  students,
} from "@/lib/mock-data";
import { principalNav } from "./principal-nav";

type BandKey = "high" | "moderate" | "low";

export default function PrincipalSchoolDashboard() {
  // Risk distribution by grade
  const grades = [...new Set(sections.map((s) => s.gradeLevel))].sort();

  const byGrade = grades.map((grade) => {
    const gradeSections = sections.filter((s) => s.gradeLevel === grade);
    const sectionIds = gradeSections.map((s) => s.id);
    const gradeEnrollments = enrollments.filter(
      (e) => sectionIds.includes(e.sectionId) && e.schoolYearId === "sy-2024-2025",
    );
    const studentIds = gradeEnrollments.map((e) => e.studentId);
    const risks = riskAssessments.filter((r) => studentIds.includes(r.studentId));

    return {
      grade,
      total: studentIds.length,
      high: risks.filter((r) => r.band === "high").length,
      moderate: risks.filter((r) => r.band === "moderate").length,
      low: risks.filter((r) => r.band === "low").length,
    };
  });

  // Distribution by sex
  const bySex = ["M", "F"].map((sex) => {
    const sexStudents = students.filter((s) => s.sex === sex);
    const ids = sexStudents.map((s) => s.id);
    const risks = riskAssessments.filter((r) => ids.includes(r.studentId));
    return {
      sex: sex === "M" ? "Male" : "Female",
      total: ids.length,
      high: risks.filter((r) => r.band === "high").length,
      moderate: risks.filter((r) => r.band === "moderate").length,
      low: risks.filter((r) => r.band === "low").length,
    };
  });

  // Distribution by modality
  const modalities = [...new Set(students.map((s) => s.modality))];
  const byModality = modalities.map((modality) => {
    const mod = students.filter((s) => s.modality === modality);
    const ids = mod.map((s) => s.id);
    const risks = riskAssessments.filter((r) => ids.includes(r.studentId));
    return {
      modality,
      total: ids.length,
      high: risks.filter((r) => r.band === "high").length,
      moderate: risks.filter((r) => r.band === "moderate").length,
      low: risks.filter((r) => r.band === "low").length,
    };
  });

  const totalHigh = riskAssessments.filter((r) => r.band === "high").length;
  const totalModerate = riskAssessments.filter((r) => r.band === "moderate").length;
  const totalLow = riskAssessments.filter((r) => r.band === "low").length;
  const total = riskAssessments.length;

  function bandBar(high: number, moderate: number, low: number, totalCount: number) {
    if (totalCount === 0) return null;
    const pHigh = (high / totalCount) * 100;
    const pMod = (moderate / totalCount) * 100;
    const pLow = (low / totalCount) * 100;
    return (
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        {pHigh > 0 && <div className="bg-red-500" style={{ width: `${pHigh}%` }} title={`High: ${high}`} />}
        {pMod > 0 && <div className="bg-amber-400" style={{ width: `${pMod}%` }} title={`Moderate: ${moderate}`} />}
        {pLow > 0 && <div className="bg-emerald-500" style={{ width: `${pLow}%` }} title={`Low: ${low}`} />}
      </div>
    );
  }

  return (
    <PageShell badge="P" title="Dr. Pedro Villareal" schoolYear="SY 2024-2025" theme="amber" navItems={principalNav}>
      <PageHeader
        backHref="/principal"
        backLabel="Principal workspace"
        title="School Dashboard"
        description="Risk distribution across grade levels, sections, sex, and learning modalities. Drill into specific dimensions to identify patterns."
      />

      {/* Overall distribution */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total students</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{total}</p>
        </div>
        {(["high", "moderate", "low"] as BandKey[]).map((band) => {
          const count = band === "high" ? totalHigh : band === "moderate" ? totalModerate : totalLow;
          return (
            <div key={band} className={`rounded-2xl border p-4 ${band === "high" ? "border-red-200 bg-red-50" : band === "moderate" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${band === "high" ? "text-red-600" : band === "moderate" ? "text-amber-600" : "text-emerald-600"}`}>{riskBandLabel(band)}</p>
              <p className={`mt-2 text-2xl font-semibold ${band === "high" ? "text-red-800" : band === "moderate" ? "text-amber-800" : "text-emerald-800"}`}>{count}</p>
              <p className="mt-0.5 text-xs text-slate-500">{Math.round((count / total) * 100)}% of students</p>
            </div>
          );
        })}
      </div>

      {/* Overall bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">School-wide risk distribution</p>
        {bandBar(totalHigh, totalModerate, totalLow, total)}
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> High ({totalHigh})</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Moderate ({totalModerate})</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Low ({totalLow})</span>
        </div>
      </div>

      {/* By grade */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-4">By grade level</p>
        <div className="space-y-4">
          {byGrade.map((row) => (
            <div key={row.grade}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700">Grade {row.grade}</span>
                <span className="text-xs text-slate-500">{row.high + row.moderate + row.low} / {row.total} assessed · {row.high} high</span>
              </div>
              {bandBar(row.high, row.moderate, row.low, row.high + row.moderate + row.low)}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* By sex */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-4">By sex</p>
          <div className="space-y-4">
            {bySex.map((row) => (
              <div key={row.sex}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{row.sex}</span>
                  <span className="text-xs text-slate-500">{row.total} students · {row.high} high</span>
                </div>
                {bandBar(row.high, row.moderate, row.low, row.total)}
              </div>
            ))}
          </div>
        </section>

        {/* By modality */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-4">By learning modality</p>
          <div className="space-y-4">
            {byModality.map((row) => (
              <div key={row.modality}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{row.modality}</span>
                  <span className="text-xs text-slate-500">{row.total} students · {row.high} high</span>
                </div>
                {bandBar(row.high, row.moderate, row.low, row.total)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
