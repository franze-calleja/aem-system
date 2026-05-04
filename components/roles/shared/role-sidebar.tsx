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

type WorkspaceSection = {
  title: string;
  description: string;
};

type ThemeName = "indigo" | "emerald" | "amber" | "rose";

type RoleSidebarProps = {
  badge: string;
  title: string;
  schoolYear: string;
  theme: ThemeName;
  sections: WorkspaceSection[];
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

function IconHome() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
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

function sectionAnchor(title: string) {
  return `#${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export default function RoleSidebar({ badge, title, schoolYear, theme, sections }: RoleSidebarProps) {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold ${themeAccent[theme]}`}>
              {badge.slice(0, 1)}
            </div>

            {open ? (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AEM System</p>
                <h2 className="mt-2 text-sm font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-xs text-slate-500">{schoolYear}</p>
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
                <SidebarMenuButton active href={pathname} className={!open ? "justify-center" : undefined}>
                  <IconHome />
                  <span className={open ? undefined : "sr-only"}>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            {open && <SidebarGroupLabel>Modules</SidebarGroupLabel>}
            <SidebarMenu>
              {sections.map((section) => {
                const href = section.title.toLowerCase().includes("my class")
                  ? "/teacher/my-classes"
                  : sectionAnchor(section.title);

                return (
                  <SidebarMenuItem key={section.title}>
                    <SidebarMenuButton href={href} className={!open ? "justify-center" : undefined}>
                      <IconFolder />
                      <span className={open ? undefined : "sr-only"}>{section.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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