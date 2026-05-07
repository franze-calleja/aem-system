"use client";

import Link from "next/link";
import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  enrollments,
  getStudentById,
  interventions,
  getRiskAssessmentByStudentId,
  riskAssessments,
  riskBandColor,
  riskBandLabel,
  sections,
  students,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

type SortKey = "score" | "name" | "grade";
type FilterBand = "all" | "high" | "moderate";

export default function CounselorCaseload() {
  const [filterBand, setFilterBand] = useState<FilterBand>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const grades = [...new Set(sections.map((s) => s.gradeLevel))].sort();

  const caseload = riskAssessments
    .filter((r) => filterBand === "all" || r.band === filterBand)
    .filter((r) => {
      if (filterGrade === "all") return true;
      const enr = enrollments.find((e) => e.studentId === r.studentId && e.schoolYearId === "sy-2024-2025");
      const sec = sections.find((s) => s.id === enr?.sectionId);
      return sec?.gradeLevel === Number(filterGrade);
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "name") {
        const sa = getStudentById(a.studentId);
        const sb = getStudentById(b.studentId);
        return `${sa?.lastName}`.localeCompare(`${sb?.lastName}`);
      }
      return 0;
    });

  const activeInterventionCount = (studentId: string) =>
    interventions.filter((i) => i.targetStudentId === studentId && i.status === "active").length;

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Caseload Dashboard"
        description="All moderate and high-risk students across the school, sorted by urgency. Click any student to view their full profile."
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["high", "moderate", "low"] as const).map((band) => {
          const count = riskAssessments.filter((r) => r.band === band).length;
          return (
            <div key={band} className={`rounded-2xl border p-4 ${band === "high" ? "border-red-200 bg-red-50" : band === "moderate" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${band === "high" ? "text-red-600" : band === "moderate" ? "text-amber-600" : "text-emerald-600"}`}>{riskBandLabel(band)}</p>
              <p className={`mt-2 text-2xl font-semibold ${band === "high" ? "text-red-800" : band === "moderate" ? "text-amber-800" : "text-emerald-800"}`}>{count}</p>
              <p className="mt-0.5 text-xs text-slate-600">students</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(["all", "high", "moderate"] as FilterBand[]).map((b) => (
            <button key={b} type="button" onClick={() => setFilterBand(b)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${filterBand === b ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {b === "all" ? "All risk" : riskBandLabel(b)}
            </button>
          ))}
        </div>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All grades</option>
          {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="score">Sort: Risk score</option>
          <option value="name">Sort: Last name</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">{caseload.length} students</span>
      </div>

      {/* Caseload table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Section</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Risk band</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active plans</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {caseload.map((ra) => {
              const student = getStudentById(ra.studentId);
              const enr = enrollments.find((e) => e.studentId === ra.studentId && e.schoolYearId === "sy-2024-2025");
              const sec = sections.find((s) => s.id === enr?.sectionId);
              const plans = activeInterventionCount(ra.studentId);
              return (
                <tr key={ra.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{student?.lastName}, {student?.firstName}</p>
                    <p className="text-xs text-slate-500">LRN {student?.lrn}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{sec?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBandColor(ra.band)}`}>{riskBandLabel(ra.band)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{ra.score}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{plans > 0 ? `${plans} active` : <span className="text-slate-400">None</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{ra.computedAt.split("T")[0]}</td>
                  <td className="px-4 py-3">
                    <Link href={`/counselor/students/${ra.studentId}`}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {caseload.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">No students match filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
