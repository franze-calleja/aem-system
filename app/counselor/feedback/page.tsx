import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getOpenFeedbackForCounselor } from "@/lib/intervention/queries";
import FeedbackDisposition from "@/components/counselor/feedback-disposition";

const NOTE_TYPE_LABEL: Record<string, string> = {
  OBSERVATION: "Observation",
  REVISION_REQUEST: "Revision request",
  OUTCOME_OBSERVATION: "Outcome observation",
};

const NOTE_TYPE_TONE: Record<string, string> = {
  OBSERVATION: "border-slate-200 bg-slate-50 text-slate-700",
  REVISION_REQUEST: "border-amber-200 bg-amber-50 text-amber-700",
  OUTCOME_OBSERVATION: "border-sky-200 bg-sky-50 text-sky-700",
};

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

export default async function CounselorFeedbackPage() {
  const session = await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const queue = await getOpenFeedbackForCounselor(session.user.id, sy.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Feedback Queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          {queue.length} open note{queue.length === 1 ? "" : "s"} on interventions you own. Acknowledge to record without changing the plan. Incorporate writes a revision linked to the note. Dismiss to close without action.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nothing to action.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {queue.map((n) => (
            <li key={n.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {SCOPE_LABEL[n.interventionScope] ?? n.interventionScope} ·{" "}
                    {n.interventionType.replace(/_/g, " ")}
                  </p>
                  <Link
                    href={`/counselor/interventions/${n.interventionId}`}
                    className="mt-1 inline-block font-semibold text-slate-900 hover:text-amber-700"
                  >
                    {n.interventionScopeLabel}
                  </Link>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    NOTE_TYPE_TONE[n.noteType] ?? "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {NOTE_TYPE_LABEL[n.noteType] ?? n.noteType}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{n.content}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                by {n.authorName} · {new Date(n.createdAt).toLocaleString()}
              </p>

              <FeedbackDisposition noteId={n.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
