"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInterventionAction } from "@/app/actions/counselor/interventions";
import { interimReviseInterventionAction } from "@/app/actions/principal/interventions";
import type { InterventionTargets } from "@/lib/intervention/queries";

const SCOPE_OPTIONS = [
  { value: "STUDENT", label: "Individual" },
  { value: "SECTION", label: "Section" },
  { value: "GRADE", label: "Grade level" },
  { value: "SCHOOL", label: "School-wide" },
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
type Mode = "counselor" | "principal-interim";

export type InterventionEditSnapshot = {
  interventionId: string;
  status: string;
  scope: Scope;
  scopeTargetId: string;
  type: (typeof TYPE_OPTIONS)[number];
  startDate: string; // yyyy-mm-dd
  endDate: string | null;
  schedule: string | null;
  accommodations: string | null;
  staffActions: string | null;
  targetOutcomes: string | null;
  rationale: string;
  counselingContext: string | null;
};

type Props = {
  mode: Mode;
  initial: InterventionEditSnapshot;
  targets: InterventionTargets;
  triggeringNoteId?: string | null;
  successHref: string; // where to redirect on save
};

export default function InterventionEditForm({
  mode,
  initial,
  targets,
  triggeringNoteId,
  successHref,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<Scope>(initial.scope);
  const [scopeTargetId, setScopeTargetId] = useState<string>(initial.scopeTargetId);
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>(initial.type);
  const [startDate, setStartDate] = useState<string>(initial.startDate);
  const [endDate, setEndDate] = useState<string>(initial.endDate ?? "");
  const [schedule, setSchedule] = useState<string>(initial.schedule ?? "");
  const [accommodations, setAccommodations] = useState<string>(initial.accommodations ?? "");
  const [staffActions, setStaffActions] = useState<string>(initial.staffActions ?? "");
  const [targetOutcomes, setTargetOutcomes] = useState<string>(initial.targetOutcomes ?? "");
  const [rationale, setRationale] = useState<string>(initial.rationale);
  const [counselingContext, setCounselingContext] = useState<string>(initial.counselingContext ?? "");
  const [reason, setReason] = useState<string>("");

  // Local "would this be significant?" hint mirrors the server-side detector
  // (scope/type/target/duration). Just a UI nudge; the server is authoritative.
  const willBeSignificant = useMemo(() => {
    if (scope !== initial.scope) return true;
    if (type !== initial.type) return true;
    if (scopeTargetId !== initial.scopeTargetId) return true;
    const beforeEnd = initial.endDate;
    const afterEnd = endDate || null;
    if (beforeEnd === null && afterEnd === null) return false;
    if (beforeEnd === null || afterEnd === null) return true;
    const diffDays = Math.abs(
      (new Date(afterEnd).getTime() - new Date(beforeEnd).getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays > 30;
  }, [scope, type, scopeTargetId, endDate, initial]);

  const willReenterApproval =
    mode === "counselor" &&
    initial.status === "ACTIVE" &&
    willBeSignificant &&
    scope !== "STUDENT";

  const targetField = useMemo(() => {
    switch (scope) {
      case "STUDENT":
        return (
          <select
            value={scopeTargetId}
            onChange={(e) => setScopeTargetId(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
            required
          >
            <option value="">Select a student…</option>
            {targets.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.sectionLabel}
              </option>
            ))}
          </select>
        );
      case "SECTION":
        return (
          <select
            value={scopeTargetId}
            onChange={(e) => setScopeTargetId(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
            required
          >
            <option value="">Select a section…</option>
            {targets.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
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

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(mode === "principal-interim" ? "Justification is required." : "Reason is required.");
      return;
    }

    startTransition(async () => {
      if (mode === "principal-interim") {
        const result = await interimReviseInterventionAction({
          interventionId: initial.interventionId,
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
          justification: trimmedReason,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await updateInterventionAction({
          interventionId: initial.interventionId,
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
          reason: trimmedReason,
          triggeringNoteId: triggeringNoteId ?? undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      router.push(successHref);
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
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Target</label>
          {targetField}
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Type</label>
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
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Start date</label>
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
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">End date (optional)</label>
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
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Public plan fields</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <TextAreaField label="Schedule" value={schedule} setValue={setSchedule} disabled={pending} />
          <TextAreaField label="Accommodations" value={accommodations} setValue={setAccommodations} disabled={pending} />
          <TextAreaField label="Staff actions" value={staffActions} setValue={setStaffActions} disabled={pending} />
          <TextAreaField label="Target outcomes" value={targetOutcomes} setValue={setTargetOutcomes} disabled={pending} />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Sensitive — counselor + principal only
        </h3>
        <div className="mt-3 grid gap-3">
          <TextAreaField
            label="Rationale"
            required
            value={rationale}
            setValue={setRationale}
            disabled={pending}
            minRows={3}
          />
          <TextAreaField
            label="Counseling context (optional)"
            value={counselingContext}
            setValue={setCounselingContext}
            disabled={pending}
            minRows={3}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {mode === "principal-interim" ? "Justification (required)" : "Reason for revision (required)"}
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          {mode === "principal-interim"
            ? "Recorded on the InterventionRevision (isInterim=true). Counselor sees this when they return."
            : "Stored on the InterventionRevision. Visible to the principal and in the audit log."}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          disabled={pending}
          required
          className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-2 text-sm disabled:bg-slate-50"
        />
      </section>

      {willReenterApproval && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This change looks significant (scope / type / target / duration &gt; 30 days). Saving will route this plan back to PENDING_APPROVAL.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {mode === "principal-interim"
            ? "Saves as an interim revision while the counselor is unavailable."
            : willReenterApproval
              ? "On save: status → PENDING_APPROVAL → routed to principal."
              : "On save: revision recorded; plan stays in its current status."}
        </p>
        <button
          type="submit"
          disabled={pending || reason.trim().length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Saving…" : mode === "principal-interim" ? "Save interim revision" : "Save revision"}
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
  disabled,
  required,
  minRows = 2,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
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
        disabled={disabled}
        required={required}
        rows={minRows}
        className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm disabled:bg-slate-50"
      />
    </div>
  );
}
