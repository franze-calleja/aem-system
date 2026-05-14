import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getInterventionsForYear } from "@/lib/intervention/queries";
import { getOpenRecommendations } from "@/lib/risk/queries";

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

export default async function CounselorInterventionsPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year. Ask the admin to activate one.
      </div>
    );
  }

  const [interventions, recommendations] = await Promise.all([
    getInterventionsForYear(sy.id),
    getOpenRecommendations(sy.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Intervention Builder</h1>
          <p className="mt-1 text-sm text-slate-600">
            {interventions.length} intervention{interventions.length === 1 ? "" : "s"} in {sy.label}. Individual scope activates on save; section, grade, and school-wide scopes go to the principal for approval.
          </p>
        </div>
        <Link
          href="/counselor/interventions/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800"
        >
          + New intervention
        </Link>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Open recommendations
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Algorithmic drafts surfaced from pattern detection. Drafts that you open in the builder are marked INSTANTIATED on save.
          </p>
        </header>

        {recommendations.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No open recommendations. Run the risk engine to surface new drafts.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {recommendations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {SCOPE_LABEL[r.scope] ?? r.scope} · {r.suggestedType.replace(/_/g, " ")}
                    {r.triggeringRuleId && (
                      <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {r.triggeringRuleId.replace(/_/g, " ")}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{r.rationale}</p>
                </div>
                <Link
                  href={`/counselor/interventions/new?fromRecommendation=${r.id}`}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
                >
                  Open in Builder
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Interventions
          </h2>
        </header>

        {interventions.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No interventions created yet. Use the button above or open a recommendation to start.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/counselor/interventions/${i.id}`}
                        className="font-medium text-slate-900 hover:text-amber-700"
                      >
                        {i.scopeLabel}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{SCOPE_LABEL[i.scope] ?? i.scope}</td>
                    <td className="px-3 py-2 text-slate-600">{i.type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          STATUS_TONE[i.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {i.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {i.startDate}
                      {i.endDate ? ` → ${i.endDate}` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{i.ownerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
