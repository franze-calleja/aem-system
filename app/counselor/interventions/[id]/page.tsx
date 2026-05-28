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
    <div className="flex flex-col gap-6">
      {/* ── Back nav ─────────────────────────────────────────────────── */}
      <Link
        href="/counselor/interventions"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        ← Back to Interventions
      </Link>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {SCOPE_LABEL[intervention.scope] ?? intervention.scope}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {intervention.type.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 leading-tight">{intervention.scopeLabel}</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Owner: <span className="text-slate-700">{intervention.ownerName}</span>
              <span className="mx-2 text-slate-300">·</span>
              {intervention.startDate}
              {intervention.endDate && <span className="text-slate-400"> → {intervention.endDate}</span>}
            </p>
            {intervention.triggeringRecommendationId && (
              <p className="mt-1 text-[11px] font-mono text-slate-400">
                from recommendation {intervention.triggeringRecommendationId}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2.5">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
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
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Edit plan
                </Link>
              )}
          </div>
        </div>
      </header>

      {/* ── Public fields ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Plan details</h2>
        <p className="mt-0.5 text-xs text-slate-400">Visible to all roles with access to this intervention.</p>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Schedule" value={intervention.schedule} />
          <Field label="Accommodations" value={intervention.accommodations} />
          <Field label="Staff actions" value={intervention.staffActions} />
          <Field label="Target outcomes" value={intervention.targetOutcomes} />
        </dl>
      </section>

      {/* ── Sensitive fields ─────────────────────────────────────────── */}
      {intervention.sensitive ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-400 inline-block" />
            <h2 className="text-sm font-semibold text-amber-800">Sensitive — counselor &amp; principal only</h2>
          </div>
          <dl className="mt-5 flex flex-col gap-5">
            <Field label="Rationale" value={intervention.sensitive.rationale} />
            <Field label="Counseling context" value={intervention.sensitive.counselingContext} />
          </dl>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-400 text-center">
          Sensitive fields are not visible — this plan is owned by another counselor.
        </div>
      )}

      {/* ── Participants ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
          <span className="text-xs text-slate-400">{intervention.participants.length} enrolled</span>
        </div>
        {intervention.participants.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
            No participants attached.
          </p>
        ) : (
          <ul className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
            {intervention.participants.map((p) => (
              <li
                key={p.enrollmentId}
                className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0"
              >
                <span className="text-sm text-slate-800">{p.studentName}</span>
                <span className="flex items-center gap-2 text-xs">
                  {p.outcome && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      p.outcome === "IMPROVING" || p.outcome === "COMPLETED"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : p.outcome === "DECLINING"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}>
                      {p.outcome}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-slate-400">{p.lrn}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Close-out ────────────────────────────────────────────────── */}
      {intervention.status === "ACTIVE" && intervention.ownerId === session.user.id && (
        <section className="rounded-2xl border border-sky-300 bg-sky-50 p-6">
          <h2 className="text-base font-semibold text-sky-900">Close out this plan</h2>
          <p className="mt-1 text-sm text-sky-700/80">
            Mark the plan complete and record a final outcome for each participant.
          </p>
          <div className="mt-5">
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
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
        {value ?? <span className="italic text-slate-300">—</span>}
      </dd>
    </div>
  );
}
