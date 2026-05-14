// Read-only server queries for student profiles + caseload listing.
// Callers verify session/role before calling these (defense-in-depth: queries
// here don't apply RBAC themselves — they're used inside role-guarded pages).

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type {
  AttendanceStatus,
  BehaviorCategory,
  BehaviorSeverity,
  ConsentScope,
  ConsentStatus,
  Role,
  Sex,
  SpedStatus,
} from "@prisma/client";

// ─── Caseload list ──────────────────────────────────────────────────────────

export type CaseloadRow = {
  studentId: string;
  enrollmentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  sex: Sex;
  spedStatus: SpedStatus;
  sectionName: string;
  gradeLevel: string;
  absenceRate: number; // 0..1, computed on the fly from Attendance
  tardyRate: number;   // 0..1
  totalAttendanceDays: number;
  behavioralIncidentCount: number;
};

export async function getCaseload(schoolYearId: string): Promise<CaseloadRow[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE" },
    include: {
      student: {
        select: {
          id: true, lrn: true, firstName: true, lastName: true, middleName: true,
          sex: true, spedStatus: true,
        },
      },
      section: { select: { name: true, gradeLevel: true } },
      attendance: { select: { status: true } },
      behavioralRecords: { select: { id: true } },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return enrollments.map((e) => {
    const total = e.attendance.length;
    const absent = e.attendance.filter((a) => a.status === "ABSENT").length;
    const tardy = e.attendance.filter((a) => a.status === "TARDY").length;
    return {
      studentId: e.student.id,
      enrollmentId: e.id,
      lrn: e.student.lrn,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      middleName: e.student.middleName,
      sex: e.student.sex,
      spedStatus: e.student.spedStatus,
      sectionName: e.section.name,
      gradeLevel: e.section.gradeLevel,
      totalAttendanceDays: total,
      absenceRate: total === 0 ? 0 : absent / total,
      tardyRate: total === 0 ? 0 : tardy / total,
      behavioralIncidentCount: e.behavioralRecords.length,
    };
  });
}

// ─── Student profile ────────────────────────────────────────────────────────

export type StudentProfileData = {
  student: {
    id: string;
    lrn: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    sex: Sex;
    birthDate: string; // ISO
    spedStatus: SpedStatus;
    guardianName: string | null;
    guardianContact: string | null;
  };
  enrollment: {
    id: string;
    schoolYearLabel: string;
    sectionName: string;
    gradeLevel: string;
    learningModality: string;
  };
  consents: Array<{ scope: ConsentScope; status: ConsentStatus; grantedAt: string; revokedAt: string | null }>;
  grades: Array<{
    id: string;
    quarter: number;
    score: number;
    maxScore: number;
    percentage: number;
    assessmentKind: string;
    label: string | null;
    subjectCode: string;
    subjectName: string;
    recordedAt: string;
  }>;
  attendance: Array<{ id: string; date: string; status: AttendanceStatus; notes: string | null }>;
  behavioral: Array<{
    id: string;
    date: string;
    category: BehaviorCategory;
    severity: BehaviorSeverity;
    description: string;
    recordedByName: string | null;
  }>;
  stats: {
    totalAttendanceDays: number;
    absenceRate: number;
    tardyRate: number;
    behavioralIncidentCount: number;
    gwaByQuarter: Array<{ quarter: number; gwa: number | null; count: number }>;
    subjectAverages: Array<{ subjectCode: string; subjectName: string; quarters: Array<{ quarter: number; pct: number | null }> }>;
  };
};

/**
 * Returns the full student profile for the active enrollment in `schoolYearId`.
 * Returns null if the student has no enrollment for that year.
 */
export async function getStudentProfile(
  studentId: string,
  schoolYearId: string,
): Promise<StudentProfileData | null> {
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    include: {
      student: true,
      section: { select: { name: true, gradeLevel: true } },
      schoolYear: { select: { label: true } },
    },
  });
  if (!enrollment) return null;

  const [grades, attendance, behavioral, consents] = await Promise.all([
    prisma.grade.findMany({
      where: { enrollmentId: enrollment.id },
      include: { subject: { select: { code: true, name: true } } },
      orderBy: [{ quarter: "asc" }, { recordedAt: "asc" }],
    }),
    prisma.attendance.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { date: "asc" },
    }),
    prisma.behavioralRecord.findMany({
      where: { enrollmentId: enrollment.id },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.consentRecord.findMany({
      where: { studentId },
      orderBy: { scope: "asc" },
    }),
  ]);

  // Derived stats
  const totalAttendanceDays = attendance.length;
  const absent = attendance.filter((a) => a.status === "ABSENT").length;
  const tardy = attendance.filter((a) => a.status === "TARDY").length;
  const absenceRate = totalAttendanceDays === 0 ? 0 : absent / totalAttendanceDays;
  const tardyRate = totalAttendanceDays === 0 ? 0 : tardy / totalAttendanceDays;

  const gwaByQuarter = [1, 2, 3, 4].map((q) => {
    const subset = grades.filter((g) => g.quarter === q);
    if (subset.length === 0) return { quarter: q, gwa: null, count: 0 };
    const pctSum = subset.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
    return { quarter: q, gwa: Math.round((pctSum / subset.length) * 10) / 10, count: subset.length };
  });

  // Subject-level breakdown — per subject per quarter average.
  const subjectMap = new Map<
    string,
    { code: string; name: string; perQuarter: Map<number, number[]> }
  >();
  for (const g of grades) {
    const key = g.subject.code;
    if (!subjectMap.has(key)) {
      subjectMap.set(key, { code: g.subject.code, name: g.subject.name, perQuarter: new Map() });
    }
    const entry = subjectMap.get(key)!;
    if (!entry.perQuarter.has(g.quarter)) entry.perQuarter.set(g.quarter, []);
    entry.perQuarter.get(g.quarter)!.push((g.score / g.maxScore) * 100);
  }
  const subjectAverages = Array.from(subjectMap.values()).map((s) => ({
    subjectCode: s.code,
    subjectName: s.name,
    quarters: [1, 2, 3, 4].map((q) => {
      const pcts = s.perQuarter.get(q) ?? [];
      if (pcts.length === 0) return { quarter: q, pct: null };
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      return { quarter: q, pct: Math.round(avg * 10) / 10 };
    }),
  }));

  return {
    student: {
      id: enrollment.student.id,
      lrn: enrollment.student.lrn,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      middleName: enrollment.student.middleName,
      sex: enrollment.student.sex,
      birthDate: enrollment.student.birthDate.toISOString(),
      spedStatus: enrollment.student.spedStatus,
      guardianName: enrollment.student.guardianName,
      guardianContact: enrollment.student.guardianContact,
    },
    enrollment: {
      id: enrollment.id,
      schoolYearLabel: enrollment.schoolYear.label,
      sectionName: enrollment.section.name,
      gradeLevel: enrollment.section.gradeLevel,
      learningModality: enrollment.learningModality,
    },
    consents: consents.map((c) => ({
      scope: c.scope,
      status: c.status,
      grantedAt: c.grantedAt.toISOString(),
      revokedAt: c.revokedAt?.toISOString() ?? null,
    })),
    grades: grades.map((g) => ({
      id: g.id,
      quarter: g.quarter,
      score: g.score,
      maxScore: g.maxScore,
      percentage: Math.round((g.score / g.maxScore) * 1000) / 10,
      assessmentKind: g.assessmentKind,
      label: g.label,
      subjectCode: g.subject.code,
      subjectName: g.subject.name,
      recordedAt: g.recordedAt.toISOString(),
    })),
    attendance: attendance.map((a) => ({
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      status: a.status,
      notes: a.notes,
    })),
    behavioral: behavioral.map((b) => ({
      id: b.id,
      date: b.date.toISOString().slice(0, 10),
      category: b.category,
      severity: b.severity,
      description: b.description,
      recordedByName: b.recordedBy?.name ?? null,
    })),
    stats: {
      totalAttendanceDays,
      absenceRate,
      tardyRate,
      behavioralIncidentCount: behavioral.length,
      gwaByQuarter,
      subjectAverages,
    },
  };
}

// ─── Counseling notes (counselor-only, audited) ─────────────────────────────

export type CounselingNoteRow = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Returns counseling notes for an enrollment. Counselor-only at the query
 * layer: any other role gets [] without a DB roundtrip. Every successful
 * read is logged to AuditLog as COUNSELING_NOTE_READ.
 */
export async function getCounselingNotes(
  enrollmentId: string,
  viewerRole: Role,
  viewerUserId: string,
): Promise<CounselingNoteRow[]> {
  if (viewerRole !== "COUNSELOR") return [];

  const notes = await prisma.counselingNote.findMany({
    where: { enrollmentId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  await logAudit({
    action: "COUNSELING_NOTE_READ",
    userId: viewerUserId,
    resourceType: "CounselingNote",
    resourceId: enrollmentId,
    metadata: { enrollmentId, count: notes.length },
  });

  return notes.map((n) => ({
    id: n.id,
    body: n.body,
    authorName: n.author.name,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));
}
