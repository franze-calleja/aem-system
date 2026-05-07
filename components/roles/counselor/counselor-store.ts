"use client";

import { useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskBand = "Low" | "Moderate" | "High";
export type InterventionStatus = "Planned" | "Active" | "Closed";
export type InterventionScope = "Individual" | "Section" | "Grade Level" | "School-Wide";
export type InterventionType =
  | "Remedial Classes"
  | "Tutoring"
  | "Counseling Sessions"
  | "Peer Support"
  | "Parent Conference"
  | "External Referral"
  | "SEL Program"
  | "Attendance Campaign"
  | "Study Skills Workshop";
export type FeedbackNoteType = "Observation" | "Revision Request" | "Outcome Observation";
export type FeedbackNoteStatus = "Pending" | "Acknowledged" | "Incorporated";

export type GradeEntry = {
  quarter: 1 | 2 | 3 | 4;
  subject: string;
  score: number;
  maxScore: number;
};

export type AttendanceEntry = {
  date: string; // ISO date YYYY-MM-DD
  status: "present" | "absent" | "tardy" | "excused";
};

export type BehavioralRecord = {
  id: string;
  date: string;
  category: "Academic" | "Attendance" | "Behavioral" | "Social-Emotional";
  severity: "Low" | "Moderate" | "High";
  description: string;
};

export type SELAssessment = {
  id: string;
  date: string;
  dimension: "Self-Awareness" | "Self-Management" | "Social Awareness" | "Relationship Skills" | "Responsible Decision-Making";
  score: number; // 1–5
  notes: string;
};

export type CounselingNote = {
  id: string;
  createdAt: string;
  content: string;
  authorId: string; // counselor only
};

export type RiskFactor = {
  label: string;
  detail: string;
  weight: number; // percentage contribution
  dimension: "Academic" | "Attendance" | "Behavioral & SEL" | "Intervention History" | "Profile";
};

export type RiskAssessment = {
  score: number;
  band: RiskBand;
  computedAt: string;
  factors: RiskFactor[];
  narrative: string;
};

export type InterventionNote = {
  id: string;
  type: FeedbackNoteType;
  authorName: string;
  authorRole: "Teacher" | "Counselor" | "Principal";
  content: string;
  createdAt: string;
  status: FeedbackNoteStatus;
};

export type Intervention = {
  id: string;
  scope: InterventionScope;
  type: InterventionType;
  targetStudentIds: string[];
  targetSection?: string;
  targetGradeLevel?: string;
  frequency: string;
  startDate: string;
  endDate: string;
  // Public fields
  description: string;
  accommodationsNeeded: string[];
  staffActions: string[];
  targetOutcome: string;
  status: InterventionStatus;
  // Sensitive fields (counselor + principal only)
  rationale: string;
  counselingContext: string;
  // Meta
  notes: InterventionNote[];
  sessionCount: number;
  schoolYear: string;
  createdAt: string;
};

export type RecommendationDraft = {
  id: string;
  studentId: string;
  studentName: string;
  triggerReason: string;
  suggestedType: InterventionType;
  suggestedScope: InterventionScope;
  narrative: string;
  createdAt: string;
  status: "Pending" | "Converted" | "Dismissed";
};

export type CounselorStudent = {
  id: string;
  name: string;
  lrn: string;
  gradeLevel: string;
  section: string;
  sex: "Male" | "Female";
  spedStatus: boolean;
  learningModality: "Face-to-Face" | "Modular" | "Online";
  schoolYear: string;
  grades: GradeEntry[];
  attendance: AttendanceEntry[];
  behavioral: BehavioralRecord[];
  sel: SELAssessment[];
  notes: CounselingNote[];
  risk: RiskAssessment;
  interventionIds: string[];
};

// ─── Risk engine (deterministic) ──────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashStr(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return h;
}

function computeRisk(student: Omit<CounselorStudent, "risk" | "interventionIds">): RiskAssessment {
  const seed = hashStr(student.id + student.name);

  // Academic sub-score (0–100)
  const latestGrades = student.grades.filter((g) => g.quarter === 4).length
    ? student.grades.filter((g) => g.quarter === 4)
    : student.grades.filter((g) => g.quarter === Math.max(...student.grades.map((g) => g.quarter), 1));
  const gwa =
    latestGrades.length > 0
      ? latestGrades.reduce((t, g) => t + (g.score / g.maxScore) * 100, 0) / latestGrades.length
      : 55 + (seed % 30);
  const academicSub = clamp(Math.round((100 - gwa) * 1.4), 0, 100);

  // Attendance sub-score (0–100)
  const total = student.attendance.length;
  const absent = student.attendance.filter((a) => a.status === "absent").length;
  const tardy = student.attendance.filter((a) => a.status === "tardy").length;
  const absenceRate = total > 0 ? (absent / total) * 100 : 10 + (seed % 25);
  const attendanceSub = clamp(Math.round(absenceRate * 2.5 + tardy * 2), 0, 100);

  // Behavioral sub-score (0–100)
  const behavioralSub = clamp(
    student.behavioral.reduce((t, b) => t + (b.severity === "High" ? 30 : b.severity === "Moderate" ? 15 : 5), 0) +
      (student.sel.length > 0
        ? student.sel.reduce((t, s) => t + (5 - s.score) * 8, 0) / student.sel.length
        : seed % 20),
    0,
    100,
  );

  // Intervention history sub-score (0–100)
  const noteCount = student.notes.length;
  const histSub = clamp(noteCount * 8 + (seed % 15), 0, 100);

  // Profile sub-score (0–100)
  const profileSub = clamp(
    (student.spedStatus ? 25 : 0) + (student.learningModality !== "Face-to-Face" ? 10 : 0) + (seed % 15),
    0,
    100,
  );

  const score = clamp(
    Math.round(academicSub * 0.3 + attendanceSub * 0.25 + behavioralSub * 0.2 + histSub * 0.15 + profileSub * 0.1),
    0,
    100,
  );
  const band: RiskBand = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";

  const factors: RiskFactor[] = [
    {
      label: "Academic Performance",
      detail: `GWA of ${gwa.toFixed(1)}/100. ${gwa < 75 ? "Below the passing threshold — remedial support may be needed." : "Within the acceptable range but worth monitoring."}`,
      weight: 30,
      dimension: "Academic",
    },
    {
      label: "Attendance",
      detail: `Absence rate of ${absenceRate.toFixed(1)}%. ${absenceRate > 15 ? "Exceeds the 15% concern threshold." : "Within safe limits."}`,
      weight: 25,
      dimension: "Attendance",
    },
    {
      label: "Behavioral & SEL",
      detail: `${student.behavioral.length} behavioral incident${student.behavioral.length !== 1 ? "s" : ""}. ${student.sel.length > 0 ? `SEL composite: ${(student.sel.reduce((t, s) => t + s.score, 0) / student.sel.length).toFixed(1)}/5.` : "No SEL assessments on record."}`,
      weight: 20,
      dimension: "Behavioral & SEL",
    },
    {
      label: "Intervention History",
      detail: `${student.notes.length} counseling note${student.notes.length !== 1 ? "s" : ""} on record. ${student.notes.length > 3 ? "Elevated engagement level." : "Low engagement volume."}`,
      weight: 15,
      dimension: "Intervention History",
    },
    {
      label: "Profile Factors",
      detail: `${student.spedStatus ? "SPED-enrolled student. " : ""}${student.learningModality !== "Face-to-Face" ? `${student.learningModality} modality adds monitoring complexity.` : "Face-to-face enrollment, lower modality risk."}`,
      weight: 10,
      dimension: "Profile",
    },
  ];

  const narrative = `${student.name} is ${band} Risk (${score}/100) because ${
    academicSub > 60
      ? `their academic average is ${gwa.toFixed(1)}/100`
      : `their absence rate is ${absenceRate.toFixed(1)}%`
  }${student.behavioral.length > 0 ? ` and ${student.behavioral.length} behavioral incident${student.behavioral.length !== 1 ? "s" : ""} have been logged` : ""}. Each factor weight is shown in the explainability panel below.`;

  return { score, band, computedAt: new Date().toISOString(), factors, narrative };
}

// ─── Seed data ────────────────────────────────────────────────────────────────

function makeAttendance(seed: number, days = 60): AttendanceEntry[] {
  const result: AttendanceEntry[] = [];
  const base = new Date("2024-08-01");
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const roll = (seed * (i + 7)) % 100;
    result.push({
      date: d.toISOString().slice(0, 10),
      status: roll < 12 ? "absent" : roll < 18 ? "tardy" : roll < 20 ? "excused" : "present",
    });
  }
  return result;
}

function makeGrades(seed: number): GradeEntry[] {
  const subjects = ["Math", "Science", "English", "Filipino", "AP"];
  const entries: GradeEntry[] = [];
  for (const subject of subjects) {
    for (const quarter of [1, 2, 3, 4] as const) {
      const base = 55 + ((seed + quarter * 7) % 35);
      entries.push({ quarter, subject, score: base, maxScore: 100 });
    }
  }
  return entries;
}

function makeBehavioral(id: string, count: number): BehavioralRecord[] {
  const cats: BehavioralRecord["category"][] = ["Academic", "Behavioral", "Attendance", "Social-Emotional"];
  const sevs: BehavioralRecord["severity"][] = ["Low", "Moderate", "High"];
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-b${i}`,
    date: `2024-${String(9 + (i % 4)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`,
    category: cats[i % cats.length],
    severity: sevs[i % sevs.length],
    description: `Incident logged by the class teacher. Category: ${cats[i % cats.length]}.`,
  }));
}

type StudentSeed = {
  id: string;
  name: string;
  lrn: string;
  gradeLevel: string;
  section: string;
  sex: "Male" | "Female";
  spedStatus?: boolean;
  learningModality?: CounselorStudent["learningModality"];
  behavioralCount?: number;
  selCount?: number;
  noteCount?: number;
};

function buildStudent(s: StudentSeed): CounselorStudent {
  const seed = hashStr(s.id);
  const grades = makeGrades(seed);
  const attendance = makeAttendance(seed);
  const behavioral = makeBehavioral(s.id, s.behavioralCount ?? 0);
  const sel: SELAssessment[] = Array.from({ length: s.selCount ?? 0 }, (_, i) => ({
    id: `${s.id}-sel${i}`,
    date: `2024-${String(9 + i).padStart(2, "0")}-15`,
    dimension: (["Self-Awareness", "Self-Management", "Social Awareness", "Relationship Skills", "Responsible Decision-Making"] as SELAssessment["dimension"][])[i % 5],
    score: 1 + ((seed + i) % 5),
    notes: "Assessed during scheduled SEL session.",
  }));
  const notes: CounselingNote[] = Array.from({ length: s.noteCount ?? 0 }, (_, i) => ({
    id: `${s.id}-note${i}`,
    createdAt: `2024-${String(9 + i).padStart(2, "0")}-20T10:00:00Z`,
    content: `Counseling session note ${i + 1}. Student expressed concerns about workload and peer relationships.`,
    authorId: "counselor-1",
  }));

  const partial = {
    id: s.id,
    name: s.name,
    lrn: s.lrn,
    gradeLevel: s.gradeLevel,
    section: s.section,
    sex: s.sex,
    spedStatus: s.spedStatus ?? false,
    learningModality: s.learningModality ?? "Face-to-Face",
    schoolYear: "SY 2024-2025",
    grades,
    attendance,
    behavioral,
    sel,
    notes,
  };

  return {
    ...partial,
    risk: computeRisk(partial),
    interventionIds: [],
  };
}

const seedStudents: StudentSeed[] = [
  { id: "c-s1", name: "Maria Santos", lrn: "LRN-2024-001", gradeLevel: "Grade 9", section: "Newton", sex: "Female", behavioralCount: 3, selCount: 2, noteCount: 2 },
  { id: "c-s2", name: "Jose Cruz", lrn: "LRN-2024-002", gradeLevel: "Grade 9", section: "Newton", sex: "Male", behavioralCount: 5, selCount: 1, noteCount: 3 },
  { id: "c-s3", name: "Ana Reyes", lrn: "LRN-2024-003", gradeLevel: "Grade 9", section: "Newton", sex: "Female", behavioralCount: 1, noteCount: 1 },
  { id: "c-s4", name: "Paolo Dela Cruz", lrn: "LRN-2024-004", gradeLevel: "Grade 9", section: "Newton", sex: "Male", spedStatus: true, behavioralCount: 4, noteCount: 4 },
  { id: "c-s5", name: "Leah Garcia", lrn: "LRN-2024-005", gradeLevel: "Grade 10", section: "Pascal", sex: "Female", behavioralCount: 2, selCount: 3, noteCount: 1 },
  { id: "c-s6", name: "Mark Villanueva", lrn: "LRN-2024-006", gradeLevel: "Grade 10", section: "Pascal", sex: "Male", behavioralCount: 6, selCount: 2, noteCount: 5, learningModality: "Modular" },
  { id: "c-s7", name: "Ella Navarro", lrn: "LRN-2024-007", gradeLevel: "Grade 10", section: "Pascal", sex: "Female", noteCount: 0 },
  { id: "c-s8", name: "Ramon Dizon", lrn: "LRN-2024-008", gradeLevel: "Grade 10", section: "Pascal", sex: "Male", behavioralCount: 2, noteCount: 2 },
  { id: "c-s9", name: "Clara Mendoza", lrn: "LRN-2024-009", gradeLevel: "Grade 11", section: "Einstein", sex: "Female", spedStatus: true, behavioralCount: 3, selCount: 4, noteCount: 3 },
  { id: "c-s10", name: "Ivan Ramos", lrn: "LRN-2024-010", gradeLevel: "Grade 11", section: "Einstein", sex: "Male", behavioralCount: 1, noteCount: 1 },
  { id: "c-s11", name: "Noel Bautista", lrn: "LRN-2024-011", gradeLevel: "Grade 11", section: "Einstein", sex: "Male", behavioralCount: 0, noteCount: 0 },
  { id: "c-s12", name: "Jessa Flores", lrn: "LRN-2024-012", gradeLevel: "Grade 11", section: "Einstein", sex: "Female", behavioralCount: 4, selCount: 2, noteCount: 2 },
];

function buildSeedInterventions(students: CounselorStudent[]): Intervention[] {
  const highRisk = students.filter((s) => s.risk.band === "High").slice(0, 3);

  return highRisk.map((s, i) => ({
    id: `intv-${s.id}`,
    scope: "Individual" as InterventionScope,
    type: ["Remedial Classes", "Counseling Sessions", "Parent Conference"][i % 3] as InterventionType,
    targetStudentIds: [s.id],
    frequency: ["Twice a week", "Weekly", "Bi-weekly"][i % 3],
    startDate: "2024-09-16",
    endDate: "2024-12-15",
    description: `Targeted support plan for ${s.name} based on current risk profile.`,
    accommodationsNeeded: ["Front-of-class seating", "Extended time on assessments"],
    staffActions: ["Monitor attendance weekly", "Submit observation notes after each session"],
    targetOutcome: `Reduce risk score from ${s.risk.score} to below 40 by the end of the term.`,
    status: i === 0 ? "Active" : "Planned",
    rationale: `Risk assessment identified elevated ${s.risk.factors[0].dimension} signals. Counseling context supports early intervention.`,
    counselingContext: `Student disclosed academic stress in last two sessions. Parent is aware and supportive.`,
    notes: [
      {
        id: `note-${s.id}-1`,
        type: "Observation",
        authorName: "Teacher Cruz",
        authorRole: "Teacher",
        content: "Student attended Tuesday's session and engaged well, but struggled on Thursday.",
        createdAt: "2024-10-01T09:00:00Z",
        status: "Pending",
      },
    ],
    sessionCount: i === 0 ? 3 : 0,
    schoolYear: "SY 2024-2025",
    createdAt: "2024-09-10T08:00:00Z",
  }));
}

function buildRecommendationDrafts(students: CounselorStudent[]): RecommendationDraft[] {
  return students
    .filter((s) => s.risk.band !== "Low")
    .slice(0, 5)
    .map((s, i) => ({
      id: `rec-${s.id}`,
      studentId: s.id,
      studentName: s.name,
      triggerReason: s.risk.factors[0].label,
      suggestedType: ["Remedial Classes", "Counseling Sessions", "Attendance Campaign", "SEL Program", "Tutoring"][i % 5] as InterventionType,
      suggestedScope: "Individual" as InterventionScope,
      narrative: `Based on ${s.name}'s risk profile (Score: ${s.risk.score}, Band: ${s.risk.band}), an algorithmic assessment identified a primary concern in ${s.risk.factors[0].dimension}. ${s.risk.factors[0].detail} A ${(["Remedial Classes", "Counseling Sessions", "Attendance Campaign", "SEL Program", "Tutoring"][i % 5])} intervention is suggested to address this pattern before it escalates.`,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      status: "Pending",
    }));
}

// ─── Store ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "aem-counselor-data";

export type CounselorStoreState = {
  students: CounselorStudent[];
  interventions: Intervention[];
  recommendations: RecommendationDraft[];
};

function buildInitialState(): CounselorStoreState {
  const students = seedStudents.map(buildStudent);
  const interventions = buildSeedInterventions(students);
  students
    .filter((s) => interventions.some((iv) => iv.targetStudentIds.includes(s.id)))
    .forEach((s) => {
      const iv = interventions.find((iv) => iv.targetStudentIds.includes(s.id));
      if (iv) s.interventionIds = [iv.id];
    });
  return { students, interventions, recommendations: buildRecommendationDrafts(students) };
}

export function useCounselorStore() {
  const [state, setState] = useState<CounselorStoreState>(() => buildInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setTimeout(() => setState(JSON.parse(raw) as CounselorStoreState), 0);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setTimeout(() => setHydrated(true), 0);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // ── Note CRUD ──────────────────────────────────────────────────────────────

  const addNote = (studentId: string, content: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id !== studentId
          ? s
          : {
              ...s,
              notes: [
                ...s.notes,
                {
                  id: `note-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                  content,
                  authorId: "counselor-1",
                },
              ],
            },
      ),
    }));
  };

  const updateNote = (studentId: string, noteId: string, content: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id !== studentId
          ? s
          : { ...s, notes: s.notes.map((n) => (n.id === noteId ? { ...n, content } : n)) },
      ),
    }));
  };

  const deleteNote = (studentId: string, noteId: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id !== studentId ? s : { ...s, notes: s.notes.filter((n) => n.id !== noteId) },
      ),
    }));
  };

  // ── SEL ────────────────────────────────────────────────────────────────────

  const addSEL = (studentId: string, assessment: Omit<SELAssessment, "id">) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id !== studentId
          ? s
          : { ...s, sel: [...s.sel, { ...assessment, id: `sel-${Date.now()}` }] },
      ),
    }));
  };

  // ── Interventions ──────────────────────────────────────────────────────────

  const createIntervention = (iv: Omit<Intervention, "id" | "notes" | "sessionCount" | "createdAt">) => {
    const newIv: Intervention = {
      ...iv,
      id: `intv-${Date.now()}`,
      notes: [],
      sessionCount: 0,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      interventions: [...prev.interventions, newIv],
      students: prev.students.map((s) =>
        newIv.targetStudentIds.includes(s.id)
          ? { ...s, interventionIds: [...s.interventionIds, newIv.id] }
          : s,
      ),
    }));
    return newIv.id;
  };

  const updateInterventionStatus = (ivId: string, status: InterventionStatus) => {
    setState((prev) => ({
      ...prev,
      interventions: prev.interventions.map((iv) => (iv.id === ivId ? { ...iv, status } : iv)),
    }));
  };

  const acknowledgeNote = (ivId: string, noteId: string) => {
    setState((prev) => ({
      ...prev,
      interventions: prev.interventions.map((iv) =>
        iv.id !== ivId
          ? iv
          : {
              ...iv,
              notes: iv.notes.map((n) => (n.id === noteId ? { ...n, status: "Acknowledged" } : n)),
            },
      ),
    }));
  };

  const incorporateNote = (ivId: string, noteId: string) => {
    setState((prev) => ({
      ...prev,
      interventions: prev.interventions.map((iv) =>
        iv.id !== ivId
          ? iv
          : {
              ...iv,
              notes: iv.notes.map((n) => (n.id === noteId ? { ...n, status: "Incorporated" } : n)),
            },
      ),
    }));
  };

  // ── Recommendations ────────────────────────────────────────────────────────

  const dismissRecommendation = (recId: string) => {
    setState((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) =>
        r.id === recId ? { ...r, status: "Dismissed" } : r,
      ),
    }));
  };

  const convertRecommendation = (recId: string, ivId: string) => {
    setState((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((r) =>
        r.id === recId ? { ...r, status: "Converted" } : r,
      ),
    }));
    void ivId;
  };

  const getStudentById = (id: string) => state.students.find((s) => s.id === id);
  const getInterventionsForStudent = (studentId: string) =>
    state.interventions.filter((iv) => iv.targetStudentIds.includes(studentId));
  const getPendingFeedbackNotes = () =>
    state.interventions.flatMap((iv) =>
      iv.notes
        .filter((n) => n.status === "Pending")
        .map((n) => ({ ...n, interventionId: iv.id, studentIds: iv.targetStudentIds })),
    );

  return useMemo(
    () => ({
      ...state,
      addNote,
      updateNote,
      deleteNote,
      addSEL,
      createIntervention,
      updateInterventionStatus,
      acknowledgeNote,
      incorporateNote,
      dismissRecommendation,
      convertRecommendation,
      getStudentById,
      getInterventionsForStudent,
      getPendingFeedbackNotes,
    }),
    [state],
  );
}
