import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getTeacherClasses } from "@/lib/teacher/queries";

export default async function MyClassesPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return <EmptyState message="No active school year. Ask the admin to activate one." />;
  }

  const classes = await getTeacherClasses(session.user.id, sy.id);

  if (classes.length === 0) {
    return <EmptyState message={`You have no class assignments for ${sy.label}. Ask the admin to assign you to a section.`} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">My Classes</h1>
        <p className="mt-1 text-sm text-slate-600">
          {classes.length} assignment{classes.length === 1 ? "" : "s"} for {sy.label}.
          Open a class to record attendance, enter grades, or log behavioral incidents.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => (
          <Link
            key={c.assignmentId}
            href={`/teacher/my-classes/${c.assignmentId}`}
            className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{c.gradeLevel}</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{c.gradeLevel} – {c.sectionName}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {c.subjectCode ? (
                    <>
                      <span className="font-medium text-slate-700">{c.subjectCode}</span>
                      <span className="text-slate-500"> · {c.subjectName}</span>
                    </>
                  ) : (
                    <span className="text-slate-500 italic">Adviser-only assignment</span>
                  )}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
              </span>
            </div>

            {c.isAdviser && (
              <p className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                Section Adviser
              </p>
            )}

            <p className="mt-4 text-xs font-medium text-emerald-700 group-hover:text-emerald-800">
              Open class →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
