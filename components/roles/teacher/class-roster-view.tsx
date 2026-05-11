"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  type AssessmentKind,
  type AttendanceStatus,
  type BehaviorCategory,
  type BehaviorSeverity,
  useTeacherClasses,
} from "@/components/roles/teacher/teacher-class-store";
import { buildStudentRiskSummary, studentRiskHref } from "@/components/roles/teacher/student-risk-data";

const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "tardy", "excused"];
const ASSESSMENT_KINDS: AssessmentKind[] = ["quiz", "exam", "pre-test", "post-test"];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function kindToLabel(kind: AssessmentKind) {
  switch (kind) {
    case "quiz":
      return "Quiz";
    case "exam":
      return "Exam";
    case "pre-test":
      return "Pre-test";
    case "post-test":
      return "Post-test";
  }
}

export default function ClassRosterView({ classId }: { classId: string }) {
  const {
    getClassById,
    addAttendanceDay,
    updateAttendanceStatus,
    markAllPresent,
    addAssessmentColumn,
    updateAssessmentScore,
    removeAssessmentColumn,
    addBehavioralIncident,
  } = useTeacherClasses();

  const activeClass = getClassById(classId);
  const [activeTab, setActiveTab] = useState<"attendance" | "gradebook" | "risk" | "behavioral">("attendance");
  const [quarter, setQuarter] = useState(1);
  const [newAttendanceDate, setNewAttendanceDate] = useState(todayString());
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [behaviorStudentId, setBehaviorStudentId] = useState("");
  const [behaviorDate, setBehaviorDate] = useState(todayString());
  const [behaviorCategory, setBehaviorCategory] = useState<BehaviorCategory>("Behavioral");
  const [behaviorSeverity, setBehaviorSeverity] = useState<BehaviorSeverity>("Low");
  const [behaviorDescription, setBehaviorDescription] = useState("");

  useEffect(() => {
    if (activeClass && activeClass.attendanceDays.length === 0) {
      addAttendanceDay(classId, newAttendanceDate);
    }
  }, [activeClass, addAttendanceDay, classId, newAttendanceDate]);

  useEffect(() => {
    if (activeClass && activeClass.attendanceDays.length > 0 && !selectedDayId) {
      // Defer to avoid synchronous setState inside effect and satisfy lint
      setTimeout(() => {
        setSelectedDayId(activeClass.attendanceDays[activeClass.attendanceDays.length - 1].id);
      }, 0);
    }
    // Only run when activeClass changes — selection should initialize once per class
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass]);

  const selectedDay = useMemo(() => {
    if (!activeClass) {
      return null;
    }

    return (
      activeClass.attendanceDays.find((day) => day.id === selectedDayId) ??
      activeClass.attendanceDays[activeClass.attendanceDays.length - 1] ??
      null
    );
  }, [activeClass, selectedDayId]);

  const quarterAssessments = useMemo(() => {
    if (!activeClass) {
      return [];
    }

    return activeClass.assessmentColumns.filter((column) => column.quarter === quarter);
  }, [activeClass, quarter]);

  const attendanceCounts = useMemo(() => {
    if (!selectedDay || !activeClass) {
      return { present: 0, absent: 0, tardy: 0, excused: 0 };
    }

    return activeClass.students.reduce(
      (counts, student) => {
        const status = selectedDay.statusByStudent[student.id] ?? "present";
        counts[status] += 1;
        return counts;
      },
      { present: 0, absent: 0, tardy: 0, excused: 0 },
    );
  }, [activeClass, selectedDay]);

  const riskSummaries = useMemo(() => {
    if (!activeClass) return [];
    return activeClass.students
      .map((student) => buildStudentRiskSummary(activeClass, student))
      .sort((a, b) => b.score - a.score);
  }, [activeClass]);

  const setAttendance = (studentId: string, status: AttendanceStatus) => {
    if (!selectedDay) {
      return;
    }

    updateAttendanceStatus(classId, selectedDay.id, studentId, status);
  };

  const cycleAttendance = (current: AttendanceStatus) => {
    const index = ATTENDANCE_STATUSES.indexOf(current);
    return ATTENDANCE_STATUSES[(index + 1) % ATTENDANCE_STATUSES.length];
  };

  const handleAttendanceKey = (event: KeyboardEvent<HTMLDivElement>, studentId: string) => {
    const key = event.key.toLowerCase();

    if (key === "p") {
      event.preventDefault();
      setAttendance(studentId, "present");
    }

    if (key === "a") {
      event.preventDefault();
      setAttendance(studentId, "absent");
    }

    if (key === "t") {
      event.preventDefault();
      setAttendance(studentId, "tardy");
    }

    if (key === "e") {
      event.preventDefault();
      setAttendance(studentId, "excused");
    }

    if (key === " " || key === "enter") {
      event.preventDefault();
      const studentStatus = selectedDay?.statusByStudent[studentId] ?? "present";
      setAttendance(studentId, cycleAttendance(studentStatus));
    }
  };

  const addAttendance = () => {
    addAttendanceDay(classId, newAttendanceDate);
    setSelectedDayId(`day-${newAttendanceDate}`);
  };

  const runningGwa = (studentId: string) => {
    const values = quarterAssessments
      .map((assessment) => assessment.scoreByStudent[studentId])
      .filter((value): value is number => typeof value === "number");

    if (!values.length) {
      return "—";
    }

    return (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1);
  };

  const submitBehaviorIncident = () => {
    if (!behaviorStudentId || !behaviorDescription.trim()) return;
    addBehavioralIncident(classId, {
      studentId: behaviorStudentId,
      date: behaviorDate,
      category: behaviorCategory,
      severity: behaviorSeverity,
      description: behaviorDescription.trim(),
    });
    setBehaviorDescription("");
    setBehaviorStudentId("");
  };

  if (!activeClass) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Class not found</h2>
        <p className="mt-2 text-sm text-slate-600">The selected class does not exist anymore or the link is outdated.</p>
        <Link href="/teacher/my-classes" className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Back to My Classes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Class roster</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activeClass.name}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {activeClass.gradeLevel} · {activeClass.section} · {activeClass.subject} · {activeClass.schedule}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {activeClass.schoolYear} · {activeClass.semester}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/teacher/my-classes" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Back to Classes
          </Link>
          <button
            type="button"
            onClick={() => selectedDay && markAllPresent(classId, selectedDay.id)}
            className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Mark All Present
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "attendance" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("gradebook")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "gradebook" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Gradebook
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("risk")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "risk" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          At-Risk Students
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("behavioral")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "behavioral" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Behavioral Log
        </button>
      </div>

      {activeTab === "attendance" ? (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Daily Attendance</h3>
              <p className="mt-1 text-sm text-slate-500">Add a new day, then mark each student for that specific date.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={newAttendanceDate}
                onChange={(event) => setNewAttendanceDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
              <button
                type="button"
                onClick={addAttendance}
                className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Add Day
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeClass.attendanceDays.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selectedDay?.id === day.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <Stat label="Present" value={attendanceCounts.present} tone="emerald" />
            <Stat label="Absent" value={attendanceCounts.absent} tone="slate" />
            <Stat label="Tardy" value={attendanceCounts.tardy} tone="amber" />
            <Stat label="Excused" value={attendanceCounts.excused} tone="slate" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-245 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status for selected day</th>
                  <th className="px-4 py-3">LRN</th>
                </tr>
              </thead>
              <tbody>
                {activeClass.students.map((student) => {
                  const status = selectedDay?.statusByStudent[student.id] ?? "present";
                  const risk = buildStudentRiskSummary(activeClass, student);

                  return (
                    <tr key={student.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={studentRiskHref(activeClass.id, student.id)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-slate-700"
                        >
                          {student.name}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                              risk.band === "High"
                                ? "bg-rose-100 text-rose-700"
                                : risk.band === "Moderate"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {risk.band} Risk
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setAttendance(student.id, cycleAttendance(status))}
                          onKeyDown={(event) => handleAttendanceKey(event, student.id)}
                          className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-slate-300"
                        >
                          <span
                            className={`inline-flex rounded-full px-2 py-1 ${
                              status === "present"
                                ? "bg-emerald-600 text-white"
                                : status === "tardy"
                                ? "bg-amber-200 text-amber-900"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {status === "present" ? "Present" : status === "tardy" ? "Tardy" : status === "absent" ? "Absent" : "Excused"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-600">{student.lrn}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "gradebook" ? (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Quarterly Gradebook</h3>
              <p className="mt-1 text-sm text-slate-500">Add only the quizzes, exams, pre-tests, or post-tests you want for the selected quarter.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[1, 2, 3, 4].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuarter(item)}
                  className={`rounded-lg px-3 py-1 text-sm transition ${quarter === item ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"}`}
                >
                  {item}Q
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ASSESSMENT_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => addAssessmentColumn(classId, quarter, kind)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                + Add {kindToLabel(kind)}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-245 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3">Student</th>
                  {quarterAssessments.map((assessment) => (
                    <th key={assessment.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span>{assessment.label}</span>
                        <button
                          type="button"
                          onClick={() => removeAssessmentColumn(classId, assessment.id)}
                          className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500 hover:bg-slate-100"
                          aria-label={`Remove ${assessment.label}`}
                        >
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3">Running GWA</th>
                </tr>
              </thead>

              <tbody>
                {activeClass.students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-medium text-slate-900">{student.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{student.lrn}</p>
                    </td>

                    {quarterAssessments.map((assessment) => (
                      <ScoreCell
                        key={assessment.id}
                        value={assessment.scoreByStudent[student.id]}
                        onChange={(score) => updateAssessmentScore(classId, assessment.id, student.id, score)}
                      />
                    ))}

                    <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">{runningGwa(student.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!quarterAssessments.length ? (
            <p className="text-sm text-slate-500">
              No assessment columns yet. Click <span className="font-medium text-slate-700">Add Quiz</span>, <span className="font-medium text-slate-700">Add Exam</span>, or another type to start this quarter.
            </p>
          ) : null}
        </section>
      ) : null}

      {activeTab === "risk" ? (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">At-Risk Students</h3>
              <p className="mt-1 text-sm text-slate-500">
                Risk scores combine attendance and academic signals visible to teachers. Sorted highest first. Counseling data is excluded.
              </p>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{riskSummaries.length} students</p>
          </div>

          {riskSummaries.length === 0 ? (
            <p className="text-sm text-slate-500">No students in this class yet.</p>
          ) : (
            <div className="space-y-3">
              {riskSummaries.map((risk) => {
                const bandColor =
                  risk.band === "High"
                    ? "bg-rose-100 text-rose-700 border-rose-200"
                    : risk.band === "Moderate"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200";

                return (
                  <div key={risk.studentId} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{risk.studentName}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${bandColor}`}>
                          {risk.band} Risk
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">LRN {risk.lrn}</p>
                      <div className="mt-3 space-y-2">
                        {risk.factors.slice(0, 2).map((factor) => (
                          <div key={factor.label} className="flex items-start gap-2">
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                factor.tone === "high" ? "bg-rose-500" : factor.tone === "medium" ? "bg-amber-500" : "bg-slate-400"
                              }`}
                            />
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">{factor.label}</span> — {factor.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Score</p>
                        <p className="text-2xl font-semibold text-slate-900">{risk.score}</p>
                      </div>
                      <Link
                        href={studentRiskHref(activeClass.id, risk.studentId)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        View profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "behavioral" ? (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Behavioral Log</h3>
            <p className="mt-1 text-sm text-slate-500">
              Record a classroom observation. Behavioral records are visible to the counselor and contribute to the student's case file.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">New incident</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm text-slate-700">
                <span className="font-medium">Student</span>
                <select
                  value={behaviorStudentId}
                  onChange={(e) => setBehaviorStudentId(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">Select a student</option>
                  {activeClass.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm text-slate-700">
                <span className="font-medium">Date</span>
                <input
                  type="date"
                  value={behaviorDate}
                  onChange={(e) => setBehaviorDate(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </label>

              <label className="block space-y-1 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <select
                  value={behaviorCategory}
                  onChange={(e) => setBehaviorCategory(e.target.value as BehaviorCategory)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  {(["Academic", "Attendance", "Behavioral", "Social-Emotional"] as BehaviorCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm text-slate-700">
                <span className="font-medium">Severity</span>
                <select
                  value={behaviorSeverity}
                  onChange={(e) => setBehaviorSeverity(e.target.value as BehaviorSeverity)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  {(["Low", "Moderate", "High"] as BehaviorSeverity[]).map((sev) => (
                    <option key={sev} value={sev}>
                      {sev}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block space-y-1 text-sm text-slate-700">
              <span className="font-medium">Description</span>
              <textarea
                value={behaviorDescription}
                onChange={(e) => setBehaviorDescription(e.target.value)}
                rows={3}
                placeholder="Describe the incident briefly..."
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <button
              type="button"
              onClick={submitBehaviorIncident}
              disabled={!behaviorStudentId || !behaviorDescription.trim()}
              className="mt-3 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Log Incident
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Incident log</p>
            {activeClass.behavioralIncidents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No behavioral incidents logged yet for this class.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {activeClass.behavioralIncidents.map((incident) => {
                  const student = activeClass.students.find((s) => s.id === incident.studentId);
                  const sevColor =
                    incident.severity === "High"
                      ? "bg-rose-100 text-rose-700"
                      : incident.severity === "Moderate"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600";

                  return (
                    <div key={incident.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{student?.name ?? "Unknown student"}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                            {incident.category}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${sevColor}`}>
                            {incident.severity}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{incident.date}</p>
                      <p className="mt-2 text-sm text-slate-600">{incident.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ScoreCell({
  value,
  onChange,
}: {
  value?: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <td className="px-4 py-4 align-top">
      <input
        type="number"
        min={0}
        max={100}
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value === "" ? null : Math.max(0, Math.min(100, Number(event.target.value)));
          onChange(nextValue);
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
      />
    </td>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800"
      : "bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border border-slate-200 px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
