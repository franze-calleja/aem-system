"use client";

import Link from "next/link";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  attendanceSummaries,
  behavioralIncidents,
  counselingNotes,
  enrollments,
  getStudentById,
  getRiskAssessmentByStudentId,
  gradeRecords,
  interventions,
  riskBandColor,
  riskBandLabel,
  sections,
  selAssessments,
  severityColor,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

type Props = { studentId: string };

export default function StudentProfileDetail({ studentId }: Props) {
  const student = getStudentById(studentId);
  const ra = getRiskAssessmentByStudentId(studentId);
  const enr = enrollments.find((e) => e.studentId === studentId && e.schoolYearId === "sy-2024-2025");
  const sec = sections.find((s) => s.id === enr?.sectionId);
  const grades = gradeRecords.filter((g) => g.studentId === studentId);
  const attendance = attendanceSummaries.find((a) => a.studentId === studentId);
  const incidents = behavioralIncidents.filter((b) => b.studentId === studentId);
  const sel = selAssessments.filter((s) => s.studentId === studentId);
  const notes = counselingNotes.filter((n) => n.studentId === studentId);
  const studentInterventions = interventions.filter((i) => i.targetStudentId === studentId);

  if (!student) {
    return (
      <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
        <PageHeader backHref="/counselor/students" backLabel="Student Profiles" title="Student not found" />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No student with ID &quot;{studentId}&quot;.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor/students"
        backLabel="Student Profiles"
        title={`${student.firstName} ${student.lastName}`}
        description={`LRN ${student.lrn} · ${sec?.name ?? "No section"} · ${student.sex === "M" ? "Male" : "Female"} · ${student.modality}`}
        actions={
          <Link href={`/counselor/interventions?student=${studentId}`}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
            + New intervention
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: risk + demographics */}
        <div className="flex flex-col gap-4">
          {/* Risk score */}
          {ra && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current risk level</p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${riskBandColor(ra.band)}`}>{riskBandLabel(ra.band)}</span>
                <span className="text-2xl font-semibold text-slate-900">{ra.score}<span className="text-sm text-slate-400">/100</span></span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${ra.band === "high" ? "bg-red-500" : ra.band === "moderate" ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${ra.score}%` }} />
              </div>
              <p className="mt-4 text-xs text-slate-500 leading-5">{ra.narrative}</p>
              <div className="mt-4 space-y-2">
                {ra.factors.map((f) => (
                  <div key={f.dimension} className="flex items-center gap-2">
                    <span className="flex-1 text-xs text-slate-600">{f.dimension}</span>
                    <div className="w-24 h-1.5 rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${f.subScore >= 70 ? "bg-red-500" : f.subScore >= 40 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${f.subScore}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-800 w-6 text-right">{Math.round(f.contribution)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Updated {ra.computedAt.split("T")[0]}</p>
            </section>
          )}

          {/* Demographics */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Demographics</p>
            <dl className="space-y-2 text-sm">
              {[
                ["Date of birth", student.birthDate],
                ["Sex", student.sex === "M" ? "Male" : "Female"],
                ["Modality", student.modality],
                ["Section", sec?.name ?? "—"],
                ["Grade", sec?.gradeLevel ? `Grade ${sec.gradeLevel}` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-900 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Attendance */}
          {attendance && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Attendance (SY 2024-2025)</p>
              <dl className="space-y-2 text-sm">
                {[
                  ["Days present", attendance.daysPresent],
                  ["Days absent", attendance.daysAbsent],
                  ["Days tardy", attendance.daysTardy],
                  ["Absences (Q1)", attendance.absentQ1],
                  ["Absences (Q2)", attendance.absentQ2],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between gap-2">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {/* Right: tabs */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Grades */}
          {grades.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Academic Records</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-2 text-left text-xs text-slate-500">Subject</th>
                      <th className="pb-2 text-center text-xs text-slate-500">Q1</th>
                      <th className="pb-2 text-center text-xs text-slate-500">Q2</th>
                      <th className="pb-2 text-center text-xs text-slate-500">Q3</th>
                      <th className="pb-2 text-center text-xs text-slate-500">Q4</th>
                      <th className="pb-2 text-center text-xs text-slate-500">Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grades.map((g) => (
                      <tr key={g.id}>
                        <td className="py-2 text-slate-700">{g.subject}</td>
                        {[g.q1, g.q2, g.q3, g.q4].map((q, i) => (
                          <td key={i} className={`py-2 text-center font-medium ${q !== null && q < 75 ? "text-red-600" : "text-slate-900"}`}>{q ?? "—"}</td>
                        ))}
                        <td className={`py-2 text-center font-semibold ${g.finalGrade !== null && g.finalGrade < 75 ? "text-red-600" : "text-slate-900"}`}>{g.finalGrade ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Behavioral incidents */}
          {incidents.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Behavioral Incidents ({incidents.length})</p>
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div key={inc.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                    <span className={`mt-0.5 shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityColor(inc.severity)}`}>{inc.severity}</span>
                    <div>
                      <p className="text-xs font-medium text-slate-700">{inc.date} · <span className="capitalize">{inc.category}</span></p>
                      <p className="mt-0.5 text-xs text-slate-600">{inc.description}</p>
                      {inc.actionTaken && <p className="mt-0.5 text-xs text-slate-400">Action: {inc.actionTaken}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SEL assessments */}
          {sel.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">SEL Assessments</p>
              {sel.map((s) => (
                <div key={s.id} className="mb-3 last:mb-0">
                  <p className="text-xs text-slate-500 mb-2">{s.assessedAt.split("T")[0]} · {s.tool}</p>
                  <div className="space-y-1.5">
                    {s.scores.map((sc) => (
                      <div key={sc.domain} className="flex items-center gap-2">
                        <span className="w-32 shrink-0 text-xs text-slate-600">{sc.domain}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-rose-400" style={{ width: `${sc.score}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-700 w-8 text-right">{sc.score}</span>
                      </div>
                    ))}
                  </div>
                  {s.narrative && <p className="mt-2 text-xs text-slate-500 italic">{s.narrative}</p>}
                </div>
              ))}
            </section>
          )}

          {/* Counseling notes */}
          {notes.length > 0 && (
            <section className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 mb-3">Counseling Notes (private)</p>
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-rose-200 bg-white p-3">
                    <p className="text-xs font-medium text-rose-700">{note.sessionDate} · {note.sessionType}</p>
                    <p className="mt-1 text-sm text-slate-700">{note.body}</p>
                    {note.followUpNeeded && <p className="mt-1.5 text-xs text-amber-600 font-medium">⚑ Follow-up needed</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interventions */}
          {studentInterventions.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Intervention History</p>
              {studentInterventions.map((iv) => (
                <div key={iv.id} className="mb-3 last:mb-0 rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${iv.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{iv.status}</span>
                    <p className="text-sm font-medium text-slate-900">{iv.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{iv.startDate}{iv.endDate ? ` → ${iv.endDate}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-600">{iv.publicSummary}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}
