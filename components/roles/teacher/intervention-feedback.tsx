"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildTeacherRiskSummaries, studentRiskHref, type StudentRiskSummary } from "@/components/roles/teacher/student-risk-data";
import { useTeacherClasses } from "@/components/roles/teacher/teacher-class-store";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function bandClasses(band: "Low" | "Moderate" | "High") {
  if (band === "High") return "bg-rose-100 text-rose-700 border-rose-200";
  if (band === "Moderate") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function statusClasses(status: string) {
  if (status === "Active") return "bg-emerald-100 text-emerald-700";
  if (status === "Closed") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-800";
}

type LogEntry = { type: string; content: string; at: string };

function InterventionCard({ summary }: { summary: StudentRiskSummary }) {
  const [activeForm, setActiveForm] = useState<"session" | "observation" | "revision" | null>(null);
  const [sessionDate, setSessionDate] = useState(todayString());
  const [sessionDuration, setSessionDuration] = useState("45 minutes");
  const [sessionNote, setSessionNote] = useState("");
  const [observationNote, setObservationNote] = useState("");
  const [revisionRequest, setRevisionRequest] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const toggle = (form: "session" | "observation" | "revision") => {
    setActiveForm((current) => (current === form ? null : form));
    setStatusMsg(null);
  };

  const submitSession = () => {
    if (!sessionDuration.trim()) return;
    setLogs((prev) => [
      ...prev,
      {
        type: "Session",
        content: `${sessionDate} · ${sessionDuration.trim()}${sessionNote.trim() ? ` — ${sessionNote.trim()}` : ""}`,
        at: new Date().toLocaleTimeString(),
      },
    ]);
    setSessionNote("");
    setStatusMsg("Session logged and sent to counselor.");
    setActiveForm(null);
  };

  const submitObservation = () => {
    if (!observationNote.trim()) return;
    setLogs((prev) => [
      ...prev,
      { type: "Observation", content: observationNote.trim(), at: new Date().toLocaleTimeString() },
    ]);
    setObservationNote("");
    setStatusMsg("Observation note sent to counselor queue.");
    setActiveForm(null);
  };

  const submitRevision = () => {
    if (!revisionRequest.trim()) return;
    setLogs((prev) => [
      ...prev,
      { type: "Revision Request", content: revisionRequest.trim(), at: new Date().toLocaleTimeString() },
    ]);
    setRevisionRequest("");
    setStatusMsg("Revision request submitted to counselor.");
    setActiveForm(null);
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6">
      {/* Student + class info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {summary.className} · {summary.gradeLevel} · {summary.subject}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{summary.studentName}</h3>
          <p className="mt-0.5 text-xs text-slate-500">LRN {summary.lrn}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${bandClasses(summary.band)}`}>
            {summary.band} Risk · {summary.score}
          </span>
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClasses(summary.intervention.status)}`}>
            {summary.intervention.status}
          </span>
        </div>
      </div>

      {/* Intervention public fields */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Intervention plan — public fields only</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{summary.intervention.type}</p>
        <p className="mt-1 text-sm text-slate-600">{summary.intervention.schedule}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{summary.intervention.targetOutcome}</p>

        {summary.intervention.teacherActions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your actions</p>
            <ul className="mt-2 space-y-1">
              {summary.intervention.teacherActions.map((action) => (
                <li key={action} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.intervention.accommodations.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Accommodations</p>
            <ul className="mt-2 space-y-1">
              {summary.intervention.accommodations.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toggle("session")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
            activeForm === "session" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Log Session
        </button>
        <button
          type="button"
          onClick={() => toggle("observation")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
            activeForm === "observation" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Submit Observation
        </button>
        <button
          type="button"
          onClick={() => toggle("revision")}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
            activeForm === "revision" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Request Revision
        </button>
        <Link
          href={studentRiskHref(summary.classId, summary.studentId)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Full Profile
        </Link>
      </div>

      {/* Inline: Log Session */}
      {activeForm === "session" && (
        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Log Session</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm text-slate-700">
              <span className="font-medium">Date</span>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </label>
            <label className="block space-y-1 text-sm text-slate-700">
              <span className="font-medium">Duration</span>
              <input
                type="text"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                placeholder="e.g. 45 minutes"
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm text-slate-700">
            <span className="font-medium">Note (optional)</span>
            <textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              rows={3}
              placeholder="Brief session note…"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={submitSession}
            className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Submit
          </button>
        </div>
      )}

      {/* Inline: Submit Observation */}
      {activeForm === "observation" && (
        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Submit Observation Note</p>
          <p className="text-sm text-slate-500">Describe what you observed in class. This goes to the counselor's review queue.</p>
          <label className="block space-y-1 text-sm text-slate-700">
            <span className="font-medium">Observation</span>
            <textarea
              value={observationNote}
              onChange={(e) => setObservationNote(e.target.value)}
              rows={4}
              placeholder="Student attended Tuesday's session, engaged well; struggled Thursday…"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={submitObservation}
            disabled={!observationNote.trim()}
            className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      )}

      {/* Inline: Request Revision */}
      {activeForm === "revision" && (
        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Request Plan Revision</p>
          <p className="text-sm text-slate-500">Describe the change needed and why. The counselor will review and may update the plan.</p>
          <label className="block space-y-1 text-sm text-slate-700">
            <span className="font-medium">Request</span>
            <textarea
              value={revisionRequest}
              onChange={(e) => setRevisionRequest(e.target.value)}
              rows={4}
              placeholder="Tuesday/Thursday schedule conflicts with the student's other commitment; suggest moving to MWF…"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={submitRevision}
            disabled={!revisionRequest.trim()}
            className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <p className="mt-3 text-sm font-medium text-emerald-700" aria-live="polite">
          {statusMsg}
        </p>
      )}

      {/* Activity log */}
      {logs.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Activity log (this session)</p>
          {logs.map((log, i) => (
            <div key={`${log.type}-${i}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{log.type}</span> — {log.content}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" | "slate" | "rose" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border border-slate-200 px-5 py-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function InterventionFeedback() {
  const { classes } = useTeacherClasses();
  const allSummaries = useMemo(() => buildTeacherRiskSummaries(classes), [classes]);

  // Show all students with Active or Planned interventions
  const interventionSummaries = allSummaries.filter(
    (s) => s.intervention.status === "Active" || s.intervention.status === "Planned",
  );

  const activeCount = interventionSummaries.filter((s) => s.intervention.status === "Active").length;
  const plannedCount = interventionSummaries.filter((s) => s.intervention.status === "Planned").length;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Teacher feedback</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Intervention Feedback</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              View the public fields of active and planned interventions for students in your classes. Log sessions you ran,
              submit observation notes, or request plan revisions — all go directly to the counselor's review queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/teacher/my-classes"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              My Classes
            </Link>
            <Link
              href="/teacher"
              className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Overview
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active plans" value={activeCount.toString()} tone="emerald" />
        <StatCard label="Planned" value={plannedCount.toString()} tone="amber" />
        <StatCard label="Students monitored" value={interventionSummaries.length.toString()} tone="slate" />
      </section>

      {interventionSummaries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No active or planned interventions for your current classes.</p>
          <p className="mt-1 text-sm text-slate-500">
            Add classes with students and the system will generate support plans based on their risk profiles.
          </p>
          <Link
            href="/teacher/my-classes"
            className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Go to My Classes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {interventionSummaries.map((summary) => (
            <InterventionCard key={`${summary.classId}:${summary.studentId}`} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
