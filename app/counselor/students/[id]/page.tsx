import { type Metadata } from "next";
import StudentProfileDetail from "@/components/roles/counselor/student-profile";

export const metadata: Metadata = { title: "Student Profile — Counselor | AEM System" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StudentProfilePage({ params }: Props) {
  const { id } = await params;
  return <StudentProfileDetail studentId={id} />;
}
