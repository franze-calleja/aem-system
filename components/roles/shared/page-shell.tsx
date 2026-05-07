import Link from "next/link";
import RoleSidebar, { type NavItem } from "@/components/roles/shared/role-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type ThemeName = "indigo" | "emerald" | "amber" | "rose";

type PageShellProps = {
  badge: string;
  title: string;
  schoolYear: string;
  theme: ThemeName;
  navItems: NavItem[];
  children: React.ReactNode;
};

export default function PageShell({ badge, title, schoolYear, theme, navItems, children }: PageShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <RoleSidebar badge={badge} title={title} schoolYear={schoolYear} theme={theme} navItems={navItems} />
        <SidebarInset>
          <main className="min-h-screen px-4 py-6 md:px-8">
            <div className="flex flex-col gap-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

type PageHeaderProps = {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ backHref, backLabel, title, description, actions }: PageHeaderProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
