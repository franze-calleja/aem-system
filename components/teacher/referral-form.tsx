"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReferralAction } from "@/app/actions/teacher/referrals";

type Student = { id: string; label: string; sectionLabel: string };

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ACADEMIC_SUPPORT", label: "Academic support" },
  { value: "COUNSELING_SESSION", label: "Counseling session" },
  { value: "IMMEDIATE_COUNSELING", label: "Immediate counseling" },
  { value: "POSITIVE_REINFORCEMENT", label: "Positive reinforcement" },
  { value: "CASE_REVIEW", label: "Case review" },
  { value: "SUBJECT_REMEDIATION", label: "Subject remediation" },
];

const URGENCY_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

export default function ReferralForm({ students }: { students: Student[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState("");
  const [suggestedType, setSuggestedType] = useState("ACADEMIC_SUPPORT");
  const [rationale, setRationale] = useState("");
  const [urgency, setUrgency] = useState<string>("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createReferralAction({ studentId, suggestedType, rationale, urgency });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStudentId("");
      setRationale("");
      setUrgency("MEDIUM");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Student</span>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        >
          <option value="" disabled>Select a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.label} — {s.sectionLabel}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Suggested intervention type</span>
        <select
          value={suggestedType}
          onChange={(e) => setSuggestedType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Reason / rationale</span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          maxLength={4000}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="What you're seeing in class that prompts this referral."
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Urgency</span>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {URGENCY_OPTIONS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </label>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={pending || !studentId || !rationale}
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit referral"}
      </button>
    </form>
  );
}
