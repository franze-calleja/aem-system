"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createSchoolYearAction,
  activateSchoolYearAction,
  createSectionAction,
  createSubjectAction,
} from "@/app/actions/admin/setup";

type YearRow = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sectionCount: number;
  subjectCount: number;
  enrollmentCount: number;
};

type SectionRow = {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYearId: string;
  enrollmentCount: number;
};

type SubjectRow = {
  id: string;
  code: string;
  name: string;
  schoolYearId: string;
};

type Props = {
  years: YearRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
};

export default function SetupManager({ years, sections, subjects }: Props) {
  const defaultYearId =
    years.find((y) => y.isActive)?.id ?? years[0]?.id ?? "";
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId);
  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId) ?? null,
    [years, selectedYearId],
  );
  const yearSections = useMemo(
    () => sections.filter((s) => s.schoolYearId === selectedYearId),
    [sections, selectedYearId],
  );
  const yearSubjects = useMemo(
    () => subjects.filter((s) => s.schoolYearId === selectedYearId),
    [subjects, selectedYearId],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">School setup</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create and activate school years, then add the sections and subjects each year offers.
          Exactly one school year is active at a time — activating a year deactivates the previous one.
        </p>
      </section>

      <SchoolYearsCard years={years} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sections &amp; subjects</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick the year you want to edit. Changes are scoped to that year.
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">School year</span>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {years.length === 0 && <option value="">No years yet</option>}
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                  {y.isActive ? " · current" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedYear ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <SectionsPanel year={selectedYear} sections={yearSections} />
            <SubjectsPanel year={selectedYear} subjects={yearSubjects} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Create a school year above to start adding sections and subjects.</p>
        )}
      </section>
    </div>
  );
}

function SchoolYearsCard({ years }: { years: YearRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const r = await createSchoolYearAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(`Created ${String(fd.get("label"))}`);
      form.reset();
    });
  };

  const handleActivate = (id: string) => {
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.set("schoolYearId", id);
    startTransition(async () => {
      const r = await activateSchoolYearAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">School years</h2>
      <p className="mt-1 text-sm text-slate-600">Each year scopes sections, subjects, enrollments, grades, attendance, and behavioral records.</p>

      <form onSubmit={handleCreate} className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Label</span>
          <input
            name="label"
            required
            maxLength={40}
            placeholder="SY 2026-2027"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Starts</span>
          <input
            name="startDate"
            type="date"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Ends</span>
          <input
            name="endDate"
            type="date"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" name="activate" className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
          <span className="text-sm text-slate-700">Set as current</span>
        </label>
        <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3">
          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <button
            type="submit"
            disabled={pending}
            className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create school year"}
          </button>
        </div>
      </form>

      <ul className="mt-5 divide-y divide-slate-100">
        {years.map((y) => (
          <li key={y.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-slate-900">
                {y.label}
                {y.isActive && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Current
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {y.startDate} → {y.endDate} · {y.sectionCount} section(s) · {y.subjectCount} subject(s) · {y.enrollmentCount} enrollment(s)
              </p>
            </div>
            {!y.isActive && (
              <button
                type="button"
                onClick={() => handleActivate(y.id)}
                disabled={pending}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
              >
                Set as current
              </button>
            )}
          </li>
        ))}
        {years.length === 0 && <li className="py-3 text-sm text-slate-500">No school years yet.</li>}
      </ul>
    </section>
  );
}

function SectionsPanel({ year, sections }: { year: YearRow; sections: SectionRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("schoolYearId", year.id);
    setError(null);
    startTransition(async () => {
      const r = await createSectionAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      form.reset();
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Sections</h3>
      <form onSubmit={handleCreate} className="mt-3 grid gap-2">
        <input
          name="gradeLevel"
          placeholder="Grade level (e.g. Grade 9)"
          required
          maxLength={40}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          name="name"
          placeholder="Section name (e.g. Newton)"
          required
          maxLength={40}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add section"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      <ul className="mt-4 divide-y divide-slate-200">
        {sections.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className="font-medium text-slate-900">{s.gradeLevel} · {s.name}</p>
              <p className="text-xs text-slate-500">{s.enrollmentCount} enrollment(s)</p>
            </div>
          </li>
        ))}
        {sections.length === 0 && <li className="py-2 text-xs text-slate-500">No sections yet for {year.label}.</li>}
      </ul>
    </div>
  );
}

function SubjectsPanel({ year, subjects }: { year: YearRow; subjects: SubjectRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("schoolYearId", year.id);
    setError(null);
    startTransition(async () => {
      const r = await createSubjectAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      form.reset();
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Subjects</h3>
      <form onSubmit={handleCreate} className="mt-3 grid gap-2">
        <input
          name="code"
          placeholder="Code (e.g. MATH9)"
          required
          maxLength={20}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono uppercase"
        />
        <input
          name="name"
          placeholder="Name (e.g. Mathematics 9)"
          required
          maxLength={80}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add subject"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      <ul className="mt-4 divide-y divide-slate-200">
        {subjects.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className="font-mono text-xs font-semibold text-slate-700">{s.code}</p>
              <p className="text-slate-700">{s.name}</p>
            </div>
          </li>
        ))}
        {subjects.length === 0 && <li className="py-2 text-xs text-slate-500">No subjects yet for {year.label}.</li>}
      </ul>
    </div>
  );
}
