import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getDecisionAuditTrail, type AuditTrailEvent } from "@/lib/student/audit-trail";

const EVENT_TONE: Record<AuditTrailEvent["kind"], string> = {
  RISK_ASSESSMENT: "border-sky-200 bg-sky-50 text-sky-700",
  PATTERN_MATCH: "border-amber-200 bg-amber-50 text-amber-700",
  RECOMMENDATION_DRAFT: "border-violet-200 bg-violet-50 text-violet-700",
  INTERVENTION: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INTERVENTION_REVISION: "border-slate-200 bg-slate-50 text-slate-700",
  INTERVENTION_NOTE: "border-slate-200 bg-white text-slate-700",
};

const EVENT_LABEL: Record<AuditTrailEvent["kind"], string> = {
  RISK_ASSESSMENT: "Risk computed",
  PATTERN_MATCH: "Pattern matched",
  RECOMMENDATION_DRAFT: "Recommendation drafted",
  INTERVENTION: "Intervention created",
  INTERVENTION_REVISION: "Revision recorded",
  INTERVENTION_NOTE: "Feedback note",
};

export default async function DecisionAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["COUNSELOR", "PRINCIPAL"]);
  const { id } = await params;
  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const trail = await getDecisionAuditTrail(id, sy.id);
  if (!trail) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/counselor/students/${id}`}
        className="inline-flex w-fit items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to student
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Decision Audit Trail</h1>
        <p className="mt-1 text-sm text-slate-600">
          {trail.studentName} · {sy.label} · {trail.events.length} event{trail.events.length === 1 ? "" : "s"}. Chronological view of every algorithmic decision (risk scores, pattern matches, recommendation drafts) and every human action (interventions, revisions, feedback) that touched this student in this school year.
        </p>
      </header>

      {trail.events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          No events yet. Risk scores appear once the admin runs the engine.
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {trail.events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex w-20 shrink-0 flex-col text-[11px] text-slate-400">
                <span>{new Date(e.at).toLocaleDateString()}</span>
                <span>{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className={`flex-1 rounded-xl border p-3 ${EVENT_TONE[e.kind]}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {EVENT_LABEL[e.kind]}
                </p>
                <EventBody event={e} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EventBody({ event }: { event: AuditTrailEvent }) {
  switch (event.kind) {
    case "RISK_ASSESSMENT":
      return (
        <p className="mt-1 text-sm">
          Score <span className="font-mono font-semibold">{event.score.toFixed(0)}</span> · band{" "}
          <span className="font-semibold">{event.band}</span> · using AlgorithmConfig v{event.configVersion}
        </p>
      );
    case "PATTERN_MATCH":
      return (
        <p className="mt-1 text-sm">
          Rule <span className="font-mono">{event.ruleId}</span> · status {event.status}
        </p>
      );
    case "RECOMMENDATION_DRAFT":
      return (
        <div className="mt-1 text-sm">
          <p>
            Suggested <span className="font-mono">{event.suggestedType.replace(/_/g, " ")}</span> · status {event.status}
          </p>
          <p className="mt-1 italic text-slate-600">{event.rationale}</p>
        </div>
      );
    case "INTERVENTION":
      return (
        <p className="mt-1 text-sm">
          <span className="font-mono">{event.type.replace(/_/g, " ")}</span> · scope {event.scope} · status {event.status} · role {event.role}
          <span className="ml-2 font-mono text-[11px] text-slate-500">{event.interventionId}</span>
        </p>
      );
    case "INTERVENTION_REVISION":
      return (
        <div className="mt-1 text-sm">
          <p>
            {event.isInterim ? "Interim revision" : "Revision"} · significant={String(event.isSignificant)}
          </p>
          <p className="mt-1 italic text-slate-600">{event.reason}</p>
        </div>
      );
    case "INTERVENTION_NOTE":
      return (
        <div className="mt-1 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {event.noteType.replace(/_/g, " ")}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{event.content}</p>
        </div>
      );
  }
}
