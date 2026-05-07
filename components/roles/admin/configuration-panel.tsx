"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { systemConfig, type SystemConfig } from "@/lib/mock-data";
import { adminNav } from "./admin-nav";

export default function AdminConfiguration() {
  const [config, setConfig] = useState<SystemConfig>(systemConfig);
  const [saved, setSaved] = useState(false);

  function toggleRule(id: string) {
    setConfig((prev) => ({
      ...prev,
      patternRules: prev.patternRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r),
    }));
    setSaved(false);
  }

  function updateThreshold(name: string, value: number) {
    setConfig((prev) => ({
      ...prev,
      thresholds: prev.thresholds.map((t) => t.name === name ? { ...t, value } : t),
    }));
    setSaved(false);
  }

  function save() { setSaved(true); }

  const patternScopes = [...new Set(config.patternRules.map((r) => r.scope))];
  const totalWeight = config.riskWeights.reduce((s, w) => s + w.weight, 0);

  return (
    <PageShell badge="A" title="Admin" schoolYear="SY 2024-2025" theme="indigo" navItems={adminNav}>
      <PageHeader
        backHref="/admin"
        backLabel="Admin workspace"
        title="System Configuration"
        description="Adjust risk score weights, classification thresholds, and pattern detection rules. All changes are logged in the audit trail."
        actions={
          <button type="button" onClick={save} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            {saved ? "✓ Saved" : "Save changes"}
          </button>
        }
      />

      {/* Risk Weights */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Risk score weights</h2>
          <span className={`text-xs font-semibold ${totalWeight === 100 ? "text-emerald-700" : "text-red-700"}`}>Total: {totalWeight}%</span>
        </div>
        <div className="space-y-4">
          {config.riskWeights.map((w) => (
            <div key={w.dimension}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-800">{w.dimension}</span>
                <span className="font-semibold text-indigo-700">{w.weight}%</span>
              </div>
              <p className="text-xs text-slate-500 mb-1">{w.description}</p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-400" style={{ width: `${w.weight}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">Weight editing requires principal approval. Contact system administrator to adjust.</p>
      </section>

      {/* Thresholds */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Classification thresholds</h2>
        <div className="space-y-3">
          {config.thresholds.map((t) => (
            <div key={t.name} className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500">{t.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={t.value}
                  onChange={(e) => updateThreshold(t.name, Number(e.target.value))}
                  className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-center font-semibold text-slate-900" />
                <span className="text-xs text-slate-500">{t.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pattern rules */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Pattern detection rules</h2>
        {patternScopes.map((scope) => (
          <div key={scope} className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{scope}</h3>
            <div className="space-y-2">
              {config.patternRules.filter((r) => r.scope === scope).map((rule) => (
                <div key={rule.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <button type="button" onClick={() => toggleRule(rule.id)}
                    className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition flex items-center justify-center ${rule.enabled ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"}`}>
                    {rule.enabled && <span className="text-xs leading-none">✓</span>}
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${rule.enabled ? "text-slate-900" : "text-slate-400"}`}>{rule.name}</p>
                    <p className="text-xs text-slate-500">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Changes to thresholds or pattern rules may affect risk classifications retroactively. Re-running the risk model is required for changes to take effect. All saved changes are logged in the audit trail with your account.
        </p>
      </div>
    </PageShell>
  );
}
