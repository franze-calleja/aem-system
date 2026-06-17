"use client";

// "Pre-generate AI for this page" — runs the batch narrative pre-warm action
// for the students on the current caseload page. Shows a summary toast-ish
// inline note when the run completes (generated / already cached / skipped).

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  prewarmCaseloadPageNarrativesAction,
  type PrewarmResult,
} from "@/app/actions/ai/narrative";

type Props = {
  schoolYearId: string;
  page: number;
};

export default function PrewarmCaseloadButton({ schoolYearId, page }: Props) {
  const [pending, startTransition] = useTransition();
  const [last, setLast] = useState<PrewarmResult | null>(null);
  const router = useRouter();

  const onClick = () => {
    setLast(null);
    const fd = new FormData();
    fd.set("schoolYearId", schoolYearId);
    fd.set("page", String(page));
    startTransition(async () => {
      const r = await prewarmCaseloadPageNarrativesAction(fd);
      setLast(r);
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        title="Generate AI narratives for the students on this page that don't have one cached yet"
      >
        {pending ? "Generating…" : "Pre-generate AI for this page"}
      </button>
      {last?.ok && (
        <span className="text-[11px] text-slate-500">
          {last.generated} generated · {last.alreadyCached} cached · {last.skipped} skipped · {last.pageSize} on page
        </span>
      )}
      {last && !last.ok && (
        <span className="text-[11px] text-rose-700">{last.error}</span>
      )}
    </div>
  );
}
