"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { auditLog, type AuditEntry } from "@/lib/mock-data";
import { principalNav } from "./principal-nav";

const ACTIONS = ["login", "view", "create", "update", "delete", "approve", "import", "export", "config", "override"] as const;

export default function PrincipalGovernance() {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSubmitted, setOverrideSubmitted] = useState(false);

  const userIds = [...new Set(auditLog.map((e) => e.userId))];

  const filtered = auditLog
    .filter((e) => filterAction === "all" || e.action === filterAction)
    .filter((e) => filterUser === "all" || e.userId === filterUser)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  function actionColor(action: AuditEntry["action"]) {
    const map: Record<string, string> = {
      create: "bg-emerald-100 text-emerald-700",
      delete: "bg-red-100 text-red-700",
      approve: "bg-blue-100 text-blue-700",
      override: "bg-purple-100 text-purple-700",
      import: "bg-amber-100 text-amber-700",
      update: "bg-slate-100 text-slate-700",
      view: "bg-slate-50 text-slate-500",
      login: "bg-slate-50 text-slate-500",
      export: "bg-amber-50 text-amber-600",
      config: "bg-indigo-100 text-indigo-700",
    };
    return map[action] ?? "bg-slate-100 text-slate-700";
  }

  return (
    <PageShell badge="P" title="Dr. Pedro Villareal" schoolYear="SY 2024-2025" theme="amber" navItems={principalNav}>
      <PageHeader
        backHref="/principal"
        backLabel="Principal workspace"
        title="Governance Review"
        description="Audit trails, risk score overrides, and accountability records. All entries are append-only and cannot be edited or deleted."
      />

      {/* Risk override form */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold text-amber-900 mb-1">Log risk score override</h2>
        <p className="text-xs text-amber-700 mb-3">Use this when you override an algorithmic risk score. A written justification is mandatory and will appear in the audit log.</p>
        {overrideSubmitted ? (
          <p className="text-sm font-semibold text-emerald-700">✓ Override logged in audit trail.</p>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={3}
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Describe the reason for overriding the score, the student context, and what outcome you expect…"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm resize-none"
            />
            <button
              type="button"
              disabled={!overrideNote.trim()}
              onClick={() => setOverrideSubmitted(true)}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition"
            >
              Submit override
            </button>
          </div>
        )}
      </section>

      {/* Audit log */}
      <section>
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="all">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="all">All users</option>
            {userIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} entries</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Target</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{entry.timestamp.replace("T", " ").slice(0, 19)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-800">{entry.userId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${actionColor(entry.action)}`}>{entry.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{entry.targetType} {entry.targetId ? `· ${entry.targetId}` : ""}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{entry.detail}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No audit entries match filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          Audit entries are append-only. No entry can be modified or deleted. All actions by any role are recorded automatically. Risk overrides require a written justification (recorded above). The governance log is retained for 7 years per DepEd policy.
        </p>
      </div>
    </PageShell>
  );
}
