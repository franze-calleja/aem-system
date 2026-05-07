"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  behavioralIncidents,
  enrollments,
  getStudentById,
  sections,
  severityColor,
  type BehavioralIncident,
} from "@/lib/mock-data";

const TEACHER_SECTION_IDS = ["9-newton", "11-einstein"];

const teacherNavItems = [
  { label: "Overview", href: "/teacher", icon: "home" as const },
  { label: "My Classes", href: "/teacher/my-classes", icon: "folder" as const },
  { label: "At-Risk Students", href: "/teacher/at-risk", icon: "alert" as const },
  { label: "Behavioral Log", href: "/teacher/behavioral", icon: "clipboard" as const },
  { label: "Interventions & Feedback", href: "/teacher/interventions", icon: "message" as const },
];

const CATEGORIES = ["academic", "behavioral", "attendance", "social", "other"] as const;
type Category = (typeof CATEGORIES)[number];

const emptyForm = {
  studentId: "",
  date: new Date().toISOString().split("T")[0],
  category: "behavioral" as Category,
  severity: "minor" as "minor" | "moderate" | "serious",
  description: "",
  actionTaken: "",
};

export default function TeacherBehavioral() {
  const teacherEnrollments = enrollments.filter(
    (e) => TEACHER_SECTION_IDS.includes(e.sectionId) && e.schoolYearId === "sy-2024-2025",
  );
  const studentIds = teacherEnrollments.map((e) => e.studentId);

  const [incidents, setIncidents] = useState<BehavioralIncident[]>(
    behavioralIncidents.filter((i) => studentIds.includes(i.studentId)),
  );
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = incidents
    .filter((i) => filterCategory === "all" || i.category === filterCategory)
    .filter((i) => filterSeverity === "all" || i.severity === filterSeverity)
    .sort((a, b) => b.date.localeCompare(a.date));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newIncident: BehavioralIncident = {
      id: `bi-new-${Date.now()}`,
      ...form,
      reportedBy: "t1",
      schoolYearId: "sy-2024-2025",
    };
    setIncidents((prev) => [newIncident, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
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
        title="Behavioral Log"
        description="Track incidents, actions taken, and patterns for students in your sections. Entries feed into the system's risk computation."
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            {showForm ? "Cancel" : "+ Log incident"}
          </button>
        }
      />

      {/* New incident form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-emerald-900">Log new incident</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Student</label>
              <select
                required
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select student…</option>
                {teacherEnrollments.map((enr) => {
                  const student = getStudentById(enr.studentId);
                  if (!student) return null;
                  return (
                    <option key={enr.studentId} value={enr.studentId}>
                      {student.lastName}, {student.firstName}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as "minor" | "moderate" | "serious" }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="serious">Serious</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Description</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What happened?"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Action taken</label>
              <textarea
                rows={2}
                value={form.actionTaken}
                onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))}
                placeholder="How did you respond?"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save incident</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${filterCategory === c ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All severities</option>
          <option value="minor">Minor</option>
          <option value="moderate">Moderate</option>
          <option value="serious">Serious</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Incident table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Section</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((incident) => {
              const student = getStudentById(incident.studentId);
              const enr = teacherEnrollments.find((e) => e.studentId === incident.studentId);
              const sec = sections.find((s) => s.id === enr?.sectionId);
              return (
                <tr key={incident.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">{incident.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {student ? `${student.lastName}, ${student.firstName}` : incident.studentId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{sec?.name ?? enr?.sectionId ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{incident.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${severityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{incident.description}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  No incidents match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
