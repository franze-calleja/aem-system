"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  getStudentById,
  interventions,
  recommendationDrafts,
  riskBandColor,
  riskBandLabel,
  getRiskAssessmentByStudentId,
  type RecommendationDraft,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

function statusColor(status: RecommendationDraft["status"]) {
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "converted") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function CounselorRecommendations() {
  const [drafts, setDrafts] = useState<RecommendationDraft[]>(recommendationDrafts);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = drafts
    .filter((d) => filterStatus === "all" || d.status === filterStatus)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  function convertToIntervention(draftId: string) {
    setDrafts((prev) => prev.map((d) => d.id === draftId ? { ...d, status: "converted" as const } : d));
  }

  function dismissDraft(draftId: string) {
    setDrafts((prev) => prev.map((d) => d.id === draftId ? { ...d, status: "dismissed" as const } : d));
  }

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Recommendation Drafts"
        description="AI-assisted intervention recommendations based on risk patterns. Review each draft, modify as needed, then convert to an active intervention plan or dismiss."
      />

      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <p className="text-xs text-rose-700">
          <strong>AI literacy note:</strong> These recommendations are algorithmically generated from risk scores and pattern data. They are drafts only — the counselor bears full decision authority. Converting a draft into an intervention is a deliberate act of professional judgment.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(["all", "pending", "converted", "dismissed"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${filterStatus === s ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} drafts</span>
      </div>

      <div className="space-y-4">
        {filtered.map((draft) => {
          const student = getStudentById(draft.studentId);
          const ra = getRiskAssessmentByStudentId(draft.studentId);
          return (
            <article key={draft.id} className={`rounded-2xl border p-5 ${statusColor(draft.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${draft.status === "pending" ? "border-amber-300" : draft.status === "converted" ? "border-emerald-300" : "border-slate-300"}`}>
                      {draft.status}
                    </span>
                    {ra && (
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskBandColor(ra.band)}`}>
                        {riskBandLabel(ra.band)} · {ra.score}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{student?.firstName} {student?.lastName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Generated {draft.generatedAt.split("T")[0]} · {draft.source}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">Suggested approach</p>
                  <p className="text-sm text-slate-700 leading-6">{draft.summary}</p>
                </div>
                {draft.reasoning && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">Reasoning</p>
                    <p className="text-sm text-slate-600 leading-6">{draft.reasoning}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">Suggested interventions</p>
                  <ul className="list-disc list-inside space-y-1">
                    {draft.suggestedStrategies.map((strategy, i) => (
                      <li key={i} className="text-sm text-slate-700">{strategy}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {draft.status === "pending" && (
                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={() => convertToIntervention(draft.id)}
                    className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition">
                    Convert to intervention plan
                  </button>
                  <button type="button" onClick={() => dismissDraft(draft.id)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                    Dismiss
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-400">No drafts match the current filter.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
