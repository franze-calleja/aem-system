"use client";

import { useEffect, useMemo, useState } from "react";

export type AttendanceStatus = "present" | "absent" | "tardy" | "excused";
export type AssessmentKind = "quiz" | "exam" | "pre-test" | "post-test";
export type Semester = "1st Semester" | "2nd Semester" | "Summer";
export type BehaviorCategory = "Academic" | "Attendance" | "Behavioral" | "Social-Emotional";
export type BehaviorSeverity = "Low" | "Moderate" | "High";
export type BehavioralIncident = {
  id: string;
  studentId: string;
  date: string;
  category: BehaviorCategory;
  severity: BehaviorSeverity;
  description: string;
};

export const DEFAULT_SCHOOL_YEAR = "SY 2024-2025";
export const DEFAULT_SEMESTER: Semester = "1st Semester";

export type TeacherStudent = {
  id: string;
  name: string;
  lrn: string;
};

export type AttendanceDay = {
  id: string;
  date: string;
  label: string;
  statusByStudent: Record<string, AttendanceStatus>;
};

export type AssessmentColumn = {
  id: string;
  quarter: number;
  kind: AssessmentKind;
  label: string;
  scoreByStudent: Record<string, number | null>;
};

export type TeacherClass = {
  id: string;
  name: string;
  schoolYear: string;
  semester: Semester;
  gradeLevel: string;
  section: string;
  subject: string;
  adviser: string;
  schedule: string;
  students: TeacherStudent[];
  attendanceDays: AttendanceDay[];
  assessmentColumns: AssessmentColumn[];
  behavioralIncidents: BehavioralIncident[];
};

export type TeacherClassInput = {
  name: string;
  schoolYear: string;
  semester: Semester;
  gradeLevel: string;
  section: string;
  subject: string;
  adviser: string;
  schedule: string;
};

const STORAGE_KEY = "aem-teacher-classes";

const defaultClasses: TeacherClass[] = [
  {
    id: "9-newton",
    name: "9-Newton",
    schoolYear: DEFAULT_SCHOOL_YEAR,
    semester: DEFAULT_SEMESTER,
    gradeLevel: "Grade 9",
    section: "Newton",
    subject: "Science",
    adviser: "Ms. Cruz",
    schedule: "Mon / Wed / Fri",
    students: [
      { id: "s1", name: "Maria Santos", lrn: "LRN001" },
      { id: "s2", name: "Jose Cruz", lrn: "LRN002" },
      { id: "s3", name: "Ana Reyes", lrn: "LRN003" },
      { id: "s4", name: "Paolo Dela Cruz", lrn: "LRN004" },
    ],
    attendanceDays: [],
    assessmentColumns: [],
    behavioralIncidents: [],
  },
  {
    id: "10-pascal",
    name: "10-Pascal",
    schoolYear: DEFAULT_SCHOOL_YEAR,
    semester: DEFAULT_SEMESTER,
    gradeLevel: "Grade 10",
    section: "Pascal",
    subject: "Mathematics",
    adviser: "Mr. Santos",
    schedule: "Tue / Thu",
    students: [
      { id: "s5", name: "Leah Garcia", lrn: "LRN005" },
      { id: "s6", name: "Mark Villanueva", lrn: "LRN006" },
      { id: "s7", name: "Ella Navarro", lrn: "LRN007" },
      { id: "s8", name: "Ramon Dizon", lrn: "LRN008" },
    ],
    attendanceDays: [],
    assessmentColumns: [],
    behavioralIncidents: [],
  },
  {
    id: "11-einstein",
    name: "11-Einstein",
    schoolYear: DEFAULT_SCHOOL_YEAR,
    semester: "2nd Semester",
    gradeLevel: "Grade 11",
    section: "Einstein",
    subject: "English",
    adviser: "Ms. Valdez",
    schedule: "Mon / Thu",
    students: [
      { id: "s9", name: "Clara Mendoza", lrn: "LRN009" },
      { id: "s10", name: "Ivan Ramos", lrn: "LRN010" },
      { id: "s11", name: "Noel Bautista", lrn: "LRN011" },
      { id: "s12", name: "Jessa Flores", lrn: "LRN012" },
    ],
    attendanceDays: [],
    assessmentColumns: [],
    behavioralIncidents: [],
  },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function createAttendanceDay(students: TeacherStudent[], date = todayString()): AttendanceDay {
  return {
    id: `day-${date}`,
    date,
    label: date,
    statusByStudent: Object.fromEntries(students.map((student) => [student.id, "present"])),
  };
}

function createAssessmentColumn(
  quarter: number,
  kind: AssessmentKind,
  index: number,
  students: TeacherStudent[],
): AssessmentColumn {
  return {
    id: `assessment-${quarter}-${kind}-${index + 1}-${Date.now()}`,
    quarter,
    kind,
    label: `${kindToLabel(kind)} ${index + 1}`,
    scoreByStudent: Object.fromEntries(students.map((student) => [student.id, null])),
  };
}

function kindToLabel(kind: AssessmentKind) {
  switch (kind) {
    case "quiz":
      return "Quiz";
    case "exam":
      return "Exam";
    case "pre-test":
      return "Pre-test";
    case "post-test":
      return "Post-test";
  }
}

function normalizeAttendanceDays(rawDays: unknown, students: TeacherStudent[], legacyAttendance?: string) {
  if (Array.isArray(rawDays) && rawDays.length > 0) {
    const deduped = rawDays
      .map((day) => {
        if (!day || typeof day !== "object") return null;
        const candidate = day as Partial<AttendanceDay>;
        if (!candidate.id || !candidate.date || !candidate.statusByStudent) return null;
        return {
          id: candidate.id,
          date: candidate.date,
          label: candidate.label ?? candidate.date,
          statusByStudent: candidate.statusByStudent,
        };
      })
      .filter((day): day is AttendanceDay => Boolean(day));

    return Array.from(new Map(deduped.map((day) => [day.date, day])).values());
  }

  return [
    {
      id: `day-${todayString()}`,
      date: todayString(),
      label: todayString(),
      statusByStudent: Object.fromEntries(
        students.map((student) => [student.id, (legacyAttendance as AttendanceStatus) ?? "present"]),
      ),
    },
  ];
}

function normalizeAssessmentColumns(
  rawColumns: unknown,
  students: TeacherStudent[],
  legacyGradesByStudent?: Record<string, TeacherStudentLegacyGrades>,
) {
  if (Array.isArray(rawColumns) && rawColumns.length > 0) {
    return rawColumns
      .map((column) => {
        if (!column || typeof column !== "object") return null;
        const candidate = column as Partial<AssessmentColumn>;
        if (!candidate.id || !candidate.kind || !candidate.quarter || !candidate.label || !candidate.scoreByStudent) return null;
        return {
          id: candidate.id,
          quarter: candidate.quarter,
          kind: candidate.kind,
          label: candidate.label,
          scoreByStudent: candidate.scoreByStudent,
        };
      })
      .filter((column): column is AssessmentColumn => Boolean(column));
  }

  return ["quiz", "exam", "pre-test", "post-test"].map((kind, index) => {
    const scoreKey = kind === "pre-test" ? "pre" : kind === "post-test" ? "post" : kind;

    return {
      ...createAssessmentColumn(1, kind as AssessmentKind, index, students),
      scoreByStudent: Object.fromEntries(
        students.map((student) => {
          const studentGrades = legacyGradesByStudent?.[student.id] ?? {};
          const source = studentGrades[1]?.[scoreKey as keyof NonNullable<(typeof studentGrades)[1]>];
          return [student.id, typeof source === "number" ? source : null];
        }),
      ),
    };
  });
}

type TeacherStudentLegacyGrades = Record<number, { quiz?: number | null; exam?: number | null; pre?: number | null; post?: number | null }>;

function normalizeClass(rawClass: unknown): TeacherClass | null {
  if (!rawClass || typeof rawClass !== "object") {
    return null;
  }

  const candidate = rawClass as Partial<TeacherClass & { students: Array<Partial<TeacherStudent> & { attendance?: AttendanceStatus; grades?: TeacherStudentLegacyGrades }> }>;

  if (!candidate.id || !candidate.name || !candidate.gradeLevel || !candidate.section || !candidate.subject || !candidate.adviser || !candidate.schedule || !Array.isArray(candidate.students)) {
    return null;
  }

  const legacyGradesByStudent: Record<string, TeacherStudentLegacyGrades> = {};

  const students: TeacherStudent[] = candidate.students
    .map((student, index) => {
      if (!student || typeof student !== "object") return null;
      const studentId = student.id ?? `${slugify(student.name ?? `student-${index + 1}`)}-${index}`;
      const name = student.name ?? `Student ${index + 1}`;
      const lrn = student.lrn ?? `LRN${index + 1}`;
      if (student.grades) {
        legacyGradesByStudent[studentId] = student.grades;
      }
      return { id: studentId, name, lrn };
    })
    .filter((student): student is TeacherStudent => Boolean(student));

  const legacyAttendance = candidate.students[0] && typeof candidate.students[0] === "object" ? candidate.students[0].attendance : undefined;

  return {
    id: candidate.id,
    name: candidate.name,
    schoolYear: candidate.schoolYear ?? DEFAULT_SCHOOL_YEAR,
    semester: candidate.semester ?? DEFAULT_SEMESTER,
    gradeLevel: candidate.gradeLevel,
    section: candidate.section,
    subject: candidate.subject,
    adviser: candidate.adviser,
    schedule: candidate.schedule,
    students,
    attendanceDays: normalizeAttendanceDays(candidate.attendanceDays, students, legacyAttendance),
    assessmentColumns: normalizeAssessmentColumns(candidate.assessmentColumns, students, legacyGradesByStudent),
    behavioralIncidents: Array.isArray(candidate.behavioralIncidents) ? (candidate.behavioralIncidents as BehavioralIncident[]) : [],
  };
}

function cloneDefaultClasses() {
  return defaultClasses.map((item) => ({
    ...item,
    students: item.students.map((student) => ({ ...student })),
    attendanceDays:
      item.attendanceDays.length > 0
        ? item.attendanceDays.map((day) => ({ ...day, statusByStudent: { ...day.statusByStudent } }))
        : [createAttendanceDay(item.students)],
    assessmentColumns: item.assessmentColumns.map((column) => ({ ...column, scoreByStudent: { ...column.scoreByStudent } })),
    behavioralIncidents: item.behavioralIncidents.map((incident) => ({ ...incident })),
  }));
}

function normalizeClassList(raw: unknown) {
  if (!Array.isArray(raw)) {
    return cloneDefaultClasses();
  }

  const normalized = raw.map(normalizeClass).filter((item): item is TeacherClass => Boolean(item));
  return normalized.length > 0 ? normalized : cloneDefaultClasses();
}

export function useTeacherClasses() {
  const [classes, setClasses] = useState<TeacherClass[]>(() => cloneDefaultClasses());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        // Defer setState to avoid synchronous updates within the effect
        setTimeout(() => setClasses(normalizeClassList(JSON.parse(stored))), 0);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Defer hydrated flag to avoid synchronous setState in the effect
    setTimeout(() => setHydrated(true), 0);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  }, [classes, hydrated]);

  const addClass = (input: TeacherClassInput) => {
    setClasses((current) => [
      ...current,
      {
        id: `${slugify(input.name || input.section)}-${Date.now()}`,
        ...input,
        students: [],
        attendanceDays: [],
        assessmentColumns: [],
      },
    ]);
  };

  const updateClass = (classId: string, input: TeacherClassInput) => {
    setClasses((current) => current.map((item) => (item.id === classId ? { ...item, ...input } : item)));
  };

  const deleteClass = (classId: string) => {
    setClasses((current) => current.filter((item) => item.id !== classId));
  };

  const getClassById = (classId: string) => classes.find((item) => item.id === classId);

  const addAttendanceDay = (classId: string, date = todayString()) => {
    setClasses((current) =>
      current.map((item) => {
        if (item.id !== classId) return item;
        if (item.attendanceDays.some((day) => day.date === date)) {
          return item;
        }
        const nextDay = createAttendanceDay(item.students, date);
        return { ...item, attendanceDays: [...item.attendanceDays, nextDay] };
      }),
    );
  };

  const updateAttendanceStatus = (classId: string, dayId: string, studentId: string, status: AttendanceStatus) => {
    setClasses((current) =>
      current.map((item) => {
        if (item.id !== classId) return item;
        return {
          ...item,
          attendanceDays: item.attendanceDays.map((day) =>
            day.id === dayId ? { ...day, statusByStudent: { ...day.statusByStudent, [studentId]: status } } : day,
          ),
        };
      }),
    );
  };

  const markAllPresent = (classId: string, dayId: string) => {
    setClasses((current) =>
      current.map((item) => {
        if (item.id !== classId) return item;
        return {
          ...item,
          attendanceDays: item.attendanceDays.map((day) =>
            day.id === dayId
              ? {
                  ...day,
                  statusByStudent: Object.fromEntries(item.students.map((student) => [student.id, "present"])),
                }
              : day,
          ),
        };
      }),
    );
  };

  const addAssessmentColumn = (classId: string, quarter: number, kind: AssessmentKind) => {
    setClasses((current) =>
      current.map((item) => {
        if (item.id !== classId) return item;
        const existingCount = item.assessmentColumns.filter((column) => column.quarter === quarter && column.kind === kind).length;
        return {
          ...item,
          assessmentColumns: [...item.assessmentColumns, createAssessmentColumn(quarter, kind, existingCount, item.students)],
        };
      }),
    );
  };

  const updateAssessmentScore = (classId: string, assessmentId: string, studentId: string, score: number | null) => {
    setClasses((current) =>
      current.map((item) => {
        if (item.id !== classId) return item;
        return {
          ...item,
          assessmentColumns: item.assessmentColumns.map((column) =>
            column.id === assessmentId ? { ...column, scoreByStudent: { ...column.scoreByStudent, [studentId]: score } } : column,
          ),
        };
      }),
    );
  };

  const removeAssessmentColumn = (classId: string, assessmentId: string) => {
    setClasses((current) =>
      current.map((item) => (item.id === classId ? { ...item, assessmentColumns: item.assessmentColumns.filter((column) => column.id !== assessmentId) } : item)),
    );
  };

  const addBehavioralIncident = (classId: string, incident: Omit<BehavioralIncident, "id">) => {
    setClasses((current) =>
      current.map((item) =>
        item.id === classId
          ? { ...item, behavioralIncidents: [...item.behavioralIncidents, { ...incident, id: `incident-${Date.now()}` }] }
          : item,
      ),
    );
  };

  return useMemo(
    () => ({
      classes,
      addClass,
      updateClass,
      deleteClass,
      getClassById,
      addAttendanceDay,
      updateAttendanceStatus,
      markAllPresent,
      addAssessmentColumn,
      updateAssessmentScore,
      removeAssessmentColumn,
      addBehavioralIncident,
    }),
    [classes],
  );
}
