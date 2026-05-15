import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getPendingApprovals } from "@/lib/intervention/queries";
import ApprovalActions from "@/components/principal/approval-actions";

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

export default async function PrincipalApprovalsPage() {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const pending = await getPendingApprovals(sy.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Approval queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          {pending.length} broader-scope intervention{pending.length === 1 ? "" : "s"} awaiting your approval in {sy.label}. Individual-scope plans activate without approval.
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nothing pending.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((p) => (
            <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {SCOPE_LABEL[p.scope] ?? p.scope} · {p.type.replace(/_/g, " ")}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-900">{p.scopeLabel}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Proposed by {p.ownerName} · starts {p.startDate}
                    {p.endDate ? ` → ${p.endDate}` : ""} · {p.participantCount} participant{p.participantCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href={`/principal/interventions/${p.id}`}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
                >
                  View full plan
                </Link>
              </div>

              {p.sensitive && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Rationale
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{p.sensitive.rationale}</p>
                  {p.sensitive.counselingContext && (
                    <>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Counseling context
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
                        {p.sensitive.counselingContext}
                      </p>
                    </>
                  )}
                </div>
              )}

              <ApprovalActions interventionId={p.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
