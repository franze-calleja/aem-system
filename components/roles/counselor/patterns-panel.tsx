"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  getStudentById,
  patternMatches,
  patternSeverityColor,
  sections,
  type PatternMatch,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

type StatusFilter = "all" | "active" | "acknowledged" | "resolved";

export default function CounselorPatterns() {
  const [patterns, setPatterns] = useState<PatternMatch[]>(patternMatches);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const filtered = patterns
    .filter((p) => filterStatus === "all" || p.status === filterStatus)
    .filter((p) => filterSeverity === "all" || p.severity === filterSeverity)
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

  function acknowledge(id: string) {
    setPatterns((prev) => prev.map((p) => p.id === id ? { ...p, status: "acknowledged" as const } : p));
  }

  function resolve(id: string) {
    setPatterns((prev) => prev.map((p) => p.id === id ? { ...p, status: "resolved" as const } : p));
  }

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Pattern Alerts"
        description="System-detected patterns across students, sections, and grade levels that may require counselor attention. Acknowledge or resolve to keep the queue clean."
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(["critical", "warning", "info"] as const).map((sev) => {
          const count = patterns.filter((p) => p.severity === sev && p.status === "active").length;
          return (
            <div key={sev} className={`rounded-2xl border p-4 ${patternSeverityColor(sev)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] capitalize">{sev}</p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
              <p className="text-xs mt-0.5">active alert{count !== 1 ? "s" : ""}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(["all", "active", "acknowledged", "resolved"] as StatusFilter[]).map((s) => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${filterStatus === s ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} alerts</span>
      </div>

      <div className="space-y-4">
        {filtered.map((pattern) => {
          const sec = pattern.affectedSectionId ? sections.find((s) => s.id === pattern.affectedSectionId) : null;
          const affectedStudents = pattern.affectedStudentIds?.map((id) => getStudentById(id)).filter(Boolean) ?? [];
          return (
            <article key={pattern.id} className={`rounded-2xl border p-5 ${patternSeverityColor(pattern.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize border border-current/20 bg-white/60">
                      {pattern.severity}
                    </span>
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium border border-current/20 bg-white/60 capitalize">
                      {pattern.status}
                    </span>
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs border border-current/20 bg-white/60">
                      {pattern.scope}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold">{pattern.patternName}</h2>
                  <p className="mt-0.5 text-xs opacity-75">Detected {pattern.detectedAt.split("T")[0]}</p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6">{pattern.description}</p>

              {sec && (
                <p className="mt-2 text-xs">Section: {sec.name}</p>
              )}

              {affectedStudents.length > 0 && (
                <p className="mt-1 text-xs">
                  Students: {affectedStudents.map((s) => `${s!.firstName} ${s!.lastName}`).join(", ")}
                </p>
              )}

              <div className="mt-2 text-xs">
                Routed to: {pattern.routed.join(", ")}
              </div>

              {pattern.status === "active" && (
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => acknowledge(pattern.id)}
                    className="rounded-xl border border-current/30 bg-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white transition">
                    Acknowledge
                  </button>
                  <button type="button" onClick={() => resolve(pattern.id)}
                    className="rounded-xl bg-white/80 border border-current/30 px-3 py-1.5 text-xs font-semibold hover:bg-white transition">
                    Resolve
                  </button>
                </div>
              )}
              {pattern.status === "acknowledged" && (
                <button type="button" onClick={() => resolve(pattern.id)}
                  className="mt-4 rounded-xl border border-current/30 bg-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white transition">
                  Mark resolved
                </button>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-400">No pattern alerts match the current filter.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
