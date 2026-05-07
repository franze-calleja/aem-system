import MyClasses from "@/components/roles/teacher/my-classes";
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
    href: "/teacher/student-risk",
    description:
      "See which students need attention, with transparent factor explanations but without private counseling content.",
  },
  {
    title: "Intervention feedback",
    description:
      "Submit observation notes, request revisions, and log sessions you personally conducted for active plans.",
  },
];

export default function MyClassesPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <RoleSidebar
          role="teacher"
          badge="Teacher workspace"
          title="Classroom operations dashboard"
          schoolYear="SY 2024-2025"
          theme="emerald"
          sections={sections}
        />

        <SidebarInset>
          <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
            <div className="w-full flex flex-col gap-6">
              <section>
                <MyClasses />
              </section>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
