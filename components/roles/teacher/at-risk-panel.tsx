"use client";

import Link from "next/link";
import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  enrollments,
  getStudentById,
  patternMatches,
  riskAssessments,
  riskBandColor,
  riskBandDot,
  riskBandLabel,
  sections,
} from "@/lib/mock-data";

// Teacher t1 (Ms. Maria Cruz) handles 9-newton + adviser 11-einstein
const TEACHER_SECTION_IDS = ["9-newton", "11-einstein"];

const teacherNavItems = [
  { label: "Overview", href: "/teacher", icon: "home" as const },
  { label: "My Classes", href: "/teacher/my-classes", icon: "folder" as const },
  { label: "At-Risk Students", href: "/teacher/at-risk", icon: "alert" as const },
  { label: "Behavioral Log", href: "/teacher/behavioral", icon: "clipboard" as const },
  { label: "Interventions & Feedback", href: "/teacher/interventions", icon: "message" as const },
];

function riskScoreBar(score: number) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function TeacherAtRisk() {
  const [filterBand, setFilterBand] = useState<"all" | "high" | "moderate" | "low">("all");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "name">("score");

  // Get all enrollments for teacher's sections
  const teacherEnrollments = enrollments.filter(
    (e) => TEACHER_SECTION_IDS.includes(e.sectionId) && e.schoolYearId === "sy-2024-2025",
  );
  const studentIds = teacherEnrollments.map((e) => e.studentId);

  // Join risk assessments with students
  const studentRisks = riskAssessments
    .filter((r) => studentIds.includes(r.studentId))
    .filter((r) => filterBand === "all" || r.band === filterBand)
    .filter((r) => {
      if (filterSection === "all") return true;
      const enrollment = teacherEnrollments.find((e) => e.studentId === r.studentId);
      return enrollment?.sectionId === filterSection;
    })
    .sort((a, b) => sortBy === "score" ? b.score - a.score : 0);

  // Pattern alerts for teacher's sections
  const sectionAlerts = patternMatches.filter(
    (p) => p.status === "active" && (
      (p.affectedSectionId && TEACHER_SECTION_IDS.includes(p.affectedSectionId)) ||
      (p.affectedStudentIds?.some((id) => studentIds.includes(id)))
    ),
  );

  return (
    <PageShell
      badge="T"
      title="Ms. Maria Cruz"
      schoolYear="SY 2024-2025"
      theme="emerald"
      navItems={teacherNavItems}
    >
      <PageHeader
        backHref="/teacher"
        backLabel="Teacher workspace"
        title="At-Risk Students"
        description="Students in your assigned sections flagged by the algorithmic risk engine. Scores shown are based on academic, attendance, behavioral, and profile data — no counseling content is included."
      />

      {/* Pattern alerts */}
      {sectionAlerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pattern Alerts for Your Sections</h2>
          {sectionAlerts.map((alert) => (
            <div key={alert.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${alert.severity === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              <span className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${alert.severity === "critical" ? "bg-red-500" : "bg-amber-400"}`} />
              <div>
                <p className={`text-sm font-semibold ${alert.severity === "critical" ? "text-red-800" : "text-amber-800"}`}>{alert.patternName}</p>
                <p className={`mt-0.5 text-xs ${alert.severity === "critical" ? "text-red-700" : "text-amber-700"}`}>{alert.description}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(["all", "high", "moderate", "low"] as const).map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => setFilterBand(band)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterBand === band ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {band === "all" ? "All" : band.charAt(0).toUpperCase() + band.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All sections</option>
          {TEACHER_SECTION_IDS.map((id) => {
            const sec = sections.find((s) => s.id === id);
            return <option key={id} value={id}>{sec?.name ?? id}</option>;
          })}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "score" | "name")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="score">Sort by risk score</option>
          <option value="name">Sort by name</option>
        </select>

        <span className="ml-auto text-xs text-slate-500">{studentRisks.length} student{studentRisks.length !== 1 ? "s" : ""}</span>
      </section>

      {/* Student cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {studentRisks.map((ra) => {
          const student = getStudentById(ra.studentId);
          const enrollment = teacherEnrollments.find((e) => e.studentId === ra.studentId);
          const sectionInfo = sections.find((s) => s.id === enrollment?.sectionId);
          if (!student) return null;

          return (
            <article key={ra.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{student.firstName} {student.lastName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{sectionInfo?.name ?? enrollment?.sectionId} · LRN {student.lrn}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBandColor(ra.band)}`}>
                  {riskBandLabel(ra.band)}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Risk score</span>
                  <span className="text-sm font-semibold text-slate-900">{ra.score}/100</span>
                </div>
                {riskScoreBar(ra.score)}
              </div>

              {/* Factor breakdown */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contributing factors</p>
                {ra.factors.map((f) => (
                  <div key={f.dimension} className="flex items-center gap-2">
                    <span className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${riskBandDot(f.subScore >= 70 ? "high" : f.subScore >= 40 ? "moderate" : "low")}`} />
                    <span className="min-w-0 flex-1 text-xs text-slate-600 truncate">{f.dimension}</span>
                    <span className="text-xs font-medium text-slate-800">{Math.round(f.contribution)}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-600 line-clamp-3 leading-5">{ra.narrative}</p>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/teacher/interventions?student=${ra.studentId}`}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  View interventions
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      {studentRisks.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No students match the current filter.</p>
        </div>
      )}

      {/* Explainability note */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-700">How are these scores computed?</strong>{" "}
          Each student receives a 0–100 risk score weighted across five dimensions: Academic Performance (30%), Attendance (25%), Behavioral &amp; SEL (20%), Intervention History (15%), and Profile Factors (10%). Thresholds: Low 0–39 · Moderate 40–69 · High 70–100. Scores are recomputed weekly or when data changes. Counseling note content is never included.
        </p>
      </div>
    </PageShell>
  );
}
