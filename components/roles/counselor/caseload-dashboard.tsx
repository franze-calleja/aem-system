"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCounselorStore } from "./counselor-store";
import type { CounselorStudent, RiskBand } from "./counselor-store";

type SortKey = "score-desc" | "score-asc" | "name" | "grade" | "intervention-active";

function RiskBadge({ band }: { band: RiskBand }) {
  const cls =
    band === "High"
      ? "bg-rose-100 text-rose-700"
      : band === "Moderate"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {band} Risk
    </span>
  );
}

function RiskScoreMeter({ score, band }: { score: number; band: RiskBand }) {
  const barColor =
    band === "High" ? "bg-rose-500" : band === "Moderate" ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-600">{score}</span>
    </div>
  );
}

function InterventionStatusBadge({ hasActive, hasPlanned }: { hasActive: boolean; hasPlanned: boolean }) {
  if (hasActive) return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Active Intervention</span>;
  if (hasPlanned) return <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">Planned Intervention</span>;
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">No Intervention</span>;
}

function StudentCard({ student, interventionStatus }: { student: CounselorStudent; interventionStatus: "active" | "planned" | "none" }) {
  const topFactors = student.risk.factors.sort((a, b) => b.weight - a.weight).slice(0, 2);
  const absent = student.attendance.filter((a) => a.status === "absent").length;
  const total = student.attendance.length;
  const absRate = total > 0 ? ((absent / total) * 100).toFixed(1) : "—";

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-start sm:gap-5">
      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base font-bold text-amber-700 ring-2 ring-amber-200">
        {student.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Main info */}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800">{student.name}</span>
          <RiskBadge band={student.risk.band} />
          <InterventionStatusBadge
            hasActive={interventionStatus === "active"}
            hasPlanned={interventionStatus === "planned"}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{student.gradeLevel}</span>
          <span className="text-slate-300">·</span>
          <span>Section {student.section}</span>
          <span className="text-slate-300">·</span>
          <span>LRN {student.lrn}</span>
          <span className="text-slate-300">·</span>
          <span>Absence rate: {absRate}%</span>
          {student.spedStatus && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-violet-600">SPED</span>
            </>
          )}
        </div>
        <RiskScoreMeter score={student.risk.score} band={student.risk.band} />

        {/* Top factors */}
        <div className="mt-1 flex flex-col gap-0.5">
          {topFactors.map((f) => (
            <div key={f.label} className="flex items-start gap-1.5 text-xs text-slate-600">
              <span className="mt-0.5 shrink-0 text-slate-400">▸</span>
              <span>
                <span className="font-medium text-slate-700">{f.label}</span> — {f.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <Link
          href={`/counselor/students/${student.id}`}
          className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
        >
          View Profile
        </Link>
        <Link
          href={`/counselor/interventions?studentId=${student.id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Interventions
        </Link>
      </div>
    </div>
  );
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score-desc", label: "Risk Score (Highest first)" },
  { value: "score-asc", label: "Risk Score (Lowest first)" },
  { value: "name", label: "Name (A–Z)" },
  { value: "grade", label: "Grade Level" },
  { value: "intervention-active", label: "Active Intervention first" },
];

export default function CaseloadDashboard() {
  const store = useCounselorStore();
  const [sortKey, setSortKey] = useState<SortKey>("score-desc");
  const [filterBand, setFilterBand] = useState<"All" | RiskBand>("All");
  const [filterIntervention, setFilterIntervention] = useState<"All" | "Active" | "Planned" | "None">("All");
  const [search, setSearch] = useState("");

  const urgentStudents = useMemo(
    () => store.students.filter((s) => s.risk.band !== "Low"),
    [store.students],
  );

  const interventionStatusMap = useMemo(() => {
    const map = new Map<string, "active" | "planned" | "none">();
    for (const student of urgentStudents) {
      const studentIvs = store.interventions.filter((iv) => iv.targetStudentIds.includes(student.id));
      const hasActive = studentIvs.some((iv) => iv.status === "Active");
      const hasPlanned = studentIvs.some((iv) => iv.status === "Planned");
      map.set(student.id, hasActive ? "active" : hasPlanned ? "planned" : "none");
    }
    return map;
  }, [urgentStudents, store.interventions]);

  const sorted = useMemo(() => {
    let result = [...urgentStudents];

    // Filter
    if (filterBand !== "All") result = result.filter((s) => s.risk.band === filterBand);
    if (filterIntervention !== "All") {
      result = result.filter((s) => {
        const status = interventionStatusMap.get(s.id);
        if (filterIntervention === "Active") return status === "active";
        if (filterIntervention === "Planned") return status === "planned";
        return status === "none";
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.lrn.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortKey === "score-desc") return b.risk.score - a.risk.score;
      if (sortKey === "score-asc") return a.risk.score - b.risk.score;
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "grade") return a.gradeLevel.localeCompare(b.gradeLevel) || b.risk.score - a.risk.score;
      if (sortKey === "intervention-active") {
        const ord = (id: string) => ({ active: 0, planned: 1, none: 2 }[interventionStatusMap.get(id) ?? "none"]);
        return ord(a.id) - ord(b.id) || b.risk.score - a.risk.score;
      }
      return 0;
    });
    return result;
  }, [urgentStudents, sortKey, filterBand, filterIntervention, search, interventionStatusMap]);

  const highCount = urgentStudents.filter((s) => s.risk.band === "High").length;
  const moderateCount = urgentStudents.filter((s) => s.risk.band === "Moderate").length;
  const activeCount = [...interventionStatusMap.values()].filter((v) => v === "active").length;
  const noIvCount = [...interventionStatusMap.values()].filter((v) => v === "none").length;

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Counselor</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Caseload Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Urgent attention list — Moderate and High risk students for the active school year.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "High Risk", value: highCount, color: "text-rose-600" },
          { label: "Moderate Risk", value: moderateCount, color: "text-amber-600" },
          { label: "Active Interventions", value: activeCount, color: "text-blue-600" },
          { label: "No Intervention Yet", value: noIvCount, color: "text-slate-500" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{m.label}</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, LRN or section…"
            className="h-9 w-52 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Sort</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Risk Band</label>
          <select
            value={filterBand}
            onChange={(e) => setFilterBand(e.target.value as typeof filterBand)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Intervention</label>
          <select
            value={filterIntervention}
            onChange={(e) => setFilterIntervention(e.target.value as typeof filterIntervention)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Planned">Planned</option>
            <option value="None">No Intervention</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-400">
          {sorted.length} student{sorted.length !== 1 ? "s" : ""} shown
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <p className="text-slate-400">No students match the current filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              interventionStatus={interventionStatusMap.get(s.id) ?? "none"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
