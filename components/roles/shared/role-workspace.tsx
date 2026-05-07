import Link from "next/link";
import RoleSidebar, { type NavItem } from "@/components/roles/shared/role-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export type { NavItem };

type WorkspaceMetric = {
  label: string;
  value: string;
  sub?: string;
};

type ThemeName = "indigo" | "emerald" | "amber" | "rose";

type RoleWorkspaceProps = {
  badge: string;
  title: string;
  description: string;
  schoolYear: string;
  theme: ThemeName;
  metrics: WorkspaceMetric[];
  navItems: NavItem[];
  children?: React.ReactNode;
};

const themeStyles = {
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    metricValue: "text-indigo-700",
    cardLink: "bg-indigo-50 text-indigo-700",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    metricValue: "text-emerald-700",
    cardLink: "bg-emerald-50 text-emerald-700",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    metricValue: "text-amber-700",
    cardLink: "bg-amber-50 text-amber-700",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    metricValue: "text-rose-700",
    cardLink: "bg-rose-50 text-rose-700",
  },
} as const;

export default function RoleWorkspace({
  badge,
  title,
  description,
  schoolYear,
  theme,
  metrics,
  navItems,
  children,
}: RoleWorkspaceProps) {
  const styles = themeStyles[theme];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <RoleSidebar
          badge={badge}
          title={title}
          schoolYear={schoolYear}
          theme={theme}
          navItems={navItems}
        />

        <SidebarInset>
          <main className="min-h-screen px-4 py-6 md:px-8">
            <div className="w-full flex flex-col gap-6">
              {/* Header */}
              <header className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}>
                      {badge}
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {schoolYear}
                    </div>
                    <Link
                      href="/"
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Switch role
                    </Link>
                  </div>
                </div>
              </header>

              {/* Metrics */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((metric) => (
                  <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                    <p className={`mt-3 text-2xl font-semibold ${styles.metricValue}`}>{metric.value}</p>
                    {metric.sub ? <p className="mt-1 text-xs text-slate-500">{metric.sub}</p> : null}
                  </article>
                ))}
              </section>

              {/* Role-specific overview content */}
              {children}

              {/* Nav quick-access cards */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {navItems.slice(1).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${styles.cardLink}`}>
                      {item.label.slice(0, 1)}
                    </div>
                    <h2 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-slate-700">{item.label}</h2>
                    <p className="mt-1 text-xs text-slate-400 group-hover:text-slate-500">Open module →</p>
                  </Link>
                ))}
              </section>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}