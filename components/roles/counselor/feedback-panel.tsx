"use client";

import { useState } from "react";
import PageShell, { PageHeader } from "@/components/roles/shared/page-shell";
import {
  getStudentById,
  interventions,
  type Intervention,
} from "@/lib/mock-data";
import { counselorNav } from "./counselor-nav";

// In a real system, these would come from teacher observation notes.
// For mock purposes, we derive feedback from intervention revision requests.
type FeedbackItem = {
  id: string;
  interventionId: string;
  interventionTitle: string;
  submittedBy: string;
  submittedDate: string;
  type: "observation" | "revision-request";
  body: string;
  studentId?: string;
  status: "pending" | "reviewed" | "actioned";
};

const mockFeedback: FeedbackItem[] = [
  {
    id: "fb1",
    interventionId: "iv1",
    interventionTitle: "Academic Monitoring Plan – Grade 9",
    submittedBy: "Ms. Maria Cruz (9-Newton)",
    submittedDate: "2025-04-28",
    type: "observation",
    body: "Student stu1 has shown improved participation in class discussion this week, though still missing assignments.",
    studentId: "stu1",
    status: "pending",
  },
  {
    id: "fb2",
    interventionId: "iv2",
    interventionTitle: "Individual Counseling – Student 3",
    submittedBy: "Mr. Jose Santos (9-Darwin)",
    submittedDate: "2025-04-30",
    type: "revision-request",
    body: "The current plan does not include home engagement component. The student's parents have expressed willingness to be involved. Please revise.",
    studentId: "stu3",
    status: "pending",
  },
  {
    id: "fb3",
    interventionId: "iv3",
    interventionTitle: "Attendance Support Program",
    submittedBy: "Ms. Maria Cruz (11-Einstein)",
    submittedDate: "2025-05-02",
    type: "observation",
    body: "stu14 attended all sessions this week. Noted significant improvement in timeliness.",
    studentId: "stu14",
    status: "reviewed",
  },
];

function statusColor(status: FeedbackItem["status"]) {
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "reviewed") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function CounselorFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>(mockFeedback);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = items
    .filter((f) => filterType === "all" || f.type === filterType)
    .filter((f) => filterStatus === "all" || f.status === filterStatus)
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));

  function markStatus(id: string, status: FeedbackItem["status"]) {
    setItems((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
  }

  return (
    <PageShell badge="C" title="Ms. Ana Reyes" schoolYear="SY 2024-2025" theme="rose" navItems={counselorNav}>
      <PageHeader
        backHref="/counselor"
        backLabel="Counselor workspace"
        title="Feedback Queue"
        description="Teacher observation notes and revision requests submitted for active interventions. Review and take action or dismiss."
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(["all", "observation", "revision-request"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${filterType === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {t === "all" ? "All" : t === "revision-request" ? "Revision requests" : "Observations"}
            </button>
          ))}
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="actioned">Actioned</option>
        </select>
        <span className="ml-auto text-xs text-slate-500">
          {items.filter((f) => f.status === "pending").length} pending
        </span>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => {
          const student = item.studentId ? getStudentById(item.studentId) : null;
          return (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === "revision-request" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {item.type === "revision-request" ? "Revision request" : "Observation"}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{item.interventionTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-400">By {item.submittedBy} · {item.submittedDate}</p>
                  {student && <p className="mt-0.5 text-xs text-slate-500">Re: {student.firstName} {student.lastName}</p>}
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-700 leading-6">{item.body}</p>

              {item.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => markStatus(item.id, "reviewed")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                    Mark reviewed
                  </button>
                  <button type="button" onClick={() => markStatus(item.id, "actioned")}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition">
                    Mark actioned
                  </button>
                </div>
              )}
              {item.status === "reviewed" && (
                <button type="button" onClick={() => markStatus(item.id, "actioned")}
                  className="mt-4 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition">
                  Mark actioned
                </button>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-400">No feedback items match the current filter.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
