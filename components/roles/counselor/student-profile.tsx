"use client";

import Link from "next/link";
import { useState } from "react";
import { useCounselorStore } from "./counselor-store";
import type { CounselorStudent, RiskBand, SELAssessment } from "./counselor-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RiskBadge({ band }: { band: RiskBand }) {
  const cls =
    band === "High"
      ? "bg-rose-100 text-rose-700"
      : band === "Moderate"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {band} Risk
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Academic Trends Tab ──────────────────────────────────────────────────────

function AcademicTrendsTab({ student }: { student: CounselorStudent }) {
  const subjects = [...new Set(student.grades.map((g) => g.subject))];
  const quarters: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  // SVG line chart per subject
  const W = 340;
  const H = 140;
  const padX = 36;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const colors = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444"];

  return (
    <div className="flex flex-col gap-6">
      {/* Grade table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</th>
              {quarters.map((q) => (
                <th key={q} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Q{q}</th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">GWA</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, si) => {
              const rows = quarters.map((q) => {
                const entry = student.grades.find((g) => g.subject === subject && g.quarter === q);
                return entry ? entry.score : null;
              });
              const validRows = rows.filter((r): r is number => r !== null);
              const gwa = validRows.length > 0 ? validRows.reduce((t, n) => t + n, 0) / validRows.length : null;
              return (
                <tr key={subject} className={`border-b border-slate-50 ${si % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{subject}</td>
                  {rows.map((score, qi) => (
                    <td key={qi} className={`px-4 py-2.5 text-center tabular-nums ${score !== null && score < 75 ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                      {score !== null ? score : "—"}
                    </td>
                  ))}
                  <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${gwa !== null && gwa < 75 ? "text-rose-600" : "text-slate-700"}`}>
                    {gwa !== null ? gwa.toFixed(1) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SVG line chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quarter-over-Quarter Trend</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg">
          {/* Y-axis guides */}
          {[60, 70, 80, 90, 100].map((y) => {
            const sy = padY + innerH - ((y - 55) / 45) * innerH;
            return (
              <g key={y}>
                <line x1={padX} x2={W - padX} y1={sy} y2={sy} stroke="#e2e8f0" strokeWidth={0.5} />
                <text x={padX - 4} y={sy + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{y}</text>
              </g>
            );
          })}
          {/* X-axis labels */}
          {quarters.map((q, i) => {
            const sx = padX + (i / (quarters.length - 1)) * innerW;
            return (
              <text key={q} x={sx} y={H - 2} textAnchor="middle" fontSize={9} fill="#94a3b8">Q{q}</text>
            );
          })}
          {/* Lines */}
          {subjects.map((subject, si) => {
            const points = quarters.map((q, qi) => {
              const entry = student.grades.find((g) => g.subject === subject && g.quarter === q);
              const score = entry ? entry.score : null;
              if (score === null) return null;
              const sx = padX + (qi / (quarters.length - 1)) * innerW;
              const sy = padY + innerH - ((score - 55) / 45) * innerH;
              return { sx, sy, score };
            });
            const validPoints = points.filter((p): p is NonNullable<typeof p> => p !== null);
            const path = validPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx} ${p.sy}`).join(" ");
            return (
              <g key={subject}>
                <path d={path} fill="none" stroke={colors[si % colors.length]} strokeWidth={1.5} />
                {validPoints.map((p, i) => (
                  <circle key={i} cx={p.sx} cy={p.sy} r={3} fill={colors[si % colors.length]} />
                ))}
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {subjects.map((subject, si) => (
            <div key={subject} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: colors[si % colors.length] }} />
              <span className="text-xs text-slate-500">{subject}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Heatmap Tab ────────────────────────────────────────────────────

function AttendanceTab({ student }: { student: CounselorStudent }) {
  const total = student.attendance.length;
  const absent = student.attendance.filter((a) => a.status === "absent").length;
  const tardy = student.attendance.filter((a) => a.status === "tardy").length;
  const excused = student.attendance.filter((a) => a.status === "excused").length;
  const present = student.attendance.filter((a) => a.status === "present").length;
  const absenceRate = total > 0 ? ((absent / total) * 100).toFixed(1) : "0.0";
  const attendanceRate = total > 0 ? (((present + excused) / total) * 100).toFixed(1) : "100.0";

  // Day-of-week heatmap
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayAbsences = Array.from({ length: 7 }, (_, d) => {
    const dayEntries = student.attendance.filter((a) => new Date(a.date).getDay() === d);
    const absents = dayEntries.filter((a) => a.status === "absent").length;
    const total = dayEntries.length;
    return { day: d, rate: total > 0 ? (absents / total) * 100 : 0, count: absents, total };
  });

  // Monthly breakdown
  const monthlyData = student.attendance.reduce(
    (acc, a) => {
      const month = a.date.slice(0, 7);
      if (!acc[month]) acc[month] = { present: 0, absent: 0, tardy: 0, excused: 0 };
      acc[month][a.status]++;
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Attendance Rate", value: `${attendanceRate}%`, color: "text-emerald-600" },
          { label: "Absence Rate", value: `${absenceRate}%`, color: absent > total * 0.15 ? "text-rose-600" : "text-amber-600" },
          { label: "Tardy Days", value: tardy, color: "text-amber-600" },
          { label: "Excused", value: excused, color: "text-slate-500" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{m.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Day-of-week heatmap */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Absence Pattern by Day of Week</p>
        <div className="flex gap-2">
          {dayAbsences.map(({ day, rate, count, total: dayTotal }) => {
            const intensity = Math.min(rate / 40, 1);
            const bgStyle = `rgba(239, 68, 68, ${0.1 + intensity * 0.7})`;
            return (
              <div key={day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="flex h-12 w-full items-center justify-center rounded-xl text-xs font-bold"
                  style={{ background: bgStyle, color: intensity > 0.5 ? "#7f1d1d" : "#64748b" }}
                  title={`${dayTotal} school days, ${count} absent (${rate.toFixed(0)}%)`}
                >
                  {rate > 0 ? `${rate.toFixed(0)}%` : "–"}
                </div>
                <span className="text-xs text-slate-500">{dayNames[day]}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Red intensity indicates the absence rate for that day of week. Higher intensity = more frequent absences.
        </p>
      </div>

      {/* Monthly breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monthly Breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left text-xs text-slate-500">Month</th>
                <th className="pb-2 text-center text-xs text-slate-500">Present</th>
                <th className="pb-2 text-center text-xs text-slate-500">Absent</th>
                <th className="pb-2 text-center text-xs text-slate-500">Tardy</th>
                <th className="pb-2 text-center text-xs text-slate-500">Excused</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyData).map(([month, counts]) => (
                <tr key={month} className="border-b border-slate-50">
                  <td className="py-1.5 font-medium text-slate-700">{new Date(month + "-01").toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</td>
                  <td className="py-1.5 text-center tabular-nums text-emerald-600">{counts.present ?? 0}</td>
                  <td className={`py-1.5 text-center font-semibold tabular-nums ${(counts.absent ?? 0) > 3 ? "text-rose-600" : "text-slate-600"}`}>{counts.absent ?? 0}</td>
                  <td className="py-1.5 text-center tabular-nums text-amber-600">{counts.tardy ?? 0}</td>
                  <td className="py-1.5 text-center tabular-nums text-slate-500">{counts.excused ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Counseling Notes Tab ─────────────────────────────────────────────────────

function CounselingNotesTab({ student }: { student: CounselorStudent }) {
  const store = useCounselorStore();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleAdd = () => {
    if (!draft.trim()) return;
    store.addNote(student.id, draft.trim());
    setDraft("");
  };

  const handleStartEdit = (noteId: string, content: string) => {
    setEditingId(noteId);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      store.updateNote(student.id, editingId, editContent.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Counselor-only notice */}
      <div className="flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
        <span className="mt-0.5 text-violet-500">🔒</span>
        <p className="text-xs text-violet-700">
          These notes are <strong>counselor-only</strong>. Content is never shared with teachers, principal, or the student profile visible outside the counseling module.
        </p>
      </div>

      {/* Add note form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">New Note</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Enter a private counseling note…"
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40"
          >
            Save Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {student.notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
          No counseling notes yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...student.notes].reverse().map((note) => (
            <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">{fmt(note.createdAt)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartEdit(note.id, note.content)}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => store.deleteNote(student.id, note.id)}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingId === note.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{note.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SEL Tab ──────────────────────────────────────────────────────────────────

const SEL_DIMENSIONS: SELAssessment["dimension"][] = [
  "Self-Awareness",
  "Self-Management",
  "Social Awareness",
  "Relationship Skills",
  "Responsible Decision-Making",
];

function SELTab({ student }: { student: CounselorStudent }) {
  const store = useCounselorStore();
  const [form, setForm] = useState<{ dimension: SELAssessment["dimension"]; score: number; notes: string; date: string }>({
    dimension: "Self-Awareness",
    score: 3,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [adding, setAdding] = useState(false);

  const handleSubmit = () => {
    store.addSEL(student.id, form);
    setForm({ dimension: "Self-Awareness", score: 3, date: new Date().toISOString().slice(0, 10), notes: "" });
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Composite scores per dimension */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SEL Composite by Dimension</p>
        <div className="flex flex-col gap-2">
          {SEL_DIMENSIONS.map((dim) => {
            const entries = student.sel.filter((s) => s.dimension === dim);
            const avg = entries.length > 0 ? entries.reduce((t, s) => t + s.score, 0) / entries.length : null;
            return (
              <div key={dim} className="flex items-center gap-3">
                <span className="w-48 text-xs text-slate-600 truncate">{dim}</span>
                <div className="flex flex-1 items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    {avg !== null && (
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">
                    {avg !== null ? `${avg.toFixed(1)}/5` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add assessment */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Assessment History</p>
        <button
          onClick={() => setAdding(true)}
          className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
        >
          Record Assessment
        </button>
      </div>

      {adding && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Dimension</label>
              <select
                value={form.dimension}
                onChange={(e) => setForm((f) => ({ ...f, dimension: e.target.value as SELAssessment["dimension"] }))}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              >
                {SEL_DIMENSIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Score (1–5)</label>
              <select
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              >
                {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} — {["Needs Support", "Developing", "Approaching", "Meeting", "Exceeding"][s - 1]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional observations…"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSubmit} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600">
              Save Assessment
            </button>
            <button onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {student.sel.length === 0 ? (
        <p className="text-sm text-slate-400">No SEL assessments recorded.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {[...student.sel].reverse().map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{s.dimension}</p>
                {s.notes && <p className="text-xs text-slate-500">{s.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{fmt(s.date)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.score >= 4 ? "bg-emerald-100 text-emerald-700" : s.score >= 3 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"}`}>
                  {s.score}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Behavioral Tab ───────────────────────────────────────────────────────────

function BehavioralTab({ student }: { student: CounselorStudent }) {
  const sevColor = (s: string) =>
    s === "High" ? "bg-rose-100 text-rose-700" : s === "Moderate" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";

  return (
    <div className="flex flex-col gap-4">
      {student.behavioral.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-400">
          No behavioral incidents on record.
        </div>
      ) : (
        student.behavioral.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sevColor(b.severity)}`}>{b.severity}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{b.category}</span>
              </div>
              <span className="text-xs text-slate-400">{fmt(b.date)}</span>
            </div>
            <p className="text-sm text-slate-700">{b.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Interventions Tab ────────────────────────────────────────────────────────

function InterventionsTab({ student }: { student: CounselorStudent }) {
  const store = useCounselorStore();
  const studentInterventions = store.getInterventionsForStudent(student.id);

  const statusColor = (s: string) =>
    s === "Active" ? "bg-blue-100 text-blue-700" : s === "Planned" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{studentInterventions.length} intervention{studentInterventions.length !== 1 ? "s" : ""} on record</p>
        <Link
          href={`/counselor/interventions?studentId=${student.id}`}
          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
        >
          New Plan
        </Link>
      </div>
      {studentInterventions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-400">
          No interventions for this student.
        </div>
      ) : (
        studentInterventions.map((iv) => (
          <div key={iv.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(iv.status)}`}>{iv.status}</span>
                <span className="text-sm font-semibold text-slate-700">{iv.type}</span>
              </div>
              <span className="text-xs text-slate-400">{iv.startDate} → {iv.endDate}</span>
            </div>
            <p className="mb-2 text-xs text-slate-600">{iv.description}</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Scope: <span className="font-medium">{iv.scope}</span></span>
              <span>Sessions: <span className="font-medium">{iv.sessionCount}</span></span>
              <span>Frequency: <span className="font-medium">{iv.frequency}</span></span>
            </div>
            {iv.notes.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Feedback Notes ({iv.notes.length})</p>
                {iv.notes.slice(0, 2).map((n) => (
                  <div key={n.id} className="mb-1 flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 rounded px-1.5 py-0.5 font-semibold ${n.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{n.status}</span>
                    <span className="text-slate-600">{n.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Risk Explainability Tab ───────────────────────────────────────────────────

function RiskExplainabilityTab({ student }: { student: CounselorStudent }) {
  const dimColors: Record<string, string> = {
    "Academic": "bg-blue-100 text-blue-700",
    "Attendance": "bg-amber-100 text-amber-800",
    "Behavioral & SEL": "bg-rose-100 text-rose-700",
    "Intervention History": "bg-violet-100 text-violet-700",
    "Profile": "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Narrative */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk Narrative</p>
        <p className="text-sm leading-relaxed text-slate-700">{student.risk.narrative}</p>
      </div>

      {/* Factors */}
      <div className="flex flex-col gap-3">
        {student.risk.factors.sort((a, b) => b.weight - a.weight).map((f) => (
          <div key={f.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${dimColors[f.dimension] ?? "bg-slate-100 text-slate-600"}`}>{f.dimension}</span>
              <span className="text-sm font-semibold text-slate-700">{f.label}</span>
              <span className="ml-auto text-xs font-semibold text-slate-400">{f.weight}% weight</span>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${f.weight * 2}%` }} />
            </div>
            <p className="text-xs text-slate-600">{f.detail}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Score computed at {fmt(student.risk.computedAt)}. Risk assessment reflects all available data at that time and should be interpreted alongside counselor judgment.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = "academic" | "attendance" | "notes" | "sel" | "behavioral" | "interventions" | "risk";

const TABS: { id: TabId; label: string }[] = [
  { id: "academic", label: "Academic Trends" },
  { id: "attendance", label: "Attendance" },
  { id: "notes", label: "Counseling Notes" },
  { id: "sel", label: "SEL" },
  { id: "behavioral", label: "Behavioral" },
  { id: "interventions", label: "Interventions" },
  { id: "risk", label: "Risk Explainability" },
];

export default function StudentProfile({ studentId }: { studentId: string }) {
  const store = useCounselorStore();
  const [activeTab, setActiveTab] = useState<TabId>("academic");

  const student = store.getStudentById(studentId);

  if (!student) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <p className="text-slate-500">Student not found.</p>
        <Link href="/counselor/caseload" className="text-amber-600 underline text-sm">Back to caseload</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back */}
      <Link href="/counselor/caseload" className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
        ← Back to Caseload
      </Link>

      {/* Student header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700 ring-2 ring-amber-200">
          {student.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
            <RiskBadge band={student.risk.band} />
            {student.spedStatus && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">SPED</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span>LRN: <span className="font-medium text-slate-700">{student.lrn}</span></span>
            <span>{student.gradeLevel}</span>
            <span>Section {student.section}</span>
            <span>{student.sex}</span>
            <span>{student.learningModality}</span>
            <span>{student.schoolYear}</span>
          </div>
        </div>
        {/* Risk score card */}
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Risk Score</p>
          <p className={`text-4xl font-bold tabular-nums ${student.risk.band === "High" ? "text-rose-600" : student.risk.band === "Moderate" ? "text-amber-600" : "text-emerald-600"}`}>
            {student.risk.score}
          </p>
          <p className="text-xs text-slate-500">out of 100</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-slate-200 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "academic" && <AcademicTrendsTab student={student} />}
        {activeTab === "attendance" && <AttendanceTab student={student} />}
        {activeTab === "notes" && <CounselingNotesTab student={student} />}
        {activeTab === "sel" && <SELTab student={student} />}
        {activeTab === "behavioral" && <BehavioralTab student={student} />}
        {activeTab === "interventions" && <InterventionsTab student={student} />}
        {activeTab === "risk" && <RiskExplainabilityTab student={student} />}
      </div>
    </div>
  );
}
