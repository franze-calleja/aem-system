import TeacherStudentRiskDetail from "@/components/roles/teacher/student-risk-detail";

export default async function TeacherStudentRiskDetailPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId, studentId } = await params;
  return <TeacherStudentRiskDetail classId={classId} studentId={studentId} />;
}
