"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCounselorStore } from "./counselor-store";
import type {
  InterventionScope,
  InterventionStatus,
  InterventionType,
  RecommendationDraft,
} from "./counselor-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVENTION_TYPES: InterventionType[] = [
  "Remedial Classes",
  "Tutoring",
  "Counseling Sessions",
  "Peer Support",
  "Parent Conference",
  "External Referral",
  "SEL Program",
  "Attendance Campaign",
  "Study Skills Workshop",
];

const SCOPES: InterventionScope[] = ["Individual", "Section", "Grade Level", "School-Wide"];
const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const SECTIONS = ["Newton", "Pascal", "Einstein", "Curie", "Dalton"];

function statusColor(s: InterventionStatus | "Dismissed" | "Converted" | "Pending") {
  if (s === "Active") return "bg-blue-100 text-blue-700";
  if (s === "Planned") return "bg-violet-100 text-violet-700";
  if (s === "Closed") return "bg-slate-100 text-slate-600";
  if (s === "Pending") return "bg-amber-100 text-amber-800";
  if (s === "Converted") return "bg-emerald-100 text-emerald-700";
  if (s === "Dismissed") return "bg-rose-100 text-rose-600";
  return "bg-slate-100 text-slate-600";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Recommendation Queue Tab ─────────────────────────────────────────────────

function RecommendationQueueTab() {
  const store = useCounselorStore();
  const pendingRecs = store.recommendations.filter((r) => r.status === "Pending");
  const otherRecs = store.recommendations.filter((r) => r.status !== "Pending");
  const [converting, setConverting] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Pending Drafts ({pendingRecs.length})
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Algorithmically-generated recommendations awaiting counselor review. Convert to create a formal intervention plan.
        </p>
      </div>

      {pendingRecs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-400">
          No pending recommendations.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pendingRecs.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              isConverting={converting === rec.id}
              onConvert={() => setConverting(rec.id)}
              onDismiss={() => store.dismissRecommendation(rec.id)}
              onCancelConvert={() => setConverting(null)}
              store={store}
            />
          ))}
        </div>
      )}

      {otherRecs.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Actioned</p>
          <div className="flex flex-col gap-3">
            {otherRecs.map((rec) => (
              <div key={rec.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(rec.status)}`}>{rec.status}</span>
                <span className="text-sm font-medium text-slate-600">{rec.studentName}</span>
                <span className="text-xs text-slate-400">{rec.suggestedType}</span>
                <span className="ml-auto text-xs text-slate-400">{fmt(rec.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type RecommendationCardProps = {
  rec: RecommendationDraft;
  isConverting: boolean;
  onConvert: () => void;
  onDismiss: () => void;
  onCancelConvert: () => void;
  store: ReturnType<typeof useCounselorStore>;
};

function RecommendationCard({ rec, isConverting, onConvert, onDismiss, onCancelConvert, store }: RecommendationCardProps) {
  const student = store.getStudentById(rec.studentId);

  const handleConvert = () => {
    if (!student) return;
    const today = new Date().toISOString().slice(0, 10);
    const ivId = store.createIntervention({
      scope: rec.suggestedScope,
      type: rec.suggestedType,
      targetStudentIds: [rec.studentId],
      frequency: "Weekly",
      startDate: today,
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      description: `Auto-converted from recommendation draft. ${rec.narrative.slice(0, 120)}…`,
      accommodationsNeeded: [],
      staffActions: [],
      targetOutcome: `Reduce risk for ${rec.studentName}.`,
      status: "Planned",
      rationale: rec.narrative,
      counselingContext: `Converted from algorithmic recommendation on ${today}.`,
      schoolYear: "SY 2024-2025",
    });
    store.convertRecommendation(rec.id, ivId);
    onCancelConvert();
  };

  return (
    <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">{rec.studentName}</span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{rec.suggestedType}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{rec.suggestedScope}</span>
        <span className="ml-auto text-xs text-slate-400">{fmt(rec.createdAt)}</span>
      </div>

      <div className="mb-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <span className="font-semibold">Trigger: </span>{rec.triggerReason}
      </div>

      <p className="mb-4 text-sm leading-relaxed text-slate-600">{rec.narrative}</p>

      {isConverting ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">
            This will create a Planned intervention for {rec.studentName}. You can edit the details afterward.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConvert}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Confirm Create
            </button>
            <button
              onClick={onCancelConvert}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onConvert}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
          >
            Create Intervention from Draft
          </button>
          <Link
            href={`/counselor/students/${rec.studentId}`}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            View Profile
          </Link>
          <button
            onClick={onDismiss}
            className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Plan Creator Tab ─────────────────────────────────────────────────────────

type PlanFormState = {
  scope: InterventionScope;
  type: InterventionType;
  targetStudentId: string;
  targetSection: string;
  targetGradeLevel: string;
  frequency: string;
  startDate: string;
  endDate: string;
  description: string;
  accommodationsNeeded: string;
  staffActions: string;
  targetOutcome: string;
  rationale: string;
  counselingContext: string;
  schoolYear: string;
};

function PlanCreatorTab({ prefilledStudentId }: { prefilledStudentId?: string }) {
  const store = useCounselorStore();
  const [form, setForm] = useState<PlanFormState>({
    scope: "Individual",
    type: "Remedial Classes",
    targetStudentId: prefilledStudentId ?? "",
    targetSection: "",
    targetGradeLevel: "",
    frequency: "Weekly",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    description: "",
    accommodationsNeeded: "",
    staffActions: "",
    targetOutcome: "",
    rationale: "",
    counselingContext: "",
    schoolYear: "SY 2024-2025",
  });
  const [submitted, setSubmitted] = useState<string | null>(null);

  const set = <K extends keyof PlanFormState>(key: K, val: PlanFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const broadScope = form.scope === "Grade Level" || form.scope === "School-Wide";

  const handleSubmit = () => {
    const targetStudentIds =
      form.scope === "Individual"
        ? [form.targetStudentId].filter(Boolean)
        : store.students
            .filter((s) => {
              if (form.scope === "Section") return s.section === form.targetSection;
              if (form.scope === "Grade Level") return s.gradeLevel === form.targetGradeLevel;
              return true; // School-Wide
            })
            .map((s) => s.id);

    const ivId = store.createIntervention({
      scope: form.scope,
      type: form.type,
      targetStudentIds,
      targetSection: form.targetSection || undefined,
      targetGradeLevel: form.targetGradeLevel || undefined,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate,
      description: form.description,
      accommodationsNeeded: form.accommodationsNeeded.split("\n").filter(Boolean),
      staffActions: form.staffActions.split("\n").filter(Boolean),
      targetOutcome: form.targetOutcome,
      status: "Planned",
      rationale: form.rationale,
      counselingContext: form.counselingContext,
      schoolYear: form.schoolYear,
    });
    setSubmitted(ivId);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 py-12 text-center">
        <span className="text-3xl">✓</span>
        <p className="text-lg font-semibold text-emerald-800">Intervention Plan Created</p>
        <p className="text-sm text-emerald-700">The plan is now in <strong>Planned</strong> status. You can activate it from the student's profile.</p>
        {broadScope && (
          <div className="mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Broad-scope interventions ({form.scope}) require principal approval before activation.
          </div>
        )}
        <button
          onClick={() => { setSubmitted(null); setForm((f) => ({ ...f, description: "", targetOutcome: "", rationale: "", counselingContext: "" })); }}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Scope + type */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Scope & Type</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Scope">
            <select value={form.scope} onChange={(e) => set("scope", e.target.value as InterventionScope)} className="input-field">
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Intervention Type">
            <select value={form.type} onChange={(e) => set("type", e.target.value as InterventionType)} className="input-field">
              {INTERVENTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          {form.scope === "Individual" && (
            <Field label="Target Student">
              <select value={form.targetStudentId} onChange={(e) => set("targetStudentId", e.target.value)} className="input-field">
                <option value="">Select student…</option>
                {store.students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.gradeLevel} {s.section}</option>
                ))}
              </select>
            </Field>
          )}
          {form.scope === "Section" && (
            <Field label="Target Section">
              <select value={form.targetSection} onChange={(e) => set("targetSection", e.target.value)} className="input-field">
                <option value="">Select section…</option>
                {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          )}
          {form.scope === "Grade Level" && (
            <Field label="Target Grade Level">
              <select value={form.targetGradeLevel} onChange={(e) => set("targetGradeLevel", e.target.value)} className="input-field">
                <option value="">Select grade level…</option>
                {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          )}
          {form.scope === "School-Wide" && (
            <div className="flex items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:col-span-2">
              School-Wide scope targets all enrolled students.
            </div>
          )}
        </div>

        {broadScope && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="mt-0.5 text-amber-500">⚠</span>
            <p className="text-xs text-amber-800">
              Broad-scope interventions ({form.scope}) require <strong>principal approval</strong> before activation. The plan will be created in <em>Planned</em> status and submitted for review.
            </p>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Schedule</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Frequency">
            <input value={form.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="e.g. Twice a week" className="input-field" />
          </Field>
          <Field label="Start Date">
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="input-field" />
          </Field>
          <Field label="End Date">
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="input-field" />
          </Field>
        </div>
      </div>

      {/* Public fields */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Public Plan Details</p>
        <p className="mb-4 text-xs text-slate-400">Visible to teachers and relevant staff involved in implementation.</p>
        <div className="flex flex-col gap-4">
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Brief description of the intervention plan…" className="input-field resize-none" />
          </Field>
          <Field label="Accommodations Needed (one per line)">
            <textarea value={form.accommodationsNeeded} onChange={(e) => set("accommodationsNeeded", e.target.value)} rows={3} placeholder="e.g. Front-of-class seating&#10;Extended time on assessments" className="input-field resize-none" />
          </Field>
          <Field label="Staff Actions Required (one per line)">
            <textarea value={form.staffActions} onChange={(e) => set("staffActions", e.target.value)} rows={3} placeholder="e.g. Submit weekly observation notes&#10;Monitor attendance daily" className="input-field resize-none" />
          </Field>
          <Field label="Target Outcome">
            <textarea value={form.targetOutcome} onChange={(e) => set("targetOutcome", e.target.value)} rows={2} placeholder="What does success look like?" className="input-field resize-none" />
          </Field>
        </div>
      </div>

      {/* Sensitive fields */}
      <div className="rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-violet-500">🔒</span>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Sensitive / Counseling Context</p>
        </div>
        <p className="mb-4 text-xs text-violet-600">Visible only to the counselor and principal. Not shared with teachers or the student.</p>
        <div className="flex flex-col gap-4">
          <Field label="Rationale">
            <textarea value={form.rationale} onChange={(e) => set("rationale", e.target.value)} rows={3} placeholder="Why is this intervention needed? Risk signals, patterns, prior history…" className="input-field resize-none" />
          </Field>
          <Field label="Counseling Context">
            <textarea value={form.counselingContext} onChange={(e) => set("counselingContext", e.target.value)} rows={3} placeholder="Background from counseling sessions, family context, or sensitive observations…" className="input-field resize-none" />
          </Field>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={form.scope === "Individual" ? !form.targetStudentId || !form.description : !form.description}
          className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40"
        >
          {broadScope ? "Submit for Approval" : "Create Intervention Plan"}
        </button>
        <Link href="/counselor/caseload" className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

// ─── Interventions List Tab ───────────────────────────────────────────────────

function InterventionsListTab() {
  const store = useCounselorStore();
  const [filterStatus, setFilterStatus] = useState<InterventionStatus | "All">("All");

  const filtered = store.interventions.filter((iv) =>
    filterStatus === "All" ? true : iv.status === filterStatus,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as InterventionStatus | "All")}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="All">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <p className="ml-auto text-xs text-slate-400">{filtered.length} plan{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-400">
          No interventions match the current filter.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((iv) => {
            const targetNames = iv.targetStudentIds
              .map((sid) => store.getStudentById(sid)?.name ?? sid)
              .join(", ");

            return (
              <div key={iv.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(iv.status)}`}>{iv.status}</span>
                  <span className="text-sm font-semibold text-slate-800">{iv.type}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{iv.scope}</span>
                  <div className="ml-auto flex gap-2">
                    {iv.status === "Planned" && (
                      <button
                        onClick={() => store.updateInterventionStatus(iv.id, "Active")}
                        className="rounded-xl bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600"
                      >
                        Activate
                      </button>
                    )}
                    {iv.status === "Active" && (
                      <button
                        onClick={() => store.updateInterventionStatus(iv.id, "Closed")}
                        className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
                <p className="mb-1 text-sm text-slate-600">{iv.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-2">
                  <span>Target: <span className="font-medium text-slate-700 truncate max-w-xs">{targetNames || iv.targetSection || iv.targetGradeLevel || "All Students"}</span></span>
                  <span>Frequency: <span className="font-medium">{iv.frequency}</span></span>
                  <span>{iv.startDate} → {iv.endDate}</span>
                  <span>Sessions: <span className="font-medium">{iv.sessionCount}</span></span>
                </div>
                {iv.notes.length > 0 && (
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <span className="text-xs text-slate-400">{iv.notes.filter((n) => n.status === "Pending").length} pending feedback note{iv.notes.filter((n) => n.status === "Pending").length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabId = "queue" | "new-plan" | "all-plans";

const TABS: { id: TabId; label: string }[] = [
  { id: "queue", label: "Recommendation Queue" },
  { id: "new-plan", label: "New Intervention Plan" },
  { id: "all-plans", label: "All Plans" },
];

export default function InterventionBuilder() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId") ?? undefined;
  const [activeTab, setActiveTab] = useState<TabId>(studentIdParam ? "new-plan" : "queue");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Counselor</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Intervention Builder</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review AI-generated recommendation drafts and build formal intervention plans.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "queue" && <RecommendationQueueTab />}
      {activeTab === "new-plan" && <PlanCreatorTab prefilledStudentId={studentIdParam} />}
      {activeTab === "all-plans" && <InterventionsListTab />}
    </div>
  );
}
