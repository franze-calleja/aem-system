import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getInterventionsForTeacher } from "@/lib/intervention/queries";
import TeacherFeedbackForms from "@/components/teacher/teacher-feedback-forms";

const STATUS_TONE: Record<string, string> = {
  PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const SCOPE_LABEL: Record<string, string> = {
  STUDENT: "Individual",
  SECTION: "Section",
  GRADE: "Grade level",
  SCHOOL: "School-wide",
};

export default async function TeacherInterventionFeedbackPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const interventions = await getInterventionsForTeacher(session.user.id, sy.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Intervention Feedback</h1>
        <p className="mt-1 text-sm text-slate-600">
          {interventions.length} intervention{interventions.length === 1 ? "" : "s"} touching your assignments in {sy.label}. You see public plan fields only — rationale and counseling context stay with the counselor.
        </p>
      </header>

      {interventions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          No active interventions in your scope yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {interventions.map((i) => (
            <li key={i.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {SCOPE_LABEL[i.scope] ?? i.scope} · {i.type.replace(/_/g, " ")}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-900">{i.scopeLabel}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {i.startDate}
                    {i.endDate ? ` → ${i.endDate}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    STATUS_TONE[i.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {i.status.replace(/_/g, " ")}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Schedule" value={i.schedule} />
                <Field label="Accommodations" value={i.accommodations} />
                <Field label="Staff actions" value={i.staffActions} />
                <Field label="Target outcomes" value={i.targetOutcomes} />
              </dl>

              {i.status === "ACTIVE" && <TeacherFeedbackForms interventionId={i.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
        {value ?? <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
