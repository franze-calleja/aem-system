import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getInterventionTargets,
  getRecommendationForPrefill,
  getReferralForPrefill,
} from "@/lib/intervention/queries";
import InterventionBuilderForm from "@/components/counselor/intervention-builder-form";

export default async function NewInterventionPage({
  searchParams,
}: {
  searchParams: Promise<{ fromRecommendation?: string; fromReferral?: string }>;
}) {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const { fromRecommendation, fromReferral } = await searchParams;

  const targets = await getInterventionTargets(sy.id);
  const prefill = fromRecommendation
    ? await getRecommendationForPrefill(fromRecommendation, sy.id)
    : fromReferral
      ? await getReferralForPrefill(fromReferral, sy.id)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/counselor/interventions"
        className="inline-flex w-fit items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to Interventions
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">New intervention</h1>
        <p className="mt-1 text-sm text-slate-600">
          Individual-scope plans activate immediately. Broader scopes (section, grade, school) save as PENDING APPROVAL and route to the principal.
        </p>
        {prefill && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {prefill.source === "REFERRAL"
              ? <>Prefilled from teacher referral <span className="font-mono">{prefill.id}</span>. On save this referral will be marked ACCEPTED.</>
              : <>Prefilled from recommendation draft <span className="font-mono">{prefill.id}</span>. On save this draft will be marked INSTANTIATED.</>}
          </p>
        )}
      </header>

      <InterventionBuilderForm targets={targets} prefill={prefill} />
    </div>
  );
}
