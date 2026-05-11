"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTeacherClasses } from "@/components/roles/teacher/teacher-class-store";
import { buildTeacherRiskSummaries, studentRiskHref } from "@/components/roles/teacher/student-risk-data";

function bandClasses(band: "Low" | "Moderate" | "High") {
  if (band === "High") {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }

  if (band === "Moderate") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

export default function TeacherStudentRiskOverview() {
  const { classes } = useTeacherClasses();

  const riskSummaries = useMemo(() => buildTeacherRiskSummaries(classes), [classes]);

  const highRiskCount = riskSummaries.filter((summary) => summary.band === "High").length;
  const moderateRiskCount = riskSummaries.filter((summary) => summary.band === "Moderate").length;
  const averageRiskScore = riskSummaries.length
    ? Math.round(riskSummaries.reduce((total, summary) => total + summary.score, 0) / riskSummaries.length)
    : 0;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Teacher student risk view</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Privacy-safe student profiles</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Open a student to see the simplified risk breakdown, the public fields of any active intervention,
              and the teacher-facing feedback tools. Counseling notes and sensitive rationale stay hidden.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/teacher/my-classes" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Back to classes
            </Link>
            <Link href="/teacher" className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
              Teacher overview
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="High risk students" value={highRiskCount.toString()} tone="rose" />
        <StatCard label="Moderate risk students" value={moderateRiskCount.toString()} tone="amber" />
        <StatCard label="Average score" value={averageRiskScore.toString()} tone="slate" />
        <StatCard label="Students tracked" value={riskSummaries.length.toString()} tone="emerald" />
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Priority students</h3>
            <p className="mt-1 text-sm text-slate-500">Sorted by risk score so the most urgent profiles appear first.</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Mock analytics snapshot</p>
        </div>

        {riskSummaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No students are available yet. Add a class and open the roster to begin tracking risk profiles.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {riskSummaries.map((summary) => (
              <article key={`${summary.classId}:${summary.studentId}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{summary.className}</p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900">{summary.studentName}</h4>
                    <p className="mt-1 text-sm text-slate-600">{summary.gradeLevel} · {summary.section} · {summary.subject}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${bandClasses(summary.band)}`}>
                    {summary.band} Risk
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Score</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{summary.score}</p>
                  </div>
                  <p className="text-xs text-slate-500">LRN {summary.lrn}</p>
                </div>

                <ul className="mt-4 space-y-2">
                  {summary.factors.slice(0, 2).map((factor) => (
                    <li key={factor.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">{factor.label}:</span> {factor.detail}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Suggested support: {summary.intervention.type}</p>
                  <Link
                    href={studentRiskHref(summary.classId, summary.studentId)}
                    className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Open profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "rose" | "amber" | "slate" | "emerald";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-50 text-slate-700";

  return (
    <article className={`rounded-3xl border border-slate-200 p-5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </article>
  );
}