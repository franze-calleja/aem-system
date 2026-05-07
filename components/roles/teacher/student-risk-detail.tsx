"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { findStudentRiskSummary, studentRiskHref } from "@/components/roles/teacher/student-risk-data";
import { useTeacherClasses } from "@/components/roles/teacher/teacher-class-store";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function bandClasses(band: "Low" | "Moderate" | "High") {
  if (band === "High") {
    return "bg-rose-100 text-rose-700 border-rose-200";
  }

  if (band === "Moderate") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

export default function TeacherStudentRiskDetail({ classId, studentId }: { classId: string; studentId: string }) {
  const { classes } = useTeacherClasses();
  const summary = useMemo(() => findStudentRiskSummary(classes, classId, studentId), [classes, classId, studentId]);

  const [sessionDate, setSessionDate] = useState(todayString());
  const [sessionDuration, setSessionDuration] = useState("45 minutes");
  const [sessionNote, setSessionNote] = useState("");
  const [observationNote, setObservationNote] = useState("");
  const [revisionRequest, setRevisionRequest] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<Array<{ date: string; duration: string; note: string }>>([]);
  const [observationLogs, setObservationLogs] = useState<Array<{ note: string; createdAt: string }>>([]);
  const [revisionLogs, setRevisionLogs] = useState<Array<{ request: string; createdAt: string }>>([]);

  if (!summary) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Student not found</h2>
        <p className="mt-2 text-sm text-slate-600">
          The selected student or class is unavailable. Return to the student risk overview or the class roster.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/teacher/student-risk" className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Back to Student Risk View
          </Link>
          <Link href="/teacher/my-classes" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Back to My Classes
          </Link>
        </div>
      </div>
    );
  }

  const logSession = () => {
    if (!sessionDuration.trim()) {
      setStatusMessage("Add a session duration before logging the visit.");
      return;
    }

    setSessionLogs((current) => [
      { date: sessionDate, duration: sessionDuration.trim(), note: sessionNote.trim() },
      ...current,
    ]);
    setSessionNote("");
    setStatusMessage("Session logged for counselor review.");
  };

  const submitObservation = () => {
    if (!observationNote.trim()) {
      setStatusMessage("Add an observation note before submitting.");
      return;
    }

    setObservationLogs((current) => [
      { note: observationNote.trim(), createdAt: new Date().toLocaleString() },
      ...current,
    ]);
    setObservationNote("");
    setStatusMessage("Observation note sent to the counselor queue.");
  };

  const requestRevision = () => {
    if (!revisionRequest.trim()) {
      setStatusMessage("Describe the requested change before sending it to the counselor.");
      return;
    }

    setRevisionLogs((current) => [
      { request: revisionRequest.trim(), createdAt: new Date().toLocaleString() },
      ...current,
    ]);
    setRevisionRequest("");
    setStatusMessage("Revision request submitted.");
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Teacher student profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">{summary.studentName}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {summary.className} · {summary.gradeLevel} · {summary.section} · {summary.subject} · LRN {summary.lrn}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/teacher/student-risk" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Back to overview
            </Link>
            <Link href={studentRiskHref(summary.classId, summary.studentId)} className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
              Shareable profile link
            </Link>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
          This simplified profile is privacy-compliant for teachers. It shows classroom-visible signals, public intervention fields,
          and feedback tools without exposing counseling notes or sensitive rationale.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk breakdown</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Explainability for the teacher</h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${bandClasses(summary.band)}`}>
              {summary.band} Risk
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="flex items-center justify-center">
              <div className={`flex h-28 w-28 items-center justify-center rounded-full border-8 ${summary.band === "High" ? "border-rose-100 bg-rose-50 text-rose-700" : summary.band === "Moderate" ? "border-amber-100 bg-amber-50 text-amber-800" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
                <div className="text-center">
                  <p className="text-3xl font-semibold">{summary.score}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Score</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                The score combines classroom-visible attendance and academic signals. It highlights the factors the teacher can influence directly.
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <Metric label="Attendance rate" value={`${summary.attendanceRate.toFixed(0)}%`} />
                <Metric label="Absence rate" value={`${summary.absenceRate.toFixed(0)}%`} />
                <Metric label="Average score" value={summary.averageScore.toFixed(1)} />
                <Metric label="Tardy marks" value={summary.tardyDays.toString()} />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {summary.factors.map((factor) => (
              <div key={factor.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{factor.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{factor.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${factor.tone === "high" ? "bg-rose-100 text-rose-700" : factor.tone === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                    {factor.tone}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active intervention summary</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Public fields only</h3>

          <dl className="mt-5 space-y-4 text-sm">
            <Field label="Type" value={summary.intervention.type} />
            <Field label="Status" value={summary.intervention.status} />
            <Field label="Schedule" value={summary.intervention.schedule} />
            <Field label="Teacher accommodations" value={summary.intervention.accommodations.join(" · ")} />
            <Field label="Teacher actions" value={summary.intervention.teacherActions.join(" · ")} />
            <Field label="Target outcome" value={summary.intervention.targetOutcome} />
          </dl>

          <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Counselor-only rationale and private notes are intentionally hidden from this view.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feedback & session logging</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Teacher actions feed the counselor queue</h3>
          </div>

          {statusMessage ? <p className="text-sm text-slate-500" aria-live="polite">{statusMessage}</p> : null}
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Log Session</h4>
            <p className="mt-1 text-sm text-slate-500">Record the date, duration, and a short note after any remedial support you run.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FieldInput label="Session date" value={sessionDate} onChange={setSessionDate} type="date" />
              <FieldInput label="Duration" value={sessionDuration} onChange={setSessionDuration} placeholder="45 minutes" />
            </div>

            <label className="mt-4 block space-y-2 text-sm text-slate-700">
              <span className="font-medium">Session note</span>
              <textarea
                value={sessionNote}
                onChange={(event) => setSessionNote(event.target.value)}
                placeholder="Reviewed factoring; student needed extra prompting."
                rows={4}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <button type="button" onClick={logSession} className="mt-4 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
              Log Session
            </button>

            <div className="mt-4 space-y-3">
              {sessionLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No sessions logged yet.</p>
              ) : (
                sessionLogs.map((entry) => (
                  <div key={`${entry.date}-${entry.duration}-${entry.note}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">{entry.date} · {entry.duration}</p>
                    <p className="mt-1">{entry.note || "No note provided."}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Observation Note</h4>
              <p className="mt-1 text-sm text-slate-500">Write a brief classroom observation for the counselor.</p>
            </div>

            <label className="block space-y-2 text-sm text-slate-700">
              <span className="font-medium">Note</span>
              <textarea
                value={observationNote}
                onChange={(event) => setObservationNote(event.target.value)}
                placeholder="Student was engaged today but struggled with factoring."
                rows={4}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <button type="button" onClick={submitObservation} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Submit Observation Note
            </button>

            <div className="space-y-3">
              {observationLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No observation notes yet.</p>
              ) : (
                observationLogs.map((entry) => (
                  <div key={`${entry.createdAt}-${entry.note}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.createdAt}</p>
                    <p className="mt-2">{entry.note}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-900">Revision Request</h4>
              <p className="mt-1 text-sm text-slate-500">Ask the counselor for a plan change based on classroom observations.</p>

              <label className="mt-3 block space-y-2 text-sm text-slate-700">
                <span className="font-medium">Request</span>
                <textarea
                  value={revisionRequest}
                  onChange={(event) => setRevisionRequest(event.target.value)}
                  placeholder="The session schedule conflicts with other classes; move to MWF if possible."
                  rows={4}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>

              <button type="button" onClick={requestRevision} className="mt-4 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                Request Revision
              </button>

              <div className="mt-4 space-y-3">
                {revisionLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">No revision requests yet.</p>
                ) : (
                  revisionLogs.map((entry) => (
                    <div key={`${entry.createdAt}-${entry.request}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.createdAt}</p>
                      <p className="mt-2">{entry.request}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-slate-700">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}