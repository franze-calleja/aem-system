import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getPatternMatchesForYear } from "@/lib/patterns/queries";
import PatternDisposition from "@/components/counselor/pattern-disposition";

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

const SCOPE_TONE: Record<string, string> = {
  STUDENT: "border-slate-200 bg-slate-50 text-slate-700",
  SECTION: "border-amber-200 bg-amber-50 text-amber-700",
  GRADE: "border-sky-200 bg-sky-50 text-sky-700",
  SCHOOL: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function CounselorPatternInboxPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const matches = await getPatternMatchesForYear(sy.id, "OPEN");

  const grouped: Record<string, typeof matches> = {};
  for (const m of matches) {
    if (!grouped[m.scope]) grouped[m.scope] = [];
    grouped[m.scope].push(m);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Pattern Inbox</h1>
        <p className="mt-1 text-sm text-slate-600">
          {matches.length} open pattern match{matches.length === 1 ? "" : "es"} across all scopes in {sy.label}. Resolve once you&apos;ve acted on a pattern; dismiss to clear without action. Both leave an audit trail.
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nothing open. Run the risk engine if you expect new matches.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {(["STUDENT", "SECTION", "GRADE", "SCHOOL"] as const).map((scope) => {
            const items = grouped[scope] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={scope}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {SCOPE_LABEL[scope]} ({items.length})
                </h2>
                <ul className="flex flex-col gap-3">
                  {items.map((m) => (
                    <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${SCOPE_TONE[m.scope]}`}>
                              {SCOPE_LABEL[m.scope] ?? m.scope}
                            </span>
                            <span className="ml-2">{m.ruleLabel}</span>
                          </p>
                          <p className="mt-2 font-medium text-slate-900">{m.scopeLabel}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            matched {new Date(m.matchedAt).toLocaleString()} · {m.recommendationCount} recommendation draft{m.recommendationCount === 1 ? "" : "s"}
                          </p>
                          {Object.keys(m.evidence).length > 0 && (
                            <details className="mt-3 text-xs text-slate-600">
                              <summary className="cursor-pointer font-medium text-slate-700">Evidence</summary>
                              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
                                {JSON.stringify(m.evidence, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {m.scope === "STUDENT" && (
                            <Link
                              href={`/counselor/students/${m.scopeTargetId}`}
                              className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
                            >
                              View student
                            </Link>
                          )}
                          <Link
                            href={`/counselor/interventions/new?fromPattern=${m.id}`}
                            className="rounded-lg bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800"
                          >
                            Plan intervention
                          </Link>
                        </div>
                      </div>
                      <PatternDisposition patternId={m.id} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
