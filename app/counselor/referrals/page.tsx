import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { prisma } from "@/lib/prisma";
import ReferralQueue, { type ReferralCard } from "@/components/counselor/referral-queue";

export default async function CounselorReferralsPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const rows = await prisma.interventionReferral.findMany({
    where: { schoolYearId: sy.id, status: "PENDING" },
    include: {
      student: { select: { firstName: true, lastName: true, lrn: true } },
      referredBy: { select: { name: true, email: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });

  const referrals: ReferralCard[] = rows.map((r) => ({
    id: r.id,
    studentLabel: `${r.student.lastName}, ${r.student.firstName} · ${r.student.lrn}`,
    teacherLabel: r.referredBy.name ?? r.referredBy.email,
    suggestedType: r.suggestedType,
    urgency: r.urgency,
    rationale: r.rationale,
    createdAt: r.createdAt.toLocaleDateString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Teacher Referrals</h1>
        <p className="mt-1 text-sm text-slate-600">
          {referrals.length} pending referral{referrals.length === 1 ? "" : "s"} in {sy.label}. Accept to pre-fill a new intervention you own, or decline with a reason.
        </p>
      </header>
      <ReferralQueue referrals={referrals} />
    </div>
  );
}
