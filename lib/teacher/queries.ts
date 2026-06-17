// Server-side query helpers for the Teacher role.
// All callers must already have verified the session via requireRole("TEACHER").

import { prisma } from "@/lib/prisma";

export type TeacherClassCard = {
  assignmentId: string;
  sectionId: string;
  sectionName: string; // e.g. "Newton"
  gradeLevel: string;
  subjectCode: string | null;
  subjectName: string | null;
  isAdviser: boolean;
  studentCount: number;
};

/** All TeacherAssignment rows for `userId` in `schoolYearId`, hydrated for the My Classes grid. */
export async function getTeacherClasses(userId: string, schoolYearId: string): Promise<TeacherClassCard[]> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { userId, schoolYearId },
    include: {
      section: { select: { id: true, name: true, gradeLevel: true } },
      subject: { select: { code: true, name: true } },
    },
    orderBy: [{ section: { gradeLevel: "asc" } }, { section: { name: "asc" } }],
  });

  // Pre-fetch student counts per section in one query.
  const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
  const counts = await prisma.studentEnrollment.groupBy({
    by: ["sectionId"],
    where: { sectionId: { in: sectionIds }, schoolYearId, status: "ACTIVE" },
    _count: { _all: true },
  });
  const countBySection = new Map(counts.map((c) => [c.sectionId, c._count._all]));

  return assignments.map((a) => ({
    assignmentId: a.id,
    sectionId: a.sectionId,
    sectionName: a.section.name,
    gradeLevel: a.section.gradeLevel,
    subjectCode: a.subject?.code ?? null,
    subjectName: a.subject?.name ?? null,
    isAdviser: a.isAdviser,
    studentCount: countBySection.get(a.sectionId) ?? 0,
  }));
}

/**
 * Fetch a single TeacherAssignment + the full class roster + recent data, scoped to teacher.
 * Returns null if the assignment doesn't belong to `userId`.
 */
export async function getTeacherClassDetail(
  userId: string,
  assignmentId: string,
  schoolYearId: string,
) {
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { id: assignmentId, userId, schoolYearId },
    include: {
      section: { select: { id: true, name: true, gradeLevel: true } },
      subject: { select: { id: true, code: true, name: true } },
    },
  });
  if (!assignment) return null;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { sectionId: assignment.sectionId, schoolYearId },
    include: {
      student: {
        select: {
          id: true,
          lrn: true,
          firstName: true,
          lastName: true,
          middleName: true,
          sex: true,
          spedStatus: true,
        },
      },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return { assignment, enrollments };
}

export type AttendanceMap = Record<string, Record<string, "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED">>;
//                                  enrollmentId -> isoDate -> status

/** Attendance records for a section across a date range (inclusive). */
export async function getSectionAttendance(sectionId: string, schoolYearId: string, fromIso: string, toIso: string) {
  const rows = await prisma.attendance.findMany({
    where: {
      enrollment: { sectionId, schoolYearId },
      date: { gte: new Date(fromIso + "T00:00:00.000Z"), lte: new Date(toIso + "T00:00:00.000Z") },
    },
    select: { enrollmentId: true, date: true, status: true },
  });

  const map: AttendanceMap = {};
  for (const r of rows) {
    const iso = r.date.toISOString().slice(0, 10);
    if (!map[r.enrollmentId]) map[r.enrollmentId] = {};
    map[r.enrollmentId][iso] = r.status;
  }
  return map;
}

/** Grades for a (section, subject) for a given quarter set. */
export async function getSectionGrades(sectionId: string, subjectId: string, schoolYearId: string) {
  return prisma.grade.findMany({
    where: {
      enrollment: { sectionId, schoolYearId },
      subjectId,
    },
    select: {
      id: true,
      enrollmentId: true,
      quarter: true,
      score: true,
      maxScore: true,
      assessmentKind: true,
      label: true,
      recordedAt: true,
    },
    orderBy: [{ quarter: "asc" }, { recordedAt: "desc" }],
  });
}

/** Behavioral records for a section, most recent first. */
export async function getSectionBehavioralRecords(sectionId: string, schoolYearId: string) {
  return prisma.behavioralRecord.findMany({
    where: { enrollment: { sectionId, schoolYearId } },
    select: {
      id: true,
      enrollmentId: true,
      date: true,
      category: true,
      severity: true,
      description: true,
      recordedAt: true,
      recordedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
}

export type ReferableStudent = { id: string; label: string; sectionLabel: string };

/**
 * Distinct sectionIds the teacher teaches or advises in the given year.
 */
async function teacherSectionIds(userId: string, schoolYearId: string): Promise<string[]> {
  const rows = await prisma.teacherAssignment.findMany({
    where: { userId, schoolYearId },
    select: { sectionId: true },
  });
  return Array.from(new Set(rows.map((r) => r.sectionId)));
}

/** Students enrolled in any section the teacher teaches/advises this year. */
export async function getReferableStudents(
  userId: string,
  schoolYearId: string,
): Promise<ReferableStudent[]> {
  const sectionIds = await teacherSectionIds(userId, schoolYearId);
  if (sectionIds.length === 0) return [];
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE", sectionId: { in: sectionIds } },
    include: {
      student: { select: { id: true, lastName: true, firstName: true, lrn: true } },
      section: { select: { gradeLevel: true, name: true } },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  // Dedupe by student (a student could appear via multiple assignments).
  const seen = new Set<string>();
  const out: ReferableStudent[] = [];
  for (const e of enrollments) {
    if (seen.has(e.student.id)) continue;
    seen.add(e.student.id);
    out.push({
      id: e.student.id,
      label: `${e.student.lastName}, ${e.student.firstName} · ${e.student.lrn}`,
      sectionLabel: `${e.section.gradeLevel} · ${e.section.name}`,
    });
  }
  return out;
}

/** Authoritative scope guard for the create action. */
export async function canTeacherReferStudent(
  userId: string,
  studentId: string,
  schoolYearId: string,
): Promise<boolean> {
  const sectionIds = await teacherSectionIds(userId, schoolYearId);
  if (sectionIds.length === 0) return false;
  const count = await prisma.studentEnrollment.count({
    where: { schoolYearId, studentId, status: "ACTIVE", sectionId: { in: sectionIds } },
  });
  return count > 0;
}

export type TeacherReferralRow = {
  id: string;
  studentLabel: string;
  suggestedType: string;
  urgency: string;
  status: string;
  declineReason: string | null;
  resultingInterventionId: string | null;
  createdAt: Date;
};

export async function getTeacherReferrals(
  userId: string,
  schoolYearId: string,
): Promise<TeacherReferralRow[]> {
  const rows = await prisma.interventionReferral.findMany({
    where: { referredById: userId, schoolYearId },
    include: { student: { select: { firstName: true, lastName: true, lrn: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    studentLabel: `${r.student.lastName}, ${r.student.firstName} · ${r.student.lrn}`,
    suggestedType: r.suggestedType,
    urgency: r.urgency,
    status: r.status,
    declineReason: r.declineReason,
    resultingInterventionId: r.resultingInterventionId,
    createdAt: r.createdAt,
  }));
}
