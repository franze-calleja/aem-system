"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCounselingNoteAction } from "@/app/actions/counselor/notes";

export default function CounselingNoteForm({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Note body is required.");
      return;
    }
    startTransition(async () => {
      const result = await createCounselingNoteAction({ enrollmentId, body: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <label htmlFor="counseling-note-body" className="sr-only">
        New counseling note
      </label>
      <textarea
        id="counseling-note-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a confidential counseling note — visible to counselors only."
        rows={4}
        disabled={pending}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          Saved notes are logged. Reads are audited.
        </p>
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Saving…" : "Save note"}
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
