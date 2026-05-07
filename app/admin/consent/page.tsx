import { type Metadata } from "next";
import AdminConsent from "@/components/roles/admin/consent-panel";
export const metadata: Metadata = { title: "Consent Records — Admin | AEM System" };
export default function AdminConsentPage() { return <AdminConsent />; }
