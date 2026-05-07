"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import { staffUsers, type StaffUser } from "@/lib/mock-data";
import { adminNav } from "./admin-nav";

const ROLES = ["admin", "teacher", "counselor", "principal"] as const;

function statusBadge(status: StaffUser["status"]) {
  return status === "active"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-500";
}

export default function AdminUsers() {
  const [users, setUsers] = useState<StaffUser[]>(staffUsers);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = users
    .filter((u) => filterRole === "all" || u.role === filterRole)
    .filter((u) => filterStatus === "all" || u.status === filterStatus)
    .filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u),
    );
  }

  return (
    <PageShell badge="A" title="Admin" schoolYear="SY 2024-2025" theme="indigo" navItems={adminNav}>
      <PageHeader
        backHref="/admin"
        backLabel="Admin workspace"
        title="User Management"
        description="Create, update, and manage staff accounts. Role assignments control data access levels."
        actions={
          <button type="button" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            + Add user
          </button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input type="search" placeholder="Search by name or email…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-50 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="flex items-center text-xs text-slate-500">{filtered.length} users</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-medium capitalize">{user.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(user.status)}`}>{user.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{user.createdAt.split("T")[0]}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button type="button" onClick={() => toggleStatus(user.id)}
                      className={`text-xs font-medium ${user.status === "active" ? "text-red-600 hover:text-red-800" : "text-emerald-600 hover:text-emerald-800"}`}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No users match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
