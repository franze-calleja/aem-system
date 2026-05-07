import { type Metadata } from "next";
import PrincipalGovernance from "@/components/roles/principal/governance-panel";
export const metadata: Metadata = { title: "Governance Review — Principal | AEM System" };
export default function GovernancePage() { return <PrincipalGovernance />; }
