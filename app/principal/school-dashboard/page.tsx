import { type Metadata } from "next";
import PrincipalSchoolDashboard from "@/components/roles/principal/school-dashboard-panel";
export const metadata: Metadata = { title: "School Dashboard — Principal | AEM System" };
export default function SchoolDashboardPage() { return <PrincipalSchoolDashboard />; }
