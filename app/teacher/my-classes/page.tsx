import MyClasses from "@/components/roles/teacher/my-classes";
import RoleSidebar from "@/components/roles/shared/role-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const sections = [
  {
    title: "My Classes",
    href: "/teacher/my-classes",
    description: "Open handled sections, review rosters, manage attendance, grades, and student risk.",
  },
  {
    title: "Intervention Feedback",
    href: "/teacher/intervention-feedback",
    description: "View active intervention plans, log sessions you ran, and submit observations to the counselor.",
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
