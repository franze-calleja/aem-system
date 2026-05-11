"use client";

import InterventionBuilder from "@/components/roles/counselor/intervention-builder";
import RoleSidebar from "@/components/roles/shared/role-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Suspense } from "react";

const sections = [
  {
    title: "Caseload Dashboard",
    href: "/counselor/caseload",
    description: "Urgent attention list — all Moderate and High risk students.",
  },
  {
    title: "Intervention Builder",
    href: "/counselor/interventions",
    description: "Review recommendation drafts and create formal intervention plans.",
  },
  {
    title: "Feedback Queue",
    href: "/counselor/feedback",
    description: "Review teacher observation notes and revision requests.",
  },
];

export default function InterventionsPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <RoleSidebar
          role="counselor"
          badge="Counselor workspace"
          title="Student support and intervention hub"
          schoolYear="SY 2024-2025"
          theme="amber"
          sections={sections}
        />
        <SidebarInset>
          <main className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
            <Suspense>
              <InterventionBuilder />
            </Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
