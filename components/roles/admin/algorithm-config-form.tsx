"use client";

import { useTransition } from "react";
import { saveAlgorithmConfigAction } from "@/app/actions/admin/algorithm";
import type { AlgorithmConfigRow } from "@/app/admin/algorithm/page";

interface Props {
  current: AlgorithmConfigRow;
}

const RULES = [
  { key: "ACADEMIC_DECLINE_CLUSTER", label: "Academic Decline Cluster", field: "ruleAcademicDeclineCluster" },
  { key: "DISENGAGEMENT_SIGNAL", label: "Disengagement Signal", field: "ruleDisengagementSignal" },
  { key: "CRISIS_WARNING", label: "Crisis Warning", field: "ruleCrisisWarning" },
  { key: "RECOVERY_TRACKING", label: "Recovery Tracking", field: "ruleRecoveryTracking" },
  { key: "CHRONIC_CONCERN", label: "Chronic Concern", field: "ruleChronicConcern" },
  { key: "CONCENTRATED_RISK", label: "Concentrated Risk (section)", field: "ruleConcentratedRisk" },
  { key: "SUBJECT_STRUGGLE", label: "Subject Struggle (section)", field: "ruleSubjectStruggle" },
  { key: "ATTENDANCE_EROSION", label: "Attendance Erosion (section)", field: "ruleAttendanceErosion" },
] as const;

export default function AlgorithmConfigForm({ current }: Props) {
  const [pending, startTransition] = useTransition();
  const weights = current.weights as Record<string, number>;
  const thresholds = current.thresholds as Record<string, number>;
  const ruleConfig = current.ruleConfig as Record<string, boolean>;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveAlgorithmConfigAction(formData);
      if (result.ok) {
        // Reload to show new version
        window.location.reload();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Weights */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Dimension weights</h2>
        <p className="text-xs text-slate-500 mb-4">
          Enter values 0–100 (percentage points). The engine normalises them, so they don&apos;t need to sum to 100.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { name: "weightAcademic", label: "Academic", key: "academic" },
            { name: "weightAttendance", label: "Attendance", key: "attendance" },
            { name: "weightBehavioral", label: "Behavioral", key: "behavioral" },
            { name: "weightInterventionHistory", label: "Intervention History", key: "interventionHistory" },
            { name: "weightProfile", label: "Profile (SPED / Modality)", key: "profile" },
          ].map(({ name, label, key }) => (
            <label key={name} className="flex flex-col gap-1">
              <span className="text-sm text-slate-700">{label}</span>
              <input
                type="number"
                name={name}
                min={0}
                max={100}
                step={1}
                defaultValue={Math.round((weights[key] ?? 0) * 100)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
            </label>
          ))}
        </div>
      </div>

      {/* Thresholds */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Band thresholds</h2>
        <p className="text-xs text-slate-500 mb-4">Scores at or above High threshold → HIGH. At or above Moderate → MODERATE. Otherwise → LOW.</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-700">Moderate minimum score</span>
            <input
              type="number"
              name="thresholdModerate"
              min={1}
              max={98}
              step={1}
              defaultValue={thresholds.moderateMin ?? 40}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-700">High minimum score</span>
            <input
              type="number"
              name="thresholdHigh"
              min={2}
              max={99}
              step={1}
              defaultValue={thresholds.highMin ?? 70}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              required
            />
          </label>
        </div>
      </div>

      {/* Rule toggles */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Pattern rules</h2>
        <p className="text-xs text-slate-500 mb-4">Enable or disable each pattern detection rule for the next computation run.</p>
        <div className="space-y-2">
          {RULES.map(({ key, label, field }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name={field}
                defaultChecked={ruleConfig[key] ?? true}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Justification */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Change justification</h2>
        <p className="text-xs text-slate-500 mb-4">Required. Written rationale is stored in the audit trail (governance requirement).</p>
        <textarea
          name="justification"
          rows={3}
          required
          minLength={10}
          placeholder="Why are these weights/thresholds appropriate for this school year?"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save as new version"}
        </button>
        <p className="text-xs text-slate-400">
          Saving creates a new immutable version and deactivates the current one.
        </p>
      </div>
    </form>
  );
}
