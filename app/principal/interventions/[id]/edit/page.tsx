import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getEditableIntervention,
  getInterventionTargets,
} from "@/lib/intervention/queries";
import InterventionEditForm from "@/components/counselor/intervention-edit-form";

export default async function PrincipalInterimRevisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("PRINCIPAL");
  const { id } = await params;

  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const initial = await getEditableIntervention(id, session.user.role, session.user.id);
  if (!initial) notFound();
  if (initial.status !== "ACTIVE") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        Interim revisions only apply to ACTIVE plans. This one is currently {initial.status.replace(/_/g, " ")}.
        <p className="mt-3">
          <Link
            href={`/principal/interventions/${id}`}
            className="text-xs font-medium text-slate-700 hover:underline"
          >
            ← Back to plan
          </Link>
        </p>
      </div>
    );
  }

  const targets = await getInterventionTargets(sy.id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/principal/interventions/${id}`}
        className="inline-flex w-fit items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to plan
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Interim revision</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use this when the counselor is unavailable and an active plan needs urgent revision. The revision is flagged isInterim and routes to the counselor&apos;s review queue on their return.
        </p>
      </header>

      <InterventionEditForm
        mode="principal-interim"
        initial={initial}
        targets={targets}
        triggeringNoteId={null}
        successHref={`/principal/interventions/${id}`}
      />
    </div>
  );
}
