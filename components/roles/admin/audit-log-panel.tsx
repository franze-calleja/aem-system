"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { auditLog, type AuditEntry } from "@/lib/mock-data";
import { adminNav } from "./admin-nav";

const ACTION_TYPES = ["login", "view", "create", "update", "delete", "approve", "import", "export", "config", "override"] as const;
const TARGET_TYPES = [...new Set(auditLog.map((e) => e.targetType))];

function actionColor(action: AuditEntry["action"]) {
  const m: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700", delete: "bg-red-100 text-red-700",
    approve: "bg-blue-100 text-blue-700", override: "bg-purple-100 text-purple-700",
    import: "bg-amber-100 text-amber-700", update: "bg-slate-100 text-slate-700",
    view: "bg-slate-50 text-slate-400", login: "bg-slate-50 text-slate-400",
    export: "bg-amber-50 text-amber-600", config: "bg-indigo-100 text-indigo-700",
  };
  return m[action] ?? "bg-slate-100 text-slate-700";
}

export default function AdminAuditLog() {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState<string>("all");
  const [search, setSearch] = useState("");

  const userIds = [...new Set(auditLog.map((e) => e.userId))];

  const filtered = auditLog
    .filter((e) => filterAction === "all" || e.action === filterAction)
    .filter((e) => filterTarget === "all" || e.targetType === filterTarget)
    .filter((e) => !search || `${e.userId} ${e.detail} ${e.targetId ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <PageShell badge="A" title="Admin" schoolYear="SY 2024-2025" theme="indigo" navItems={adminNav}>
      <PageHeader
        backHref="/admin"
        backLabel="Admin workspace"
        title="Audit Log"
        description="All system actions are recorded here. The log is append-only and cannot be edited. Retained for 7 years per DepEd policy."
      />

      <div className="flex flex-wrap gap-3">
        <input type="search" placeholder="Search user, detail, or target ID…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-50 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All actions</option>
          {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All targets</option>
          {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="flex items-center text-xs text-slate-500">{filtered.length} entries</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Target</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Detail</th>
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
                <td className="px-4 py-3 text-xs text-slate-600">{entry.targetType}{entry.targetId ? ` · ${entry.targetId}` : ""}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{entry.detail}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No entries match filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
