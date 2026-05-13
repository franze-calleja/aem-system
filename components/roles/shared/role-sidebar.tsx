'use client';

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
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
  href?: string;
};

type RoleName = "admin" | "teacher" | "counselor" | "principal";

type ThemeName = "indigo" | "emerald" | "amber" | "rose";

type RoleSidebarProps = {
  role: RoleName;
  badge: string;
  title: string;
  schoolYear: string;
  theme: ThemeName;
  sections: WorkspaceSection[];
};

// role switch removed from the sidebar; keep roleHome for role-based home links
const roleHome = {
  admin: "/admin",
  teacher: "/teacher",
  counselor: "/counselor",
  principal: "/principal",
} as const;

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

function IconLogout() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M19 3h2v18h-2" />
    </svg>
  );
}



function sectionSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitHref(href: string) {
  const [path, hash] = href.split("#");

  return {
    path: path || "/",
    hash: hash ? `#${hash}` : "",
  };
}

export default function RoleSidebar({ role, badge, title, schoolYear, theme, sections }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useSidebar();
  const [hash, setHash] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);

    updateHash();
    window.addEventListener("hashchange", updateHash);

    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const homeHref = roleHome[role];

  const handleLogout = () => {
    startTransition(async () => {
      // Clear legacy localStorage scaffolding (will be removed in later phases).
      window.localStorage.removeItem("aem-teacher-classes");
      window.localStorage.removeItem("aem-counselor-data");
      await logoutAction();
      router.refresh();
    });
  };

  const isActiveHref = useMemo(
    () => (href: string) => {
      const { path, hash: hrefHash } = splitHref(href);

      if (hrefHash) {
        return pathname === path && hash === hrefHash;
      }

      if (path === homeHref) {
        return pathname === path;
      }

      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [hash, pathname],
  );

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
                <SidebarMenuButton active={isActiveHref(homeHref)} href={homeHref} className={!open ? "justify-center" : undefined}>
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
                const href =
                section.href ?? `${homeHref}#${sectionSlug(section.title)}`;

                return (
                  <SidebarMenuItem key={section.title}>
                    <SidebarMenuButton active={isActiveHref(href)} href={href} className={!open ? "justify-center" : undefined}>
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
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} disabled={pending} className={!open ? "justify-center" : undefined}>
                <IconLogout />
                <span className={open ? undefined : "sr-only"}>{pending ? "Signing out…" : "Logout"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
    </>
  );
}