import StudentProfile from "@/components/roles/counselor/student-profile";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentProfile studentId={id} />;
}
