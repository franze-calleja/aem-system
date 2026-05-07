'use client';

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export type NavItem = {
  label: string;
  href: string;
  icon?: "home" | "folder" | "users" | "alert" | "chart" | "clipboard" | "settings" | "shield" | "calendar" | "book" | "list" | "check" | "upload" | "eye" | "message";
};

type ThemeName = "indigo" | "emerald" | "amber" | "rose";

type RoleSidebarProps = {
  badge: string;
  title: string;
  schoolYear: string;
  theme: ThemeName;
  navItems: NavItem[];
};

const roleLinks = [
  { label: "Admin", href: "/admin" },
  { label: "Teacher", href: "/teacher" },
  { label: "Counselor", href: "/counselor" },
  { label: "Principal", href: "/principal" },
];

const themeAccent = {
  indigo: "text-indigo-700 bg-indigo-50 border-slate-200",
  emerald: "text-emerald-700 bg-emerald-50 border-slate-200",
  amber: "text-amber-700 bg-amber-50 border-slate-200",
  rose: "text-rose-700 bg-rose-50 border-slate-200",
} as const;

function NavIcon({ type }: { type?: NavItem["icon"] }) {
  const cls = "h-4 w-4 flex-none";
  switch (type) {
    case "home":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" /></svg>;
    case "users":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "alert":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "chart":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
    case "clipboard":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
    case "settings":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case "shield":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "calendar":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case "book":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
    case "list":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
    case "check":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
    case "upload":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>;
    case "eye":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "message":
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    default:
      return <svg aria-hidden="true" className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>;
  }
}

function IconUser() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <path d="M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export default function RoleSidebar({ badge, title, schoolYear, theme, navItems }: RoleSidebarProps) {
  const pathname = usePathname();
  const { open } = useSidebar();

  const overviewHref = navItems[0]?.href ?? "/";

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold ${themeAccent[theme]}`}>
              {badge.slice(0, 1)}
            </div>

            {open ? (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AEM System</p>
                <h2 className="mt-1 text-sm font-semibold text-slate-900 leading-snug">{title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{schoolYear}</p>
              </div>
            ) : null}

            <div className="ml-auto">
              <SidebarTrigger />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            {open && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton active={pathname === overviewHref} href={overviewHref} className={!open ? "justify-center" : undefined}>
                  <NavIcon type="home" />
                  <span className={open ? undefined : "sr-only"}>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            {open && <SidebarGroupLabel>Modules</SidebarGroupLabel>}
            <SidebarMenu>
              {navItems.slice(1).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                    href={item.href}
                    className={!open ? "justify-center" : undefined}
                  >
                    <NavIcon type={item.icon} />
                    <span className={open ? undefined : "sr-only"}>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarGroup className="mb-0">
            {open && <SidebarGroupLabel>Switch Role</SidebarGroupLabel>}
            <SidebarMenu>
              {roleLinks.map((role) => (
                <SidebarMenuItem key={role.href}>
                  <SidebarMenuButton active={pathname === role.href} href={role.href} className={!open ? "justify-center" : undefined}>
                    <IconUser />
                    <span className={open ? undefined : "sr-only"}>{role.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton href="/" className={!open ? "justify-center" : undefined}>
                  <IconBack />
                  <span className={open ? undefined : "sr-only"}>Back to login</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
    </>
  );
}