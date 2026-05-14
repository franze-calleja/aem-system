"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  addAssignmentAction,
  removeAssignmentAction,
} from "@/app/actions/admin/users";
import type { Role, UserStatus } from "@prisma/client";

type YearOption = {
  id: string;
  label: string;
  isActive: boolean;
  sections: { id: string; gradeLevel: string; name: string }[];
  subjects: { id: string; code: string; name: string }[];
};

type AssignmentRow = {
  id: string;
  isAdviser: boolean;
  schoolYearLabel: string;
  schoolYearId: string;
  section: { id: string; label: string };
  subject: { id: string; label: string } | null;
};

type Props = {
  user: { id: string; email: string; name: string; role: Role; status: UserStatus };
  years: YearOption[];
  assignments: AssignmentRow[];
};

export default function UserAssignmentsPanel({ user, years, assignments }: Props) {
  const isTeacher = user.role === "TEACHER";
  const defaultYearId = years.find((y) => y.isActive)?.id ?? years[0]?.id ?? "";

  const [yearId, setYearId] = useState(defaultYearId);
  const year = useMemo(() => years.find((y) => y.id === yearId) ?? null, [years, yearId]);

  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isAdviser, setIsAdviser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isTeacher) return;
    if (!sectionId || !yearId) {
      setError("Pick a school year and section.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.set("userId", user.id);
    fd.set("schoolYearId", yearId);
    fd.set("sectionId", sectionId);
    if (subjectId) fd.set("subjectId", subjectId);
    if (isAdviser) fd.set("isAdviser", "true");

    startTransition(async () => {
      const r = await addAssignmentAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSectionId("");
      setSubjectId("");
      setIsAdviser(false);
    });
  };

  const handleRemove = (assignmentId: string) => {
    setError(null);
    const fd = new FormData();
    fd.set("assignmentId", assignmentId);
    startTransition(async () => {
      const r = await removeAssignmentAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <Link href="/admin/users" className="text-xs font-medium text-slate-500 hover:text-slate-700">
          ← Back to users
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 md:text-2xl">{user.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.email} · {user.role} · {user.status === "ACTIVE" ? "Active" : "Suspended"}
        </p>
      </section>

      {!isTeacher ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Section assignments only apply to teacher accounts.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Add an assignment</h2>
            <p className="mt-1 text-sm text-slate-600">
              Leave the subject blank to assign an adviser-only seat. Mark the adviser flag
              when this teacher is the section&apos;s homeroom adviser.
            </p>

            <form onSubmit={handleAdd} className="mt-4 grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  School year
                </span>
                <select
                  value={yearId}
                  onChange={(e) => {
                    setYearId(e.target.value);
                    setSectionId("");
                    setSubjectId("");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                      {y.isActive ? " · current" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Section
                </span>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">— pick a section —</option>
                  {year?.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.gradeLevel} · {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Subject (optional)
                </span>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— adviser only —</option>
                  {year?.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={isAdviser}
                  onChange={(e) => setIsAdviser(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="text-sm text-slate-700">Adviser of this section</span>
              </label>

              <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3">
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button
                  type="submit"
                  disabled={pending}
                  className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Add assignment"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Current assignments</h2>
            {assignments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No assignments yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {assignments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{a.section.label}</p>
                      <p className="text-slate-600">
                        {a.subject?.label ?? "Adviser-only seat"} · {a.schoolYearLabel}
                        {a.isAdviser && (
                          <span className="ml-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            Adviser
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(a.id)}
                      disabled={pending}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
