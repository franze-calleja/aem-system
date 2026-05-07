import { type Metadata } from "next";
import PrincipalBiasMonitoring from "@/components/roles/principal/bias-monitoring-panel";
export const metadata: Metadata = { title: "Bias Monitoring — Principal | AEM System" };
export default function BiasMonitoringPage() { return <PrincipalBiasMonitoring />; }
