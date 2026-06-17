"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveInterventionAction,
  rejectInterventionAction,
} from "@/app/actions/principal/interventions";

export default function ApprovalActions({ interventionId }: { interventionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveInterventionAction({ interventionId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Provide a reason for rejection.");
      return;
    }
    startTransition(async () => {
      const result = await rejectInterventionAction({ interventionId, reason: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReason("");
      setShowRejectForm(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-emerald-700 disabled:bg-emerald-300"
        >
          {pending ? "Working…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => setShowRejectForm((v) => !v)}
          disabled={pending}
          className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          {showRejectForm ? "Cancel" : "Reject"}
        </button>
      </div>

      {showRejectForm && (
        <form onSubmit={handleReject} className="flex flex-col gap-2">
          <label htmlFor={`reject-reason-${interventionId}`} className="text-xs font-medium text-slate-600">
            Reason (required — recorded as a significant revision)
          </label>
          <textarea
            id={`reject-reason-${interventionId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            disabled={pending}
            className="w-full resize-y rounded-lg border border-slate-200 p-2 text-sm disabled:bg-slate-50"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || reason.trim().length === 0}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-rose-700 disabled:bg-rose-300"
            >
              {pending ? "Working…" : "Confirm reject"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
