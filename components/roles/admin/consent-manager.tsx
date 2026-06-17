"use client";

import { useState, useTransition } from "react";
import { setConsentAction } from "@/app/actions/admin/consent";
import type { ConsentScope, ConsentStatus } from "@prisma/client";

const SCOPE_LABELS: Record<ConsentScope, string> = {
  DATA_PROCESSING: "Data processing",
  AI_ANALYSIS: "AI analysis",
  INTERVENTION_PLANNING: "Intervention planning",
};

type ConsentEntry = {
  scope: ConsentScope;
  status: ConsentStatus;
  hasRecord: boolean;
  revokedAt: string | null;
  grantedAt: string | null;
  notes: string | null;
};

type StudentRow = {
  id: string;
  lrn: string;
  name: string;
  context: string;
  consents: ConsentEntry[];
};

type Props = {
  students: StudentRow[];
  scopes: ConsentScope[];
};

export default function ConsentManager({ students, scopes }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3">
          {students.map((s) => (
            <StudentConsentRow key={s.id} student={s} scopes={scopes} />
          ))}
          {students.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No students match the current filter. Adjust or clear it above.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StudentConsentRow({ student, scopes }: { student: StudentRow; scopes: ConsentScope[] }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{student.name}</h3>
          <p className="text-xs text-slate-500">
            LRN <span className="font-mono">{student.lrn}</span> · {student.context}
          </p>
        </div>
      </header>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {scopes.map((scope) => {
          const consent = student.consents.find((c) => c.scope === scope);
          if (!consent) return null;
          return (
            <ConsentScopeCell
              key={scope}
              studentId={student.id}
              scope={scope}
              consent={consent}
            />
          );
        })}
      </div>
    </article>
  );
}

function ConsentScopeCell({
  studentId,
  scope,
  consent,
}: {
  studentId: string;
  scope: ConsentScope;
  consent: ConsentEntry;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRevoke, setShowRevoke] = useState(false);
  const [notes, setNotes] = useState("");

  const revoked = consent.status === "REVOKED";

  const handleGrant = () => {
    setError(null);
    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("scope", scope);
    fd.set("status", "GRANTED");
    startTransition(async () => {
      const r = await setConsentAction(fd);
      if (!r.ok) setError(r.error);
    });
  };

  const handleRevoke = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (notes.trim().length === 0) {
      setError("Justification is required to revoke.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("studentId", studentId);
    fd.set("scope", scope);
    fd.set("status", "REVOKED");
    fd.set("notes", notes);
    startTransition(async () => {
      const r = await setConsentAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setNotes("");
      setShowRevoke(false);
    });
  };

  return (
    <div
      className={`rounded-xl border p-3 ${
        revoked
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{SCOPE_LABELS[scope]}</p>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            revoked
              ? "border-amber-300 bg-amber-100 text-amber-900"
              : "border-emerald-300 bg-emerald-100 text-emerald-900"
          }`}
        >
          {revoked ? "Revoked" : "Granted"}
        </span>
      </div>
      {revoked && consent.notes && (
        <p className="mt-2 rounded-md bg-white px-2 py-1 text-xs text-slate-700">
          <span className="font-medium">Justification:</span> {consent.notes}
        </p>
      )}
      {revoked && consent.revokedAt && (
        <p className="mt-1 text-[11px] text-slate-500">
          Revoked {new Date(consent.revokedAt).toLocaleString()}
        </p>
      )}
      {!revoked && consent.grantedAt && (
        <p className="mt-1 text-[11px] text-slate-500">
          Granted {new Date(consent.grantedAt).toLocaleDateString()}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {revoked ? (
          <button
            type="button"
            onClick={handleGrant}
            disabled={pending}
            className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            {pending ? "…" : "Reinstate"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowRevoke((s) => !s)}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            Revoke…
          </button>
        )}
      </div>

      {showRevoke && !revoked && (
        <form onSubmit={handleRevoke} className="mt-2 flex flex-col gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Justification (required)"
            required
            rows={2}
            maxLength={1000}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRevoke(false);
                setNotes("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Confirm revoke"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
