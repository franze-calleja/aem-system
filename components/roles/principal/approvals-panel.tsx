"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  getStudentById,
  interventions,
  interventionStatusColor,
  sections,
  type Intervention,
} from "@/lib/mock-data";
import { principalNav } from "./principal-nav";

function scopeLabel(scope: Intervention["scope"]) {
  const map: Record<Intervention["scope"], string> = {
    individual: "Individual",
    section: "Section",
    "grade-level": "Grade-level",
    "school-wide": "School-wide",
  };
  return map[scope];
}

export default function PrincipalApprovals() {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [denied, setDenied] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const pending = interventions.filter(
    (iv) => iv.requiresApproval && !iv.approvedAt && !denied.has(iv.id) && !approved.has(iv.id),
  );

  function approve(id: string) {
    setApproved((prev) => new Set([...prev, id]));
  }

  function deny(id: string) {
    setDenied((prev) => new Set([...prev, id]));
  }

  const alreadyApproved = interventions.filter((iv) => iv.approvedAt);

  return (
    <PageShell badge="P" title="Dr. Pedro Villareal" schoolYear="SY 2024-2025" theme="amber" navItems={principalNav}>
      <PageHeader
        backHref="/principal"
        backLabel="Principal workspace"
        title="Approval Queue"
        description="Interventions with section-, grade-level, or school-wide scope require principal approval before implementation. Individual plans do not require your sign-off."
      />

      {pending.length === 0 && approved.size === 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-medium text-emerald-800">All pending approvals have been processed.</p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Awaiting approval ({pending.length})</h2>
          <div className="space-y-4">
            {pending.map((iv) => {
              const student = iv.targetStudentId ? getStudentById(iv.targetStudentId) : null;
              const sec = iv.targetSectionId ? sections.find((s) => s.id === iv.targetSectionId) : null;
              return (
                <article key={iv.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-amber-600 text-white px-2.5 py-0.5 text-xs font-semibold">
                        {scopeLabel(iv.scope)} scope
                      </span>
                      <h3 className="mt-2 text-sm font-semibold text-slate-900">{iv.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Initiated by {iv.initiatedBy} · {iv.startDate}
                        {student ? ` · ${student.firstName} ${student.lastName}` : sec ? ` · ${sec.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-700">{iv.publicSummary}</p>
                  {iv.counselorNote && (
                    <p className="mt-2 text-xs text-slate-600 italic">Counselor note: {iv.counselorNote}</p>
                  )}

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Decision notes (required for denial)</label>
                    <textarea
                      rows={2}
                      value={notes[iv.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [iv.id]: e.target.value }))}
                      placeholder="Explain your decision…"
                      className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => approve(iv.id)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                      Approve
                    </button>
                    <button type="button" onClick={() => deny(iv.id)}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition">
                      Deny
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Session-approved */}
      {approved.size > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Approved this session ({approved.size})</h2>
          <div className="space-y-3">
            {[...approved].map((id) => {
              const iv = interventions.find((i) => i.id === id);
              if (!iv) return null;
              return (
                <div key={id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                  <span className="text-emerald-600 text-lg">✓</span>
                  <div>
                    <p className="text-sm font-medium text-emerald-900">{iv.title}</p>
                    <p className="text-xs text-emerald-700">{scopeLabel(iv.scope)} scope · Approved</p>
                    {notes[id] && <p className="mt-0.5 text-xs text-emerald-600">Note: {notes[id]}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Already approved (from data) */}
      {alreadyApproved.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Previously approved</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Scope</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Approved</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alreadyApproved.map((iv) => (
                  <tr key={iv.id}>
                    <td className="px-4 py-3 text-slate-900">{iv.title}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{iv.scope}</td>
                    <td className="px-4 py-3 text-slate-600">{iv.approvedAt?.split("T")[0]}</td>
                    <td className="px-4 py-3 text-slate-600">{iv.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PageShell>
  );
}
