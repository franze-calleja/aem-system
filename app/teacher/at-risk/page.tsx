import { type Metadata } from "next";
import TeacherAtRisk from "@/components/roles/teacher/at-risk-panel";

export const metadata: Metadata = { title: "At-Risk Students — Teacher | AEM System" };

export default function AtRiskPage() {
  return <TeacherAtRisk />;
}
