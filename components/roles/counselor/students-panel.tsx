"use client";

import Link from "next/link";
import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  enrollments,
  getRiskAssessmentByStudentId,
  riskBandColor,
  riskBandLabel,
  sections,
  students,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

export default function CounselorStudents() {
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSex, setFilterSex] = useState<string>("all");

  const grades = [...new Set(sections.map((s) => s.gradeLevel))].sort();

  const filtered = students
    .filter((s) => {
      const name = `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase();
      return name.includes(search.toLowerCase());
    })
    .filter((s) => {
      if (filterGrade === "all") return true;
      const enr = enrollments.find((e) => e.studentId === s.id && e.schoolYearId === "sy-2024-2025");
      const sec = sections.find((sec) => sec.id === enr?.sectionId);
      return sec?.gradeLevel === Number(filterGrade);
    })
    .filter((s) => filterSex === "all" || s.sex === filterSex);

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Student Profiles"
        description="Search and access full student profiles including academic history, attendance, behavioral records, SEL assessments, and counseling context."
      />

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or LRN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All grades</option>
          {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={filterSex} onChange={(e) => setFilterSex(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
        <span className="flex items-center text-xs text-slate-500">{filtered.length} students</span>
      </div>

      {/* Student grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((student) => {
          const ra = getRiskAssessmentByStudentId(student.id);
          const enr = enrollments.find((e) => e.studentId === student.id && e.schoolYearId === "sy-2024-2025");
          const sec = sections.find((s) => s.id === enr?.sectionId);
          return (
            <Link
              key={student.id}
              href={`/counselor/students/${student.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-rose-700 transition">
                    {student.lastName}, {student.firstName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">LRN {student.lrn}</p>
                </div>
                {ra && (
                  <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBandColor(ra.band)}`}>
                    {riskBandLabel(ra.band)}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{sec?.name ?? "No section"}</span>
                <span>·</span>
                <span>{student.sex === "M" ? "Male" : "Female"}</span>
                <span>·</span>
                <span>{student.modality}</span>
              </div>
              {ra && (
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${ra.band === "high" ? "bg-red-500" : ra.band === "moderate" ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${ra.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{ra.score}/100</p>
                </div>
              )}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-400">No students match your search.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
