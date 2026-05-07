"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  enrollments,
  getStudentById,
  interventionStatusColor,
  interventions,
  type Intervention,
} from "@/lib/mock-data";

const TEACHER_SECTION_IDS = ["9-newton", "11-einstein"];

const teacherNavItems = [
  { label: "Overview", href: "/teacher", icon: "home" as const },
  { label: "My Classes", href: "/teacher/my-classes", icon: "folder" as const },
  { label: "At-Risk Students", href: "/teacher/at-risk", icon: "alert" as const },
  { label: "Behavioral Log", href: "/teacher/behavioral", icon: "clipboard" as const },
  { label: "Interventions & Feedback", href: "/teacher/interventions", icon: "message" as const },
];

function scopeBadge(scope: Intervention["scope"]) {
  const map: Record<Intervention["scope"], string> = {
    individual: "bg-slate-100 text-slate-700",
    section: "bg-blue-100 text-blue-700",
    "grade-level": "bg-purple-100 text-purple-700",
    "school-wide": "bg-rose-100 text-rose-700",
  };
  return map[scope] ?? "bg-slate-100 text-slate-700";
}

export default function TeacherInterventions() {
  const teacherEnrollments = enrollments.filter(
    (e) => TEACHER_SECTION_IDS.includes(e.sectionId) && e.schoolYearId === "sy-2024-2025",
  );
  const studentIds = teacherEnrollments.map((e) => e.studentId);

  // Teacher sees interventions for their students (individual) or their sections
  const visibleInterventions = interventions.filter((iv) => {
    if (iv.scope === "individual" && iv.targetStudentId && studentIds.includes(iv.targetStudentId)) return true;
    if (iv.scope === "section" && iv.targetSectionId && TEACHER_SECTION_IDS.includes(iv.targetSectionId)) return true;
    return false;
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"observation" | "revision-request">("observation");
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  function submitFeedback(ivId: string) {
    if (!feedbackText.trim()) return;
    setSubmitted((prev) => new Set([...prev, ivId]));
    setFeedbackText("");
    setSelected(null);
  }

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
        title="Interventions & Feedback"
        description="View active support plans for students and sections in your scope. Submit observation notes or request revisions. Counseling-only details are not shown."
      />

      {visibleInterventions.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No active interventions for your students or sections.</p>
        </div>
      )}

      <div className="space-y-4">
        {visibleInterventions.map((iv) => {
          const student = iv.targetStudentId ? getStudentById(iv.targetStudentId) : null;
          const isExpanded = selected === iv.id;
          const wasSubmitted = submitted.has(iv.id);

          return (
            <article key={iv.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${interventionStatusColor(iv.status)}`}>
                        {iv.status}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${scopeBadge(iv.scope)}`}>
                        {iv.scope}
                      </span>
                    </div>
                    <h2 className="mt-2 text-sm font-semibold text-slate-900">{iv.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {student ? `${student.firstName} ${student.lastName}` : iv.targetSectionId ?? "Section"} · Started {iv.startDate}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(isExpanded ? null : iv.id)}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    {isExpanded ? "Close" : "Add feedback"}
                  </button>
                </div>

                <p className="mt-3 text-sm text-slate-600 leading-5">{iv.publicSummary}</p>

                {/* Sessions */}
                {iv.sessions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Sessions ({iv.sessions.length})</p>
                    <div className="space-y-1.5">
                      {iv.sessions.slice(0, 3).map((session) => (
                        <div key={session.id} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="text-slate-400">{session.date}</span>
                          <span>·</span>
                          <span>{session.conductedBy === "t1" ? "You" : session.conductedBy}</span>
                          <span>·</span>
                          <span className="truncate">{session.notes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback form */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-5">
                  {wasSubmitted ? (
                    <p className="text-sm text-emerald-700 font-medium">✓ Feedback submitted. Counselor will review.</p>
                  ) : (
                    <>
                      <div className="mb-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackType("observation")}
                          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${feedbackType === "observation" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                        >
                          Observation note
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackType("revision-request")}
                          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${feedbackType === "revision-request" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                        >
                          Revision request
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={
                          feedbackType === "observation"
                            ? "Describe what you observed (behavior, response to intervention, etc.)…"
                            : "Explain what needs to be revised and why…"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">Cancel</button>
                        <button
                          type="button"
                          onClick={() => submitFeedback(iv.id)}
                          disabled={!feedbackText.trim()}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                        >
                          Submit {feedbackType === "observation" ? "note" : "request"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
