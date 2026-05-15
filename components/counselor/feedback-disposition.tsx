"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acknowledgeNoteAction,
  dismissNoteAction,
  incorporateNoteAction,
} from "@/app/actions/counselor/feedback";

export default function FeedbackDisposition({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showIncorporate, setShowIncorporate] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: (input: unknown) => Promise<{ ok: true } | { ok: false; error: string }>, payload: unknown) {
    setError(null);
    startTransition(async () => {
      const result = await action(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleIncorporate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Provide a short reason for the revision.");
      return;
    }
    startTransition(async () => {
      const result = await incorporateNoteAction({ noteId, reason: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReason("");
      setShowIncorporate(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(acknowledgeNoteAction, { noteId })}
          disabled={pending}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Acknowledge
        </button>
        <button
          type="button"
          onClick={() => setShowIncorporate((v) => !v)}
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-emerald-700 disabled:bg-emerald-300"
        >
          {showIncorporate ? "Cancel" : "Incorporate"}
        </button>
        <button
          type="button"
          onClick={() => run(dismissNoteAction, { noteId })}
          disabled={pending}
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>

      {showIncorporate && (
        <form onSubmit={handleIncorporate} className="flex flex-col gap-2">
          <label htmlFor={`incorporate-${noteId}`} className="text-xs font-medium text-slate-600">
            Reason (recorded as an InterventionRevision linked to this note)
          </label>
          <textarea
            id={`incorporate-${noteId}`}
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
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {pending ? "Saving…" : "Save revision"}
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
