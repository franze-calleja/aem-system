import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getInterventionsForYear,
  getInterventionsCountForYear,
  getOutcomeTracking,
} from "@/lib/intervention/queries";
import { getOpenRecommendations } from "@/lib/risk/queries";
import { prisma } from "@/lib/prisma";
import { generateRecommendationNarrative, fallbackMessage } from "@/lib/ai/narrative";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";

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

export default async function CounselorInterventionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year. Ask the admin to activate one.
      </div>
    );
  }

  const sp = await searchParams;
  const requestedPage = parsePageParam(sp.page);
  const totalInterventions = await getInterventionsCountForYear(sy.id);
  const pagination = paginate(totalInterventions, requestedPage, PAGE_SIZE);

  const [interventions, recommendations, outcomes] = await Promise.all([
    getInterventionsForYear(sy.id, { skip: pagination.skip, take: pagination.take }),
    getOpenRecommendations(sy.id),
    getOutcomeTracking(sy.id),
  ]);

  // Resolve scope labels for recommendations + fire narrative generators in
  // parallel. The wrapper caches by content hash so subsequent renders skip
  // the SDK; the algorithmic rationale below is always visible regardless.
  const studentIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const r of recommendations) {
    if (r.scope === "STUDENT") studentIds.add(r.scopeTargetId);
    if (r.scope === "SECTION") sectionIds.add(r.scopeTargetId);
  }
  const [students, sections] = await Promise.all([
    studentIds.size === 0
      ? Promise.resolve([])
      : prisma.student.findMany({
          where: { id: { in: [...studentIds] } },
          select: { id: true, firstName: true, lastName: true },
        }),
    sectionIds.size === 0
      ? Promise.resolve([])
      : prisma.section.findMany({
          where: { id: { in: [...sectionIds] }, schoolYearId: sy.id },
          select: { id: true, gradeLevel: true, name: true },
        }),
  ]);
  const labelMap = new Map<string, string>();
  for (const s of students) labelMap.set(`STUDENT:${s.id}`, `${s.lastName}, ${s.firstName}`);
  for (const sec of sections) labelMap.set(`SECTION:${sec.id}`, `${sec.gradeLevel} · ${sec.name}`);

  // Sequential, not Promise.all — cache hits return instantly so re-visits are
  // fast, but a cold cache (e.g., right after the engine ran and created N new
  // recommendations) used to fire N parallel Gemini calls. On the free-tier
  // key that's 15 RPM, so any cold N>15 batched call bursts past the rate
  // limit and a chunk of the recommendations come back as `quota` fallbacks.
  // Serialising keeps us under the per-minute cap; first cold visit is slower
  // but every call lands a cached row that subsequent visits read instantly.
  const recommendationNarratives: Awaited<ReturnType<typeof generateRecommendationNarrative>>[] = [];
  for (const r of recommendations) {
    const result = await generateRecommendationNarrative({
      scope: r.scope as "STUDENT" | "SECTION" | "GRADE" | "SCHOOL",
      scopeLabel:
        labelMap.get(`${r.scope}:${r.scopeTargetId}`) ??
        (r.scope === "GRADE" ? r.scopeTargetId : r.scope === "SCHOOL" ? "School-wide" : r.scopeTargetId),
      suggestedType: r.suggestedType,
      rationale: r.rationale,
      evidence: r.evidence,
      triggeringRuleId: r.triggeringRuleId,
    });
    recommendationNarratives.push(result);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Intervention Builder</h1>
          <p className="mt-1 text-sm text-slate-600">
            {totalInterventions.toLocaleString()} intervention{totalInterventions === 1 ? "" : "s"} in {sy.label}. Individual scope activates on save; section, grade, and school-wide scopes go to the principal for approval.
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
            {recommendations.map((r, i) => {
              const narrative = recommendationNarratives[i];
              return (
                <li key={r.id} className="flex flex-col gap-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                  </div>
                  {narrative.ok ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                        AI narrative {narrative.cached ? "(cached)" : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-sky-900">{narrative.text}</p>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      {fallbackMessage(narrative.reason)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Outcome tracking
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Participation outcomes from completed plans. Feeds the interventionHistory sub-score on the next risk recompute.
          </p>
        </header>
        {outcomes.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No completed interventions yet. Outcomes populate when a counselor marks a plan complete.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {outcomes.map((o) => {
              const total = o.total || 1;
              return (
                <li key={o.interventionId} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/counselor/interventions/${o.interventionId}`}
                      className="text-sm font-medium text-slate-900 hover:text-amber-700"
                    >
                      {o.scopeLabel}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {SCOPE_LABEL[o.scope] ?? o.scope} · {o.type.replace(/_/g, " ")}
                      {o.endDate ? ` · ended ${o.endDate}` : ""}
                    </p>
                  </div>
                  <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="bg-emerald-500" style={{ width: `${(o.improving / total) * 100}%` }} title={`Improving ${o.improving}`} />
                    <span className="bg-emerald-300" style={{ width: `${(o.completed / total) * 100}%` }} title={`Completed ${o.completed}`} />
                    <span className="bg-slate-300" style={{ width: `${(o.stable / total) * 100}%` }} title={`Stable ${o.stable}`} />
                    <span className="bg-rose-500" style={{ width: `${(o.declining / total) * 100}%` }} title={`Declining ${o.declining}`} />
                    <span className="bg-slate-100" style={{ width: `${(o.unset / total) * 100}%` }} title={`Unset ${o.unset}`} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {o.total} participant{o.total === 1 ? "" : "s"} ·
                    <span className="ml-1 text-emerald-700">IMPROVING {o.improving}</span> ·
                    <span className="ml-1 text-emerald-600">COMPLETED {o.completed}</span> ·
                    <span className="ml-1 text-slate-600">STABLE {o.stable}</span> ·
                    <span className="ml-1 text-rose-700">DECLINING {o.declining}</span>
                    {o.unset > 0 && <span className="ml-1 text-slate-400">UNSET {o.unset}</span>}
                  </p>
                </li>
              );
            })}
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
            <div className="mt-3">
              <PaginationBar
                pagination={pagination}
                basePath="/counselor/interventions"
                forwardParams={{}}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
