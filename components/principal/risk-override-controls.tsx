"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearRiskOverrideAction,
  createRiskOverrideAction,
} from "@/app/actions/principal/overrides";

type Band = "LOW" | "MODERATE" | "HIGH";

type Props = {
  enrollmentId: string;
  currentBand: Band;
  activeOverride: {
    id: string;
    originalBand: Band;
    overrideBand: Band;
    justification: string;
    overriddenByName: string;
    createdAt: string;
  } | null;
};

export default function RiskOverrideControls({ enrollmentId, currentBand, activeOverride }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [band, setBand] = useState<Band>(() =>
    currentBand === "HIGH" ? "MODERATE" : currentBand === "MODERATE" ? "LOW" : "MODERATE",
  );
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = justification.trim();
    if (!trimmed) {
      setError("Written justification is required.");
      return;
    }
    startTransition(async () => {
      const result = await createRiskOverrideAction({
        enrollmentId,
        overrideBand: band,
        justification: trimmed,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setJustification("");
      router.refresh();
    });
  }

  function handleClear() {
    if (!activeOverride) return;
    setError(null);
    startTransition(async () => {
      const result = await clearRiskOverrideAction({ overrideId: activeOverride.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {activeOverride ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
            Override active
          </p>
          <p className="mt-1 text-sm text-rose-900">
            Displayed band <span className="font-mono font-semibold">{activeOverride.overrideBand}</span> (overrode original {activeOverride.originalBand}).
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm italic text-rose-900">
            “{activeOverride.justification}”
          </p>
          <p className="mt-2 text-[11px] text-rose-700/80">
            by {activeOverride.overriddenByName} · {new Date(activeOverride.createdAt).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            Clear override
          </button>
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 hover:bg-rose-50"
        >
          Override risk band
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs text-rose-900">
            Current algorithmic band: <span className="font-mono font-semibold">{currentBand}</span>. Override to:
          </p>
          <div className="flex gap-2">
            {(["LOW", "MODERATE", "HIGH"] as const).map((b) => (
              <label
                key={b}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  band === b
                    ? "border-rose-700 bg-rose-700 text-white"
                    : "border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
                }`}
              >
                <input
                  type="radio"
                  name="band"
                  value={b}
                  checked={band === b}
                  onChange={() => setBand(b)}
                  className="sr-only"
                />
                {b}
              </label>
            ))}
          </div>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            disabled={pending}
            placeholder="Why does the algorithm need an override? Required for the audit trail."
            className="w-full resize-y rounded-lg border border-rose-200 bg-white p-2 text-sm placeholder:text-rose-300 disabled:bg-rose-50"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || justification.trim().length === 0 || band === currentBand}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-rose-700 disabled:bg-rose-300"
            >
              {pending ? "Saving…" : "Apply override"}
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
