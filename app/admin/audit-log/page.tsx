import { type Metadata } from "next";
import AdminAuditLog from "@/components/roles/admin/audit-log-panel";
export const metadata: Metadata = { title: "Audit Log — Admin | AEM System" };
export default function AdminAuditLogPage() { return <AdminAuditLog />; }
