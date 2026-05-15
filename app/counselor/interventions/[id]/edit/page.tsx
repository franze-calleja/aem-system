import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getEditableIntervention,
  getInterventionTargets,
} from "@/lib/intervention/queries";
import { prisma } from "@/lib/prisma";
import InterventionEditForm from "@/components/counselor/intervention-edit-form";

export default async function CounselorInterventionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromNote?: string }>;
}) {
  const session = await requireRole("COUNSELOR");
  const { id } = await params;
  const { fromNote } = await searchParams;

  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const initial = await getEditableIntervention(id, session.user.role, session.user.id);
  if (!initial) notFound();

  if (initial.status === "CANCELLED" || initial.status === "COMPLETED") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        Cannot edit a {initial.status.replace(/_/g, " ").toLowerCase()} plan.
        <p className="mt-3">
          <Link
            href={`/counselor/interventions/${id}`}
            className="text-xs font-medium text-slate-700 hover:underline"
          >
            ← Back to plan
          </Link>
        </p>
      </div>
    );
  }

  const targets = await getInterventionTargets(sy.id);

  // Optional triggering note context: pre-fill the form with the note content
  // visible so the counselor can decide what to change.
  let note: { id: string; content: string; noteType: string; authorName: string } | null = null;
  if (fromNote) {
    const row = await prisma.interventionNote.findFirst({
      where: { id: fromNote, interventionId: id, status: "OPEN" },
      include: { author: { select: { name: true } } },
    });
    if (row) {
      note = {
        id: row.id,
        content: row.content,
        noteType: row.noteType,
        authorName: row.author.name,
      };
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/counselor/interventions/${id}`}
        className="inline-flex w-fit items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to plan
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Edit intervention</h1>
        <p className="mt-1 text-sm text-slate-600">
          Changes are recorded as an InterventionRevision. Significant changes (scope, type, target, or duration &gt; 30 days) on an active broader-scope plan route back to the principal for re-approval.
        </p>
      </header>

      {note && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Incorporating {note.noteType.replace(/_/g, " ").toLowerCase()} from {note.authorName}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{note.content}</p>
          <p className="mt-2 text-[11px] text-amber-700/80">
            Saving will mark this note INCORPORATED and link the revision back to it.
          </p>
        </section>
      )}

      <InterventionEditForm
        mode="counselor"
        initial={initial}
        targets={targets}
        triggeringNoteId={note?.id ?? null}
        successHref={`/counselor/interventions/${id}`}
      />
    </div>
  );
}
