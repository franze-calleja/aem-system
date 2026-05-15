import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getTeacherClassDetail,
  getSectionAttendance,
  getSectionGrades,
  getSectionBehavioralRecords,
} from "@/lib/teacher/queries";
import { getSectionRiskForTeacher } from "@/lib/risk/queries";
import ClassDetail from "@/components/roles/teacher/class-detail";
import SectionRiskCard from "@/components/roles/teacher/section-risk-card";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const session = await requireRole("TEACHER");
  const { classId } = await params;

  const sy = await getActiveSchoolYear();
  if (!sy) notFound();

  const detail = await getTeacherClassDetail(session.user.id, classId, sy.id);
  if (!detail) notFound();

  // Default attendance window: last 14 days through today.
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(today.getUTCDate() - 13);
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = today.toISOString().slice(0, 10);

  const [attendance, grades, behavioral, sectionRisk] = await Promise.all([
    getSectionAttendance(detail.assignment.sectionId, sy.id, fromIso, toIso),
    detail.assignment.subject
      ? getSectionGrades(detail.assignment.sectionId, detail.assignment.subject.id, sy.id)
      : Promise.resolve([]),
    getSectionBehavioralRecords(detail.assignment.sectionId, sy.id),
    getSectionRiskForTeacher(session.user.id, detail.assignment.sectionId, sy.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/teacher/my-classes"
        className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to My Classes
      </Link>

      <SectionRiskCard
        rows={sectionRisk}
        sectionLabel={`${detail.assignment.section.gradeLevel} · ${detail.assignment.section.name}`}
      />

      <ClassDetail
        assignmentId={detail.assignment.id}
        sectionLabel={`${detail.assignment.section.gradeLevel} – ${detail.assignment.section.name}`}
        subjectLabel={detail.assignment.subject ? `${detail.assignment.subject.code} · ${detail.assignment.subject.name}` : null}
        isAdviser={detail.assignment.isAdviser}
        students={detail.enrollments.map((e) => ({
          enrollmentId: e.id,
          studentId: e.student.id,
          lrn: e.student.lrn,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
          middleName: e.student.middleName,
          sex: e.student.sex,
          spedStatus: e.student.spedStatus,
        }))}
        attendanceFromIso={fromIso}
        attendanceToIso={toIso}
        attendance={attendance}
        grades={grades.map((g) => ({
          id: g.id,
          enrollmentId: g.enrollmentId,
          quarter: g.quarter,
          score: g.score,
          maxScore: g.maxScore,
          assessmentKind: g.assessmentKind,
          label: g.label,
          recordedAt: g.recordedAt.toISOString(),
        }))}
        behavioral={behavioral.map((b) => ({
          id: b.id,
          enrollmentId: b.enrollmentId,
          date: b.date.toISOString().slice(0, 10),
          category: b.category,
          severity: b.severity,
          description: b.description,
          recordedByName: b.recordedBy?.name ?? null,
        }))}
      />
    </div>
  );
}
