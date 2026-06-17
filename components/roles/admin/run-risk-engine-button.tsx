"use client";

import { useTransition } from "react";
import { computeRiskAction } from "@/app/actions/risk/compute";

export default function RunRiskEngineButton({ schoolYearId }: { schoolYearId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const fd = new FormData();
    fd.set("schoolYearId", schoolYearId);
    startTransition(async () => {
      const result = await computeRiskAction(fd);
      if (result.ok) {
        alert(`Done. ${result.computed} students scored, ${result.patternsFound} patterns, ${result.recommendationsCreated} recommendations.`);
        window.location.reload();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Computing…" : "Run risk computation (all students)"}
    </button>
  );
}
