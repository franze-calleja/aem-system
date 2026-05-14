"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordAttendanceAction } from "@/app/actions/teacher/attendance";
import { recordGradeAction } from "@/app/actions/teacher/grades";
import { recordBehavioralAction } from "@/app/actions/teacher/behavioral";

type Student = {
  enrollmentId: string;
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  sex: "MALE" | "FEMALE";
  spedStatus: "NONE" | "IEP" | "ACCOMMODATIONS";
};

type AttendanceMap = Record<string, Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED">>;

type Grade = {
  id: string;
  enrollmentId: string;
  quarter: number;
  score: number;
  maxScore: number;
  assessmentKind: "REGULAR" | "QUIZ" | "PERIODICAL" | "PRE_TEST" | "POST_TEST";
  label: string | null;
  recordedAt: string;
};

type Behavioral = {
  id: string;
  enrollmentId: string;
  date: string;
  category: "ACADEMIC" | "ATTENDANCE_RELATED" | "BEHAVIORAL" | "SOCIAL_EMOTIONAL";
  severity: "LOW" | "MODERATE" | "HIGH";
  description: string;
  recordedByName: string | null;
};

type Props = {
  assignmentId: string;
  sectionLabel: string;
  subjectLabel: string | null;
  isAdviser: boolean;
  students: Student[];
  attendanceFromIso: string;
  attendanceToIso: string;
  attendance: AttendanceMap;
  grades: Grade[];
  behavioral: Behavioral[];
};

type Tab = "roster" | "attendance" | "gradebook" | "behavioral";

const STATUS_KEYS: Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED"> = {
  P: "PRESENT",
  A: "ABSENT",
  T: "TARDY",
  E: "EXCUSED",
};

export default function ClassDetail(props: Props) {
  const [tab, setTab] = useState<Tab>("attendance");

  const tabs: Array<{ id: Tab; label: string; enabled: boolean }> = [
    { id: "roster", label: "Roster", enabled: true },
    { id: "attendance", label: "Attendance", enabled: true },
    { id: "gradebook", label: "Gradebook", enabled: !!props.subjectLabel },
    { id: "behavioral", label: "Behavioral", enabled: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-900">{props.sectionLabel}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {props.subjectLabel ?? <span className="italic">Adviser-only assignment</span>}
          {props.isAdviser && (
            <span className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              Section Adviser
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-500">{props.students.length} student{props.students.length === 1 ? "" : "s"}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.enabled}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === t.id
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : t.enabled
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
            }`}
          >
            {t.label}
            {!t.enabled && t.id === "gradebook" && <span className="ml-2 text-[10px]">(needs subject)</span>}
          </button>
        ))}
      </nav>

      {tab === "roster" && <RosterTab students={props.students} />}
      {tab === "attendance" && (
        <AttendanceTab
          assignmentId={props.assignmentId}
          students={props.students}
          fromIso={props.attendanceFromIso}
          toIso={props.attendanceToIso}
          attendance={props.attendance}
        />
      )}
      {tab === "gradebook" && props.subjectLabel && (
        <GradebookTab assignmentId={props.assignmentId} students={props.students} grades={props.grades} subjectLabel={props.subjectLabel} />
      )}
      {tab === "behavioral" && (
        <BehavioralTab assignmentId={props.assignmentId} students={props.students} behavioral={props.behavioral} />
      )}
    </div>
  );
}

// ─── Roster ─────────────────────────────────────────────────────────────────

function RosterTab({ students }: { students: Student[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Class Roster</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">LRN</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Sex</th>
              <th className="px-3 py-2 font-medium">SPED</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.enrollmentId} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.lrn}</td>
                <td className="px-3 py-2">{s.lastName}, {s.firstName}{s.middleName ? ` ${s.middleName}` : ""}</td>
                <td className="px-3 py-2">{s.sex}</td>
                <td className="px-3 py-2">{s.spedStatus === "NONE" ? "—" : s.spedStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Attendance ─────────────────────────────────────────────────────────────

function AttendanceTab({
  assignmentId,
  students,
  fromIso,
  toIso,
  attendance,
}: {
  assignmentId: string;
  students: Student[];
  fromIso: string;
  toIso: string;
  attendance: AttendanceMap;
}) {
  const router = useRouter();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [draft, setDraft] = useState<Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED">>(() =>
    seedDraft(students, attendance, todayIso),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // 14-day window for the side calendar
  const windowDates = useMemo(() => {
    const out: string[] = [];
    const start = new Date(fromIso + "T00:00:00.000Z");
    const end = new Date(toIso + "T00:00:00.000Z");
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [fromIso, toIso]);

  const onDateChange = (next: string) => {
    setDate(next);
    setDraft(seedDraft(students, attendance, next));
    setError(null);
    setSavedAt(null);
  };

  const setStatus = (enrollmentId: string, status: "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED") => {
    setDraft((prev) => ({ ...prev, [enrollmentId]: status }));
  };

  const onKeyDown = (enrollmentId: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    const key = event.key.toUpperCase();
    if (STATUS_KEYS[key]) {
      event.preventDefault();
      setStatus(enrollmentId, STATUS_KEYS[key]);
      // move focus to next row's input
      const next = (event.currentTarget.closest("tr")?.nextElementSibling?.querySelector("input") as HTMLInputElement | null);
      next?.focus();
    }
  };

  const markAllPresent = () => {
    const next: Record<string, "PRESENT"> = {};
    students.forEach((s) => { next[s.enrollmentId] = "PRESENT"; });
    setDraft(next);
  };

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const entries = students.map((s) => ({
        enrollmentId: s.enrollmentId,
        status: draft[s.enrollmentId] ?? "PRESENT",
      }));
      const r = await recordAttendanceAction({ assignmentId, date, entries });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    });
  };

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, TARDY: 0, EXCUSED: 0 };
    students.forEach((s) => {
      const st = draft[s.enrollmentId] ?? "PRESENT";
      c[st]++;
    });
    return c;
  }, [draft, students]);

  return (
    <section className="grid gap-4 lg:grid-cols-[16rem,1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Date</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <h4 className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Recent days</h4>
        <ul className="mt-2 space-y-1">
          {[...windowDates].reverse().map((d) => {
            const recorded = students.some((s) => attendance[s.enrollmentId]?.[d]);
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => onDateChange(d)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-xs transition ${
                    d === date ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{d}</span>
                  <span className={recorded ? "text-emerald-600" : "text-slate-300"}>
                    {recorded ? "●" : "○"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Attendance — {date}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Tab through students; press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">P</kbd>/<kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">A</kbd>/<kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">T</kbd>/<kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">E</kbd> to mark.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Tag label="P" value={counts.PRESENT} tone="emerald" />
            <Tag label="A" value={counts.ABSENT} tone="rose" />
            <Tag label="T" value={counts.TARDY} tone="amber" />
            <Tag label="E" value={counts.EXCUSED} tone="slate" />
          </div>
        </header>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium w-32">Quick keys</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const status = draft[s.enrollmentId] ?? "PRESENT";
                return (
                  <tr key={s.enrollmentId} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">{s.lastName}, {s.firstName}</td>
                    <td className="px-3 py-2">
                      <select
                        value={status}
                        onChange={(e) => setStatus(s.enrollmentId, e.target.value as typeof status)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="TARDY">Tardy</option>
                        <option value="EXCUSED">Excused</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Quick key for ${s.firstName} ${s.lastName}`}
                        onKeyDown={(e) => onKeyDown(s.enrollmentId, e)}
                        placeholder="P/A/T/E"
                        className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={markAllPresent}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Mark all present
          </button>
          <div className="flex items-center gap-3">
            {savedAt && <span className="text-xs text-emerald-600">Saved at {savedAt}</span>}
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : `Save ${students.length} record(s) for ${date}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function seedDraft(students: Student[], attendance: AttendanceMap, dateIso: string) {
  const out: Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED"> = {};
  for (const s of students) {
    out[s.enrollmentId] = attendance[s.enrollmentId]?.[dateIso] ?? "PRESENT";
  }
  return out;
}

function Tag({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" | "slate" }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cls}`}>
      <span className="font-mono">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

// ─── Gradebook ──────────────────────────────────────────────────────────────

function GradebookTab({
  assignmentId,
  students,
  grades,
  subjectLabel,
}: {
  assignmentId: string;
  students: Student[];
  grades: Grade[];
  subjectLabel: string;
}) {
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [openFor, setOpenFor] = useState<string | null>(null);

  const gradesByEnrollment = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of grades) {
      if (!map.has(g.enrollmentId)) map.set(g.enrollmentId, []);
      map.get(g.enrollmentId)!.push(g);
    }
    return map;
  }, [grades]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Gradebook · {subjectLabel}</h2>
          <p className="mt-1 text-xs text-slate-500">All entries are recorded; quarterly average is informational only.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-slate-500">Quarter</span>
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </div>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Q{quarter} entries</th>
              <th className="px-3 py-2 font-medium">Q{quarter} average</th>
              <th className="px-3 py-2 font-medium w-40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const sg = (gradesByEnrollment.get(s.enrollmentId) ?? []).filter((g) => g.quarter === quarter);
              const avg = sg.length === 0 ? null : Math.round(
                (sg.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / sg.length) * 10,
              ) / 10;
              return (
                <tr key={s.enrollmentId} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2">{s.lastName}, {s.firstName}</td>
                  <td className="px-3 py-2">
                    {sg.length === 0 ? (
                      <span className="text-xs text-slate-400">none yet</span>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {sg.map((g) => (
                          <li key={g.id}>
                            <span className="font-mono">{g.score}/{g.maxScore}</span>
                            <span className="ml-2 text-slate-500">{g.assessmentKind}{g.label ? ` · ${g.label}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-2">{avg === null ? "—" : `${avg}%`}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenFor(openFor === s.enrollmentId ? null : s.enrollmentId)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {openFor === s.enrollmentId ? "Close" : "Add grade"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openFor && (
        <GradeEntryForm
          assignmentId={assignmentId}
          enrollmentId={openFor}
          quarter={quarter}
          studentName={students.find((s) => s.enrollmentId === openFor)?.firstName ?? ""}
          onClose={() => setOpenFor(null)}
        />
      )}
    </section>
  );
}

function GradeEntryForm({
  assignmentId,
  enrollmentId,
  quarter,
  studentName,
  onClose,
}: {
  assignmentId: string;
  enrollmentId: string;
  quarter: 1 | 2 | 3 | 4;
  studentName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [kind, setKind] = useState<"REGULAR" | "QUIZ" | "PERIODICAL" | "PRE_TEST" | "POST_TEST">("REGULAR");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const s = Number(score);
    const m = Number(maxScore);
    if (!Number.isFinite(s) || s < 0) return setError("Score must be a non-negative number.");
    if (!Number.isFinite(m) || m <= 0) return setError("Max score must be positive.");
    startTransition(async () => {
      const r = await recordGradeAction({
        assignmentId,
        enrollmentId,
        quarter,
        score: s,
        maxScore: m,
        assessmentKind: kind,
        label: label || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-900">Add Q{quarter} grade for {studentName}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="text-xs text-slate-700">
          <span className="block font-medium">Score</span>
          <input value={score} onChange={(e) => setScore(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" />
        </label>
        <label className="text-xs text-slate-700">
          <span className="block font-medium">Max</span>
          <input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" />
        </label>
        <label className="text-xs text-slate-700">
          <span className="block font-medium">Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
            <option value="REGULAR">Regular</option>
            <option value="QUIZ">Quiz</option>
            <option value="PERIODICAL">Periodical</option>
            <option value="PRE_TEST">Pre-test</option>
            <option value="POST_TEST">Post-test</option>
          </select>
        </label>
        <label className="text-xs text-slate-700">
          <span className="block font-medium">Label (optional)</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Q1 Quiz 2" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">Cancel</button>
        <button type="button" onClick={submit} disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {pending ? "Saving…" : "Save grade"}
        </button>
      </div>
    </div>
  );
}

// ─── Behavioral ─────────────────────────────────────────────────────────────

function BehavioralTab({
  assignmentId,
  students,
  behavioral,
}: {
  assignmentId: string;
  students: Student[];
  behavioral: Behavioral[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string>(students[0]?.enrollmentId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<"ACADEMIC" | "ATTENDANCE_RELATED" | "BEHAVIORAL" | "SOCIAL_EMOTIONAL">("BEHAVIORAL");
  const [severity, setSeverity] = useState<"LOW" | "MODERATE" | "HIGH">("LOW");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const studentName = useMemo(() => {
    const s = students.find((x) => x.enrollmentId === enrollmentId);
    return s ? `${s.lastName}, ${s.firstName}` : "—";
  }, [enrollmentId, students]);

  const submit = () => {
    setError(null);
    if (!description.trim()) return setError("Description is required.");
    startTransition(async () => {
      const r = await recordBehavioralAction({ assignmentId, enrollmentId, date, category, severity, description });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setDescription("");
      router.refresh();
    });
  };

  const studentLookup = useMemo(() => {
    const m = new Map<string, Student>();
    students.forEach((s) => m.set(s.enrollmentId, s));
    return m;
  }, [students]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Behavioral Records</h2>
          <p className="mt-1 text-xs text-slate-500">Most recent first. Visible to counselor and section adviser.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {open ? "Close" : "Log incident"}
        </button>
      </header>

      {open && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-700">
              <span className="block font-medium">Student</span>
              <select value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
                {students.map((s) => (
                  <option key={s.enrollmentId} value={s.enrollmentId}>{s.lastName}, {s.firstName}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-700">
              <span className="block font-medium">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-slate-700">
              <span className="block font-medium">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
                <option value="ACADEMIC">Academic</option>
                <option value="ATTENDANCE_RELATED">Attendance-related</option>
                <option value="BEHAVIORAL">Behavioral</option>
                <option value="SOCIAL_EMOTIONAL">Social-Emotional</option>
              </select>
            </label>
            <label className="text-xs text-slate-700">
              <span className="block font-medium">Severity</span>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm">
                <option value="LOW">Low</option>
                <option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block text-xs text-slate-700">
            <span className="block font-medium">Description ({studentName})</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm" />
          </label>
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">Cancel</button>
            <button type="button" onClick={submit} disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {pending ? "Saving…" : "Save record"}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {behavioral.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-400">No records yet.</li>
        )}
        {behavioral.map((b) => {
          const s = studentLookup.get(b.enrollmentId);
          return (
            <li key={b.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p className="font-medium text-slate-900">
                  {s ? `${s.lastName}, ${s.firstName}` : "—"}
                  <span className="ml-2 text-xs text-slate-500">{b.date}</span>
                </p>
                <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${severityColor(b.severity)}`}>
                  {b.severity} · {b.category.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{b.description}</p>
              {b.recordedByName && <p className="mt-1 text-[11px] text-slate-400">by {b.recordedByName}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function severityColor(sev: "LOW" | "MODERATE" | "HIGH") {
  if (sev === "HIGH") return "text-rose-700";
  if (sev === "MODERATE") return "text-amber-700";
  return "text-slate-500";
}
