"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { schoolYears, type SchoolYear } from "@/lib/mock-data";
import { adminNav } from "./admin-nav";

export default function AdminSchoolYear() {
  const [years, setYears] = useState<SchoolYear[]>(schoolYears);

  function setActive(id: string) {
    setYears((prev) => prev.map((y) => ({ ...y, active: y.id === id })));
  }

  return (
    <PageShell badge="A" title="Admin" schoolYear="SY 2024-2025" theme="indigo" navItems={adminNav}>
      <PageHeader
        backHref="/admin"
        backLabel="Admin workspace"
        title="School Year Setup"
        description="Configure active school year, quarters, and grade/section structure. Only one school year can be active at a time."
        actions={
          <button type="button" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            + New school year
          </button>
        }
      />

      <div className="space-y-4">
        {years.map((year) => (
          <article key={year.id} className={`rounded-2xl border p-5 ${year.active ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">{year.label}</h2>
                  {year.active && (
                    <span className="inline-flex rounded-full bg-indigo-600 text-white px-2.5 py-0.5 text-xs font-semibold">Active</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{year.startDate} → {year.endDate}</p>
              </div>
              {!year.active && (
                <button type="button" onClick={() => setActive(year.id)}
                  className="rounded-xl border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition">
                  Set active
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {year.quarters.map((q) => (
                <div key={q.number} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-600">Q{q.number}</p>
                  <p className="mt-1 text-xs text-slate-500">{q.startDate}</p>
                  <p className="text-xs text-slate-500">→ {q.endDate}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
