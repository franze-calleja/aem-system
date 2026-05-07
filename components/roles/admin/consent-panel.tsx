"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { consentRecords, students, type ConsentRecord } from "@/lib/mock-data";
import { adminNav } from "./admin-nav";

function statusBadge(s: ConsentRecord["status"]) {
  const m = { granted: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", revoked: "bg-red-100 text-red-700" };
  return m[s];
}

export default function AdminConsent() {
  const [records, setRecords] = useState<ConsentRecord[]>(consentRecords);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  function toggle(id: string, nextStatus: ConsentRecord["status"]) {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: nextStatus } : r));
  }

  const filtered = records.filter((r) => filterStatus === "all" || r.status === filterStatus);
  const counts = { granted: records.filter((r) => r.status === "granted").length, pending: records.filter((r) => r.status === "pending").length, revoked: records.filter((r) => r.status === "revoked").length };

  function studentName(studentId: string) {
    const s = students.find((st) => st.id === studentId);
    return s ? `${s.lastName}, ${s.firstName}` : studentId;
  }

  return (
    <PageShell badge="A" title="Admin" schoolYear="SY 2024-2025" theme="indigo" navItems={adminNav}>
      <PageHeader
        backHref="/admin"
        backLabel="Admin workspace"
        title="Consent Records"
        description="Track parental/guardian consent for student data processing. Students without granted consent are excluded from algorithmic risk assessment."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{counts.granted}</p>
          <p className="text-xs text-emerald-600 font-medium">Granted</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          <p className="text-xs text-amber-600 font-medium">Pending</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{counts.revoked}</p>
          <p className="text-xs text-red-600 font-medium">Revoked</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All statuses</option>
          <option value="granted">Granted</option>
          <option value="pending">Pending</option>
          <option value="revoked">Revoked</option>
        </select>
        <span className="flex items-center text-xs text-slate-500">{filtered.length} records</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Guardian</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-medium text-slate-900">{studentName(r.studentId)}</td>
                <td className="px-4 py-3 text-slate-600">{r.guardianName}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.date}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {r.status !== "granted" && (
                      <button type="button" onClick={() => toggle(r.id, "granted")} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Grant</button>
                    )}
                    {r.status === "granted" && (
                      <button type="button" onClick={() => toggle(r.id, "revoked")} className="text-xs font-medium text-red-600 hover:text-red-800">Revoke</button>
                    )}
                    {r.status === "revoked" && (
                      <button type="button" onClick={() => toggle(r.id, "pending")} className="text-xs font-medium text-amber-600 hover:text-amber-800">Reset to pending</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No records match filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          Consent records are legally binding. Revoking consent removes the student from algorithmic processing immediately. All status changes are logged in the audit trail. Guardians may re-grant consent at any time.
        </p>
      </div>
    </PageShell>
  );
}
