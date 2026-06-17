import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getInterventionsForYear,
  getInterventionsCountForYear,
  getOutcomeTracking,
  type InterventionFilters,
} from "@/lib/intervention/queries";
import { getOpenRecommendations } from "@/lib/risk/queries";
import { prisma } from "@/lib/prisma";
import { generateRecommendationNarrative, fallbackMessage } from "@/lib/ai/narrative";
import { paginate, parsePageParam, PAGE_SIZE } from "@/lib/pagination";
import { PaginationBar } from "@/components/shell/pagination-bar";
import type { InterventionStatus, InterventionType, PatternScope } from "@prisma/client";

const INTERVENTION_STATUSES: InterventionStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

const INTERVENTION_TYPES: InterventionType[] = [
  "ACADEMIC_SUPPORT",
  "COUNSELING_SESSION",
  "IMMEDIATE_COUNSELING",
  "POSITIVE_REINFORCEMENT",
  "CASE_REVIEW",
  "SECTION_INTERVENTION",
  "SUBJECT_REMEDIATION",
  "ATTENDANCE_PROGRAM",
];

const SCOPE_VALUES: PatternScope[] = ["STUDENT", "SECTION", "GRADE", "SCHOOL"];

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

  // ── Parse filter params ────────────────────────────────────────────────────
  const filterStatus =
    typeof sp.status === "string" && INTERVENTION_STATUSES.includes(sp.status as InterventionStatus)
      ? (sp.status as InterventionStatus)
      : undefined;
  const filterScope =
    typeof sp.scope === "string" && SCOPE_VALUES.includes(sp.scope as PatternScope)
      ? (sp.scope as PatternScope)
      : undefined;
  const filterType =
    typeof sp.type === "string" && INTERVENTION_TYPES.includes(sp.type as InterventionType)
      ? (sp.type as InterventionType)
      : undefined;
  const filterSectionId = typeof sp.section === "string" && sp.section ? sp.section : undefined;
  const filterQ = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  // Separate param for the recommendations section filter.
  const filterRecSectionId = typeof sp.recSection === "string" && sp.recSection ? sp.recSection : undefined;

  const filters: InterventionFilters = {
    status: filterStatus,
    scope: filterScope,
    type: filterType,
    sectionId: filterSectionId,
    q: filterQ,
  };
  const hasActiveFilter = !!(filterStatus || filterScope || filterType || filterSectionId || filterQ);

  const requestedPage = parsePageParam(sp.page);
  const totalInterventions = await getInterventionsCountForYear(sy.id, filters);
  const pagination = paginate(totalInterventions, requestedPage, PAGE_SIZE);

  // Fetch sections for the section filter dropdowns (always needed).
  const [interventions, allRecommendations, outcomes, allSections] = await Promise.all([
    getInterventionsForYear(sy.id, { skip: pagination.skip, take: pagination.take, filters }),
    getOpenRecommendations(sy.id),
    getOutcomeTracking(sy.id),
    prisma.section.findMany({
      where: { schoolYearId: sy.id },
      select: { id: true, gradeLevel: true, name: true },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
  ]);

  // ── Filter recommendations by section ─────────────────────────────────────
  // If recSection is set, keep:
  //   • SECTION-scope recs targeting that section
  //   • STUDENT-scope recs whose target is enrolled in that section
  //   • GRADE / SCHOOL recs (school-wide, always relevant)
  let recommendations = allRecommendations;
  if (filterRecSectionId) {
    const sectionEnrollments = await prisma.studentEnrollment.findMany({
      where: { sectionId: filterRecSectionId, schoolYearId: sy.id, status: "ACTIVE" },
      select: { studentId: true },
    });
    const enrolledStudentIds = new Set(sectionEnrollments.map((e) => e.studentId));
    recommendations = allRecommendations.filter((r) => {
      if (r.scope === "SECTION") return r.scopeTargetId === filterRecSectionId;
      if (r.scope === "STUDENT") return enrolledStudentIds.has(r.scopeTargetId);
      return true; // GRADE / SCHOOL — always shown
    });
  }

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
    <div className="flex flex-col gap-8">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Intervention Builder</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sy.label} ·{" "}
            {totalInterventions.toLocaleString()} intervention{totalInterventions === 1 ? "" : "s"} total.{" "}
            Individual scope activates on save; wider scopes go to the principal for approval.
          </p>
        </div>
        <Link
          href="/counselor/interventions/new"
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-700 transition-colors"
        >
          + New intervention
        </Link>
      </header>

      {/* ── Open recommendations ──────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Open recommendations</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Algorithmic drafts from pattern detection. Opening one in the builder marks it INSTANTIATED on save.
            </p>
          </div>

          {/* Section filter for recommendations */}
          <form method="GET" className="flex items-center gap-2">
            {/* Preserve all other query params */}
            {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
            {filterScope && <input type="hidden" name="scope" value={filterScope} />}
            {filterType && <input type="hidden" name="type" value={filterType} />}
            {filterSectionId && <input type="hidden" name="section" value={filterSectionId} />}
            {filterQ && <input type="hidden" name="q" value={filterQ} />}
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap">
                Section
              </span>
              <select
                name="recSection"
                defaultValue={filterRecSectionId ?? ""}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All sections</option>
                {allSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.gradeLevel} · {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Filter
            </button>
            {filterRecSectionId && (
              <Link
                href={`/counselor/interventions${(() => {
                  const p = new URLSearchParams();
                  if (filterStatus) p.set("status", filterStatus);
                  if (filterScope) p.set("scope", filterScope);
                  if (filterType) p.set("type", filterType);
                  if (filterSectionId) p.set("section", filterSectionId);
                  if (filterQ) p.set("q", filterQ);
                  const qs = p.toString();
                  return qs ? `?${qs}` : "";
                })()}`}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors whitespace-nowrap"
              >
                Clear
              </Link>
            )}
            {allRecommendations.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
                {recommendations.length}{filterRecSectionId ? ` / ${allRecommendations.length}` : ""} open
              </span>
            )}
          </form>
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
            {filterRecSectionId
              ? "No open recommendations for this section. Try a different section or clear the filter."
              : "No open recommendations. Run the risk engine to surface new drafts."}
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {recommendations.map((r, i) => {
              const narrative = recommendationNarratives[i];
              const scopeTarget =
                labelMap.get(`${r.scope}:${r.scopeTargetId}`) ??
                (r.scope === "SCHOOL" ? "School-wide" : r.scopeTargetId);
              return (
                <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {/* Card header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {SCOPE_LABEL[r.scope] ?? r.scope}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {r.suggestedType.replace(/_/g, " ")}
                      </span>
                      {r.triggeringRuleId && (
                        <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                          rule: {r.triggeringRuleId.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/counselor/interventions/new?fromRecommendation=${r.id}`}
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Open in builder →
                    </Link>
                  </div>

                  {/* Scope target */}
                  {scopeTarget && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Target: <span className="text-slate-700">{scopeTarget}</span>
                    </p>
                  )}

                  {/* Rationale */}
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{r.rationale}</p>

                  {/* AI narrative — visually contained below rationale */}
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {narrative.ok ? (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                          ✦ AI insight{narrative.cached ? " (cached)" : ""}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                          {narrative.text}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">{fallbackMessage(narrative.reason)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Outcome tracking ─────────────────────────────────────────── */}
      {outcomes.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Outcome tracking</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Participation outcomes from completed plans. Feeds the intervention history sub-score on the next risk recompute.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {outcomes.map((o) => {
              const total = o.total || 1;
              return (
                <li key={o.interventionId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/counselor/interventions/${o.interventionId}`}
                        className="text-sm font-semibold text-slate-900 hover:text-amber-700"
                      >
                        {o.scopeLabel}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {SCOPE_LABEL[o.scope] ?? o.scope} · {o.type.replace(/_/g, " ")}
                        {o.endDate ? ` · ended ${o.endDate}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500">
                      {o.total} participant{o.total === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className="bg-emerald-500 transition-all" style={{ width: `${(o.improving / total) * 100}%` }} title={`Improving ${o.improving}`} />
                    <span className="bg-emerald-300 transition-all" style={{ width: `${(o.completed / total) * 100}%` }} title={`Completed ${o.completed}`} />
                    <span className="bg-slate-300 transition-all" style={{ width: `${(o.stable / total) * 100}%` }} title={`Stable ${o.stable}`} />
                    <span className="bg-rose-400 transition-all" style={{ width: `${(o.declining / total) * 100}%` }} title={`Declining ${o.declining}`} />
                    <span className="bg-slate-100 transition-all" style={{ width: `${(o.unset / total) * 100}%` }} title={`Unset ${o.unset}`} />
                  </div>

                  {/* Legend */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500 inline-block" />Improving {o.improving}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-300 inline-block" />Completed {o.completed}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-300 inline-block" />Stable {o.stable}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400 inline-block" />Declining {o.declining}</span>
                    {o.unset > 0 && <span className="flex items-center gap-1.5 text-slate-400"><span className="size-2 rounded-full bg-slate-100 border border-slate-300 inline-block" />Unset {o.unset}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Interventions list ───────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">All interventions</h2>
          </div>
          {totalInterventions > 0 && (
            <span className="shrink-0 text-xs text-slate-400">
              {totalInterventions.toLocaleString()} {hasActiveFilter ? "matching" : "total"}
            </span>
          )}
        </div>

        {/* Filter bar */}
        <form
          method="GET"
          className="mb-4 rounded-2xl border border-slate-200 bg-white p-4"
        >
          {/* Text search */}
          <div className="mb-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Search</span>
              <input
                type="search"
                name="q"
                defaultValue={filterQ ?? ""}
                placeholder="Student name or section…"
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Section */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Section</span>
              <select
                name="section"
                defaultValue={filterSectionId ?? ""}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All sections</option>
                {allSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.gradeLevel} · {s.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Status */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</span>
              <select
                name="status"
                defaultValue={filterStatus ?? ""}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All statuses</option>
                {INTERVENTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>

            {/* Scope */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Scope</span>
              <select
                name="scope"
                defaultValue={filterScope ?? ""}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All scopes</option>
                {SCOPE_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {SCOPE_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </label>

            {/* Type */}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Type</span>
              <select
                name="type"
                defaultValue={filterType ?? ""}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All types</option>
                {INTERVENTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Actions row */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-slate-700 transition-colors"
            >
              Apply
            </button>
            {hasActiveFilter && (
              <Link
                href="/counselor/interventions"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Clear filters
              </Link>
            )}
          </div>
        </form>

        {interventions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
            No interventions created yet. Use the button above or open a recommendation to start.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Target</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Scope</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Dates</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interventions.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/counselor/interventions/${i.id}`}
                          className="font-semibold text-slate-900 hover:text-amber-700 transition-colors"
                        >
                          {i.scopeLabel}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{SCOPE_LABEL[i.scope] ?? i.scope}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs capitalize">{i.type.replace(/_/g, " ").toLowerCase()}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            STATUS_TONE[i.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {i.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {i.startDate}
                        {i.endDate ? <><br /><span className="text-slate-300">→</span> {i.endDate}</> : ""}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-sm">{i.ownerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-3">
                <PaginationBar
                  pagination={pagination}
                  basePath="/counselor/interventions"
                  forwardParams={{}}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
