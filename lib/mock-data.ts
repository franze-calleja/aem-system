// ─────────────────────────────────────────────────────────────────────────────
// AEM System — Comprehensive Mock Data (frontend-only, no backend)
// All data reflects Philippine high school context, SY 2024-2025
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskBand = "low" | "moderate" | "high";
export type EnrollmentStatus = "active" | "transferred" | "dropped" | "graduated";
export type LearningModality = "face-to-face" | "blended" | "online";
export type Sex = "M" | "F";
export type InterventionScope = "individual" | "section" | "grade-level" | "school-wide";
export type InterventionStatus = "planned" | "active" | "closed" | "cancelled";
export type InterventionType =
  | "remedial"
  | "tutoring"
  | "counseling"
  | "peer-support"
  | "parent-conference"
  | "external-referral"
  | "sel-program"
  | "attendance-campaign"
  | "study-skills-workshop";
export type NoteType = "observation" | "revision-request" | "outcome-observation";
export type AttendanceStatus = "present" | "absent" | "tardy" | "excused";
export type BehavioralCategory =
  | "tardiness"
  | "disrespect"
  | "fighting"
  | "cheating"
  | "vandalism"
  | "substance"
  | "bullying"
  | "truancy"
  | "other";
export type BehavioralSeverity = "minor" | "moderate" | "major";
export type PatternScope = "student" | "section" | "grade-level" | "school-wide";
export type UserRole = "admin" | "teacher" | "counselor" | "principal";
export type ConsentScope = "data-processing" | "ai-analysis" | "intervention-planning";
export type ConsentStatus = "granted" | "pending" | "revoked";

// ── School Year ────────────────────────────────────────────────────────────────

export interface SchoolYear {
  id: string;
  label: string;
  active: boolean;
  startDate: string;
  endDate: string;
  quarters: { id: number; label: string; startDate: string; endDate: string }[];
}

export const schoolYears: SchoolYear[] = [
  {
    id: "sy-2024-2025",
    label: "SY 2024-2025",
    active: true,
    startDate: "2024-06-03",
    endDate: "2025-03-28",
    quarters: [
      { id: 1, label: "1st Quarter", startDate: "2024-06-03", endDate: "2024-08-16" },
      { id: 2, label: "2nd Quarter", startDate: "2024-08-19", endDate: "2024-11-01" },
      { id: 3, label: "3rd Quarter", startDate: "2024-11-04", endDate: "2025-01-17" },
      { id: 4, label: "4th Quarter", startDate: "2025-01-20", endDate: "2025-03-28" },
    ],
  },
  {
    id: "sy-2023-2024",
    label: "SY 2023-2024",
    active: false,
    startDate: "2023-06-05",
    endDate: "2024-03-29",
    quarters: [
      { id: 1, label: "1st Quarter", startDate: "2023-06-05", endDate: "2023-08-18" },
      { id: 2, label: "2nd Quarter", startDate: "2023-08-21", endDate: "2023-11-03" },
      { id: 3, label: "3rd Quarter", startDate: "2023-11-06", endDate: "2024-01-19" },
      { id: 4, label: "4th Quarter", startDate: "2024-01-22", endDate: "2024-03-29" },
    ],
  },
  {
    id: "sy-2022-2023",
    label: "SY 2022-2023",
    active: false,
    startDate: "2022-08-22",
    endDate: "2023-06-30",
    quarters: [
      { id: 1, label: "1st Quarter", startDate: "2022-08-22", endDate: "2022-10-14" },
      { id: 2, label: "2nd Quarter", startDate: "2022-10-17", endDate: "2022-12-16" },
      { id: 3, label: "3rd Quarter", startDate: "2023-01-03", endDate: "2023-03-03" },
      { id: 4, label: "4th Quarter", startDate: "2023-03-06", endDate: "2023-06-30" },
    ],
  },
];

// ── Sections ──────────────────────────────────────────────────────────────────

export interface Section {
  id: string;
  name: string;
  gradeLevel: number;
  adviserId: string;
  adviserName: string;
  schoolYearId: string;
  room: string;
}

export const sections: Section[] = [
  { id: "9-newton", name: "9-Newton", gradeLevel: 9, adviserId: "t1", adviserName: "Ms. Maria Cruz", schoolYearId: "sy-2024-2025", room: "Room 101" },
  { id: "9-darwin", name: "9-Darwin", gradeLevel: 9, adviserId: "t2", adviserName: "Mr. Jose Santos", schoolYearId: "sy-2024-2025", room: "Room 102" },
  { id: "10-pascal", name: "10-Pascal", gradeLevel: 10, adviserId: "t3", adviserName: "Ms. Ana Reyes", schoolYearId: "sy-2024-2025", room: "Room 201" },
  { id: "10-euler", name: "10-Euler", gradeLevel: 10, adviserId: "t4", adviserName: "Mr. Paolo Bautista", schoolYearId: "sy-2024-2025", room: "Room 202" },
  { id: "11-einstein", name: "11-Einstein", gradeLevel: 11, adviserId: "t1", adviserName: "Ms. Maria Cruz", schoolYearId: "sy-2024-2025", room: "Room 301" },
  { id: "12-curie", name: "12-Curie", gradeLevel: 12, adviserId: "t2", adviserName: "Mr. Jose Santos", schoolYearId: "sy-2024-2025", room: "Room 401" },
];

// ── Users (Staff) ─────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended";
  assignedSections?: string[];
  adviserOf?: string;
  lastLogin: string;
  createdAt: string;
}

export const staffUsers: StaffUser[] = [
  {
    id: "admin1",
    name: "Dr. Ramon Dela Cruz",
    email: "rdelacruz@school.edu",
    role: "admin",
    status: "active",
    lastLogin: "2025-05-07",
    createdAt: "2023-06-01",
  },
  {
    id: "t1",
    name: "Ms. Maria Cruz",
    email: "mcruz@school.edu",
    role: "teacher",
    status: "active",
    assignedSections: ["9-newton", "11-einstein"],
    adviserOf: "9-newton",
    lastLogin: "2025-05-07",
    createdAt: "2023-06-01",
  },
  {
    id: "t2",
    name: "Mr. Jose Santos",
    email: "jsantos@school.edu",
    role: "teacher",
    status: "active",
    assignedSections: ["9-darwin", "12-curie"],
    adviserOf: "9-darwin",
    lastLogin: "2025-05-06",
    createdAt: "2023-06-01",
  },
  {
    id: "t3",
    name: "Ms. Ana Reyes",
    email: "areyes@school.edu",
    role: "teacher",
    status: "active",
    assignedSections: ["10-pascal"],
    adviserOf: "10-pascal",
    lastLogin: "2025-05-07",
    createdAt: "2024-06-03",
  },
  {
    id: "t4",
    name: "Mr. Paolo Bautista",
    email: "pbautista@school.edu",
    role: "teacher",
    status: "suspended",
    assignedSections: ["10-euler"],
    adviserOf: "10-euler",
    lastLogin: "2025-04-15",
    createdAt: "2024-06-03",
  },
  {
    id: "c1",
    name: "Ms. Lena Villanueva",
    email: "lvillanueva@school.edu",
    role: "counselor",
    status: "active",
    lastLogin: "2025-05-07",
    createdAt: "2023-06-01",
  },
  {
    id: "c2",
    name: "Mr. Rico Navarro",
    email: "rnavarro@school.edu",
    role: "counselor",
    status: "active",
    lastLogin: "2025-05-06",
    createdAt: "2024-06-03",
  },
  {
    id: "p1",
    name: "Dr. Gloria Mendoza",
    email: "gmendoza@school.edu",
    role: "principal",
    status: "active",
    lastLogin: "2025-05-07",
    createdAt: "2023-06-01",
  },
];

// ── Students ──────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  birthDate: string;
  guardian: string;
  guardianContact: string;
  spedStatus: boolean;
  spedDetails?: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  schoolYearId: string;
  gradeLevel: number;
  sectionId: string;
  learningModality: LearningModality;
  status: EnrollmentStatus;
}

export const students: Student[] = [
  { id: "stu1", lrn: "202400001", firstName: "Maria", lastName: "Santos", sex: "F", birthDate: "2009-03-15", guardian: "Elena Santos", guardianContact: "09171234567", spedStatus: false },
  { id: "stu2", lrn: "202400002", firstName: "Jose", lastName: "Cruz", sex: "M", birthDate: "2009-07-22", guardian: "Roberto Cruz", guardianContact: "09182345678", spedStatus: false },
  { id: "stu3", lrn: "202400003", firstName: "Ana", lastName: "Reyes", sex: "F", birthDate: "2009-11-08", guardian: "Carmen Reyes", guardianContact: "09193456789", spedStatus: true, spedDetails: "Dyslexia - mild" },
  { id: "stu4", lrn: "202400004", firstName: "Paolo", lastName: "Dela Cruz", sex: "M", birthDate: "2009-05-30", guardian: "Bong Dela Cruz", guardianContact: "09204567890", spedStatus: false },
  { id: "stu5", lrn: "202400005", firstName: "Leah", lastName: "Garcia", sex: "F", birthDate: "2009-09-14", guardian: "Nena Garcia", guardianContact: "09215678901", spedStatus: false },
  { id: "stu6", lrn: "202400006", firstName: "Mark", lastName: "Villanueva", sex: "M", birthDate: "2009-01-25", guardian: "Henry Villanueva", guardianContact: "09226789012", spedStatus: true, spedDetails: "ADHD" },
  { id: "stu7", lrn: "202400007", firstName: "Ella", lastName: "Navarro", sex: "F", birthDate: "2009-06-18", guardian: "Susan Navarro", guardianContact: "09237890123", spedStatus: false },
  { id: "stu8", lrn: "202400008", firstName: "Ramon", lastName: "Dizon", sex: "M", birthDate: "2008-12-03", guardian: "Alfred Dizon", guardianContact: "09248901234", spedStatus: false },
  { id: "stu9", lrn: "202400009", firstName: "Clara", lastName: "Mendoza", sex: "F", birthDate: "2008-04-27", guardian: "Ligaya Mendoza", guardianContact: "09259012345", spedStatus: false },
  { id: "stu10", lrn: "202400010", firstName: "Ivan", lastName: "Ramos", sex: "M", birthDate: "2009-08-11", guardian: "Perla Ramos", guardianContact: "09260123456", spedStatus: false },
  { id: "stu11", lrn: "202400011", firstName: "Noel", lastName: "Bautista", sex: "M", birthDate: "2009-02-19", guardian: "Alice Bautista", guardianContact: "09271234567", spedStatus: false },
  { id: "stu12", lrn: "202400012", firstName: "Jessa", lastName: "Flores", sex: "F", birthDate: "2009-10-05", guardian: "Danny Flores", guardianContact: "09282345678", spedStatus: false },
  { id: "stu13", lrn: "202400013", firstName: "Renato", lastName: "Lim", sex: "M", birthDate: "2009-03-22", guardian: "Corazon Lim", guardianContact: "09293456789", spedStatus: true, spedDetails: "Hearing impairment - bilateral" },
  { id: "stu14", lrn: "202400014", firstName: "Faith", lastName: "Torres", sex: "F", birthDate: "2009-07-16", guardian: "Nelson Torres", guardianContact: "09204567891", spedStatus: false },
  { id: "stu15", lrn: "202400015", firstName: "Jerome", lastName: "Pascual", sex: "M", birthDate: "2009-11-28", guardian: "Maribel Pascual", guardianContact: "09215678902", spedStatus: false },
  { id: "stu16", lrn: "202400016", firstName: "Angela", lastName: "Castillo", sex: "F", birthDate: "2009-01-09", guardian: "Victor Castillo", guardianContact: "09226789013", spedStatus: false },
  { id: "stu17", lrn: "202400017", firstName: "Kevin", lastName: "Ocampo", sex: "M", birthDate: "2008-06-14", guardian: "Merly Ocampo", guardianContact: "09237890124", spedStatus: false },
  { id: "stu18", lrn: "202400018", firstName: "Diane", lastName: "Soriano", sex: "F", birthDate: "2008-09-30", guardian: "Cris Soriano", guardianContact: "09248901235", spedStatus: false },
  { id: "stu19", lrn: "202400019", firstName: "Arthur", lastName: "Rojas", sex: "M", birthDate: "2009-04-07", guardian: "Tessie Rojas", guardianContact: "09259012346", spedStatus: false },
  { id: "stu20", lrn: "202400020", firstName: "Camille", lastName: "Aguilar", sex: "F", birthDate: "2009-12-21", guardian: "Pete Aguilar", guardianContact: "09260123457", spedStatus: false },
];

export const enrollments: StudentEnrollment[] = [
  { id: "e1", studentId: "stu1", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-newton", learningModality: "face-to-face", status: "active" },
  { id: "e2", studentId: "stu2", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-newton", learningModality: "face-to-face", status: "active" },
  { id: "e3", studentId: "stu3", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-newton", learningModality: "blended", status: "active" },
  { id: "e4", studentId: "stu4", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-newton", learningModality: "face-to-face", status: "active" },
  { id: "e5", studentId: "stu5", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-darwin", learningModality: "face-to-face", status: "active" },
  { id: "e6", studentId: "stu6", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-darwin", learningModality: "face-to-face", status: "active" },
  { id: "e7", studentId: "stu7", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-darwin", learningModality: "face-to-face", status: "active" },
  { id: "e8", studentId: "stu8", schoolYearId: "sy-2024-2025", gradeLevel: 9, sectionId: "9-darwin", learningModality: "face-to-face", status: "active" },
  { id: "e9", studentId: "stu9", schoolYearId: "sy-2024-2025", gradeLevel: 10, sectionId: "10-pascal", learningModality: "face-to-face", status: "active" },
  { id: "e10", studentId: "stu10", schoolYearId: "sy-2024-2025", gradeLevel: 10, sectionId: "10-pascal", learningModality: "face-to-face", status: "active" },
  { id: "e11", studentId: "stu11", schoolYearId: "sy-2024-2025", gradeLevel: 10, sectionId: "10-euler", learningModality: "blended", status: "active" },
  { id: "e12", studentId: "stu12", schoolYearId: "sy-2024-2025", gradeLevel: 10, sectionId: "10-euler", learningModality: "face-to-face", status: "active" },
  { id: "e13", studentId: "stu13", schoolYearId: "sy-2024-2025", gradeLevel: 10, sectionId: "10-euler", learningModality: "blended", status: "active" },
  { id: "e14", studentId: "stu14", schoolYearId: "sy-2024-2025", gradeLevel: 11, sectionId: "11-einstein", learningModality: "face-to-face", status: "active" },
  { id: "e15", studentId: "stu15", schoolYearId: "sy-2024-2025", gradeLevel: 11, sectionId: "11-einstein", learningModality: "face-to-face", status: "active" },
  { id: "e16", studentId: "stu16", schoolYearId: "sy-2024-2025", gradeLevel: 11, sectionId: "11-einstein", learningModality: "face-to-face", status: "active" },
  { id: "e17", studentId: "stu17", schoolYearId: "sy-2024-2025", gradeLevel: 12, sectionId: "12-curie", learningModality: "face-to-face", status: "active" },
  { id: "e18", studentId: "stu18", schoolYearId: "sy-2024-2025", gradeLevel: 12, sectionId: "12-curie", learningModality: "face-to-face", status: "active" },
  { id: "e19", studentId: "stu19", schoolYearId: "sy-2024-2025", gradeLevel: 12, sectionId: "12-curie", learningModality: "face-to-face", status: "active" },
  { id: "e20", studentId: "stu20", schoolYearId: "sy-2024-2025", gradeLevel: 12, sectionId: "12-curie", learningModality: "face-to-face", status: "active" },
];

// ── Risk Assessments ──────────────────────────────────────────────────────────

export interface RiskFactor {
  dimension: string;
  weight: number;
  subScore: number;
  contribution: number;
  details: string;
}

export interface RiskAssessment {
  id: string;
  studentId: string;
  schoolYearId: string;
  computedAt: string;
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
  narrative: string;
  overridden?: boolean;
  overrideBand?: RiskBand;
  overrideJustification?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

function makeRisk(studentId: string, score: number, factors: Partial<RiskFactor>[], narrative: string): RiskAssessment {
  const band: RiskBand = score >= 70 ? "high" : score >= 40 ? "moderate" : "low";
  const fullFactors: RiskFactor[] = [
    { dimension: "Academic Performance", weight: 0.30, subScore: factors[0]?.subScore ?? 50, contribution: (factors[0]?.subScore ?? 50) * 0.30, details: factors[0]?.details ?? "Within expected range" },
    { dimension: "Attendance", weight: 0.25, subScore: factors[1]?.subScore ?? 40, contribution: (factors[1]?.subScore ?? 40) * 0.25, details: factors[1]?.details ?? "Acceptable attendance" },
    { dimension: "Behavioral & SEL", weight: 0.20, subScore: factors[2]?.subScore ?? 30, contribution: (factors[2]?.subScore ?? 30) * 0.20, details: factors[2]?.details ?? "No significant incidents" },
    { dimension: "Intervention History", weight: 0.15, subScore: factors[3]?.subScore ?? 20, contribution: (factors[3]?.subScore ?? 20) * 0.15, details: factors[3]?.details ?? "No prior interventions" },
    { dimension: "Profile Factors", weight: 0.10, subScore: factors[4]?.subScore ?? 10, contribution: (factors[4]?.subScore ?? 10) * 0.10, details: factors[4]?.details ?? "Standard profile" },
  ];
  return { id: `ra-${studentId}`, studentId, schoolYearId: "sy-2024-2025", computedAt: "2025-05-07T06:00:00", score, band, factors: fullFactors, narrative };
}

export const riskAssessments: RiskAssessment[] = [
  makeRisk("stu1", 28, [
    { subScore: 22, details: "GWA 88 — above average, stable trend" },
    { subScore: 18, details: "Absence rate 3.2%, no tardiness pattern" },
    { subScore: 15, details: "Zero incidents this year" },
    { subScore: 10, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Maria Santos is performing well academically with a GWA of 88. Attendance is consistent and there are no behavioral concerns. Current risk is Low."),

  makeRisk("stu2", 72, [
    { subScore: 78, details: "GWA dropped from 82 (Q1) → 74 (Q2) → 69 (Q3), 2 failing subjects" },
    { subScore: 65, details: "Absence rate 19.4%, 3 consecutive absences in last month" },
    { subScore: 55, details: "2 behavioral incidents (minor tardiness, disruption)" },
    { subScore: 40, details: "One prior remedial intervention closed with partial improvement" },
    { subScore: 15, details: "Standard profile" },
  ], "Jose Cruz shows a concerning academic decline across three quarters with a current GWA of 69. His absence rate of 19.4% is significantly above the school average. Combined behavioral incidents and a prior partially-successful intervention place him in the High risk band."),

  makeRisk("stu3", 65, [
    { subScore: 70, details: "GWA 73, declining trend, struggles with written assessments (SPED)" },
    { subScore: 45, details: "Absence rate 12.1%, some Monday absences" },
    { subScore: 40, details: "1 behavioral incident (frustration-related disruption)" },
    { subScore: 50, details: "Active accommodation plan in place" },
    { subScore: 70, details: "Dyslexia (mild) — SPED status" },
  ], "Ana Reyes is a SPED student with mild dyslexia. Her GWA of 73 reflects ongoing challenges with written assessments. The active accommodation plan is partially offsetting her risk. She is currently Moderate risk."),

  makeRisk("stu4", 35, [
    { subScore: 30, details: "GWA 85, consistent performance" },
    { subScore: 25, details: "Absence rate 4.5%" },
    { subScore: 20, details: "No incidents" },
    { subScore: 10, details: "No prior interventions" },
    { subScore: 5, details: "Standard profile" },
  ], "Paolo Dela Cruz is performing at a healthy level with GWA 85 and low absence rate. Risk is Low."),

  makeRisk("stu5", 55, [
    { subScore: 60, details: "GWA 77, declining in Math (current: 72)" },
    { subScore: 50, details: "Absence rate 14.2%, pattern of Friday absences" },
    { subScore: 35, details: "1 minor incident" },
    { subScore: 20, details: "No prior interventions" },
    { subScore: 10, details: "Standard profile" },
  ], "Leah Garcia shows moderate academic concern, particularly in Mathematics. A pattern of Friday absences has been detected. Currently Moderate risk."),

  makeRisk("stu6", 81, [
    { subScore: 75, details: "GWA 68, failing in 3 subjects" },
    { subScore: 72, details: "Absence rate 22.8%, multiple consecutive absences" },
    { subScore: 80, details: "4 behavioral incidents this year (ADHD-related)" },
    { subScore: 60, details: "Two prior interventions — one closed with no change" },
    { subScore: 85, details: "ADHD — SPED status" },
  ], "Mark Villanueva is at High risk. ADHD presents significant challenges across academic performance, attendance, and behavioral domains. Multiple interventions have had limited success. Immediate counselor follow-up is recommended."),

  makeRisk("stu7", 32, [
    { subScore: 25, details: "GWA 87" },
    { subScore: 28, details: "Absence rate 5.1%" },
    { subScore: 15, details: "No incidents" },
    { subScore: 10, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Ella Navarro is a low-risk student with good academic and attendance standing."),

  makeRisk("stu8", 48, [
    { subScore: 55, details: "GWA 79, slight decline in Q3" },
    { subScore: 42, details: "Absence rate 11.3%" },
    { subScore: 30, details: "No behavioral incidents" },
    { subScore: 15, details: "No prior interventions" },
    { subScore: 12, details: "Standard profile" },
  ], "Ramon Dizon is Moderate risk driven by a slight academic decline and above-average absence rate. Monitoring recommended."),

  makeRisk("stu9", 20, [
    { subScore: 15, details: "GWA 92, excellent" },
    { subScore: 18, details: "Absence rate 2.1%" },
    { subScore: 10, details: "No incidents" },
    { subScore: 5, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Clara Mendoza is a top-performing, low-risk student."),

  makeRisk("stu10", 76, [
    { subScore: 80, details: "GWA 65, failing in 2 subjects" },
    { subScore: 68, details: "Absence rate 20.5%" },
    { subScore: 70, details: "3 behavioral incidents (tardiness, disruption)" },
    { subScore: 45, details: "One prior counseling intervention, ongoing" },
    { subScore: 20, details: "Standard profile" },
  ], "Ivan Ramos is High risk with academic failure risk in 2 subjects, high absenteeism, and repeated behavioral incidents. Active counseling intervention in progress."),

  makeRisk("stu11", 42, [
    { subScore: 45, details: "GWA 80, stable" },
    { subScore: 40, details: "Absence rate 10.2%" },
    { subScore: 25, details: "1 minor incident" },
    { subScore: 20, details: "No prior interventions" },
    { subScore: 12, details: "Standard profile" },
  ], "Noel Bautista is at the lower boundary of Moderate risk. Academic performance is stable but attendance warrants monitoring."),

  makeRisk("stu12", 29, [
    { subScore: 22, details: "GWA 89" },
    { subScore: 20, details: "Absence rate 3.8%" },
    { subScore: 15, details: "No incidents" },
    { subScore: 10, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Jessa Flores is low risk with excellent academic standing."),

  makeRisk("stu13", 70, [
    { subScore: 65, details: "GWA 72, struggles with auditory components" },
    { subScore: 58, details: "Absence rate 16.2%, frequent medical appointments" },
    { subScore: 45, details: "1 incident (frustration-related)" },
    { subScore: 30, details: "Active accommodation plan" },
    { subScore: 88, details: "Hearing impairment (bilateral) — SPED" },
  ], "Renato Lim is at the High risk boundary. Hearing impairment significantly impacts academic participation. Medical absences contribute to the attendance sub-score. Accommodations are in place but may need review."),

  makeRisk("stu14", 45, [
    { subScore: 48, details: "GWA 81, slight decline Q2-Q3" },
    { subScore: 38, details: "Absence rate 9.8%" },
    { subScore: 28, details: "No incidents" },
    { subScore: 20, details: "No prior interventions" },
    { subScore: 10, details: "Standard profile" },
  ], "Faith Torres is Moderate risk with a mild academic decline and moderate absence rate. Monitoring recommended."),

  makeRisk("stu15", 22, [
    { subScore: 18, details: "GWA 91" },
    { subScore: 15, details: "Absence rate 2.4%" },
    { subScore: 10, details: "No incidents" },
    { subScore: 5, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Jerome Pascual is low risk with strong academic performance."),

  makeRisk("stu16", 38, [
    { subScore: 35, details: "GWA 84" },
    { subScore: 30, details: "Absence rate 6.5%" },
    { subScore: 20, details: "No incidents" },
    { subScore: 10, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Angela Castillo is low risk, performing within expected ranges."),

  makeRisk("stu17", 61, [
    { subScore: 65, details: "GWA 74, declining last 2 quarters" },
    { subScore: 55, details: "Absence rate 15.3%" },
    { subScore: 40, details: "2 behavioral incidents" },
    { subScore: 30, details: "No prior formal interventions" },
    { subScore: 12, details: "Standard profile" },
  ], "Kevin Ocampo is Moderate risk. Academic decline and above-average absence rate need monitoring. Behavioral incidents are minor but warrant attention."),

  makeRisk("stu18", 25, [
    { subScore: 20, details: "GWA 88" },
    { subScore: 18, details: "Absence rate 3.0%" },
    { subScore: 12, details: "No incidents" },
    { subScore: 8, details: "No prior interventions" },
    { subScore: 8, details: "Standard profile" },
  ], "Diane Soriano is low risk with excellent standing."),

  makeRisk("stu19", 52, [
    { subScore: 55, details: "GWA 78, borderline passing in 1 subject" },
    { subScore: 48, details: "Absence rate 13.1%" },
    { subScore: 35, details: "1 behavioral incident" },
    { subScore: 20, details: "No prior interventions" },
    { subScore: 10, details: "Standard profile" },
  ], "Arthur Rojas is Moderate risk. Borderline passing in one subject combined with moderate absenteeism needs monitoring."),

  makeRisk("stu20", 18, [
    { subScore: 12, details: "GWA 93" },
    { subScore: 15, details: "Absence rate 1.5%" },
    { subScore: 8, details: "No incidents" },
    { subScore: 5, details: "No prior interventions" },
    { subScore: 5, details: "Standard profile" },
  ], "Camille Aguilar is low risk with exceptional academic performance."),
];

// ── Attendance Summary ─────────────────────────────────────────────────────────

export interface AttendanceSummary {
  studentId: string;
  schoolDays: number;
  present: number;
  absent: number;
  tardy: number;
  excused: number;
  absenceRate: number;
  tardyRate: number;
  consecutiveAbsences: number;
  monthlyTrend: { month: string; absenceRate: number }[];
}

export const attendanceSummaries: AttendanceSummary[] = [
  { studentId: "stu1", schoolDays: 125, present: 121, absent: 4, tardy: 2, excused: 0, absenceRate: 3.2, tardyRate: 1.6, consecutiveAbsences: 0, monthlyTrend: [{ month: "Jun", absenceRate: 2 }, { month: "Jul", absenceRate: 3 }, { month: "Aug", absenceRate: 4 }, { month: "Sep", absenceRate: 2 }, { month: "Oct", absenceRate: 3 }] },
  { studentId: "stu2", schoolDays: 125, present: 101, absent: 24, tardy: 5, excused: 0, absenceRate: 19.2, tardyRate: 4.0, consecutiveAbsences: 3, monthlyTrend: [{ month: "Jun", absenceRate: 8 }, { month: "Jul", absenceRate: 14 }, { month: "Aug", absenceRate: 20 }, { month: "Sep", absenceRate: 24 }, { month: "Oct", absenceRate: 28 }] },
  { studentId: "stu3", schoolDays: 125, present: 110, absent: 15, tardy: 3, excused: 0, absenceRate: 12.0, tardyRate: 2.4, consecutiveAbsences: 1, monthlyTrend: [{ month: "Jun", absenceRate: 8 }, { month: "Jul", absenceRate: 10 }, { month: "Aug", absenceRate: 12 }, { month: "Sep", absenceRate: 14 }, { month: "Oct", absenceRate: 16 }] },
  { studentId: "stu4", schoolDays: 125, present: 119, absent: 6, tardy: 0, excused: 0, absenceRate: 4.8, tardyRate: 0, consecutiveAbsences: 0, monthlyTrend: [{ month: "Jun", absenceRate: 3 }, { month: "Jul", absenceRate: 4 }, { month: "Aug", absenceRate: 5 }, { month: "Sep", absenceRate: 5 }, { month: "Oct", absenceRate: 5 }] },
  { studentId: "stu5", schoolDays: 125, present: 107, absent: 18, tardy: 2, excused: 0, absenceRate: 14.4, tardyRate: 1.6, consecutiveAbsences: 2, monthlyTrend: [{ month: "Jun", absenceRate: 6 }, { month: "Jul", absenceRate: 10 }, { month: "Aug", absenceRate: 14 }, { month: "Sep", absenceRate: 16 }, { month: "Oct", absenceRate: 18 }] },
  { studentId: "stu6", schoolDays: 125, present: 96, absent: 29, tardy: 8, excused: 0, absenceRate: 23.2, tardyRate: 6.4, consecutiveAbsences: 4, monthlyTrend: [{ month: "Jun", absenceRate: 10 }, { month: "Jul", absenceRate: 15 }, { month: "Aug", absenceRate: 22 }, { month: "Sep", absenceRate: 28 }, { month: "Oct", absenceRate: 32 }] },
  { studentId: "stu7", schoolDays: 125, present: 119, absent: 6, tardy: 1, excused: 0, absenceRate: 4.8, tardyRate: 0.8, consecutiveAbsences: 0, monthlyTrend: [{ month: "Jun", absenceRate: 3 }, { month: "Jul", absenceRate: 4 }, { month: "Aug", absenceRate: 5 }, { month: "Sep", absenceRate: 5 }, { month: "Oct", absenceRate: 6 }] },
  { studentId: "stu8", schoolDays: 125, present: 111, absent: 14, tardy: 2, excused: 0, absenceRate: 11.2, tardyRate: 1.6, consecutiveAbsences: 0, monthlyTrend: [{ month: "Jun", absenceRate: 6 }, { month: "Jul", absenceRate: 8 }, { month: "Aug", absenceRate: 10 }, { month: "Sep", absenceRate: 12 }, { month: "Oct", absenceRate: 13 }] },
  { studentId: "stu9", schoolDays: 125, present: 122, absent: 3, tardy: 0, excused: 0, absenceRate: 2.4, tardyRate: 0, consecutiveAbsences: 0, monthlyTrend: [{ month: "Jun", absenceRate: 2 }, { month: "Jul", absenceRate: 2 }, { month: "Aug", absenceRate: 3 }, { month: "Sep", absenceRate: 2 }, { month: "Oct", absenceRate: 2 }] },
  { studentId: "stu10", schoolDays: 125, present: 99, absent: 26, tardy: 6, excused: 0, absenceRate: 20.8, tardyRate: 4.8, consecutiveAbsences: 3, monthlyTrend: [{ month: "Jun", absenceRate: 8 }, { month: "Jul", absenceRate: 14 }, { month: "Aug", absenceRate: 20 }, { month: "Sep", absenceRate: 26 }, { month: "Oct", absenceRate: 30 }] },
];

// ── Academic Grades ────────────────────────────────────────────────────────────

export interface GradeRecord {
  studentId: string;
  subject: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  gwa: number;
  trend: "improving" | "declining" | "stable";
  preTestScore?: number;
  postTestScore?: number;
  testGain?: number;
}

export const gradeRecords: GradeRecord[] = [
  { studentId: "stu1", subject: "Science", q1: 90, q2: 88, q3: 87, q4: null, gwa: 88.3, trend: "stable", preTestScore: 72, postTestScore: 85, testGain: 13 },
  { studentId: "stu1", subject: "Mathematics", q1: 88, q2: 87, q3: 89, q4: null, gwa: 88, trend: "stable" },
  { studentId: "stu2", subject: "Science", q1: 82, q2: 74, q3: 69, q4: null, gwa: 75, trend: "declining", preTestScore: 70, postTestScore: 68, testGain: -2 },
  { studentId: "stu2", subject: "Mathematics", q1: 78, q2: 70, q3: 65, q4: null, gwa: 71, trend: "declining" },
  { studentId: "stu3", subject: "English", q1: 78, q2: 74, q3: 68, q4: null, gwa: 73.3, trend: "declining", preTestScore: 60, postTestScore: 65, testGain: 5 },
  { studentId: "stu6", subject: "Mathematics", q1: 72, q2: 65, q3: 60, q4: null, gwa: 65.7, trend: "declining", preTestScore: 55, postTestScore: 58, testGain: 3 },
  { studentId: "stu6", subject: "Science", q1: 70, q2: 62, q3: 58, q4: null, gwa: 63.3, trend: "declining" },
  { studentId: "stu10", subject: "English", q1: 72, q2: 66, q3: 58, q4: null, gwa: 65.3, trend: "declining" },
  { studentId: "stu10", subject: "Mathematics", q1: 70, q2: 65, q3: 60, q4: null, gwa: 65, trend: "declining" },
  { studentId: "stu9", subject: "English", q1: 94, q2: 93, q3: 91, q4: null, gwa: 92.7, trend: "stable" },
  { studentId: "stu9", subject: "Mathematics", q1: 91, q2: 92, q3: 94, q4: null, gwa: 92.3, trend: "improving" },
];

// ── Behavioral Incidents ───────────────────────────────────────────────────────

export interface BehavioralIncident {
  id: string;
  studentId: string;
  date: string;
  category: BehavioralCategory;
  severity: BehavioralSeverity;
  description: string;
  reportedBy: string;
  reportedByName: string;
  actionTaken: string;
  schoolYearId: string;
}

export const behavioralIncidents: BehavioralIncident[] = [
  { id: "bi1", studentId: "stu2", date: "2024-08-12", category: "tardiness", severity: "minor", description: "Student arrived 25 minutes late without valid excuse. Third occurrence this month.", reportedBy: "t1", reportedByName: "Ms. Maria Cruz", actionTaken: "Verbal warning. Parent notified.", schoolYearId: "sy-2024-2025" },
  { id: "bi2", studentId: "stu2", date: "2024-09-20", category: "disrespect", severity: "moderate", description: "Student raised voice at teacher during Math class when asked to submit overdue assignment.", reportedBy: "t3", reportedByName: "Ms. Ana Reyes", actionTaken: "Sent to guidance office. Written reflection submitted.", schoolYearId: "sy-2024-2025" },
  { id: "bi3", studentId: "stu3", date: "2024-10-05", category: "other", severity: "minor", description: "Student had a frustration outburst during reading activity, threw materials on desk.", reportedBy: "t1", reportedByName: "Ms. Maria Cruz", actionTaken: "De-escalated. Accommodations reviewed with counselor.", schoolYearId: "sy-2024-2025" },
  { id: "bi4", studentId: "stu6", date: "2024-07-18", category: "tardiness", severity: "minor", description: "Arrived late 4 out of 5 school days this week. ADHD-related difficulty with morning routine per parent report.", reportedBy: "t2", reportedByName: "Mr. Jose Santos", actionTaken: "Counselor looped in. Parent meeting scheduled.", schoolYearId: "sy-2024-2025" },
  { id: "bi5", studentId: "stu6", date: "2024-08-29", category: "disrespect", severity: "moderate", description: "Left classroom without permission during transition period. When retrieved, refused to return initially.", reportedBy: "t3", reportedByName: "Ms. Ana Reyes", actionTaken: "Behavioral intervention plan updated.", schoolYearId: "sy-2024-2025" },
  { id: "bi6", studentId: "stu6", date: "2024-09-15", category: "other", severity: "minor", description: "Difficulty staying on task during group activity; disrupted group members repeatedly.", reportedBy: "t2", reportedByName: "Mr. Jose Santos", actionTaken: "Seating arrangement adjusted.", schoolYearId: "sy-2024-2025" },
  { id: "bi7", studentId: "stu6", date: "2024-10-22", category: "disrespect", severity: "moderate", description: "Refused to hand in assessment paper after dismissal bell rang. Verbal confrontation with supervising teacher.", reportedBy: "t1", reportedByName: "Ms. Maria Cruz", actionTaken: "Parent conference held. Plan reviewed with counselor.", schoolYearId: "sy-2024-2025" },
  { id: "bi8", studentId: "stu10", date: "2024-08-05", category: "tardiness", severity: "minor", description: "Consistent late arrivals on Mondays for three consecutive weeks.", reportedBy: "t3", reportedByName: "Ms. Ana Reyes", actionTaken: "Verbal counseling. Counselor notified.", schoolYearId: "sy-2024-2025" },
  { id: "bi9", studentId: "stu10", date: "2024-09-11", category: "disrespect", severity: "minor", description: "Disruptive during silent reading period. Repeatedly passed notes.", reportedBy: "t2", reportedByName: "Mr. Jose Santos", actionTaken: "Seat moved. Written warning.", schoolYearId: "sy-2024-2025" },
  { id: "bi10", studentId: "stu10", date: "2024-10-30", category: "truancy", severity: "major", description: "Absent for 4 consecutive days without notification from guardian. School-home visit conducted.", reportedBy: "t3", reportedByName: "Ms. Ana Reyes", actionTaken: "Guardian contacted. Counselor home visit. Attendance contract signed.", schoolYearId: "sy-2024-2025" },
  { id: "bi11", studentId: "stu5", date: "2024-10-18", category: "tardiness", severity: "minor", description: "Late arrival on 3 consecutive Fridays.", reportedBy: "t2", reportedByName: "Mr. Jose Santos", actionTaken: "Parent notified by text.", schoolYearId: "sy-2024-2025" },
  { id: "bi12", studentId: "stu8", date: "2024-09-25", category: "other", severity: "minor", description: "Distracted during class, did not submit assignment.", reportedBy: "t3", reportedByName: "Ms. Ana Reyes", actionTaken: "Teacher follow-up. Extended deadline granted.", schoolYearId: "sy-2024-2025" },
];

// ── Counseling Notes (metadata only) ──────────────────────────────────────────

export interface CounselingNote {
  id: string;
  studentId: string;
  authorId: string;
  authorName: string;
  date: string;
  category: string;
  sessionType: string;
  bodyPreview: string; // Only counselors see full body
  schoolYearId: string;
}

export const counselingNotes: CounselingNote[] = [
  { id: "cn1", studentId: "stu2", authorId: "c1", authorName: "Ms. Lena Villanueva", date: "2024-09-22", category: "Academic concern", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn2", studentId: "stu2", authorId: "c1", authorName: "Ms. Lena Villanueva", date: "2024-10-08", category: "Family situation", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn3", studentId: "stu6", authorId: "c1", authorName: "Ms. Lena Villanueva", date: "2024-07-22", category: "Behavioral support", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn4", studentId: "stu6", authorId: "c1", authorName: "Ms. Lena Villanueva", date: "2024-09-02", category: "ADHD management", sessionType: "Parent-student", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn5", studentId: "stu6", authorId: "c2", authorName: "Mr. Rico Navarro", date: "2024-10-25", category: "Behavioral support", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn6", studentId: "stu3", authorId: "c1", authorName: "Ms. Lena Villanueva", date: "2024-10-07", category: "SPED coordination", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn7", studentId: "stu10", authorId: "c2", authorName: "Mr. Rico Navarro", date: "2024-09-12", category: "Academic and attendance", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn8", studentId: "stu10", authorId: "c2", authorName: "Mr. Rico Navarro", date: "2024-11-01", category: "Truancy follow-up", sessionType: "Parent-student", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
  { id: "cn9", studentId: "stu13", authorId: "c1", authorName: "Ms. Lena Villanueva", date: "2024-08-15", category: "SPED coordination", sessionType: "Individual", bodyPreview: "[Counselor-only content]", schoolYearId: "sy-2024-2025" },
];

// ── SEL Assessments ────────────────────────────────────────────────────────────

export interface SELAssessment {
  id: string;
  studentId: string;
  date: string;
  counselorId: string;
  selfAwareness: number;
  selfManagement: number;
  socialAwareness: number;
  relationshipSkills: number;
  responsibleDecision: number;
  composite: number;
  notes: string;
}

export const selAssessments: SELAssessment[] = [
  { id: "sel1", studentId: "stu2", date: "2024-09-25", counselorId: "c1", selfAwareness: 55, selfManagement: 45, socialAwareness: 60, relationshipSkills: 50, responsibleDecision: 48, composite: 51.6, notes: "Student shows awareness of issues but struggles with self-regulation." },
  { id: "sel2", studentId: "stu6", date: "2024-08-20", counselorId: "c1", selfAwareness: 40, selfManagement: 30, socialAwareness: 55, relationshipSkills: 45, responsibleDecision: 38, composite: 41.6, notes: "ADHD significantly impacts self-management. Strong social awareness score." },
  { id: "sel3", studentId: "stu10", date: "2024-09-15", counselorId: "c2", selfAwareness: 45, selfManagement: 40, socialAwareness: 50, relationshipSkills: 48, responsibleDecision: 42, composite: 45.0, notes: "Below-average composite. Needs support in self-management and responsible decision-making." },
];

// ── Interventions ──────────────────────────────────────────────────────────────

export interface Intervention {
  id: string;
  scope: InterventionScope;
  type: InterventionType;
  title: string;
  description: string;
  targetStudentIds?: string[];
  targetSectionId?: string;
  targetGradeLevel?: number;
  frequency: string;
  startDate: string;
  endDate?: string;
  targetOutcome: string;
  status: InterventionStatus;
  rationale: string; // sensitive
  counselingContext: string; // sensitive
  createdBy: string;
  createdByName: string;
  schoolYearId: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  requiresApproval: boolean;
  sessions: InterventionSession[];
  notes: InterventionNote[];
  revisions: InterventionRevision[];
}

export interface InterventionSession {
  id: string;
  interventionId: string;
  date: string;
  duration: number;
  conductedBy: string;
  conductedByName: string;
  attendingStudentIds: string[];
  observations: string;
}

export interface InterventionNote {
  id: string;
  interventionId: string;
  type: NoteType;
  content: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: "pending" | "acknowledged" | "incorporated" | "discussing";
  linkedRevisionId?: string;
}

export interface InterventionRevision {
  id: string;
  interventionId: string;
  revisedBy: string;
  revisedByName: string;
  revisedAt: string;
  changesSummary: string;
  isSignificant: boolean;
  isInterim: boolean;
  triggeredByNoteId?: string;
  requiresReapproval: boolean;
  reapprovedBy?: string;
}

export const interventions: Intervention[] = [
  {
    id: "int1",
    scope: "individual",
    type: "remedial",
    title: "Remedial Academic Support — Jose Cruz",
    description: "Twice-weekly remedial sessions focused on Science and Mathematics for Jose Cruz (9-Newton). Sessions target foundational concept gaps identified through Q3 assessments.",
    targetStudentIds: ["stu2"],
    frequency: "Twice weekly (Tuesday / Thursday 3:30–4:30 PM)",
    startDate: "2024-10-15",
    endDate: "2024-12-15",
    targetOutcome: "Raise GWA to 75 by end of Q4. Reduce absence rate to below 10%.",
    status: "active",
    rationale: "[Counselor-only: Family financial stress identified as root cause of disengagement. Parent working two jobs.]",
    counselingContext: "[Counselor-only: Student disclosed anxiety about academic failure. Referral to external counseling considered.]",
    createdBy: "c1",
    createdByName: "Ms. Lena Villanueva",
    schoolYearId: "sy-2024-2025",
    requiresApproval: false,
    sessions: [
      { id: "sess1", interventionId: "int1", date: "2024-10-17", duration: 60, conductedBy: "t1", conductedByName: "Ms. Maria Cruz", attendingStudentIds: ["stu2"], observations: "Student engaged well in Science review. Struggled with Q3 Physics concepts. Reviewed basic mechanics." },
      { id: "sess2", interventionId: "int1", date: "2024-10-22", duration: 60, conductedBy: "t1", conductedByName: "Ms. Maria Cruz", attendingStudentIds: ["stu2"], observations: "Mathematics session. Student was absent. Noted upcoming absence this Tuesday." },
      { id: "sess3", interventionId: "int1", date: "2024-10-24", duration: 60, conductedBy: "t1", conductedByName: "Ms. Maria Cruz", attendingStudentIds: ["stu2"], observations: "Good session. Student attempted all practice problems. 6/10 correct." },
    ],
    notes: [
      { id: "note1", interventionId: "int1", type: "revision-request", content: "Tuesday sessions are a problem — student has a part-time job on Tuesdays after school. Attendance is consistently 0 on Tuesdays. Suggest shifting to Monday / Wednesday instead.", submittedBy: "t1", submittedByName: "Ms. Maria Cruz", submittedAt: "2024-10-28T10:30:00", status: "incorporated", linkedRevisionId: "rev1" },
      { id: "note2", interventionId: "int1", type: "observation", content: "Student showed improved engagement in the Thursday session this week. Answered 3 questions spontaneously during Science review.", submittedBy: "t1", submittedByName: "Ms. Maria Cruz", submittedAt: "2024-11-01T09:00:00", status: "acknowledged" },
    ],
    revisions: [
      { id: "rev1", interventionId: "int1", revisedBy: "c1", revisedByName: "Ms. Lena Villanueva", revisedAt: "2024-10-29T14:00:00", changesSummary: "Schedule changed from Tue/Thu to Mon/Wed based on teacher feedback about student work conflict.", isSignificant: false, isInterim: false, triggeredByNoteId: "note1", requiresReapproval: false },
    ],
  },
  {
    id: "int2",
    scope: "individual",
    type: "counseling",
    title: "Behavioral Counseling — Mark Villanueva",
    description: "Weekly individual counseling sessions for Mark Villanueva (9-Darwin) to address ADHD-related behavioral patterns and develop self-regulation strategies.",
    targetStudentIds: ["stu6"],
    frequency: "Weekly (Wednesday 2:00–3:00 PM)",
    startDate: "2024-08-05",
    targetOutcome: "Reduce behavioral incidents to zero per month. Improve attendance rate to above 85%.",
    status: "active",
    rationale: "[Counselor-only: ADHD diagnosis confirmed, medication regime ongoing. Parent supportive of counseling approach.]",
    counselingContext: "[Counselor-only: Student expressed frustration about being misunderstood. Building rapport is priority before behavioral goals.]",
    createdBy: "c1",
    createdByName: "Ms. Lena Villanueva",
    schoolYearId: "sy-2024-2025",
    requiresApproval: false,
    sessions: [
      { id: "sess4", interventionId: "int2", date: "2024-08-07", duration: 60, conductedBy: "c1", conductedByName: "Ms. Lena Villanueva", attendingStudentIds: ["stu6"], observations: "Initial session. Focus on relationship building. Student resistant initially, warmed up by end." },
      { id: "sess5", interventionId: "int2", date: "2024-08-14", duration: 60, conductedBy: "c1", conductedByName: "Ms. Lena Villanueva", attendingStudentIds: ["stu6"], observations: "Session 2. Introduced self-monitoring checklist. Student receptive." },
      { id: "sess6", interventionId: "int2", date: "2024-09-04", duration: 60, conductedBy: "c1", conductedByName: "Ms. Lena Villanueva", attendingStudentIds: ["stu6"], observations: "Student reported using the checklist 3/5 days. Positive progress." },
    ],
    notes: [
      { id: "note3", interventionId: "int2", type: "observation", content: "October behavioral incident (10/22) seems linked to a significant assignment deadline. Student's frustration threshold lowers near major assessments. May be worth building a pre-exam preparation strategy into the counseling plan.", submittedBy: "t1", submittedByName: "Ms. Maria Cruz", submittedAt: "2024-10-23T11:00:00", status: "pending" },
    ],
    revisions: [],
  },
  {
    id: "int3",
    scope: "section",
    type: "remedial",
    title: "Section-Wide Math Remedial Program — 9-Darwin",
    description: "Section-level remedial mathematics program for 9-Darwin following concentrated risk detection: 3 of 4 students showing failing or near-failing math performance.",
    targetSectionId: "9-darwin",
    frequency: "Twice weekly group sessions (Monday / Friday 4:00–5:00 PM)",
    startDate: "2024-11-11",
    targetOutcome: "Raise section average in Mathematics to 75 by Q4. Reduce the number of students failing Math from 3 to 0.",
    status: "planned",
    rationale: "[Counselor-only: Pattern detected across all 9-Darwin Math records. Teacher has flagged curriculum pacing as a contributing factor.]",
    counselingContext: "[Counselor-only: Group dynamics seem healthy — students supportive of each other. Peer-facilitated components viable.]",
    createdBy: "c1",
    createdByName: "Ms. Lena Villanueva",
    schoolYearId: "sy-2024-2025",
    requiresApproval: true,
    approvedBy: "p1",
    approvedByName: "Dr. Gloria Mendoza",
    approvedAt: "2024-11-08T10:00:00",
    sessions: [],
    notes: [],
    revisions: [],
  },
  {
    id: "int4",
    scope: "individual",
    type: "parent-conference",
    title: "Parent Conference — Ivan Ramos",
    description: "Parent conference to discuss Ivan's attendance crisis and academic decline, and to build a shared attendance contract.",
    targetStudentIds: ["stu10"],
    frequency: "One-time conference + follow-up",
    startDate: "2024-11-05",
    endDate: "2024-11-05",
    targetOutcome: "Signed attendance contract. Parent commits to daily check-in with student. Absence rate below 10% by Q4.",
    status: "closed",
    rationale: "[Counselor-only: Home visit revealed caretaker responsibilities for younger sibling. Attendance linked to home situation, not disengagement.]",
    counselingContext: "[Counselor-only: Student expressed guilt about family situation. Referral to social welfare considered.]",
    createdBy: "c2",
    createdByName: "Mr. Rico Navarro",
    schoolYearId: "sy-2024-2025",
    requiresApproval: false,
    sessions: [
      { id: "sess7", interventionId: "int4", date: "2024-11-05", duration: 90, conductedBy: "c2", conductedByName: "Mr. Rico Navarro", attendingStudentIds: ["stu10"], observations: "Conference attended by parent and student. Attendance contract signed. Parent agreed to daily morning text check-in." },
    ],
    notes: [
      { id: "note4", interventionId: "int4", type: "outcome-observation", content: "Conference was productive. Parent engaged and concerned. Student visibly relieved to have situation acknowledged. Strong indicator for improved attendance.", submittedBy: "c2", submittedByName: "Mr. Rico Navarro", submittedAt: "2024-11-05T17:00:00", status: "acknowledged" },
    ],
    revisions: [],
  },
  {
    id: "int5",
    scope: "grade-level",
    type: "study-skills-workshop",
    title: "Grade 9 Study Skills & Transition Workshop",
    description: "School-year opening workshop series for all Grade 9 students addressing study habits, time management, and high school transition challenges.",
    targetGradeLevel: 9,
    frequency: "Weekly workshops for 4 weeks (September)",
    startDate: "2024-09-02",
    endDate: "2024-09-27",
    targetOutcome: "Measurable improvement in grade 9 attendance rates and Q2 GWA compared to Q1.",
    status: "closed",
    rationale: "[Counselor-only: Grade 9 transition data from SY 2023-2024 showed elevated risk in first semester. Proactive intervention based on historical pattern.]",
    counselingContext: "[Counselor-only: Several Grade 9 students expressed anxiety about workload increase. Workshop designed to normalize and equip.]",
    createdBy: "c1",
    createdByName: "Ms. Lena Villanueva",
    schoolYearId: "sy-2024-2025",
    requiresApproval: true,
    approvedBy: "p1",
    approvedByName: "Dr. Gloria Mendoza",
    approvedAt: "2024-08-28T09:00:00",
    sessions: [],
    notes: [],
    revisions: [],
  },
];

// ── Recommendation Drafts ──────────────────────────────────────────────────────

export interface RecommendationDraft {
  id: string;
  studentId?: string;
  sectionId?: string;
  gradeLevel?: number;
  scope: InterventionScope;
  suggestedType: InterventionType;
  triggerPattern: string;
  riskScore?: number;
  riskBand?: RiskBand;
  draftTitle: string;
  draftDescription: string;
  rationale: string;
  generatedAt: string;
  status: "pending" | "instantiated" | "dismissed";
  priority: "high" | "medium" | "low";
}

export const recommendationDrafts: RecommendationDraft[] = [
  { id: "rec1", studentId: "stu13", scope: "individual", suggestedType: "counseling", triggerPattern: "High individual risk driven by SPED profile and attendance", riskScore: 70, riskBand: "high", draftTitle: "Individual Counseling Support — Renato Lim", draftDescription: "Renato Lim (10-Euler) has crossed into the High risk band. His hearing impairment combined with rising medical absences and academic struggle signals the need for coordinated counseling and SPED accommodation review. Recommend weekly individual counseling sessions focused on academic coping strategies and a review of current hearing accommodations.", rationale: "Risk score 70 (High band). SPED profile contributes 8.8 sub-points. Absence rate 16.2% with increasing trend.", generatedAt: "2025-05-07T06:15:00", status: "pending", priority: "high" },
  { id: "rec2", studentId: "stu5", scope: "individual", suggestedType: "parent-conference", triggerPattern: "Friday absence pattern detected", riskScore: 55, riskBand: "moderate", draftTitle: "Parent Conference — Leah Garcia (Friday Absence Pattern)", draftDescription: "A recurring Friday absence pattern has been detected for Leah Garcia (9-Darwin). This pattern over 3 consecutive months suggests a structural barrier. Recommend a parent conference to identify and address the root cause before it compounds academic impact.", rationale: "Friday absence rate is 3.2x higher than her Monday–Thursday average. Academic trend is declining.", generatedAt: "2025-05-07T06:15:00", status: "pending", priority: "medium" },
  { id: "rec3", sectionId: "9-darwin", scope: "section", suggestedType: "remedial", triggerPattern: "Concentrated risk — 3/4 students failing Math", riskScore: undefined, riskBand: undefined, draftTitle: "Section-Wide Math Remedial — 9-Darwin", draftDescription: "Section 9-Darwin shows a concentrated Math struggle pattern: 3 of 4 enrolled students are at or below 70% in Mathematics. This exceeds the section-level alert threshold. Recommend a structured group remedial program targeting foundational gaps with a teacher and counselor co-facilitated approach.", rationale: "Section Math average: 66.7. Threshold: 75. Three of four students below passing.", generatedAt: "2025-05-07T06:15:00", status: "instantiated", priority: "high" },
  { id: "rec4", studentId: "stu17", scope: "individual", suggestedType: "tutoring", triggerPattern: "Academic decline + attendance elevation", riskScore: 61, riskBand: "moderate", draftTitle: "Peer Tutoring Support — Kevin Ocampo", draftDescription: "Kevin Ocampo (12-Curie) shows declining grades across two consecutive quarters with an above-average absence rate. Peer tutoring from a high-performing Grade 12 classmate may provide accessible academic support while also strengthening the section's social cohesion.", rationale: "GWA declined from 82 (Q1) to 74 (Q3). Absence rate 15.3%. Two behavioral incidents noted.", generatedAt: "2025-05-07T06:15:00", status: "pending", priority: "medium" },
  { id: "rec5", gradeLevel: 9, scope: "grade-level", suggestedType: "study-skills-workshop", triggerPattern: "Transition difficulty — Grade 9 entry-year risk concentration", riskScore: undefined, riskBand: undefined, draftTitle: "Grade 9 Academic Orientation — SY 2025 Proactive Planning", draftDescription: "Historical data shows Grade 9 consistently has the highest risk concentration in Q1 due to transition difficulty. Based on prior-year patterns, recommend proactively scheduling a Grade 9 Study Skills and Orientation workshop for the incoming SY 2025-2026 before Q1 assessments begin.", rationale: "SY 2024-2025 Grade 9 risk rate: 37.5% moderate+. SY 2023-2024 Grade 9 risk rate: 41.2% moderate+.", generatedAt: "2025-05-07T06:15:00", status: "pending", priority: "low" },
];

// ── Pattern Matches ────────────────────────────────────────────────────────────

export interface PatternMatch {
  id: string;
  scope: PatternScope;
  patternName: string;
  description: string;
  affectedStudentIds?: string[];
  affectedSectionId?: string;
  affectedGradeLevel?: number;
  detectedAt: string;
  severity: "info" | "warning" | "critical";
  routed: UserRole[];
  status: "active" | "acknowledged" | "resolved";
  resolvedAt?: string;
}

export const patternMatches: PatternMatch[] = [
  { id: "pm1", scope: "student", patternName: "Academic Decline Cluster", description: "Jose Cruz (9-Newton) has shown three consecutive quarters of declining grades. Current Q3 GWA: 69. Absence rate 19.2% — above the 15% threshold.", affectedStudentIds: ["stu2"], detectedAt: "2025-05-07T06:00:00", severity: "critical", routed: ["teacher", "counselor"], status: "active" },
  { id: "pm2", scope: "student", patternName: "Disengagement Signal", description: "Mark Villanueva (9-Darwin): Rising tardiness trend (8 instances), 4 behavioral incidents this year, and multiple missing assessments in Math and Science.", affectedStudentIds: ["stu6"], detectedAt: "2025-05-07T06:00:00", severity: "critical", routed: ["teacher", "counselor"], status: "active" },
  { id: "pm3", scope: "student", patternName: "Crisis Warning", description: "Ivan Ramos (10-Pascal): Extended 4-day unauthorized absence combined with behavioral incident and grade drop in Q3.", affectedStudentIds: ["stu10"], detectedAt: "2024-11-01T06:00:00", severity: "critical", routed: ["teacher", "counselor"], status: "acknowledged" },
  { id: "pm4", scope: "section", patternName: "Subject Struggle", description: "Section 9-Darwin: Section average in Mathematics is 66.7 — below the 75 passing threshold. 3 of 4 students are failing or near-failing Math.", affectedSectionId: "9-darwin", detectedAt: "2025-05-07T06:00:00", severity: "warning", routed: ["counselor", "principal"], status: "active" },
  { id: "pm5", scope: "section", patternName: "Attendance Erosion", description: "Section 9-Darwin: Average absence rate is 18.4% — significantly above the school average of 8.1%. Escalating monthly trend observed.", affectedSectionId: "9-darwin", detectedAt: "2025-05-01T06:00:00", severity: "warning", routed: ["counselor", "principal"], status: "active" },
  { id: "pm6", scope: "student", patternName: "Recovery Tracking", description: "Ivan Ramos (10-Pascal): Post-intervention attendance improvement observed. Absence rate reduced from 20.8% to 12% in the two weeks following parent conference.", affectedStudentIds: ["stu10"], detectedAt: "2024-11-20T06:00:00", severity: "info", routed: ["counselor"], status: "resolved", resolvedAt: "2024-11-20T06:00:00" },
  { id: "pm7", scope: "grade-level", patternName: "Transition Difficulty", description: "Grade 9 students show a risk concentration of 37.5% in the moderate/high bands — the highest among all grade levels. This matches the prior-year pattern.", affectedGradeLevel: 9, detectedAt: "2025-05-07T06:00:00", severity: "warning", routed: ["counselor", "principal"], status: "active" },
  { id: "pm8", scope: "school-wide", patternName: "Day-of-Week Effect", description: "School-wide absence rate on Fridays is 2.4x the Monday–Thursday average (Friday: 11.2%, M–Th: 4.6%). Statistically significant over the last 8 weeks.", affectedStudentIds: [], detectedAt: "2025-05-01T06:00:00", severity: "warning", routed: ["principal", "counselor"], status: "active" },
];

// ── Consent Records ────────────────────────────────────────────────────────────

export interface ConsentRecord {
  id: string;
  studentId: string;
  scope: ConsentScope;
  status: ConsentStatus;
  grantedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  notes?: string;
}

export const consentRecords: ConsentRecord[] = [
  { id: "con1", studentId: "stu1", scope: "data-processing", status: "granted", grantedAt: "2024-06-03" },
  { id: "con2", studentId: "stu1", scope: "ai-analysis", status: "granted", grantedAt: "2024-06-03" },
  { id: "con3", studentId: "stu1", scope: "intervention-planning", status: "granted", grantedAt: "2024-06-03" },
  { id: "con4", studentId: "stu2", scope: "data-processing", status: "granted", grantedAt: "2024-06-03" },
  { id: "con5", studentId: "stu2", scope: "ai-analysis", status: "granted", grantedAt: "2024-06-03" },
  { id: "con6", studentId: "stu2", scope: "intervention-planning", status: "granted", grantedAt: "2024-06-03" },
  { id: "con7", studentId: "stu3", scope: "data-processing", status: "granted", grantedAt: "2024-06-03" },
  { id: "con8", studentId: "stu3", scope: "ai-analysis", status: "revoked", grantedAt: "2024-06-03", revokedAt: "2024-10-15", revokedBy: "admin1", notes: "Parent revoked AI analysis consent citing privacy concerns." },
  { id: "con9", studentId: "stu3", scope: "intervention-planning", status: "granted", grantedAt: "2024-06-03" },
  { id: "con10", studentId: "stu6", scope: "data-processing", status: "granted", grantedAt: "2024-06-03" },
  { id: "con11", studentId: "stu6", scope: "ai-analysis", status: "granted", grantedAt: "2024-06-03" },
  { id: "con12", studentId: "stu6", scope: "intervention-planning", status: "granted", grantedAt: "2024-06-03" },
  { id: "con13", studentId: "stu10", scope: "data-processing", status: "granted", grantedAt: "2024-06-03" },
  { id: "con14", studentId: "stu10", scope: "ai-analysis", status: "granted", grantedAt: "2024-06-03" },
  { id: "con15", studentId: "stu10", scope: "intervention-planning", status: "granted", grantedAt: "2024-06-03" },
  { id: "con16", studentId: "stu13", scope: "data-processing", status: "granted", grantedAt: "2024-06-03" },
  { id: "con17", studentId: "stu13", scope: "ai-analysis", status: "pending" },
  { id: "con18", studentId: "stu13", scope: "intervention-planning", status: "granted", grantedAt: "2024-06-03" },
];

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
}

export const auditLog: AuditEntry[] = [
  { id: "al1", timestamp: "2025-05-07T07:02:14", userId: "c1", userName: "Ms. Lena Villanueva", userRole: "counselor", action: "READ", resource: "CounselingNote", resourceId: "cn2", details: "Viewed counseling note for Jose Cruz", ipAddress: "192.168.1.45" },
  { id: "al2", timestamp: "2025-05-07T07:15:32", userId: "c1", userName: "Ms. Lena Villanueva", userRole: "counselor", action: "READ", resource: "RiskAssessment", resourceId: "ra-stu2", details: "Viewed risk assessment for Jose Cruz", ipAddress: "192.168.1.45" },
  { id: "al3", timestamp: "2025-05-07T08:00:01", userId: "admin1", userName: "Dr. Ramon Dela Cruz", userRole: "admin", action: "WRITE", resource: "ConsentRecord", resourceId: "con8", details: "Updated consent: AI analysis for Ana Reyes — status changed to revoked", ipAddress: "192.168.1.10" },
  { id: "al4", timestamp: "2025-05-07T08:22:47", userId: "t1", userName: "Ms. Maria Cruz", userRole: "teacher", action: "READ", resource: "RiskAssessment", resourceId: "ra-stu2", details: "Viewed risk assessment for Jose Cruz (assigned section)", ipAddress: "192.168.1.88" },
  { id: "al5", timestamp: "2025-05-07T08:35:10", userId: "t1", userName: "Ms. Maria Cruz", userRole: "teacher", action: "WRITE", resource: "InterventionNote", resourceId: "note2", details: "Submitted observation note on intervention int1", ipAddress: "192.168.1.88" },
  { id: "al6", timestamp: "2025-05-07T09:10:22", userId: "p1", userName: "Dr. Gloria Mendoza", userRole: "principal", action: "READ", resource: "RiskAssessment", resourceId: "ra-stu6", details: "Viewed risk assessment for Mark Villanueva", ipAddress: "192.168.1.25" },
  { id: "al7", timestamp: "2025-05-07T09:30:15", userId: "c2", userName: "Mr. Rico Navarro", userRole: "counselor", action: "WRITE", resource: "CounselingNote", resourceId: "cn8", details: "Created new counseling note for Ivan Ramos", ipAddress: "192.168.1.52" },
  { id: "al8", timestamp: "2025-05-07T10:00:44", userId: "admin1", userName: "Dr. Ramon Dela Cruz", userRole: "admin", action: "WRITE", resource: "SchoolYear", resourceId: "sy-2024-2025", details: "Updated Q4 end date for SY 2024-2025", ipAddress: "192.168.1.10" },
  { id: "al9", timestamp: "2025-05-07T10:45:18", userId: "c1", userName: "Ms. Lena Villanueva", userRole: "counselor", action: "WRITE", resource: "Intervention", resourceId: "int2", details: "Updated intervention int2: Added session log for Nov 1 session", ipAddress: "192.168.1.45" },
  { id: "al10", timestamp: "2025-05-07T11:20:33", userId: "p1", userName: "Dr. Gloria Mendoza", userRole: "principal", action: "WRITE", resource: "Intervention", resourceId: "int3", details: "Approved section-wide Math remedial intervention for 9-Darwin", ipAddress: "192.168.1.25" },
  { id: "al11", timestamp: "2025-05-07T13:05:00", userId: "t2", userName: "Mr. Jose Santos", userRole: "teacher", action: "WRITE", resource: "BehavioralIncident", resourceId: "bi11", details: "Logged behavioral incident for Leah Garcia", ipAddress: "192.168.1.77" },
  { id: "al12", timestamp: "2025-05-07T14:22:11", userId: "c1", userName: "Ms. Lena Villanueva", userRole: "counselor", action: "WRITE", resource: "InterventionRevision", resourceId: "rev1", details: "Revised intervention int1 schedule based on teacher feedback", ipAddress: "192.168.1.45" },
];

// ── System Configuration ───────────────────────────────────────────────────────

export interface RiskWeightConfig {
  dimension: string;
  weight: number;
  description: string;
}

export interface ThresholdConfig {
  name: string;
  value: number;
  unit: string;
  description: string;
}

export interface SystemConfig {
  riskWeights: RiskWeightConfig[];
  thresholds: ThresholdConfig[];
  patternRules: { id: string; name: string; scope: PatternScope; enabled: boolean; description: string }[];
  lastModifiedBy: string;
  lastModifiedAt: string;
}

export const systemConfig: SystemConfig = {
  riskWeights: [
    { dimension: "Academic Performance", weight: 30, description: "GWA, grade trend, failing subjects, pre/post-test gain" },
    { dimension: "Attendance", weight: 25, description: "Absence rate, tardiness rate, 30-day trend, consecutive absence" },
    { dimension: "Behavioral & SEL", weight: 20, description: "Incident count (severity-weighted), SEL composite score" },
    { dimension: "Intervention History", weight: 15, description: "Active interventions, past outcomes, recurrence count" },
    { dimension: "Profile Factors", weight: 10, description: "SPED status, learning modality, age vs grade level" },
  ],
  thresholds: [
    { name: "Low Risk Ceiling", value: 39, unit: "score", description: "Scores 0-39 are classified as Low risk" },
    { name: "Moderate Risk Ceiling", value: 69, unit: "score", description: "Scores 40-69 are classified as Moderate risk" },
    { name: "High Risk Floor", value: 70, unit: "score", description: "Scores 70-100 are classified as High risk" },
    { name: "Absence Rate Alert", value: 15, unit: "%", description: "Triggers attendance pattern detection" },
    { name: "Section Risk Concentration", value: 30, unit: "%", description: "% of section in moderate/high band to trigger section alert" },
    { name: "Consecutive Absence Alert", value: 3, unit: "days", description: "Days of consecutive absence to trigger critical alert" },
    { name: "Grade Decline Quarters", value: 3, unit: "quarters", description: "Consecutive declining quarters to trigger academic decline pattern" },
  ],
  patternRules: [
    { id: "pr1", name: "Academic Decline Cluster", scope: "student", enabled: true, description: "3 consecutive quarters of declining grades + absence rate > 15%" },
    { id: "pr2", name: "Disengagement Signal", scope: "student", enabled: true, description: "Rising tardiness trend + recent behavioral incident + missing assessments" },
    { id: "pr3", name: "Crisis Warning", scope: "student", enabled: true, description: "Sudden behavioral incident + counseling flag + grade drop same period" },
    { id: "pr4", name: "Recovery Tracking", scope: "student", enabled: true, description: "Post-intervention grade and attendance improvement" },
    { id: "pr5", name: "Chronic Concern", scope: "student", enabled: true, description: "Multiple closed interventions with 'no change' or 'declined' outcomes" },
    { id: "pr6", name: "Concentrated Risk", scope: "section", enabled: true, description: "> 30% of section in moderate/high risk band" },
    { id: "pr7", name: "Subject Struggle", scope: "section", enabled: true, description: "Section average failing in a specific subject" },
    { id: "pr8", name: "Attendance Erosion", scope: "section", enabled: true, description: "Section absence rate exceeding school average significantly" },
    { id: "pr9", name: "Transition Difficulty", scope: "grade-level", enabled: true, description: "Entry-grade students with higher risk concentration than other grades" },
    { id: "pr10", name: "Cohort Trend", scope: "grade-level", enabled: false, description: "Same grade showing systematically different outcomes from prior year" },
    { id: "pr11", name: "Day-of-Week Effect", scope: "school-wide", enabled: true, description: "Significantly elevated absence rates on specific days" },
    { id: "pr12", name: "Year-Over-Year Drift", scope: "school-wide", enabled: false, description: "Overall risk distribution shifting vs prior years" },
  ],
  lastModifiedBy: "admin1",
  lastModifiedAt: "2025-04-15T09:00:00",
};

// ── Bias Metrics ───────────────────────────────────────────────────────────────

export interface BiasMetric {
  dimension: string;
  groups: { label: string; low: number; moderate: number; high: number; total: number }[];
  disparity: boolean;
  disparityNote?: string;
}

export const biasMetrics: BiasMetric[] = [
  {
    dimension: "Sex",
    groups: [
      { label: "Female (F)", low: 7, moderate: 2, high: 1, total: 10 },
      { label: "Male (M)", low: 4, moderate: 4, high: 2, total: 10 },
    ],
    disparity: true,
    disparityNote: "Male students show a higher moderate/high risk rate (60%) vs female students (30%). Warrants monitoring but may reflect actual differential need.",
  },
  {
    dimension: "SPED Status",
    groups: [
      { label: "SPED", low: 0, moderate: 1, high: 2, total: 3 },
      { label: "Non-SPED", low: 11, moderate: 5, high: 1, total: 17 },
    ],
    disparity: true,
    disparityNote: "SPED students show 100% moderate/high risk rate vs 35% for non-SPED. Profile Factor weight (10%) may need calibration review to ensure SPED status is not over-penalizing students who are otherwise stable.",
  },
  {
    dimension: "Learning Modality",
    groups: [
      { label: "Face-to-Face", low: 10, moderate: 5, high: 2, total: 17 },
      { label: "Blended", low: 1, moderate: 1, high: 1, total: 3 },
    ],
    disparity: false,
  },
];

// ── Cohort Comparison Data ─────────────────────────────────────────────────────

export interface CohortYearData {
  schoolYear: string;
  gradeLevel: number;
  totalStudents: number;
  lowRisk: number;
  moderateRisk: number;
  highRisk: number;
  avgGwa: number;
  avgAbsenceRate: number;
  interventionCount: number;
  interventionSuccessRate: number;
}

export const cohortData: CohortYearData[] = [
  { schoolYear: "SY 2022-2023", gradeLevel: 9, totalStudents: 38, lowRisk: 20, moderateRisk: 12, highRisk: 6, avgGwa: 78.2, avgAbsenceRate: 9.4, interventionCount: 8, interventionSuccessRate: 62 },
  { schoolYear: "SY 2023-2024", gradeLevel: 9, totalStudents: 40, lowRisk: 17, moderateRisk: 14, highRisk: 9, avgGwa: 76.8, avgAbsenceRate: 11.2, interventionCount: 12, interventionSuccessRate: 58 },
  { schoolYear: "SY 2024-2025", gradeLevel: 9, totalStudents: 8, lowRisk: 3, moderateRisk: 3, highRisk: 2, avgGwa: 75.4, avgAbsenceRate: 14.6, interventionCount: 5, interventionSuccessRate: 0 },
  { schoolYear: "SY 2022-2023", gradeLevel: 10, totalStudents: 42, lowRisk: 28, moderateRisk: 10, highRisk: 4, avgGwa: 80.1, avgAbsenceRate: 7.2, interventionCount: 6, interventionSuccessRate: 67 },
  { schoolYear: "SY 2023-2024", gradeLevel: 10, totalStudents: 44, lowRisk: 30, moderateRisk: 11, highRisk: 3, avgGwa: 81.3, avgAbsenceRate: 6.8, interventionCount: 4, interventionSuccessRate: 75 },
  { schoolYear: "SY 2024-2025", gradeLevel: 10, totalStudents: 5, lowRisk: 2, moderateRisk: 2, highRisk: 1, avgGwa: 77.2, avgAbsenceRate: 13.5, interventionCount: 2, interventionSuccessRate: 0 },
];

// ── Helper functions ───────────────────────────────────────────────────────────

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id);
}

export function getStudentFullName(id: string): string {
  const s = getStudentById(id);
  return s ? `${s.firstName} ${s.lastName}` : "Unknown Student";
}

export function getRiskAssessmentByStudentId(studentId: string): RiskAssessment | undefined {
  return riskAssessments.find((r) => r.studentId === studentId);
}

export function getEnrollmentByStudentId(studentId: string, schoolYearId = "sy-2024-2025"): StudentEnrollment | undefined {
  return enrollments.find((e) => e.studentId === studentId && e.schoolYearId === schoolYearId);
}

export function getSectionById(sectionId: string): Section | undefined {
  return sections.find((s) => s.id === sectionId);
}

export function getStudentsBySection(sectionId: string): Student[] {
  const sectionEnrollments = enrollments.filter((e) => e.sectionId === sectionId && e.schoolYearId === "sy-2024-2025");
  return sectionEnrollments.map((e) => students.find((s) => s.id === e.studentId)).filter((s): s is Student => Boolean(s));
}

export function riskBandColor(band: RiskBand): string {
  switch (band) {
    case "high": return "bg-red-100 text-red-700 border-red-200";
    case "moderate": return "bg-amber-100 text-amber-700 border-amber-200";
    case "low": return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
}

export function riskBandDot(band: RiskBand): string {
  switch (band) {
    case "high": return "bg-red-500";
    case "moderate": return "bg-amber-400";
    case "low": return "bg-emerald-500";
  }
}

export function riskBandLabel(band: RiskBand): string {
  switch (band) {
    case "high": return "High Risk";
    case "moderate": return "Moderate Risk";
    case "low": return "Low Risk";
  }
}

export function severityColor(severity: BehavioralSeverity): string {
  switch (severity) {
    case "major": return "bg-red-100 text-red-700";
    case "moderate": return "bg-amber-100 text-amber-700";
    case "minor": return "bg-slate-100 text-slate-700";
  }
}

export function consentStatusColor(status: ConsentStatus): string {
  switch (status) {
    case "granted": return "bg-emerald-100 text-emerald-700";
    case "pending": return "bg-amber-100 text-amber-700";
    case "revoked": return "bg-red-100 text-red-700";
  }
}

export function interventionStatusColor(status: InterventionStatus): string {
  switch (status) {
    case "active": return "bg-emerald-100 text-emerald-700";
    case "planned": return "bg-indigo-100 text-indigo-700";
    case "closed": return "bg-slate-100 text-slate-700";
    case "cancelled": return "bg-red-100 text-red-700";
  }
}

export function patternSeverityColor(severity: "info" | "warning" | "critical"): string {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-700 border-red-200";
    case "warning": return "bg-amber-100 text-amber-700 border-amber-200";
    case "info": return "bg-sky-100 text-sky-700 border-sky-200";
  }
}
