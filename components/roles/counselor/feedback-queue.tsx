"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCounselorStore } from "./counselor-store";
import type { FeedbackNoteType } from "./counselor-store";

function noteTypeBadge(type: FeedbackNoteType) {
  if (type === "Revision Request") return "bg-rose-100 text-rose-700";
  if (type === "Observation") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function FeedbackQueue() {
  const store = useCounselorStore();
  const [incorporating, setIncorporating] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState("");
  const [filterType, setFilterType] = useState<FeedbackNoteType | "All">("All");

  const pending = useMemo(() => {
    let notes = store.getPendingFeedbackNotes();
    if (filterType !== "All") notes = notes.filter((n) => n.type === filterType);
    return notes;
  }, [store, filterType]);

  const allNotes = useMemo(() => {
    return store.interventions.flatMap((iv) =>
      iv.notes
        .filter((n) => n.status !== "Pending")
        .map((n) => ({ ...n, interventionId: iv.id, studentIds: iv.targetStudentIds })),
    );
  }, [store.interventions]);

  const handleAcknowledge = (ivId: string, noteId: string) => {
    store.acknowledgeNote(ivId, noteId);
  };

  const handleStartIncorporate = (noteId: string) => {
    setIncorporating(noteId);
    setRevisionText("");
  };

  const handleConfirmIncorporate = (ivId: string, noteId: string) => {
    store.incorporateNote(ivId, noteId);
    setIncorporating(null);
    setRevisionText("");
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Counselor</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Feedback Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review observation notes and revision requests submitted by teachers. Act on each item to keep plans up to date.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Notes", value: store.getPendingFeedbackNotes().length, color: "text-amber-600" },
          { label: "Revision Requests", value: store.getPendingFeedbackNotes().filter((n) => n.type === "Revision Request").length, color: "text-rose-600" },
          { label: "Observations", value: store.getPendingFeedbackNotes().filter((n) => n.type === "Observation").length, color: "text-blue-600" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{m.label}</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Note Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FeedbackNoteType | "All")}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="All">All Types</option>
            <option value="Observation">Observation</option>
            <option value="Revision Request">Revision Request</option>
            <option value="Outcome Observation">Outcome Observation</option>
          </select>
        </div>
        <p className="ml-auto text-xs text-slate-400">{pending.length} pending item{pending.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Pending notes */}
      <div>
        <p className="mb-4 text-sm font-semibold text-slate-700">
          Pending ({pending.length})
        </p>
        {pending.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-400">
            No pending feedback items.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((note) => {
              const intervention = store.interventions.find((iv) => iv.id === note.interventionId);
              const studentNames = note.studentIds
                .map((sid) => store.getStudentById(sid)?.name ?? sid)
                .join(", ");

              return (
                <div
                  key={note.id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm ${note.type === "Revision Request" ? "border-rose-200" : "border-slate-200"}`}
                >
                  <div className="mb-3 flex flex-wrap items-start gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${noteTypeBadge(note.type)}`}>
                      {note.type}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-800">
                        Student: {studentNames}
                      </span>
                      <span className="text-xs text-slate-500">
                        from <span className="font-medium">{note.authorName}</span> ({note.authorRole})
                        {intervention && ` · Plan: ${intervention.type}`}
                      </span>
                    </div>
                    <span className="ml-auto text-xs text-slate-400">{fmt(note.createdAt)}</span>
                  </div>

                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 leading-relaxed">
                    {note.content}
                  </div>

                  {note.type === "Revision Request" && (
                    <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      This is a revision request. If you incorporate it, please update the intervention plan to reflect the changes.
                    </div>
                  )}

                  {incorporating === note.id ? (
                    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800">Incorporate Note</p>
                      <textarea
                        value={revisionText}
                        onChange={(e) => setRevisionText(e.target.value)}
                        placeholder="Describe the revision or action taken based on this note…"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmIncorporate(note.interventionId, note.id)}
                          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                        >
                          Confirm Incorporate
                        </button>
                        <button
                          onClick={() => setIncorporating(null)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAcknowledge(note.interventionId, note.id)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleStartIncorporate(note.id)}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                      >
                        Incorporate
                      </button>
                      <Link
                        href={`/counselor/interventions`}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        View Plan
                      </Link>
                      {note.studentIds[0] && (
                        <Link
                          href={`/counselor/students/${note.studentIds[0]}`}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Student Profile
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actioned notes */}
      {allNotes.length > 0 && (
        <div>
          <p className="mb-4 text-sm font-semibold text-slate-500">Actioned ({allNotes.length})</p>
          <div className="flex flex-col gap-3">
            {allNotes.map((note) => {
              const studentNames = note.studentIds
                .map((sid) => store.getStudentById(sid)?.name ?? sid)
                .join(", ");
              return (
                <div key={note.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${noteTypeBadge(note.type)}`}>{note.type}</span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-slate-700">{studentNames}</span>
                    <span className="text-xs text-slate-500">{note.content.slice(0, 80)}{note.content.length > 80 ? "…" : ""}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${note.status === "Incorporated" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {note.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
