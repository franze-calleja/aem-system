"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPatternStatusAction } from "@/app/actions/counselor/patterns";

export default function PatternDisposition({ patternId }: { patternId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function dispose(status: "RESOLVED" | "DISMISSED") {
    setError(null);
    startTransition(async () => {
      const result = await setPatternStatusAction({ patternId, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => dispose("RESOLVED")}
        disabled={pending}
        className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
      >
        Mark resolved
      </button>
      <button
        type="button"
        onClick={() => dispose("DISMISSED")}
        disabled={pending}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Dismiss
      </button>
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
