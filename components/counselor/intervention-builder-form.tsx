"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInterventionAction } from "@/app/actions/counselor/interventions";
import type {
  InterventionTargets,
  RecommendationPrefill,
} from "@/lib/intervention/queries";

const SCOPE_OPTIONS = [
  { value: "STUDENT", label: "Individual", description: "Activates on save." },
  { value: "SECTION", label: "Section", description: "Requires principal approval." },
  { value: "GRADE", label: "Grade level", description: "Requires principal approval." },
  { value: "SCHOOL", label: "School-wide", description: "Requires principal approval." },
] as const;

const TYPE_OPTIONS = [
  "ACADEMIC_SUPPORT",
  "COUNSELING_SESSION",
  "IMMEDIATE_COUNSELING",
  "POSITIVE_REINFORCEMENT",
  "CASE_REVIEW",
  "SECTION_INTERVENTION",
  "SUBJECT_REMEDIATION",
  "ATTENDANCE_PROGRAM",
] as const;

type Scope = (typeof SCOPE_OPTIONS)[number]["value"];

type Props = {
  targets: InterventionTargets;
  prefill: RecommendationPrefill | null;
};

const TODAY = new Date().toISOString().slice(0, 10);

export default function InterventionBuilderForm({ targets, prefill }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialScope: Scope = (prefill?.scope as Scope) ?? "STUDENT";
  const initialType = mapSuggestedType(prefill?.suggestedType);

  const [scope, setScope] = useState<Scope>(initialScope);
  const [scopeTargetId, setScopeTargetId] = useState<string>(prefill?.scopeTargetId ?? "");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>(initialType);
  const [startDate, setStartDate] = useState<string>(TODAY);
  const [endDate, setEndDate] = useState<string>("");
  const [schedule, setSchedule] = useState<string>("");
  const [accommodations, setAccommodations] = useState<string>("");
  const [staffActions, setStaffActions] = useState<string>("");
  const [targetOutcomes, setTargetOutcomes] = useState<string>("");
  const [rationale, setRationale] = useState<string>(prefill?.rationale ?? "");
  const [counselingContext, setCounselingContext] = useState<string>("");

  const needsApproval = scope !== "STUDENT";

  const targetField = useMemo(() => {
    switch (scope) {
      case "STUDENT":
        return (
          <SearchableSelect
            key={`student-${scope}`}
            options={targets.students.map((s) => ({ id: s.id, label: `${s.label} — ${s.sectionLabel}` }))}
            value={scopeTargetId}
            onChange={setScopeTargetId}
            placeholder="Search student by name or section…"
            disabled={pending}
          />
        );
      case "SECTION":
        return (
          <SearchableSelect
            key={`section-${scope}`}
            options={targets.sections.map((s) => ({ id: s.id, label: s.label }))}
            value={scopeTargetId}
            onChange={setScopeTargetId}
            placeholder="Search section…"
            disabled={pending}
          />
        );
      case "GRADE":
        return (
          <select
            value={scopeTargetId}
            onChange={(e) => setScopeTargetId(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
            required
          >
            <option value="">Select a grade level…</option>
            {targets.gradeLevels.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        );
      case "SCHOOL":
        return (
          <input
            type="text"
            readOnly
            value="School-wide (all active enrollments)"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-500"
          />
        );
    }
  }, [scope, scopeTargetId, targets, pending]);

  function handleScopeChange(next: Scope) {
    setScope(next);
    setScopeTargetId(next === "SCHOOL" ? "school" : "");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const payload = {
      scope,
      scopeTargetId: scope === "SCHOOL" ? "school" : scopeTargetId,
      type,
      startDate,
      endDate: endDate || undefined,
      schedule: schedule || undefined,
      accommodations: accommodations || undefined,
      staffActions: staffActions || undefined,
      targetOutcomes: targetOutcomes || undefined,
      rationale,
      counselingContext: counselingContext || undefined,
      triggeringRecommendationId: prefill?.source === "REFERRAL" ? undefined : prefill?.id,
      triggeringReferralId: prefill?.source === "REFERRAL" ? prefill?.id : undefined,
    };

    startTransition(async () => {
      const result = await createInterventionAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/counselor/interventions/${result.interventionId}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Scope
        </legend>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {SCOPE_OPTIONS.map((opt) => {
            const active = scope === opt.value;
            return (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-xl border p-3 text-sm ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value={opt.value}
                  checked={active}
                  onChange={() => handleScopeChange(opt.value)}
                  className="sr-only"
                />
                <p className="font-semibold">{opt.label}</p>
                <p className={`mt-1 text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                  {opt.description}
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Target
          </label>
          {targetField}
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Intervention type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPE_OPTIONS)[number])}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
            required
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            End date (optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
          />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Public plan fields
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Visible to teachers and advisers with scope access.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextAreaField
            label="Schedule"
            value={schedule}
            setValue={setSchedule}
            placeholder="e.g. Tues/Thurs 3:30pm"
            disabled={pending}
          />
          <TextAreaField
            label="Accommodations"
            value={accommodations}
            setValue={setAccommodations}
            placeholder="e.g. extended testing time"
            disabled={pending}
          />
          <TextAreaField
            label="Staff actions"
            value={staffActions}
            setValue={setStaffActions}
            placeholder="What teachers should do."
            disabled={pending}
          />
          <TextAreaField
            label="Target outcomes"
            value={targetOutcomes}
            setValue={setTargetOutcomes}
            placeholder="What success looks like."
            disabled={pending}
          />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Sensitive — counselor + principal only
        </h3>
        <p className="mt-1 text-[11px] text-amber-700/80">
          Rationale and counseling context are stripped from teacher and admin views at the query layer.
        </p>
        <div className="mt-3 grid gap-3">
          <TextAreaField
            label="Rationale"
            required
            value={rationale}
            setValue={setRationale}
            placeholder="Why this plan, in your own words."
            disabled={pending}
            minRows={3}
          />
          <TextAreaField
            label="Counseling context (optional)"
            value={counselingContext}
            setValue={setCounselingContext}
            placeholder="Counseling-derived background that should not be visible to teachers."
            disabled={pending}
            minRows={3}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {needsApproval
            ? "On save: status PENDING_APPROVAL → routed to principal."
            : "On save: status ACTIVE → effective immediately."}
        </p>
        <button
          type="submit"
          disabled={pending || (scope !== "SCHOOL" && !scopeTargetId)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Saving…" : needsApproval ? "Submit for approval" : "Save & activate"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

function TextAreaField({
  label,
  value,
  setValue,
  placeholder,
  disabled,
  required,
  minRows = 2,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  minRows?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={minRows}
        className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm placeholder:text-slate-400 disabled:bg-slate-50"
      />
    </div>
  );
}

// ── Searchable combobox ────────────────────────────────────────────────────

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative mt-1">
      <input
        type="text"
        value={open ? query : (selected?.label ?? "")}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(""); // clear selection when user starts typing
        }}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-400">No matches</li>
          ) : (
            filtered.map((o) => (
              <li
                key={o.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused so blur doesn't fire
                  onChange(o.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-slate-100 ${
                  o.id === value ? "bg-slate-50 font-semibold" : ""
                }`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// Algorithm output uses short slugs like "ACADEMIC_TUTORING"; map them to our
// stricter intervention type enum. Unknown values fall through to a sensible
// default so the counselor can override.
function mapSuggestedType(slug?: string): (typeof TYPE_OPTIONS)[number] {
  if (!slug) return "ACADEMIC_SUPPORT";
  const upper = slug.toUpperCase();
  if (TYPE_OPTIONS.includes(upper as (typeof TYPE_OPTIONS)[number])) {
    return upper as (typeof TYPE_OPTIONS)[number];
  }
  if (upper.includes("ATTENDANCE")) return "ATTENDANCE_PROGRAM";
  if (upper.includes("COUNSEL")) return "COUNSELING_SESSION";
  if (upper.includes("REMEDIA")) return "SUBJECT_REMEDIATION";
  if (upper.includes("REINFORCE")) return "POSITIVE_REINFORCEMENT";
  if (upper.includes("REVIEW")) return "CASE_REVIEW";
  return "ACADEMIC_SUPPORT";
}
