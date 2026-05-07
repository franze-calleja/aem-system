import { type Metadata } from "next";
import TeacherBehavioral from "@/components/roles/teacher/behavioral-panel";

export const metadata: Metadata = { title: "Behavioral Log — Teacher | AEM System" };

export default function BehavioralPage() {
  return <TeacherBehavioral />;
}
