"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  counselingNotes,
  getStudentById,
  students,
  type CounselingNote,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

const NOTE_TYPES = ["individual", "group", "observation", "follow-up", "crisis"] as const;

const emptyForm = {
  studentId: "",
  sessionDate: new Date().toISOString().split("T")[0],
  sessionType: "individual" as typeof NOTE_TYPES[number],
  body: "",
  followUpNeeded: false,
};

export default function CounselorNotes() {
  const [notes, setNotes] = useState<CounselingNote[]>(counselingNotes);
  const [filterStudent, setFilterStudent] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = notes
    .filter((n) => filterStudent === "all" || n.studentId === filterStudent)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      setNotes((prev) => prev.map((n) => n.id === editId ? { ...n, ...form } : n));
      setEditId(null);
    } else {
      const newNote: CounselingNote = {
        id: `cn-new-${Date.now()}`,
        counselorId: "c1",
        schoolYearId: "sy-2024-2025",
        ...form,
      };
      setNotes((prev) => [newNote, ...prev]);
    }
    setForm(emptyForm);
    setShowForm(false);
  }

  function handleEdit(note: CounselingNote) {
    setForm({
      studentId: note.studentId,
      sessionDate: note.sessionDate,
      sessionType: note.sessionType as typeof NOTE_TYPES[number],
      body: note.body,
      followUpNeeded: note.followUpNeeded,
    });
    setEditId(note.id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Counseling Notes"
        description="Private notes accessible only to counselors. Not visible to teachers or the principal."
        actions={
          <button type="button" onClick={() => { setShowForm((v) => !v); setEditId(null); setForm(emptyForm); }}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
            {showForm && !editId ? "Cancel" : "+ New note"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-rose-900">{editId ? "Edit note" : "New counseling note"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Student</label>
              <select required value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Session date</label>
              <input type="date" required value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Session type</label>
              <select value={form.sessionType} onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value as typeof NOTE_TYPES[number] }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                {NOTE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="followUp" checked={form.followUpNeeded}
                onChange={(e) => setForm((f) => ({ ...f, followUpNeeded: e.target.checked }))}
                className="rounded" />
              <label htmlFor="followUp" className="text-sm text-slate-700">Follow-up needed</label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Notes (private)</label>
              <textarea required rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Session observations, key points, student state…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">Cancel</button>
            <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
              {editId ? "Update note" : "Save note"}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-3">
        <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All students</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>)}
        </select>
        <span className="flex items-center text-xs text-slate-500">{filtered.length} notes</span>
      </div>

      <div className="space-y-4">
        {filtered.map((note) => {
          const student = getStudentById(note.studentId);
          return (
            <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{student?.firstName} {student?.lastName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{note.sessionDate} · <span className="capitalize">{note.sessionType}</span></p>
                </div>
                <div className="flex gap-2">
                  {note.followUpNeeded && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Follow-up</span>
                  )}
                  <button type="button" onClick={() => handleEdit(note)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition">Edit</button>
                  <button type="button" onClick={() => handleDelete(note.id)}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition">Delete</button>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{note.body}</p>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-400">No counseling notes found.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
