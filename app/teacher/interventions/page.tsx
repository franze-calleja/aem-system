import { type Metadata } from "next";
import TeacherInterventions from "@/components/roles/teacher/interventions-panel";

export const metadata: Metadata = { title: "Interventions & Feedback — Teacher | AEM System" };

export default function TeacherInterventionsPage() {
  return <TeacherInterventions />;
}
