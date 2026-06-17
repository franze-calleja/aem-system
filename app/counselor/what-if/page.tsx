import { requireRole } from "@/lib/session";
import WhatIfSimulator from "@/components/counselor/what-if-simulator";

export default async function CounselorWhatIfPage() {
  await requireRole("COUNSELOR");
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">What-If Simulator</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tweak hypothetical inputs and see how the risk engine reacts. No data is saved — this is a literacy tool for understanding how the score is computed.
        </p>
      </header>
      <WhatIfSimulator />
    </div>
  );
}
