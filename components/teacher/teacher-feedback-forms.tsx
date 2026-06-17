"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logSessionAction,
  submitOutcomeObservationAction,
  submitRevisionRequestAction,
} from "@/app/actions/teacher/intervention-feedback";

type Tab = "OBSERVATION" | "REVISION_REQUEST" | "OUTCOME_OBSERVATION";

const TAB_META: Record<Tab, { label: string; placeholder: string }> = {
  OBSERVATION: {
    label: "Log session / observation",
    placeholder: "What you observed during a session you ran or in your classroom.",
  },
  REVISION_REQUEST: {
    label: "Request revision",
    placeholder: "What needs to change about this plan, and why.",
  },
  OUTCOME_OBSERVATION: {
    label: "Outcome observation",
    placeholder: "Indicators that the intervention is working (or not) for the student.",
  },
};

const ACTIONS: Record<Tab, (input: unknown) => Promise<{ ok: true; noteId: string } | { ok: false; error: string }>> = {
  OBSERVATION: logSessionAction,
  REVISION_REQUEST: submitRevisionRequestAction,
  OUTCOME_OBSERVATION: submitOutcomeObservationAction,
};

export default function TeacherFeedbackForms({ interventionId }: { interventionId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("OBSERVATION");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Content is required.");
      return;
    }
    startTransition(async () => {
      const result = await ACTIONS[tab]({ interventionId, content: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContent("");
      setSuccess(`Submitted to counselor (${TAB_META[tab].label}).`);
      router.refresh();
    });
  }

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(TAB_META) as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
                setSuccess(null);
              }}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {TAB_META[t].label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={TAB_META[tab].placeholder}
          rows={3}
          disabled={pending}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm placeholder:text-slate-400 disabled:bg-slate-100"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Routed to the owning counselor&apos;s feedback queue.
          </p>
          <button
            type="submit"
            disabled={pending || content.trim().length === 0}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {success}
          </p>
        )}
      </form>
    </div>
  );
}
