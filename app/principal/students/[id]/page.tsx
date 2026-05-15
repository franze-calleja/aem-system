import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getLatestRiskForStudent, getStudentProfile } from "@/lib/student/queries";
import { generateRiskNarrative } from "@/lib/ai/narrative";
import StudentProfileView from "@/components/shell/student-profile-view";

export default async function PrincipalStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("PRINCIPAL");
  const { id } = await params;
  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const profile = await getStudentProfile(id, sy.id);
  if (!profile) notFound();

  const latestRisk = await getLatestRiskForStudent(id, sy.id);
  const aiConsentRevoked = profile.consents.some(
    (c) => c.scope === "AI_ANALYSIS" && c.status === "REVOKED",
  );
  const risk = latestRisk
    ? {
        ...latestRisk,
        narrative: await generateRiskNarrative({
          firstName: profile.student.firstName,
          gradeLabel: profile.enrollment.gradeLevel,
          score: latestRisk.score,
          band: latestRisk.band,
          factors: latestRisk.factors,
          consentRevoked: aiConsentRevoked,
        }),
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/principal/students"
        className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to Students
      </Link>
      <StudentProfileView profile={profile} viewerRole="PRINCIPAL" risk={risk} />
    </div>
  );
}
