"use client";

// Tiny client component: button that calls the regenerate-narrative server
// action, then triggers a router refresh so the freshly cached text renders.
// Visible only to roles allowed to regenerate (counselor + principal).

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateRiskNarrativeAction } from "@/app/actions/ai/narrative";

type Props = {
  studentId: string;
  schoolYearId: string;
};

export default function RegenerateNarrativeButton({ studentId, schoolYearId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onClick = () => {
    setError(null);
    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("schoolYearId", schoolYearId);
    startTransition(async () => {
      const r = await regenerateRiskNarrativeAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-sky-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        title="Force a fresh Gemini call (bypasses cache, spends one token call)"
      >
        {pending ? "Regenerating…" : "Regenerate"}
      </button>
      {error && <span className="text-[10px] text-rose-700">{error}</span>}
    </span>
  );
}
