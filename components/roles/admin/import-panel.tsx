"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { adminNav } from "./admin-nav";

type Step = "select" | "validate" | "preview" | "confirm" | "done";

const DATA_TYPES = [
  { id: "students", label: "Student roster", description: "LRN, name, sex, date of birth, modality, section" },
  { id: "grades", label: "Academic grades", description: "Quarterly grades per subject per student" },
  { id: "attendance", label: "Attendance records", description: "Daily presence/absence/tardy data" },
  { id: "behavioral", label: "Behavioral incidents", description: "Incident logs with category and severity" },
  { id: "interventions", label: "Historical interventions", description: "Past intervention records for carryover" },
] as const;

const MOCK_PREVIEW = [
  { lrn: "202400001", name: "Cruz, Miguel Santos", sex: "M", section: "9-Newton", valid: true },
  { lrn: "202400002", name: "Reyes, Ana Maria", sex: "F", section: "9-Newton", valid: true },
  { lrn: "202400003", name: "", sex: "M", section: "9-Darwin", valid: false },
  { lrn: "202400004", name: "Santos, Juana", sex: "F", section: "9-Darwin", valid: true },
];

export default function AdminImport() {
  const [step, setStep] = useState<Step>("select");
  const [selectedType, setSelectedType] = useState<string>("");

  const validCount = MOCK_PREVIEW.filter((r) => r.valid).length;
  const invalidCount = MOCK_PREVIEW.filter((r) => !r.valid).length;

  return (
    <PageShell badge="A" title="Admin" schoolYear="SY 2024-2025" theme="indigo" navItems={adminNav}>
      <PageHeader
        backHref="/admin"
        backLabel="Admin workspace"
        title="Import Wizard"
        description="Import student rosters and academic data via CSV. Each step validates data before committing."
      />

      {/* Progress steps */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["select", "validate", "preview", "confirm", "done"] as Step[]).map((s, i) => {
          const steps: Step[] = ["select", "validate", "preview", "confirm", "done"];
          const currentIdx = steps.indexOf(step);
          const stepIdx = steps.indexOf(s);
          const done = stepIdx < currentIdx;
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-indigo-600 text-white" : active ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400" : "bg-slate-100 text-slate-400"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs capitalize ${active ? "font-semibold text-slate-900" : "text-slate-400"}`}>{s}</span>
              {i < 4 && <span className="text-slate-300">→</span>}
            </div>
          );
        })}
      </div>

      {step === "select" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Select data type to import</h2>
          <div className="space-y-3">
            {DATA_TYPES.map((dt) => (
              <label key={dt.id} className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${selectedType === dt.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="dataType" value={dt.id} checked={selectedType === dt.id}
                  onChange={(e) => setSelectedType(e.target.value)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{dt.label}</p>
                  <p className="text-xs text-slate-500">{dt.description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" disabled={!selectedType} onClick={() => setStep("validate")}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
              Next: Upload file →
            </button>
          </div>
        </section>
      )}

      {step === "validate" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Upload CSV file</h2>
          <p className="text-xs text-slate-500 mb-4">Uploading: <strong>{DATA_TYPES.find((d) => d.id === selectedType)?.label}</strong></p>
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center hover:border-indigo-300 transition cursor-pointer"
            onClick={() => setStep("preview")}>
            <p className="text-sm text-slate-500">Click to select CSV file or drag and drop</p>
            <p className="mt-1 text-xs text-slate-400">.csv files only · Max 5MB</p>
            <button type="button" onClick={(e) => { e.stopPropagation(); setStep("preview"); }}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Simulate upload
            </button>
          </div>
          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setStep("select")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back</button>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Validate preview</h2>
          <div className="flex gap-4 mb-4">
            <span className="text-xs text-emerald-700 font-medium">✓ {validCount} valid rows</span>
            {invalidCount > 0 && <span className="text-xs text-red-700 font-medium">✗ {invalidCount} invalid rows</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left text-xs font-semibold text-slate-500">LRN</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-500">Name</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-500">Sex</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-500">Section</th>
                  <th className="pb-2 text-left text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MOCK_PREVIEW.map((row, i) => (
                  <tr key={i} className={row.valid ? "" : "bg-red-50"}>
                    <td className="py-2 text-slate-700">{row.lrn}</td>
                    <td className="py-2 text-slate-700">{row.name || <span className="text-red-500 italic">missing</span>}</td>
                    <td className="py-2 text-slate-700">{row.sex}</td>
                    <td className="py-2 text-slate-700">{row.section}</td>
                    <td className="py-2">
                      {row.valid
                        ? <span className="text-xs text-emerald-700 font-medium">Valid</span>
                        : <span className="text-xs text-red-700 font-medium">Error: missing name</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-between">
            <button type="button" onClick={() => setStep("validate")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700">Back</button>
            <button type="button" onClick={() => setStep("confirm")}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Confirm import →
            </button>
          </div>
        </section>
      )}

      {step === "confirm" && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900 mb-2">Confirm import</h2>
          <p className="text-sm text-amber-800">You are about to import <strong>{validCount} rows</strong> of <strong>{DATA_TYPES.find((d) => d.id === selectedType)?.label}</strong> data for <strong>SY 2024-2025</strong>. Invalid rows will be skipped.</p>
          <p className="mt-2 text-xs text-amber-700">This action will be recorded in the audit log and cannot be undone without manual data correction.</p>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => setStep("preview")} className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm text-amber-700">Back</button>
            <button type="button" onClick={() => setStep("done")}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
              Confirm and import
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="text-2xl">✓</p>
          <h2 className="mt-2 text-sm font-semibold text-emerald-900">Import successful</h2>
          <p className="mt-1 text-xs text-emerald-700">{validCount} records imported. {invalidCount} rows skipped. Audit entry created.</p>
          <button type="button" onClick={() => { setStep("select"); setSelectedType(""); }}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Import another
          </button>
        </section>
      )}
    </PageShell>
  );
}
