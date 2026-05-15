import type { CounselingNoteRow, StudentProfileData } from "@/lib/student/queries";
import type { RiskBandLabel, RiskFactors } from "@/lib/risk/types";
import type { GenerateResult } from "@/lib/ai/gemini";
import { fallbackMessage } from "@/lib/ai/gemini";
import CounselingNoteForm from "@/components/counselor/counseling-note-form";
import ExplainabilityPanel from "@/components/shell/explainability-panel";
import RiskOverrideControls from "@/components/principal/risk-override-controls";

type Props = {
  profile: StudentProfileData;
  viewerRole: "COUNSELOR" | "PRINCIPAL";
  // Counselor-only. Other roles never receive this prop. When present (even
  // as an empty array), the Counseling Notes section + form is rendered.
  counselingNotes?: CounselingNoteRow[];
  /**
   * Latest risk assessment for the enrollment. When provided, the Risk Profile
   * section renders the score + explainability + (optionally) the AI narrative.
   */
  risk?: {
    score: number;
    band: RiskBandLabel;
    factors: RiskFactors;
    computedAt: string;
    enrollmentId: string;
    /** AI narrative result — when ok, shown above the panel. When !ok, shows a fallback note. */
    narrative: GenerateResult;
    override: {
      id: string;
      originalScore: number;
      originalBand: RiskBandLabel;
      overrideBand: RiskBandLabel;
      justification: string;
      overriddenByName: string;
      createdAt: string;
    } | null;
  } | null;
};

const KIND_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  QUIZ: "Quiz",
  PERIODICAL: "Periodical",
  PRE_TEST: "Pre-test",
  POST_TEST: "Post-test",
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-emerald-200",
  ABSENT: "bg-rose-300",
  TARDY: "bg-amber-200",
  EXCUSED: "bg-sky-200",
};

const STATUS_TEXT: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  TARDY: "T",
  EXCUSED: "E",
};

export default function StudentProfileView({ profile, viewerRole, counselingNotes, risk }: Props) {
  const { student, enrollment, consents, grades, attendance, behavioral, stats } = profile;
  const fullName = [student.lastName + ",", student.firstName, student.middleName].filter(Boolean).join(" ");
  const showCounselingNotes = viewerRole === "COUNSELOR" && counselingNotes !== undefined;
  const showRisk = risk !== undefined && risk !== null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{enrollment.gradeLevel} – {enrollment.sectionName} · {enrollment.schoolYearLabel}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{fullName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-mono">{student.lrn}</span>
              <span className="mx-2">·</span>
              <span>{student.sex}</span>
              <span className="mx-2">·</span>
              <span>Born {student.birthDate.slice(0, 10)}</span>
              {student.spedStatus !== "NONE" && (
                <>
                  <span className="mx-2">·</span>
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                    SPED · {student.spedStatus}
                  </span>
                </>
              )}
            </p>
          </div>
          <ConsentBadges consents={consents} />
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 text-xs">
          <a href="#academic" className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50">Academic</a>
          <a href="#attendance" className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50">Attendance</a>
          <a href="#behavioral" className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50">Behavioral</a>
          {showCounselingNotes ? (
            <a href="#counseling-notes" className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50">
              Counseling Notes
            </a>
          ) : (
            <span className="rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-400">
              Counseling Notes — Counselor only
            </span>
          )}
          {showRisk ? (
            <a href="#risk-profile" className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50">
              Risk Profile
            </a>
          ) : (
            <span className="rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-400">
              Risk Profile — not scored
            </span>
          )}
        </nav>
      </section>

      {/* Snapshot stats */}
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Latest GWA"
          value={
            stats.gwaByQuarter.filter((g) => g.gwa !== null).slice(-1)[0]?.gwa?.toFixed(1) ?? "—"
          }
          suffix="%"
        />
        <StatCard
          label="Absence rate"
          value={stats.totalAttendanceDays === 0 ? "—" : (stats.absenceRate * 100).toFixed(1)}
          suffix={stats.totalAttendanceDays === 0 ? "" : "%"}
          tone={stats.absenceRate > 0.15 ? "warn" : stats.absenceRate > 0.08 ? "muted" : "ok"}
        />
        <StatCard
          label="Tardy rate"
          value={stats.totalAttendanceDays === 0 ? "—" : (stats.tardyRate * 100).toFixed(1)}
          suffix={stats.totalAttendanceDays === 0 ? "" : "%"}
        />
        <StatCard
          label="Behavioral incidents"
          value={String(stats.behavioralIncidentCount)}
          tone={stats.behavioralIncidentCount > 2 ? "warn" : stats.behavioralIncidentCount > 0 ? "muted" : "ok"}
        />
      </section>

      {/* Academic */}
      <section id="academic" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Academic Trends</h2>
          <p className="mt-1 text-xs text-slate-500">{grades.length} grade record(s) on file. GWA is the simple average of percentage across all assessments per quarter.</p>
        </header>

        {grades.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No grades recorded for this school year yet.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Q1</th>
                    <th className="px-3 py-2 font-medium">Q2</th>
                    <th className="px-3 py-2 font-medium">Q3</th>
                    <th className="px-3 py-2 font-medium">Q4</th>
                    <th className="px-3 py-2 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.subjectAverages.map((s) => (
                    <tr key={s.subjectCode} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{s.subjectCode}</p>
                        <p className="text-xs text-slate-500">{s.subjectName}</p>
                      </td>
                      {s.quarters.map((q) => (
                        <td key={q.quarter} className="px-3 py-2">
                          {q.pct === null ? <span className="text-slate-300">—</span> : `${q.pct.toFixed(1)}%`}
                        </td>
                      ))}
                      <td className="px-3 py-2 w-32">
                        <Sparkline values={s.quarters.map((q) => q.pct)} />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">GWA</td>
                    {stats.gwaByQuarter.map((q) => (
                      <td key={q.quarter} className="px-3 py-2 font-semibold">
                        {q.gwa === null ? <span className="text-slate-300">—</span> : `${q.gwa.toFixed(1)}%`}
                      </td>
                    ))}
                    <td className="px-3 py-2 w-32">
                      <Sparkline values={stats.gwaByQuarter.map((q) => q.gwa)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <details className="mt-4 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-slate-600">
                Show all {grades.length} individual entries
              </summary>
              <ul className="divide-y divide-slate-100 px-4 pb-3 text-xs">
                {grades.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><span className="font-mono">{g.subjectCode}</span> · Q{g.quarter} · {KIND_LABEL[g.assessmentKind] ?? g.assessmentKind}{g.label ? ` · ${g.label}` : ""}</span>
                    <span className="font-mono">{g.score}/{g.maxScore} ({g.percentage}%)</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </section>

      {/* Attendance */}
      <section id="attendance" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Attendance</h2>
          <p className="mt-1 text-xs text-slate-500">{stats.totalAttendanceDays} day(s) on record. Heatmap is ordered chronologically; hover for details.</p>
        </header>

        {attendance.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No attendance recorded yet.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-1">
              {attendance.map((a) => (
                <span
                  key={a.id}
                  title={`${a.date} — ${a.status}${a.notes ? `\n${a.notes}` : ""}`}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-mono font-semibold text-slate-900 ${STATUS_COLOR[a.status] ?? "bg-slate-100"}`}
                >
                  {STATUS_TEXT[a.status] ?? "?"}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <Legend label="Present" color="bg-emerald-200" />
              <Legend label="Absent" color="bg-rose-300" />
              <Legend label="Tardy" color="bg-amber-200" />
              <Legend label="Excused" color="bg-sky-200" />
            </div>
          </>
        )}
      </section>

      {/* Behavioral */}
      <section id="behavioral" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Behavioral & SEL Records</h2>
          <p className="mt-1 text-xs text-slate-500">{behavioral.length} record(s) on file. {viewerRole === "PRINCIPAL" ? "Read-only oversight view." : "Counselor sees full detail."}</p>
        </header>

        {behavioral.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
            No behavioral records yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {behavioral.map((b) => (
              <li key={b.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <p className="text-slate-700">{b.date}</p>
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${b.severity === "HIGH" ? "text-rose-700" : b.severity === "MODERATE" ? "text-amber-700" : "text-slate-500"}`}>
                    {b.severity} · {b.category.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{b.description}</p>
                {b.recordedByName && <p className="mt-1 text-[11px] text-slate-400">by {b.recordedByName}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Risk Profile */}
      {showRisk && risk && (
        <section id="risk-profile" className="scroll-mt-24 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Risk Profile
              {risk.override && (
                <span className="ml-2 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                  Override active
                </span>
              )}
            </h2>
            <a
              href={`/counselor/students/${student.id}/audit`}
              className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
            >
              Decision audit trail
            </a>
          </div>
          {risk.narrative.ok ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                AI narrative {risk.narrative.cached ? "(cached)" : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-sky-900">{risk.narrative.text}</p>
              <p className="mt-3 text-[11px] text-sky-700/70">
                Generated by Gemini from the algorithmic factor breakdown. Algorithmic output below is the source of truth.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              {fallbackMessage(risk.narrative.reason)}
            </p>
          )}
          {risk.override ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                Displayed band reflects principal override
              </p>
              <p className="mt-2 text-sm text-rose-900">
                Algorithmic band <span className="font-mono font-semibold">{risk.override.originalBand}</span> (score {risk.override.originalScore.toFixed(0)}) → override <span className="font-mono font-semibold">{risk.override.overrideBand}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm italic text-rose-900">
                “{risk.override.justification}”
              </p>
              <p className="mt-2 text-[11px] text-rose-700/80">
                by {risk.override.overriddenByName} · {new Date(risk.override.createdAt).toLocaleString()}
              </p>
            </div>
          ) : null}
          <ExplainabilityPanel
            score={risk.override ? risk.override.originalScore : risk.score}
            band={risk.override ? risk.override.originalBand : risk.band}
            factors={risk.factors}
          />
          <p className="text-[11px] text-slate-400">
            Computed {new Date(risk.computedAt).toLocaleString()}
          </p>
          {viewerRole === "PRINCIPAL" && (
            <RiskOverrideControls
              enrollmentId={risk.enrollmentId}
              currentBand={risk.band}
              activeOverride={risk.override}
            />
          )}
        </section>
      )}

      {/* Counseling Notes — counselor only */}
      {showCounselingNotes && (
        <section id="counseling-notes" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
          <header>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Counseling Notes</h2>
            <p className="mt-1 text-xs text-slate-500">
              Confidential. Visible to counselors only — teachers, principals, and admins cannot read these. Each read is logged in the audit trail.
            </p>
          </header>

          {counselingNotes!.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
              No counseling notes yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {counselingNotes!.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{n.authorName}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{n.body}</p>
                </li>
              ))}
            </ul>
          )}

          <CounselingNoteForm enrollmentId={enrollment.id} />
        </section>
      )}

      {/* Guardian */}
      {(student.guardianName || student.guardianContact) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Guardian</h2>
          <p className="mt-2 text-sm text-slate-700">
            {student.guardianName ?? "—"}{student.guardianContact ? ` · ${student.guardianContact}` : ""}
          </p>
        </section>
      )}
    </div>
  );
}

function ConsentBadges({ consents }: { consents: Array<{ scope: string; status: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {consents.map((c) => {
        const active = c.status === "GRANTED";
        const label = c.scope === "DATA_PROCESSING" ? "Data" : c.scope === "AI_ANALYSIS" ? "AI" : "Intervention";
        return (
          <span
            key={c.scope}
            title={`${c.scope.replace(/_/g, " ")}: ${c.status}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
            {label}
          </span>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "ok" | "muted" | "warn";
}) {
  const accent = tone === "warn" ? "text-rose-700" : tone === "ok" ? "text-emerald-700" : "text-slate-900";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent}`}>{value}{suffix ?? ""}</p>
    </article>
  );
}

function Sparkline({ values }: { values: (number | null)[] }) {
  const filled = values.map((v) => v ?? 0);
  if (filled.every((v) => v === 0)) {
    return <span className="text-xs text-slate-300">no data</span>;
  }
  const max = Math.max(100, ...filled);
  const min = Math.min(0, ...filled);
  const w = 100;
  const h = 24;
  const points = filled
    .map((v, i) => {
      const x = (i / Math.max(1, filled.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1, max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  // Trend color: green if up, red if down
  const first = filled[0];
  const last = filled[filled.length - 1];
  const stroke = last > first ? "#10b981" : last < first ? "#f43f5e" : "#94a3b8";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100" height="24" className="text-slate-700">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        if (v === null) return null;
        const x = (i / Math.max(1, filled.length - 1)) * w;
        const y = h - ((v - min) / Math.max(1, max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="2" fill={stroke} />;
      })}
    </svg>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded ${color}`} />
      <span>{label}</span>
    </span>
  );
}
