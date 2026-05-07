"use client";

import { useState } from "react";
import Link from "next/link";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  getStudentById,
  interventionStatusColor,
  interventions,
  sections,
  students,
  type Intervention,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

type StatusFilter = "all" | "planned" | "active" | "completed" | "cancelled";

function scopeColor(scope: Intervention["scope"]) {
  const map: Record<Intervention["scope"], string> = {
    individual: "bg-slate-100 text-slate-700",
    section: "bg-blue-100 text-blue-700",
    "grade-level": "bg-purple-100 text-purple-700",
    "school-wide": "bg-rose-100 text-rose-700",
  };
  return map[scope];
}

export default function CounselorInterventions() {
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = interventions
    .filter((iv) => filterStatus === "all" || iv.status === filterStatus)
    .filter((iv) => filterScope === "all" || iv.scope === filterScope)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const selected = selectedId ? interventions.find((iv) => iv.id === selectedId) : null;

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Interventions"
        description="Full lifecycle management of all intervention plans. Approve, revise, log sessions, and track outcomes."
        actions={
          <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
            + New intervention
          </button>
        }
      />

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["planned", "active", "completed", "cancelled"] as const).map((s) => {
          const count = interventions.filter((iv) => iv.status === s).length;
          return (
            <button key={s} type="button" onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`rounded-2xl border p-4 text-left transition ${filterStatus === s ? "ring-2 ring-rose-400" : ""} ${interventionStatusColor(s)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] capitalize">{s}</p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All scopes</option>
          <option value="individual">Individual</option>
          <option value="section">Section</option>
          <option value="grade-level">Grade-level</option>
          <option value="school-wide">School-wide</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} interventions</span>
      </div>

      <div className={`grid gap-4 ${selected ? "lg:grid-cols-2" : ""}`}>
        {/* List */}
        <div className="space-y-3">
          {filtered.map((iv) => {
            const student = iv.targetStudentId ? getStudentById(iv.targetStudentId) : null;
            const sec = iv.targetSectionId ? sections.find((s) => s.id === iv.targetSectionId) : null;
            return (
              <button key={iv.id} type="button" onClick={() => setSelectedId(selectedId === iv.id ? null : iv.id)}
                className={`w-full text-left rounded-2xl border bg-white p-5 hover:border-slate-300 transition ${selectedId === iv.id ? "border-rose-300 ring-2 ring-rose-200" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${interventionStatusColor(iv.status)}`}>{iv.status}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${scopeColor(iv.scope)}`}>{iv.scope}</span>
                    {iv.requiresApproval && !iv.approvedAt && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Pending approval</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{iv.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {student ? `${student.firstName} ${student.lastName}` : sec?.name ?? "Multiple students"} · {iv.startDate}
                </p>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{iv.publicSummary}</p>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-400">No interventions match the current filter.</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 self-start">
            <div className="flex items-start justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-900">{selected.title}</h2>
              <button type="button" onClick={() => setSelectedId(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${interventionStatusColor(selected.status)}`}>{selected.status}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Scope</p>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${scopeColor(selected.scope)}`}>{selected.scope}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-sm text-slate-800">{selected.startDate} → {selected.endDate ?? "ongoing"}</p>
              </div>
              {selected.counselorNote && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Counselor note</p>
                  <p className="text-sm text-slate-700 leading-5">{selected.counselorNote}</p>
                </div>
              )}
              {selected.approvedAt && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs font-medium text-emerald-700">Approved {selected.approvedAt.split("T")[0]} by {selected.approvedBy}</p>
                </div>
              )}
            </div>

            {/* Sessions */}
            {selected.sessions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Sessions</p>
                <div className="space-y-2">
                  {selected.sessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs font-medium text-slate-700">{session.date}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{session.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revisions */}
            {selected.revisions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Revisions</p>
                {selected.revisions.map((rev) => (
                  <div key={rev.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3 mb-2">
                    <p className="text-xs font-medium text-amber-700">{rev.date} · {rev.changedBy}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{rev.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </PageShell>
  );
}
