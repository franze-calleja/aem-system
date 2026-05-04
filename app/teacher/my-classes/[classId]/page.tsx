import ClassRosterView from "@/components/roles/teacher/class-roster-view";
import RoleSidebar from "@/components/roles/shared/role-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const sections = [
  {
    title: "My classes",
    description:
      "Open handled sections, review rosters, and move quickly into daily classroom tasks for the active school year.",
  },
  {
    title: "Attendance entry",
    description:
      "Record present, absent, tardy, and excused statuses with a keyboard-friendly workflow built for speed.",
  },
  {
    title: "Student risk view",
    description:
      "See which students need attention, with transparent factor explanations but without private counseling content.",
  },
  {
    title: "Intervention feedback",
    description:
      "Submit observation notes, request revisions, and log sessions you personally conducted for active plans.",
  },
];

export default async function ClassRosterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <RoleSidebar
          badge="Teacher workspace"
          title="Classroom operations dashboard"
          schoolYear="SY 2024-2025"
          theme="emerald"
          sections={sections}
        />

        <SidebarInset>
          <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
            <div className="w-full flex flex-col gap-6">
              <header className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">Class Roster</h1>
                </div>
              </header>

              <ClassRosterView classId={classId} />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
