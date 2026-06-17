"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchSchoolYearAction } from "@/app/actions/school-year";

type Year = { id: string; label: string; isActive: boolean };

export default function YearSwitcher({
  years,
  selectedId,
}: {
  years: Year[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    startTransition(async () => {
      const result = await switchSchoolYearAction(id);
      if (result.ok) router.refresh();
    });
  };

  return (
    <select
      aria-label="School year"
      value={selectedId ?? ""}
      onChange={onChange}
      disabled={pending || years.length === 0}
      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
    >
      {years.length === 0 && <option value="">No years</option>}
      {years.map((y) => (
        <option key={y.id} value={y.id}>
          {y.label}
          {y.isActive ? " · current" : ""}
        </option>
      ))}
    </select>
  );
}
