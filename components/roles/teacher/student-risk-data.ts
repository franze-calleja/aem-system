import { type TeacherClass, type TeacherStudent } from "@/components/roles/teacher/teacher-class-store";

export type RiskBand = "Low" | "Moderate" | "High";

export type RiskFactorTone = "high" | "medium" | "low";

export type RiskFactor = {
  label: string;
  detail: string;
  tone: RiskFactorTone;
};

export type PublicInterventionSummary = {
  type: string;
  schedule: string;
  accommodations: string[];
  teacherActions: string[];
  targetOutcome: string;
  status: "Planned" | "Active" | "Closed";
};

export type StudentRiskSummary = {
  classId: string;
  className: string;
  gradeLevel: string;
  section: string;
  subject: string;
  studentId: string;
  studentName: string;
  lrn: string;
  score: number;
  band: RiskBand;
  attendanceRate: number;
  absenceRate: number;
  averageScore: number;
  absentDays: number;
  tardyDays: number;
  factors: RiskFactor[];
  intervention: PublicInterventionSummary;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1000;
  }

  return hash;
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function subjectLabel(subject: string) {
  return subject.toLowerCase().includes("math") ? "Math" : subject;
}

function buildInterventionSummary(score: number, subject: string): PublicInterventionSummary {
  if (score >= 70) {
    return {
      type: `Targeted ${subject.toLowerCase()} remediation`,
      schedule: "Tue / Thu, 3:30-4:15 PM",
      accommodations: ["Front-of-class seating", "Short guided practice sets", "Frequent comprehension checks"],
      teacherActions: ["Monitor attendance and homework", "Share classroom observations after each session", "Alert the counselor if patterns worsen"],
      targetOutcome: `Raise ${subject.toLowerCase()} performance to the 80+ range and stabilize attendance.`,
      status: "Active",
    };
  }

  if (score >= 40) {
    return {
      type: "Progress monitoring support",
      schedule: "Weekly check-in, Friday 2:30 PM",
      accommodations: ["Provide concise practice tasks", "Offer brief check-for-understanding pauses", "Send assignment reminders"],
      teacherActions: ["Watch for missed work", "Log observations if the pattern changes", "Coordinate with the counselor when needed"],
      targetOutcome: "Keep the student from sliding into a higher risk band and improve classroom consistency.",
      status: "Planned",
    };
  }

  return {
    type: "Classroom monitoring",
    schedule: "As needed during regular class time",
    accommodations: ["Continue routine supports", "Use occasional comprehension checks", "Keep task directions visible"],
    teacherActions: ["Stay alert for changes in attendance or performance", "Submit observation notes when patterns shift"],
    targetOutcome: "Maintain stable performance and catch early changes before they escalate.",
    status: "Planned",
  };
}

function buildFactors(
  attendanceRate: number,
  absenceRate: number,
  averageScore: number,
  absentDays: number,
  tardyDays: number,
  attendanceTotal: number,
  subject: string,
  score: number,
): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const label = subjectLabel(subject);

  if (absenceRate >= 15 || attendanceTotal === 0) {
    factors.push({
      label: attendanceTotal === 0 ? "Attendance data pending" : `${Math.round(absenceRate)}% Absence Rate`,
      detail:
        attendanceTotal === 0
          ? "No attendance days have been recorded yet, so this is a seeded demo signal for the teacher view."
          : `${absentDays} of ${attendanceTotal} school days were marked absent.`,
      tone: score >= 70 ? "high" : "medium",
    });
  }

  if (averageScore < 80 || attendanceTotal === 0) {
    factors.push({
      label: `Declining ${label} Grade`,
      detail:
        attendanceTotal === 0
          ? `The demo snapshot seeds a classroom-visible ${label.toLowerCase()} signal so the teacher can see how the profile behaves.`
          : `Current average of ${averageScore.toFixed(1)} suggests the student needs extra practice and feedback.`,
      tone: score >= 70 ? "high" : "medium",
    });
  }

  if (tardyDays > 0 || attendanceTotal === 0) {
    factors.push({
      label: tardyDays > 0 ? `${tardyDays} tardy mark${tardyDays === 1 ? "" : "s"}` : "Classroom check-in needed",
      detail:
        attendanceTotal === 0
          ? "The mock profile keeps a teacher-facing reminder that attendance follow-up is part of the support plan."
          : "Late arrivals can compound missed instruction and should be tracked alongside the attendance pattern.",
      tone: "medium",
    });
  }

  if (factors.length < 3) {
    factors.push({
      label: "Teacher follow-up recommended",
      detail: "Continue classroom observation, add notes after sessions, and route changes to the counselor.",
      tone: "low",
    });
  }

  return factors.slice(0, 3);
}

export function studentRiskHref(classId: string, studentId: string) {
  return `/teacher/student-risk/${classId}/${studentId}`;
}

export function buildStudentRiskSummary(classItem: TeacherClass, student: TeacherStudent): StudentRiskSummary {
  const seed = hashString(`${classItem.id}:${student.id}:${student.name}`);
  const attendanceTotal = classItem.attendanceDays.length;

  const absentDays = classItem.attendanceDays.filter((day) => day.statusByStudent[student.id] === "absent").length;
  const tardyDays = classItem.attendanceDays.filter((day) => day.statusByStudent[student.id] === "tardy").length;
  const presentDays = classItem.attendanceDays.filter((day) => {
    const status = day.statusByStudent[student.id];
    return status === "present" || status === "excused";
  }).length;

  const assessmentScores = classItem.assessmentColumns
    .map((column) => column.scoreByStudent[student.id])
    .filter((value): value is number => typeof value === "number");

  const syntheticAbsenceRate = (seed % 28) + 8;
  const absenceRate = attendanceTotal > 0 ? (absentDays / attendanceTotal) * 100 : syntheticAbsenceRate;
  const attendanceRate = clamp(attendanceTotal > 0 ? (presentDays / attendanceTotal) * 100 : 100 - syntheticAbsenceRate, 0, 100);
  const averageScore = assessmentScores.length > 0 ? average(assessmentScores) : 48 + (seed % 34);

  const score = clamp(
    Math.round(
      18 +
        absenceRate * 0.45 +
        Math.max(0, 92 - averageScore) * 0.75 +
        (attendanceTotal > 0 ? (tardyDays / attendanceTotal) * 12 : seed % 8),
    ),
    0,
    100,
  );

  const band: RiskBand = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
  const subject = subjectLabel(classItem.subject);

  return {
    classId: classItem.id,
    className: classItem.name,
    gradeLevel: classItem.gradeLevel,
    section: classItem.section,
    subject: classItem.subject,
    studentId: student.id,
    studentName: student.name,
    lrn: student.lrn,
    score,
    band,
    attendanceRate,
    absenceRate,
    averageScore,
    absentDays,
    tardyDays,
    factors: buildFactors(attendanceRate, absenceRate, averageScore, absentDays, tardyDays, attendanceTotal, subject, score),
    intervention: buildInterventionSummary(score, subject),
  };
}

export function buildTeacherRiskSummaries(classes: TeacherClass[]) {
  return classes
    .flatMap((classItem) => classItem.students.map((student) => buildStudentRiskSummary(classItem, student)))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.studentName.localeCompare(right.studentName);
    });
}

export function findStudentRiskSummary(classes: TeacherClass[], classId: string, studentId: string) {
  const classItem = classes.find((item) => item.id === classId);

  if (!classItem) {
    return null;
  }

  const student = classItem.students.find((item) => item.id === studentId);

  if (!student) {
    return null;
  }

  return buildStudentRiskSummary(classItem, student);
}