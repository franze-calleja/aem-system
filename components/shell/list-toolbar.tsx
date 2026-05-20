// Server-rendered search + filter toolbar for list pages. URL-state only —
// no client JS for state management. Filters render as a single GET form;
// active filters render as removable pills above the table.
//
// Usage:
//   <ListToolbar
//     basePath="/counselor/caseload"
//     searchPlaceholder="Search name or LRN…"
//     searchValue={searchQuery}
//     filters={[
//       { name: "band", label: "Risk band", value: bandFilter,
//         options: [{ value: "HIGH", label: "HIGH" }, ...] },
//       { name: "grade", label: "Grade", value: gradeFilter,
//         options: [{ value: "Grade 7", label: "Grade 7" }, ...] },
//     ]}
//   />

import Link from "next/link";

export type FilterOption = { value: string; label: string };

export type FilterSpec = {
  name: string; // query-string key
  label: string; // human label
  value: string | null; // currently selected value (null = none)
  options: FilterOption[];
};

type Props = {
  basePath: string;
  searchPlaceholder: string;
  searchName?: string; // query key for the search input (default "q")
  searchValue: string | null;
  filters?: FilterSpec[];
};

export function ListToolbar({
  basePath,
  searchPlaceholder,
  searchName = "q",
  searchValue,
  filters = [],
}: Props) {
  // Active filters (including search) → pill row above the form.
  const active: Array<{ label: string; value: string; clearHref: string; name: string }> = [];
  if (searchValue) {
    active.push({
      label: `Search`,
      value: searchValue,
      name: searchName,
      clearHref: buildHref(basePath, filters, searchName, "", searchValue, searchName),
    });
  }
  for (const f of filters) {
    if (f.value) {
      const opt = f.options.find((o) => o.value === f.value);
      active.push({
        label: f.label,
        value: opt?.label ?? f.value,
        name: f.name,
        clearHref: buildHref(basePath, filters, searchName, searchValue ?? "", "", f.name),
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form method="GET" action={basePath} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Search</span>
          <input
            type="text"
            name={searchName}
            defaultValue={searchValue ?? ""}
            placeholder={searchPlaceholder}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        {filters.map((f) => (
          <label key={f.name} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{f.label}</span>
            <select
              name={f.name}
              defaultValue={f.value ?? ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        ))}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Apply
          </button>
          {(searchValue || filters.some((f) => f.value)) && (
            <Link
              href={basePath}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
            >
              Clear all
            </Link>
          )}
        </div>
      </form>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Filters</span>
          {active.map((a) => (
            <span
              key={a.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs"
            >
              <span className="text-slate-500">{a.label}:</span>
              <span className="font-medium text-slate-800">{a.value}</span>
              <Link
                href={a.clearHref}
                className="ml-1 text-slate-400 hover:text-slate-700"
                title={`Clear ${a.label} filter`}
                aria-label={`Clear ${a.label} filter`}
              >
                ×
              </Link>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Build a URL with the given override applied (clearKey="" removes it).
function buildHref(
  basePath: string,
  filters: FilterSpec[],
  searchName: string,
  searchValue: string,
  overrideValue: string,
  overrideKey: string,
): string {
  const params = new URLSearchParams();
  if (overrideKey !== searchName && searchValue) params.set(searchName, searchValue);
  if (overrideKey === searchName && overrideValue) params.set(searchName, overrideValue);
  for (const f of filters) {
    if (f.name === overrideKey) {
      if (overrideValue) params.set(f.name, overrideValue);
    } else if (f.value) {
      params.set(f.name, f.value);
    }
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// Helper for the pagination footer — turns current search + filters into a
// `forwardParams` object that the PaginationBar can preserve when generating
// page links.
export function toForwardParams(
  searchName: string,
  searchValue: string | null,
  filters: FilterSpec[],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (searchValue) out[searchName] = searchValue;
  for (const f of filters) {
    if (f.value) out[f.name] = f.value;
  }
  return out;
}
