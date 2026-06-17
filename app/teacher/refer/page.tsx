import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getReferableStudents, getTeacherReferrals } from "@/lib/teacher/queries";
import ReferralForm from "@/components/teacher/referral-form";

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DECLINED: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function TeacherReferPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const [students, referrals] = await Promise.all([
    getReferableStudents(session.user.id, sy.id),
    getTeacherReferrals(session.user.id, sy.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Refer a Student</h1>
        <p className="mt-1 text-sm text-slate-600">
          Propose an intervention for a student in your sections. A counselor reviews and decides — they own any plan that results.
        </p>
      </header>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          You have no assigned students in {sy.label}.
        </div>
      ) : (
        <ReferralForm students={students} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Your referrals ({referrals.length})
        </h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-slate-500">No referrals yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {referrals.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">{r.studentLabel}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {r.suggestedType} · urgency {r.urgency} · {r.createdAt.toLocaleDateString()}
                </p>
                {r.status === "ACCEPTED" && r.resultingInterventionId && (
                  <Link
                    href={`/teacher/intervention-feedback`}
                    className="mt-1 inline-block text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
                  >
                    Intervention created — view in Intervention Feedback
                  </Link>
                )}
                {r.status === "DECLINED" && r.declineReason && (
                  <p className="mt-1 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                    Declined: {r.declineReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
