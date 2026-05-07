import { type Metadata } from "next";
import PrincipalApprovals from "@/components/roles/principal/approvals-panel";
export const metadata: Metadata = { title: "Approval Queue — Principal | AEM System" };
export default function ApprovalsPage() { return <PrincipalApprovals />; }
