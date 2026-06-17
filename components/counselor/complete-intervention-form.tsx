"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeInterventionAction } from "@/app/actions/counselor/interventions";

type Outcome = "IMPROVING" | "STABLE" | "DECLINING" | "COMPLETED";

type Participant = {
  participationId: string;
  studentName: string;
  lrn: string;
  currentOutcome: Outcome | null;
};

export default function CompleteInterventionForm({
  interventionId,
  participants,
}: {
  interventionId: string;
  participants: Participant[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>(() =>
    participants.reduce<Record<string, Outcome>>((acc, p) => {
      acc[p.participationId] = p.currentOutcome ?? "STABLE";
      return acc;
    }, {}),
  );

  function set(pid: string, value: Outcome) {
    setOutcomes((prev) => ({ ...prev, [pid]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeInterventionAction({
        interventionId,
        notes: notes || undefined,
        outcomes: Object.entries(outcomes).map(([participationId, outcome]) => ({
          participationId,
          outcome,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-sky-700"
      >
        Mark complete
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-slate-600">
        Set an outcome for each participant. The plan transitions ACTIVE → COMPLETED and the outcomes feed back into future risk recomputations.
      </p>

      <ul className="flex flex-col gap-2">
        {participants.map((p) => (
          <li
            key={p.participationId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{p.studentName}</p>
              <p className="text-[11px] font-mono text-slate-400">{p.lrn}</p>
            </div>
            <select
              value={outcomes[p.participationId]}
              onChange={(e) => set(p.participationId, e.target.value as Outcome)}
              disabled={pending}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs"
            >
              <option value="IMPROVING">IMPROVING</option>
              <option value="STABLE">STABLE</option>
              <option value="DECLINING">DECLINING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </li>
        ))}
      </ul>

      <div>
        <label className="text-xs font-medium text-slate-600">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          disabled={pending}
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm disabled:bg-slate-50"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-sky-700 disabled:bg-sky-300"
        >
          {pending ? "Saving…" : "Confirm complete"}
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
