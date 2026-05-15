"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acknowledgeNoteAction,
  dismissNoteAction,
} from "@/app/actions/counselor/feedback";

export default function FeedbackDisposition({
  noteId,
  interventionId,
}: {
  noteId: string;
  interventionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: (input: unknown) => Promise<{ ok: true } | { ok: false; error: string }>,
    payload: unknown,
  ) {
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
        <Link
          href={`/counselor/interventions/${interventionId}/edit?fromNote=${noteId}`}
          className={`rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-emerald-700 ${
            pending ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Incorporate (open in editor)
        </Link>
        <button
          type="button"
          onClick={() => run(dismissNoteAction, { noteId })}
          disabled={pending}
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
