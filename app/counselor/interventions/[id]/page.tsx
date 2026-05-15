import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getIntervention } from "@/lib/intervention/queries";
import CompleteInterventionForm from "@/components/counselor/complete-intervention-form";

const STATUS_TONE: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-sky-200 bg-sky-50 text-sky-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

export default async function CounselorInterventionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("COUNSELOR");
  const { id } = await params;
  const intervention = await getIntervention(id, session.user.role, session.user.id);
  if (!intervention) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/counselor/interventions"
        className="inline-flex w-fit items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to Interventions
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {SCOPE_LABEL[intervention.scope] ?? intervention.scope} · {intervention.type.replace(/_/g, " ")}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{intervention.scopeLabel}</h1>
            <p className="mt-1 text-xs text-slate-500">
              Owner: {intervention.ownerName} · {intervention.startDate}
              {intervention.endDate ? ` → ${intervention.endDate}` : ""}
            </p>
            {intervention.triggeringRecommendationId && (
              <p className="mt-1 text-[11px] text-slate-400 font-mono">
                from recommendation draft {intervention.triggeringRecommendationId}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                STATUS_TONE[intervention.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {intervention.status.replace(/_/g, " ")}
            </span>
            {intervention.ownerId === session.user.id &&
              intervention.status !== "CANCELLED" &&
              intervention.status !== "COMPLETED" && (
                <Link
                  href={`/counselor/interventions/${intervention.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
                >
                  Edit plan
                </Link>
              )}
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Public fields
        </h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Schedule" value={intervention.schedule} />
          <Field label="Accommodations" value={intervention.accommodations} />
          <Field label="Staff actions" value={intervention.staffActions} />
          <Field label="Target outcomes" value={intervention.targetOutcomes} />
        </dl>
      </section>

      {intervention.sensitive ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
            Sensitive — counselor + principal only
          </h2>
          <dl className="mt-4 flex flex-col gap-4">
            <Field label="Rationale" value={intervention.sensitive.rationale} />
            <Field label="Counseling context" value={intervention.sensitive.counselingContext} />
          </dl>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
          Sensitive fields are hidden — owned by another counselor.
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Participants ({intervention.participants.length})
        </h2>
        {intervention.participants.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No participants attached.
          </p>
        ) : (
          <ul className="mt-4 grid gap-1 text-sm md:grid-cols-2 md:gap-x-6">
            {intervention.participants.map((p) => (
              <li key={p.enrollmentId} className="flex items-center justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-700">{p.studentName}</span>
                <span className="flex items-center gap-2 text-xs">
                  {p.outcome && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      p.outcome === "IMPROVING" || p.outcome === "COMPLETED"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : p.outcome === "DECLINING"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}>
                      {p.outcome}
                    </span>
                  )}
                  <span className="font-mono text-slate-400">{p.lrn}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {intervention.status === "ACTIVE" && intervention.ownerId === session.user.id && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            Close out
          </h2>
          <p className="mt-1 text-xs text-sky-700/80">
            Mark the plan complete and record an outcome for each participant.
          </p>
          <div className="mt-3">
            <CompleteInterventionForm
              interventionId={intervention.id}
              participants={intervention.participants.map((p) => ({
                participationId: p.participationId,
                studentName: p.studentName,
                lrn: p.lrn,
                currentOutcome:
                  p.outcome === "IMPROVING" || p.outcome === "STABLE" || p.outcome === "DECLINING" || p.outcome === "COMPLETED"
                    ? p.outcome
                    : null,
              }))}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
        {value ?? <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
