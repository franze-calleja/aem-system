import RoleSidebar from "@/components/roles/shared/role-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getAllSchoolYears, getActiveSchoolYear } from "@/lib/active-year";
import YearSwitcher from "@/components/shell/year-switcher";
import LogoutButton from "@/components/shell/logout-button";

type WorkspaceMetric = {
  label: string;
  value: string;
};

type WorkspaceSection = {
  title: string;
  description: string;
  href?: string;
};

type ThemeName = "indigo" | "emerald" | "amber" | "rose";

type RoleName = "admin" | "teacher" | "counselor" | "principal";

type RoleWorkspaceProps = {
  role: RoleName;
  badge: string;
  title: string;
  description: string;
  theme: ThemeName;
  metrics: WorkspaceMetric[];
  sections: WorkspaceSection[];
};

const themeStyles = {
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 border-slate-200",
    metricValue: "text-indigo-700",
    sectionIcon: "bg-indigo-50 text-indigo-700",
    action: "bg-indigo-600 text-white hover:bg-indigo-700",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 border-slate-200",
    metricValue: "text-emerald-700",
    sectionIcon: "bg-emerald-50 text-emerald-700",
    action: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 border-slate-200",
    metricValue: "text-amber-700",
    sectionIcon: "bg-amber-50 text-amber-700",
    action: "bg-amber-500 text-white hover:bg-amber-600",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 border-slate-200",
    metricValue: "text-rose-700",
    sectionIcon: "bg-rose-50 text-rose-700",
    action: "bg-rose-600 text-white hover:bg-rose-700",
  },
} as const;

export default async function RoleWorkspace({
  role,
  badge,
  title,
  description,
  theme,
  metrics,
  sections,
}: RoleWorkspaceProps) {
  const styles = themeStyles[theme];

  const [years, activeYear] = await Promise.all([
    getAllSchoolYears(),
    getActiveSchoolYear(),
  ]);
  const schoolYear = activeYear?.label ?? "No school year";
  const viewingHistorical = activeYear ? !activeYear.isActive : false;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <RoleSidebar
          role={role}
          badge={badge}
          title={title}
          schoolYear={schoolYear}
          theme={theme}
          sections={sections}
        />

        <SidebarInset>
          <main className="min-h-screen px-2 py-4 md:px-8 lg:px-4">
            <div className="w-full flex flex-col gap-6">
              <header className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${styles.badge}`}>
                          {badge}
                        </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 md:text-sm">{description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <YearSwitcher
                      years={years.map((y) => ({ id: y.id, label: y.label, isActive: y.isActive }))}
                      selectedId={activeYear?.id ?? null}
                    />
                    <LogoutButton />
                  </div>
                </div>
                {viewingHistorical && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
                    Viewing historical data: {schoolYear}. Switch to the current school year to make changes.
                  </div>
                )}
              </header>

              <section className="grid gap-4 md:grid-cols-3">
                {metrics.map((metric) => (
                  <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    <p className={`mt-3 text-xl font-semibold ${styles.metricValue}`}>{metric.value}</p>
                  </article>
                ))}
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                {sections.map((section) => {
                  const sectionId = section.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");

                  return (
                    <article
                      id={sectionId}
                      key={section.title}
                      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${styles.sectionIcon}`}>
                        {section.title.slice(0, 1)}
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-slate-900">{section.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{section.description}</p>
                    </article>
                  );
                })}
              </section>

              <div className="flex justify-end">
                <button className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${styles.action}`} type="button">
                  Continue building this module
                </button>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}