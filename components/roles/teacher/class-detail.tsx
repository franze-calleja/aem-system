"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordAttendanceAction } from "@/app/actions/teacher/attendance";
import { recordBulkGradesAction } from "@/app/actions/teacher/grades";
import { recordBehavioralAction } from "@/app/actions/teacher/behavioral";

// ─── Types ───────────────────────────────────────────────────────────────────

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

type StudentRisk = {
  enrollmentId: string;
  firstName: string;
  lastName: string;
  riskScore: number | null;
  riskBand: "HIGH" | "MODERATE" | "LOW" | null;
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
  sectionRisk: StudentRisk[];
};

type Tab = "roster" | "attendance" | "gradebook" | "behavioral" | "risk";
type KindFilter = "ALL" | "REGULAR" | "QUIZ" | "PERIODICAL" | "PRE_TEST" | "POST_TEST";
type AssessmentKind = "REGULAR" | "QUIZ" | "PERIODICAL" | "PRE_TEST" | "POST_TEST";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED"> = {
  P: "PRESENT",
  A: "ABSENT",
  T: "TARDY",
  E: "EXCUSED",
};

const STATUS_CONFIG = {
  PRESENT: {
    label: "Present",
    abbr: "P",
    bg: "bg-emerald-500 hover:bg-emerald-600 text-white",
    inactive: "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rowBg: "",
  },
  ABSENT: {
    label: "Absent",
    abbr: "A",
    bg: "bg-rose-500 hover:bg-rose-600 text-white",
    inactive: "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    rowBg: "bg-rose-50/40",
  },
  TARDY: {
    label: "Tardy",
    abbr: "T",
    bg: "bg-amber-500 hover:bg-amber-600 text-white",
    inactive: "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    rowBg: "bg-amber-50/40",
  },
  EXCUSED: {
    label: "Excused",
    abbr: "E",
    bg: "bg-slate-500 hover:bg-slate-600 text-white",
    inactive: "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    rowBg: "bg-slate-50/40",
  },
} as const;

const KIND_CONFIG: Record<AssessmentKind, { label: string; color: string; activePill: string }> = {
  REGULAR: {
    label: "Regular",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    activePill: "bg-blue-600 text-white border-blue-600",
  },
  QUIZ: {
    label: "Quiz",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    activePill: "bg-violet-600 text-white border-violet-600",
  },
  PERIODICAL: {
    label: "Periodical",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    activePill: "bg-amber-500 text-white border-amber-500",
  },
  PRE_TEST: {
    label: "Pre-test",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    activePill: "bg-teal-600 text-white border-teal-600",
  },
  POST_TEST: {
    label: "Post-test",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activePill: "bg-emerald-600 text-white border-emerald-600",
  },
};

const SEVERITY_CONFIG = {
  LOW: { label: "Low", badge: "bg-slate-50 text-slate-700 border-slate-300" },
  MODERATE: { label: "Moderate", badge: "bg-amber-50 text-amber-800 border-amber-300" },
  HIGH: { label: "High", badge: "bg-rose-50 text-rose-800 border-rose-300" },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  ACADEMIC: "Academic",
  ATTENDANCE_RELATED: "Attendance-Related",
  BEHAVIORAL: "Behavioral",
  SOCIAL_EMOTIONAL: "Social-Emotional",
};

const ALL_KINDS: AssessmentKind[] = ["REGULAR", "QUIZ", "PERIODICAL", "PRE_TEST", "POST_TEST"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLong(iso: string): string {
  return new Date(iso + "T00:00:00.000Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso + "T00:00:00.000Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateDisplay(iso: string): { weekday: string; date: string; year: string } {
  const d = new Date(iso + "T00:00:00.000Z");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    date: d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }),
    year: String(d.getUTCFullYear()),
  };
}

function shiftDay(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function seedDraft(
  students: Student[],
  attendance: AttendanceMap,
  dateIso: string,
): Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED"> {
  const out: Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED"> = {};
  for (const s of students) {
    out[s.enrollmentId] = attendance[s.enrollmentId]?.[dateIso] ?? "PRESENT";
  }
  return out;
}

function calcAvg(entries: Grade[]): number | null {
  if (entries.length === 0) return null;
  return (
    Math.round(
      (entries.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / entries.length) * 10,
    ) / 10
  );
}

function avgColor(avg: number): string {
  if (avg >= 75) return "text-emerald-700";
  if (avg >= 60) return "text-amber-700";
  return "text-rose-700";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClassDetail(props: Props) {
  const [tab, setTab] = useState<Tab>("attendance");

  const tabs: Array<{ id: Tab; label: string; enabled: boolean; badge?: number }> = [
    { id: "roster", label: "Roster", enabled: true, badge: props.students.length },
    { id: "attendance", label: "Attendance", enabled: true },
    {
      id: "gradebook",
      label: "Gradebook",
      enabled: !!props.subjectLabel,
      badge: props.grades.length > 0 ? props.grades.length : undefined,
    },
    {
      id: "behavioral",
      label: "Behavioral",
      enabled: true,
      badge: props.behavioral.length > 0 ? props.behavioral.length : undefined,
    },
    {
      id: "risk",
      label: "Risk",
      enabled: true,
      badge: props.sectionRisk.filter((r) => r.riskBand === "HIGH" || r.riskBand === "MODERATE").length || undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-900">{props.sectionLabel}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-600">
            {props.subjectLabel ?? <span className="italic">Adviser-only assignment</span>}
          </p>
          {props.isAdviser && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              Section Adviser
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {props.students.length} student{props.students.length === 1 ? "" : "s"} enrolled
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.enabled}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : t.enabled
                  ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span
                className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                  tab === t.id ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.badge}
              </span>
            )}
            {!t.enabled && t.id === "gradebook" && (
              <span className="text-[10px] text-slate-400">(no subject)</span>
            )}
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
        <GradebookTab
          assignmentId={props.assignmentId}
          students={props.students}
          grades={props.grades}
          subjectLabel={props.subjectLabel}
        />
      )}
      {tab === "behavioral" && (
        <BehavioralTab
          assignmentId={props.assignmentId}
          students={props.students}
          behavioral={props.behavioral}
        />
      )}
      {tab === "risk" && (
        <RiskTab
          rows={props.sectionRisk}
          sectionLabel={props.sectionLabel}
        />
      )}
    </div>
  );
}

// ─── Risk ────────────────────────────────────────────────────────────────────

function RiskTab({ rows, sectionLabel }: { rows: StudentRisk[]; sectionLabel: string }) {
  const total = rows.length;
  let high = 0, moderate = 0, low = 0, unscored = 0;
  for (const r of rows) {
    if (r.riskBand === "HIGH") high++;
    else if (r.riskBand === "MODERATE") moderate++;
    else if (r.riskBand === "LOW") low++;
    else unscored++;
  }

  const sorted = [...rows]
    .filter((r) => r.riskScore !== null)
    .sort((a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1));

  const BAND_CONFIG = {
    HIGH: { label: "HIGH", bg: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200" },
    MODERATE: { label: "MODERATE", bg: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    LOW: { label: "LOW", bg: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Risk Distribution</h2>
          <p className="mt-1 text-xs text-slate-500">
            {sectionLabel} · {total} student{total === 1 ? "" : "s"} · {high + moderate} at-risk
          </p>
        </div>
        <a
          href="/teacher/student-risk"
          className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
        >
          Full student risk
        </a>
      </header>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {(["HIGH", "MODERATE", "LOW"] as const).map((band) => {
          const count = band === "HIGH" ? high : band === "MODERATE" ? moderate : low;
          return (
            <article key={band} className={`rounded-xl border p-3 text-center ${BAND_CONFIG[band].bg}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{band}</p>
              <p className="mt-1 text-2xl font-bold">{count}</p>
            </article>
          );
        })}
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-slate-600">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Unscored</p>
          <p className="mt-1 text-2xl font-bold">{unscored}</p>
        </article>
      </div>

      {/* Distribution bar */}
      {total > 0 && (
        <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <span className="bg-rose-500 transition-all" style={{ width: `${(high / total) * 100}%` }} />
          <span className="bg-amber-400 transition-all" style={{ width: `${(moderate / total) * 100}%` }} />
          <span className="bg-emerald-500 transition-all" style={{ width: `${(low / total) * 100}%` }} />
          <span className="bg-slate-300 transition-all" style={{ width: `${(unscored / total) * 100}%` }} />
        </div>
      )}

      {/* Full student list sorted by risk */}
      {sorted.length > 0 ? (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            All students by risk score
          </p>
          <ul className="mt-2 divide-y divide-slate-100">
            {sorted.map((r, i) => {
              const band = r.riskBand as "HIGH" | "MODERATE" | "LOW";
              const cfg = BAND_CONFIG[band];
              const pct = r.riskScore !== null ? Math.round(r.riskScore) : null;
              return (
                <li key={r.enrollmentId} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-800">{r.lastName}, {r.firstName}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {band}
                  </span>
                  <span className="w-10 text-right text-xs tabular-nums text-slate-500">
                    {pct !== null ? pct : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <p className="text-2xl">📊</p>
          <p className="mt-2 text-sm font-medium text-slate-500">No risk scores yet</p>
          <p className="mt-1 text-xs text-slate-400">Ask the admin to run the risk engine first.</p>
        </div>
      )}
    </section>
  );
}

// ─── Roster ─────────────────────────────────────────────────────────────────

function RosterTab({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? students.filter((s) => {
        const name = `${s.firstName} ${s.lastName} ${s.middleName ?? ""}`.toLowerCase();
        return name.includes(q) || s.lrn.includes(q);
      })
    : students;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Class Roster</h2>
          <p className="mt-1 text-xs text-slate-500">
            {visible.length} of {students.length} student{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or LRN…"
          className="min-w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">LRN</th>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Sex</th>
              <th className="px-4 py-3">SPED Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((s, i) => (
              <tr key={s.enrollmentId} className="transition-colors hover:bg-slate-50/60">
                <td className="px-4 py-3 tabular-nums text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.lrn}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {s.lastName}, {s.firstName}{s.middleName ? ` ${s.middleName[0]}.` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.sex === "MALE" ? "Male" : "Female"}</td>
                <td className="px-4 py-3">
                  {s.spedStatus === "NONE" ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      s.spedStatus === "IEP"
                        ? "border-violet-200 bg-violet-50 text-violet-800"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                    }`}>
                      {s.spedStatus}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  No students match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
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
  const clampDate = (iso: string) => {
    if (iso < fromIso) return fromIso;
    if (iso > toIso) return toIso;
    return iso;
  };
  const [date, setDate] = useState(() => clampDate(todayIso));
  const [draft, setDraft] = useState<Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED">>(() =>
    seedDraft(students, attendance, clampDate(todayIso)),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onDateChange = (next: string) => {
    const clamped = clampDate(next);
    setDate(clamped);
    setDraft(seedDraft(students, attendance, clamped));
    setError(null);
    setSavedAt(null);
  };

  const setStatus = (enrollmentId: string, status: "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED") => {
    setDraft((prev) => ({ ...prev, [enrollmentId]: status }));
  };

  const onRowKeyDown = (enrollmentId: string, event: React.KeyboardEvent<HTMLTableRowElement>) => {
    const key = event.key.toUpperCase();
    if (STATUS_MAP[key]) {
      event.preventDefault();
      setStatus(enrollmentId, STATUS_MAP[key]);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      (event.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
    }
  };

  const markAll = (status: "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED") => {
    const next: Record<string, typeof status> = {};
    students.forEach((s) => { next[s.enrollmentId] = status; });
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
    students.forEach((s) => { c[draft[s.enrollmentId] ?? "PRESENT"]++; });
    return c;
  }, [draft, students]);

  const displayDate = formatDateDisplay(date);

  return (
    <section className="grid gap-4 lg:grid-cols-[15rem,1fr]">
      {/* Date sidebar */}
      <aside className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        {/* Prev / current / next */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDateChange(shiftDay(date, -1))}
            disabled={date <= fromIso}
            title="Previous day"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <div className="flex-1 rounded-xl bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">{displayDate.weekday}</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-900">{displayDate.date}</p>
            <p className="text-[11px] text-emerald-700">{displayDate.year}</p>
          </div>
          <button
            type="button"
            onClick={() => onDateChange(shiftDay(date, 1))}
            disabled={date >= toIso}
            title="Next day"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>

        {/* Jump to today */}
        {date !== todayIso && todayIso >= fromIso && todayIso <= toIso && (
          <button
            type="button"
            onClick={() => onDateChange(todayIso)}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Jump to Today
          </button>
        )}

        {/* Manual date picker */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500">Pick any date</label>
          <input
            type="date"
            value={date}
            min={fromIso}
            max={toIso}
            onChange={(e) => onDateChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>


      </aside>

      {/* Attendance sheet */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{formatDateLong(date)}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Click a status button — or focus a row and press{" "}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">P</kbd>{" "}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">A</kbd>{" "}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">T</kbd>{" "}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">E</kbd>{" "}
              then <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px]">↓</kbd>{" "}
              to move down.
            </p>
          </div>
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {(["PRESENT", "ABSENT", "TARDY", "EXCUSED"] as const).map((st) => (
              <span
                key={st}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  STATUS_CONFIG[st].badge
                }`}
              >
                {STATUS_CONFIG[st].label}
                <span className="min-w-[18px] rounded-full bg-white/70 px-1 text-center tabular-nums">
                  {counts[st]}
                </span>
              </span>
            ))}
          </div>
        </header>

        {/* Mark all row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="text-xs font-medium text-slate-500">Mark all as:</span>
          {(["PRESENT", "ABSENT", "TARDY", "EXCUSED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => markAll(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${STATUS_CONFIG[st].bg}`}
            >
              {STATUS_CONFIG[st].label}
            </button>
          ))}
        </div>

        {/* Student rows */}
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, i) => {
                const status = draft[s.enrollmentId] ?? "PRESENT";
                return (
                  <tr
                    key={s.enrollmentId}
                    tabIndex={0}
                    onKeyDown={(e) => onRowKeyDown(s.enrollmentId, e)}
                    className={`outline-none transition focus:ring-2 focus:ring-inset focus:ring-emerald-300 ${
                      STATUS_CONFIG[status].rowBg
                    }`}
                  >
                    <td className="px-4 py-3 tabular-nums text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.lastName}, {s.firstName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(["PRESENT", "ABSENT", "TARDY", "EXCUSED"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatus(s.enrollmentId, st)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              status === st
                                ? STATUS_CONFIG[st].bg
                                : STATUS_CONFIG[st].inactive
                            }`}
                          >
                            {STATUS_CONFIG[st].label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {savedAt && (
            <span className="text-xs text-emerald-600">✓ Saved at {savedAt}</span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : `Save Attendance — ${formatDateShort(date)}`}
          </button>
        </div>
      </div>
    </section>
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
  const router = useRouter();
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  // New-assessment setup state
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupKind, setSetupKind] = useState<AssessmentKind>("REGULAR");
  const [setupLabel, setSetupLabel] = useState("");
  const [setupMax, setSetupMax] = useState("100");
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const gradesByEnrollment = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of grades) {
      if (!map.has(g.enrollmentId)) map.set(g.enrollmentId, []);
      map.get(g.enrollmentId)!.push(g);
    }
    return map;
  }, [grades]);

  const quarterGrades = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const [eid, gg] of gradesByEnrollment) {
      map.set(eid, gg.filter((g) => g.quarter === quarter));
    }
    return map;
  }, [gradesByEnrollment, quarter]);

  const kindCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: 0 };
    for (const kind of ALL_KINDS) c[kind] = 0;
    for (const gg of quarterGrades.values()) {
      c.ALL += gg.length;
      for (const g of gg) c[g.assessmentKind]++;
    }
    return c;
  }, [quarterGrades]);

  // Build pivot columns from existing saved grades
  type PivotCol = { colKey: string; kind: AssessmentKind; label: string | null; unlabeledIndex?: number };
  const columns = useMemo((): PivotCol[] => {
    const labeledSet = new Map<string, { kind: AssessmentKind; label: string }>();
    const unlabeledMax = new Map<AssessmentKind, number>();

    for (const [, gs] of quarterGrades) {
      const filtered = kindFilter === "ALL" ? gs : gs.filter((g) => g.assessmentKind === kindFilter);
      const sorted = [...filtered].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      const unlabeledCount = new Map<AssessmentKind, number>();
      for (const g of sorted) {
        if (g.label) {
          const key = `${g.assessmentKind}:${g.label}`;
          if (!labeledSet.has(key)) labeledSet.set(key, { kind: g.assessmentKind, label: g.label });
        } else {
          const prev = unlabeledCount.get(g.assessmentKind) ?? 0;
          unlabeledCount.set(g.assessmentKind, prev + 1);
        }
      }
      for (const [kind, count] of unlabeledCount) {
        unlabeledMax.set(kind, Math.max(unlabeledMax.get(kind) ?? 0, count));
      }
    }

    const kindOrder: AssessmentKind[] = ["REGULAR", "QUIZ", "PERIODICAL", "PRE_TEST", "POST_TEST"];
    const activeKinds = kindFilter === "ALL" ? kindOrder : [kindFilter as AssessmentKind];
    const cols: PivotCol[] = [];

    for (const kind of activeKinds) {
      const maxUnlabeled = unlabeledMax.get(kind) ?? 0;
      for (let i = 0; i < maxUnlabeled; i++) {
        cols.push({ colKey: `${kind}:#${i}`, kind, label: null, unlabeledIndex: i });
      }
      const labeled = [...labeledSet.entries()]
        .filter(([, v]) => v.kind === kind)
        .sort(([, a], [, b]) => a.label.localeCompare(b.label));
      for (const [key, v] of labeled) {
        cols.push({ colKey: key, kind, label: v.label });
      }
    }
    return cols;
  }, [quarterGrades, kindFilter]);

  const getCell = (gs: Grade[], col: PivotCol): Grade | null => {
    const relevant = gs.filter(
      (g) => g.assessmentKind === col.kind && (col.label ? g.label === col.label : !g.label),
    );
    if (col.unlabeledIndex !== undefined) {
      return [...relevant].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))[col.unlabeledIndex] ?? null;
    }
    return relevant[0] ?? null;
  };

  const maxScoreNum = Number(setupMax);
  const setupValid = Number.isFinite(maxScoreNum) && maxScoreNum > 0;
  const filledEntries = students.filter((s) => scoreInputs[s.enrollmentId]?.trim() !== "");
  const filledCount = filledEntries.length;

  const openSetup = () => {
    setSetupOpen(true);
    setScoreInputs({});
    setError(null);
    setSavedMsg(null);
  };

  const cancelSetup = () => {
    setSetupOpen(false);
    setScoreInputs({});
    setError(null);
  };

  const saveAll = () => {
    setError(null);
    if (filledCount === 0) return setError("Enter at least one score before saving.");
    if (!setupValid) return setError("Max score must be a positive number.");

    const entries = filledEntries.map((s) => ({
      enrollmentId: s.enrollmentId,
      score: Number(scoreInputs[s.enrollmentId]),
    }));

    const invalid = entries.find((e) => !Number.isFinite(e.score) || e.score < 0);
    if (invalid) return setError("All scores must be non-negative numbers.");
    const overMax = entries.find((e) => e.score > maxScoreNum);
    if (overMax) return setError(`Score ${overMax.score} exceeds max ${maxScoreNum}.`);

    startTransition(async () => {
      const r = await recordBulkGradesAction({
        assignmentId,
        quarter,
        assessmentKind: setupKind,
        label: setupLabel.trim() || undefined,
        maxScore: maxScoreNum,
        entries,
      });
      if (!r.ok) { setError(r.error); return; }
      setSavedMsg(`Saved ${r.count} score${r.count === 1 ? "" : "s"} ✓`);
      setSetupOpen(false);
      setScoreInputs({});
      setSetupLabel("");
      setSetupMax("100");
      setSetupKind("REGULAR");
      router.refresh();
    });
  };

  // Total columns for colspan (existing + new + avg)
  const totalCols = columns.length + (setupOpen && setupValid ? 1 : 0) + 3; // #, Student, Avg

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Gradebook · {subjectLabel}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {setupOpen ? "Enter scores for the whole section at once." : "Each column is one assessment."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Quarter pills */}
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => { setQuarter(q); setKindFilter("ALL"); cancelSetup(); setSavedMsg(null); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  quarter === q
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
          {!setupOpen && (
            <button
              type="button"
              onClick={openSetup}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              + New Assessment
            </button>
          )}
        </div>
      </header>

      {/* New assessment setup panel */}
      {setupOpen && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-emerald-900">New Assessment — Q{quarter}</p>
            <button type="button" onClick={cancelSetup} className="text-xs text-emerald-700 hover:underline">
              ✕ Cancel
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
            {/* Kind */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Type</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ALL_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSetupKind(k)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      setupKind === k ? KIND_CONFIG[k].activePill : `${KIND_CONFIG[k].color} hover:opacity-80`
                    }`}
                  >
                    {KIND_CONFIG[k].label}
                  </button>
                ))}
              </div>
            </div>
            {/* Label */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Name / Label <span className="normal-case font-normal text-slate-400">(optional)</span>
              <input
                value={setupLabel}
                onChange={(e) => setSetupLabel(e.target.value)}
                placeholder="e.g. Quiz 1, HW 3…"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            {/* Max score */}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Max Score
              <input
                type="number"
                min={1}
                value={setupMax}
                onChange={(e) => setSetupMax(e.target.value)}
                className="mt-1.5 block w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          </div>
          {setupValid && (
            <p className="mt-2 text-[11px] text-emerald-700">
              Ready — enter each student&apos;s score in the table below. Leave blank to skip.
            </p>
          )}
        </div>
      )}

      {/* Filter pills (only when not entering a new assessment) */}
      {!setupOpen && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setKindFilter("ALL")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              kindFilter === "ALL"
                ? "border-slate-700 bg-slate-700 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Types
            <span className={`rounded-full px-1.5 tabular-nums ${kindFilter === "ALL" ? "bg-white/20" : "bg-slate-100"}`}>
              {kindCounts.ALL}
            </span>
          </button>
          {ALL_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                kindFilter === k ? KIND_CONFIG[k].activePill : `${KIND_CONFIG[k].color} hover:opacity-80`
              }`}
            >
              {KIND_CONFIG[k].label}
              <span className="rounded-full bg-white/30 px-1.5 tabular-nums">{kindCounts[k]}</span>
            </button>
          ))}
        </div>
      )}

      {savedMsg && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {savedMsg}
        </p>
      )}

      {/* Pivot table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3 min-w-[160px]">Student</th>
              {/* Existing saved columns */}
              {columns.map((col) => (
                <th key={col.colKey} className="px-3 py-3 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${KIND_CONFIG[col.kind].color}`}>
                    {KIND_CONFIG[col.kind].label}
                  </span>
                  {col.label && (
                    <p className="mt-0.5 text-[11px] normal-case font-medium text-slate-600 tracking-normal">{col.label}</p>
                  )}
                </th>
              ))}
              {/* New pending column */}
              {setupOpen && setupValid && (
                <th className="px-3 py-3 text-center whitespace-nowrap border-l-2 border-emerald-200 bg-emerald-50/60">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${KIND_CONFIG[setupKind].activePill}`}>
                    {KIND_CONFIG[setupKind].label}
                  </span>
                  {setupLabel.trim() && (
                    <p className="mt-0.5 text-[11px] normal-case font-medium text-emerald-700 tracking-normal">{setupLabel.trim()}</p>
                  )}
                  <p className="mt-0.5 text-[10px] font-normal normal-case text-slate-400 tracking-normal">/{setupMax} pts</p>
                </th>
              )}
              <th className="px-4 py-3 text-center">Avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {columns.length === 0 && !setupOpen && (
              <tr>
                <td colSpan={totalCols} className="py-10 text-center">
                  <p className="text-2xl">📝</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">No grades yet for Q{quarter}</p>
                  <p className="mt-1 text-xs text-slate-400">Click &ldquo;+ New Assessment&rdquo; to start entering scores.</p>
                </td>
              </tr>
            )}
            {students.map((s, i) => {
              const allQ = quarterGrades.get(s.enrollmentId) ?? [];
              const filtered = kindFilter === "ALL" ? allQ : allQ.filter((g) => g.assessmentKind === kindFilter);
              const avg = calcAvg(filtered);
              const rawInput = scoreInputs[s.enrollmentId] ?? "";
              const inputNum = rawInput.trim() !== "" ? Number(rawInput) : null;
              const inputPct = inputNum !== null && setupValid && Number.isFinite(inputNum)
                ? Math.round((inputNum / maxScoreNum) * 1000) / 10
                : null;

              return (
                <tr key={s.enrollmentId} className="align-middle hover:bg-slate-50/60">
                  <td className="px-4 py-3 tabular-nums text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {s.lastName}, {s.firstName}
                  </td>
                  {/* Existing saved cells */}
                  {columns.map((col) => {
                    const g = getCell(allQ, col);
                    return (
                      <td key={col.colKey} className="px-3 py-3 text-center">
                        {g ? (
                          <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums ${KIND_CONFIG[col.kind].color}`}>
                            {g.score}/{g.maxScore}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  {/* New pending input cell */}
                  {setupOpen && setupValid && (
                    <td className="px-3 py-2 text-center border-l-2 border-emerald-200 bg-emerald-50/40">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={maxScoreNum}
                          value={rawInput}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({ ...prev, [s.enrollmentId]: e.target.value }))
                          }
                          placeholder="—"
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm tabular-nums focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        {inputPct !== null && (
                          <span className={`text-[11px] font-semibold tabular-nums ${
                            inputPct >= 75 ? "text-emerald-700"
                            : inputPct >= 60 ? "text-amber-700"
                            : "text-rose-700"
                          }`}>
                            {inputPct}%
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {/* Avg */}
                  <td className="px-4 py-3 text-center">
                    {avg === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className={`text-sm font-bold tabular-nums ${avgColor(avg)}`}>{avg}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save / cancel bar */}
      {setupOpen && setupValid && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div>
            {error ? (
              <p className="text-sm text-red-700">{error}</p>
            ) : (
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-emerald-800">{filledCount}</span> of {students.length} students scored
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelSetup}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={pending || filledCount === 0}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : `Save ${filledCount > 0 ? filledCount : ""} Score${filledCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </section>
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
          <h2 className="text-base font-bold text-slate-900">Behavioral Records</h2>
          <p className="mt-1 text-xs text-slate-500">
            {behavioral.length} record{behavioral.length === 1 ? "" : "s"} · visible to counselor and section adviser
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            open
              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          }`}
        >
          {open ? "✕ Cancel" : "+ Log Incident"}
        </button>
      </header>

      {open && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">New Behavioral Record</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-700">
              <span className="font-semibold">Student</span>
              <select
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {students.map((s) => (
                  <option key={s.enrollmentId} value={s.enrollmentId}>
                    {s.lastName}, {s.firstName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-700">
              <span className="font-semibold">Date of Incident</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="block text-xs text-slate-700">
              <span className="font-semibold">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </label>
            <div className="block text-xs text-slate-700">
              <p className="font-semibold">Severity</p>
              <div className="mt-1 flex gap-2">
                {(["LOW", "MODERATE", "HIGH"] as const).map((sv) => (
                  <button
                    key={sv}
                    type="button"
                    onClick={() => setSeverity(sv)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
                      severity === sv
                        ? sv === "HIGH"
                          ? "border-rose-400 bg-rose-500 text-white"
                          : sv === "MODERATE"
                            ? "border-amber-400 bg-amber-500 text-white"
                            : "border-slate-400 bg-slate-600 text-white"
                        : SEVERITY_CONFIG[sv].badge + " hover:opacity-80"
                    }`}
                  >
                    {SEVERITY_CONFIG[sv].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-3 block text-xs text-slate-700">
            <span className="font-semibold">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the incident clearly and factually…"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>

          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setDescription(""); }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !description.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save Record"}
            </button>
          </div>
        </div>
      )}

      {/* Records list */}
      {behavioral.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <p className="text-2xl">📋</p>
          <p className="mt-2 text-sm font-medium text-slate-500">No behavioral records yet</p>
          <p className="mt-1 text-xs text-slate-400">Click &ldquo;+ Log Incident&rdquo; above to add the first one.</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {behavioral.map((b) => {
            const s = studentLookup.get(b.enrollmentId);
            return (
              <li key={b.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {s ? `${s.lastName}, ${s.firstName}` : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateLong(b.date)} · {CATEGORY_LABELS[b.category] ?? b.category}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${SEVERITY_CONFIG[b.severity].badge}`}>
                    {SEVERITY_CONFIG[b.severity].label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{b.description}</p>
                {b.recordedByName && (
                  <p className="mt-1.5 text-[11px] text-slate-400">Recorded by {b.recordedByName}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
