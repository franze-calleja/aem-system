import { type Metadata } from "next";
import AdminImport from "@/components/roles/admin/import-panel";
export const metadata: Metadata = { title: "Import Wizard — Admin | AEM System" };
export default function AdminImportPage() { return <AdminImport />; }
