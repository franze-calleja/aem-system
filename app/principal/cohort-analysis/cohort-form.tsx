"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SchoolYear = { id: string; label: string; isActive: boolean };

export default function CohortForm({
  gradeOptions,
  allYears,
  selectedGrade,
  selectedYearIds,
  hasSlices,
  csvHref,
}: {
  gradeOptions: string[];
  allYears: SchoolYear[];
  selectedGrade: string | undefined;
  selectedYearIds: string[];
  hasSlices: boolean;
  csvHref: string;
}) {
  const router = useRouter();
  const [grade, setGrade] = useState(selectedGrade ?? gradeOptions[0] ?? "");
  const [yearIds, setYearIds] = useState<string[]>(selectedYearIds);

  const toggleYear = (id: string) => {
    setYearIds((prev) =>
      prev.includes(id) ? prev.filter((y) => y !== id) : [...prev, id],
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (yearIds.length > 0) params.set("years", yearIds.join(","));
    router.push(`/principal/cohort-analysis?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Grade level
          </span>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {gradeOptions.length === 0 && (
              <option value="">(no sections in any year)</option>
            )}
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            School years
          </legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {allYears.map((y) => (
              <label
                key={y.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={yearIds.includes(y.id)}
                  onChange={() => toggleYear(y.id)}
                />
                <span>
                  {y.label}
                  {y.isActive ? " (active)" : ""}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Update view
        </button>
        {hasSlices && (
          <a
            href={csvHref}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
        )}
      </div>
    </form>
  );
}
