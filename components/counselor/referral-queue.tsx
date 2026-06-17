"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { declineReferralAction } from "@/app/actions/counselor/referrals";

export type ReferralCard = {
  id: string;
  studentLabel: string;
  teacherLabel: string;
  suggestedType: string;
  urgency: string;
  rationale: string;
  createdAt: string;
};

function DeclineBox({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
        Decline
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Reason (shared with the referring teacher)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
      />
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || !reason}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await declineReferralAction({ referralId, reason });
              if (!result.ok) { setError(result.error); return; }
              router.refresh();
            })
          }
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Declining…" : "Confirm decline"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

const URGENCY_TONE: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function ReferralQueue({ referrals }: { referrals: ReferralCard[] }) {
  if (referrals.length === 0) {
    return <p className="text-sm text-slate-500">No pending referrals.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {referrals.map((r) => (
        <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-800">{r.studentLabel}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCY_TONE[r.urgency] ?? ""}`}>
              {r.urgency}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Referred by {r.teacherLabel} · suggests {r.suggestedType} · {r.createdAt}
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">{r.rationale}</p>
          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={`/counselor/interventions/new?fromReferral=${r.id}`}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Accept &amp; create intervention
            </Link>
            <DeclineBox referralId={r.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
