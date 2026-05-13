import ClassRosterView from "@/components/roles/teacher/class-roster-view";

export default async function ClassRosterPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <ClassRosterView classId={classId} />;
}
