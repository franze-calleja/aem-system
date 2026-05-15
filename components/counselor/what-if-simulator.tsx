"use client";

import { useEffect, useState, useTransition } from "react";
import { whatIfRiskAction } from "@/app/actions/risk/what-if";
import type { WhatIfInput } from "@/app/actions/risk/what-if";
import type { ScoringResult } from "@/lib/risk/engine";
import ExplainabilityPanel from "@/components/shell/explainability-panel";

const DEFAULTS: WhatIfInput = {
  quarterlyAverages: [85, 82, 78, 75],
  failingSubjects: 0,
  totalDays: 80,
  absences: 5,
  tardies: 3,
  consecutiveAbsences: 1,
  behavioralHigh: 0,
  behavioralModerate: 1,
  behavioralLow: 2,
  spedStatus: "NONE",
  learningModality: "FACE_TO_FACE",
};

export default function WhatIfSimulator() {
  const [inputs, setInputs] = useState<WhatIfInput>(DEFAULTS);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Recompute on input change. Debounce so we don't fire on every keystroke.
    const id = setTimeout(() => {
      startTransition(async () => {
        const r = await whatIfRiskAction(inputs);
        if (r.ok) {
          setResult(r.result);
          setError(null);
        } else {
          setError(r.error);
        }
      });
    }, 250);
    return () => clearTimeout(id);
  }, [inputs]);

  function setNum<K extends keyof WhatIfInput>(key: K, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }
  function setQuarter(idx: number, value: number | null) {
    setInputs((prev) => {
      const arr = [...prev.quarterlyAverages];
      arr[idx] = value;
      return { ...prev, quarterlyAverages: arr };
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <form className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Group title="Academic">
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Num
                key={i}
                label={`Q${i + 1}`}
                value={inputs.quarterlyAverages[i] ?? 0}
                min={0}
                max={100}
                onChange={(v) => setQuarter(i, v)}
              />
            ))}
          </div>
          <Num
            label="Failing subjects"
            value={inputs.failingSubjects}
            min={0}
            max={10}
            onChange={(v) => setNum("failingSubjects", v)}
          />
        </Group>

        <Group title="Attendance">
          <div className="grid grid-cols-2 gap-2">
            <Num label="Total days" value={inputs.totalDays} min={0} max={365} onChange={(v) => setNum("totalDays", v)} />
            <Num label="Absences" value={inputs.absences} min={0} max={365} onChange={(v) => setNum("absences", v)} />
            <Num label="Tardies" value={inputs.tardies} min={0} max={365} onChange={(v) => setNum("tardies", v)} />
            <Num label="Consecutive absences" value={inputs.consecutiveAbsences} min={0} max={60} onChange={(v) => setNum("consecutiveAbsences", v)} />
          </div>
        </Group>

        <Group title="Behavioral">
          <div className="grid grid-cols-3 gap-2">
            <Num label="HIGH" value={inputs.behavioralHigh} min={0} max={20} onChange={(v) => setNum("behavioralHigh", v)} />
            <Num label="MODERATE" value={inputs.behavioralModerate} min={0} max={20} onChange={(v) => setNum("behavioralModerate", v)} />
            <Num label="LOW" value={inputs.behavioralLow} min={0} max={20} onChange={(v) => setNum("behavioralLow", v)} />
          </div>
        </Group>

        <Group title="Profile">
          <label className="text-xs font-medium text-slate-600">SPED status</label>
          <select
            value={inputs.spedStatus}
            onChange={(e) => setInputs((p) => ({ ...p, spedStatus: e.target.value as WhatIfInput["spedStatus"] }))}
            className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
          >
            <option value="NONE">NONE</option>
            <option value="IEP">IEP</option>
            <option value="ACCOMMODATIONS">ACCOMMODATIONS</option>
          </select>
          <label className="mt-2 text-xs font-medium text-slate-600">Learning modality</label>
          <select
            value={inputs.learningModality}
            onChange={(e) => setInputs((p) => ({ ...p, learningModality: e.target.value as WhatIfInput["learningModality"] }))}
            className="rounded-lg border border-slate-200 bg-white p-2 text-sm"
          >
            <option value="FACE_TO_FACE">FACE_TO_FACE</option>
            <option value="MODULAR">MODULAR</option>
            <option value="ONLINE">ONLINE</option>
            <option value="BLENDED">BLENDED</option>
          </select>
        </Group>

        <button
          type="button"
          onClick={() => setInputs(DEFAULTS)}
          className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
        >
          Reset defaults
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {pending && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Recomputing…
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        {result ? (
          <ExplainabilityPanel score={result.score} band={result.band} factors={result.factors} />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            Adjust the inputs to compute a score.
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          Uses the active <span className="font-mono">AlgorithmConfig</span> weights and thresholds. Same engine that scores real students.
        </p>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <legend className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function Num({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col text-xs">
      <span className="text-slate-600">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="mt-1 rounded-lg border border-slate-200 bg-white p-1.5 text-sm"
      />
    </label>
  );
}
