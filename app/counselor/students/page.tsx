import { type Metadata } from "next";
import CounselorStudents from "@/components/roles/counselor/students-panel";

export const metadata: Metadata = { title: "Student Profiles — Counselor | AEM System" };

export default function CounselorStudentsPage() {
  return <CounselorStudents />;
}
