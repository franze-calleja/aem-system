import { type Metadata } from "next";
import CounselorInterventions from "@/components/roles/counselor/interventions-panel";

export const metadata: Metadata = { title: "Interventions — Counselor | AEM System" };

export default function CounselorInterventionsPage() {
  return <CounselorInterventions />;
}
