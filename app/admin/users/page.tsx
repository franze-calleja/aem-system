import { type Metadata } from "next";
import AdminUsers from "@/components/roles/admin/users-panel";
export const metadata: Metadata = { title: "User Management — Admin | AEM System" };
export default function AdminUsersPage() { return <AdminUsers />; }
