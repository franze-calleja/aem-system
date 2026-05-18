"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createUserAction,
  suspendUserAction,
  reactivateUserAction,
  resetPasswordAction,
} from "@/app/actions/admin/users";
import type { Role, UserStatus } from "@prisma/client";
import type { Pagination } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  assignmentCount: number;
};

type RoleFilter = "ALL" | Role;

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  COUNSELOR: "Counselor",
  PRINCIPAL: "Principal",
};

export default function UsersManager({
  users,
  currentRole,
  pagination,
}: {
  users: UserRow[];
  currentRole: RoleFilter;
  pagination: Pagination;
}) {
  const filterHref = (role: RoleFilter) =>
    role === "ALL" ? "/admin/users" : `/admin/users?role=${role}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">User management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create staff accounts, suspend access, reset passwords, and manage teacher
          assignments. All mutations are audited.
        </p>
      </section>

      <CreateUserCard />

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>
            <p className="mt-1 text-sm text-slate-600">
              {pagination.total.toLocaleString()} matching
              {currentRole !== "ALL" ? ` ${ROLE_LABELS[currentRole]}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", "ADMIN", "TEACHER", "COUNSELOR", "PRINCIPAL"] as const).map((r) => (
              <Link
                key={r}
                href={filterHref(r)}
                prefetch={false}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  currentRole === r
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r === "ALL" ? "All" : ROLE_LABELS[r]}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Assignments</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-3 py-3 text-slate-600">{u.email}</td>
                  <td className="px-3 py-3 text-slate-700">{ROLE_LABELS[u.role]}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {u.role === "TEACHER" ? (
                      <Link href={`/admin/users/${u.id}`} className="text-indigo-700 underline-offset-2 hover:underline">
                        {u.assignmentCount} assignment{u.assignmentCount === 1 ? "" : "s"}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <UserRowActions user={u} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    No users match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <PaginationBar
            pagination={pagination}
            basePath="/admin/users"
            forwardParams={{ role: currentRole === "ALL" ? undefined : currentRole }}
          />
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status === "ACTIVE" ? "Active" : "Suspended"}
    </span>
  );
}

function CreateUserCard() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const r = await createUserAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(`Created ${String(fd.get("email"))}`);
      form.reset();
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Create a new user</h2>
      <p className="mt-1 text-sm text-slate-600">
        Password is stored using bcrypt cost 10. Share it with the user out-of-band.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Name" htmlFor="cu-name">
          <input
            id="cu-name"
            name="name"
            required
            maxLength={120}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
          />
        </Field>
        <Field label="Email" htmlFor="cu-email">
          <input
            id="cu-email"
            name="email"
            type="email"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
          />
        </Field>
        <Field label="Role" htmlFor="cu-role">
          <select
            id="cu-role"
            name="role"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
          >
            <option value="TEACHER">Teacher</option>
            <option value="COUNSELOR">Counselor</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
        <Field label="Initial password (min 8)" htmlFor="cu-pw">
          <input
            id="cu-pw"
            name="password"
            type="text"
            required
            minLength={8}
            maxLength={128}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
          />
        </Field>

        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <button
            type="submit"
            disabled={pending}
            className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function UserRowActions({ user }: { user: UserRow }) {
  const [pending, startTransition] = useTransition();
  const [resetPw, setResetPw] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuspendToggle = () => {
    setError(null);
    const fd = new FormData();
    fd.set("userId", user.id);
    startTransition(async () => {
      const r =
        user.status === "ACTIVE" ? await suspendUserAction(fd) : await reactivateUserAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (resetPw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("userId", user.id);
    fd.set("password", resetPw);
    startTransition(async () => {
      const r = await resetPasswordAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResetPw("");
      setShowReset(false);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowReset((s) => !s)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset password
        </button>
        <button
          type="button"
          onClick={handleSuspendToggle}
          disabled={pending}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
            user.status === "ACTIVE"
              ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
        </button>
      </div>
      {showReset && (
        <form onSubmit={handleReset} className="mt-1 flex items-center gap-2">
          <input
            type="text"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            placeholder="New password (min 8)"
            minLength={8}
            className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? "…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
