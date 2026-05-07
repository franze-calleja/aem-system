import { type Metadata } from "next";
import AdminConfiguration from "@/components/roles/admin/configuration-panel";
export const metadata: Metadata = { title: "System Configuration — Admin | AEM System" };
export default function AdminConfigurationPage() { return <AdminConfiguration />; }
