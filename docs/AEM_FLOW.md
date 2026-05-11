# AEM System — Frontend Flow & Page Map

This document maps every feature in the [AEM System Specification](AEM_System_Specification.md) to concrete pages, components, and user flows. It is the single source of truth for "what screens exist and how the user moves through them." If a spec feature is not represented here, the UI is incomplete.

---

## 1. Global Architectural Requirements

These elements appear on **every authenticated screen**, regardless of role.

### 1.1 Top Navigation Bar
- **Year Switcher** — prominent dropdown showing the active school year (e.g., "SY 2025–2026"). Every analytical view is scoped by this. Switching years is a deliberate action; the chosen year persists across navigation but never silently changes. A visible banner appears when viewing a non-current year ("Viewing historical data: SY 2023–2024").
- **Role-aware menu** — sidebar/menu items render based on the logged-in role (Admin / Teacher / Counselor / Principal). No role ever sees a link to a page it cannot access.
- **Notifications bell** — surfaces role-relevant events: pattern matches, risk band changes, feedback queue items, pending approvals, interim-revision flags.
- **User menu** — profile, logged-in role indicator, sign out.

### 1.2 Explainability Affordances
- **Info icon (ⓘ)** next to every Risk Score, Risk Band, and Pattern Match. Clicking opens an **Explainability Panel** showing the factor breakdown (weighted contributions, thresholds crossed, rules that fired).
- **"How does this work?"** link in the footer of every algorithmic surface. Opens a plain-language explainer of the algorithm.
- **Tooltips** on every algorithm-derived field (sub-scores, trend slopes, pattern names).

### 1.3 Audit & Consent Indicators
- Whenever a user opens a sensitive resource (counseling note, sensitive intervention field, risk override), a subtle "logged" indicator confirms the access has been recorded.
- Student headers show a **consent badge**. If AI consent is revoked, AI-generated narratives are hidden and a banner explains "AI analysis disabled for this student per consent."

### 1.4 Global Empty / Error / Loading States
- Empty: pages display guidance ("No students assigned to this section yet") rather than blank.
- Errors: surface row numbers and reasons (especially in Import Wizard).
- Loading: skeleton states; no spinners on risk scores (use cached values + "Recomputing…" indicator).

---

## 2. Page & Feature Map by Role

---

### A. Admin — The System Governor
*Focus: data integrity, governance, system setup.*

#### A1. Dashboard
- System health summary, total users by role, active school year indicator, recent import activity, pending audit alerts.

#### A2. User Management
- Table of users with create / suspend / reset-password actions.
- **Section Adviser assignment** — assign one teacher per section per school year as adviser.
- Teacher-to-section assignments (subject teaching).

#### A3. School Year & Term Setup
- Define active school year, quarters, semesters.
- Create / activate / archive school years.
- Section and subject management per school year.

#### A4. Import Wizard (Critical)
Stepper UI bound to a target school year:
1. **Select target school year**
2. **Roster CSV** (LRN, name, sex, birth date, grade level, section, learning modality, SPED status)
3. **Grades CSV** (LRN, subject code, quarter, score, max score)
4. **Attendance CSV** (LRN, date, status) — supports monthly chunks
5. **Behavioral CSV** (optional) (LRN, date, category, severity, description)
6. **Historical Interventions CSV** (optional) (LRN, type, scope, start date, end date, outcome)

Each step shows: preview of first 20 rows, validation errors with row numbers, full success / full rollback on commit, import log entry.

#### A5. Consent Management
- Per-student consent record list with status badges (Data Processing / AI Analysis / Intervention Planning).
- Actions: mark consents received, process revocations (feature degradation, no data loss), view consent history.

#### A6. Algorithm Configuration
- Risk score **weights editor** (Academic 30% / Attendance 25% / Behavioral 20% / Intervention History 15% / Profile 10%) — each change versioned with change history.
- Risk band **threshold editor** (Low 0–39 / Moderate 40–69 / High 70–100).
- Pattern detection **rule toggle list** — enable / disable / tune thresholds for each rule at each scope.

#### A7. Audit Log
- Searchable, filterable table (by user, resource type, time range).
- Append-only — no edit/delete actions.
- Distinct event types color-coded (read, write, override, consent change, import, revision, interim revision).

#### A8. Intervention Metadata Audit
- List of all interventions with **metadata only** — existence, scope, status, dates, owner. No clinical content, no rationale, no feedback notes. Admin oversight without clinical exposure.

---

### B. Teacher — The Data Provider
*Focus: speed of daily classroom data entry; awareness of at-risk students; intervention coordination.*

#### B1. My Classes
- Grid of assigned sections for the active school year. Each card shows section name, subject, student count, attendance status for today, risk distribution mini-bar.
- **Adviser badge** on any section where this teacher is the section adviser — grants elevated access to all students in that section (regardless of subject taught).

#### B2. Class View (per section)
- **Class roster** with risk badges per student.
- **Daily Attendance Sheet** — keyboard-driven table (Tab to move; keys P/A/T/E for Present/Absent/Tardy/Excused).
- **Gradebook** — quarterly grade entry per subject and assessment type, including pre-test and post-test fields.
- **At-Risk Students Panel** — students in Moderate/High band, sorted by score, with quick links to profiles.
- **Class-Level Dashboard** — risk distribution chart, attendance trend (30-day rolling), performance trend by quarter.
- **Pattern Alerts Panel** — student-level and section-level patterns matched in the teacher's sections (e.g., "Section concentrated risk in Math").

#### B3. Student View (teacher's scope)
- Student basics, attendance summary, grades (own subject(s) + adviser sees all if applicable).
- **Risk profile with Explainability Panel** — factor contributions visible; underlying counseling content NOT visible.
- **Behavioral Incident Logger** — category, severity, description, date.

#### B4. Intervention View (Public Fields Only)
For interventions involving students they teach (or any student in their advisory section if they are an adviser):
- Public fields: scope, type, schedule, accommodations needed, what staff should do, target outcomes, status.
- Actions:
  - **Log Session** — date, duration, attending students (for group sessions), brief observations. No counselor review needed.
  - **Submit Observation Note** — descriptive note about how the intervention is going.
  - **Submit Revision Request** — explicit ask for a plan change with rationale.
  - **Submit Outcome Observation** — closure-time feedback contributing to final outcome.
- Read-only view of grade-level and school-wide interventions (public fields only).

#### B5. Notifications Inbox
- Risk band changes for students they teach.
- Pattern alerts for their sections.
- Counselor responses to their submitted feedback (acknowledge / incorporate / discuss).

---

### C. Counselor — The Clinical Lead
*Focus: deep analysis, intervention lifecycle, monitoring outcomes.*

#### C1. Caseload Dashboard
- "Urgent Attention" list — Moderate and High Risk students.
- Sort by: risk score, recent change, intervention status, pattern match recency.
- Filters: grade level, section, intervention status, risk band, pattern type.
- Cards show: name, grade/section, current band with trend arrow, active intervention indicator, last note recency.

#### C2. Full Student Profile (cross-year)
Tabbed view combining all dimensions:
- **Overview** — current risk band, explainability panel, active interventions, recent flags.
- **Academic Trends** — line charts of grades per subject per quarter; GWA across years; pre/post-test gain.
- **Attendance** — heatmap (calendar grid) for Day-of-Week effects; absence/tardy rate; consecutive-absence flags.
- **Behavioral & SEL** — incident timeline; SEL composite over time; SEL assessment history.
- **Counseling Notes** — private text editor / list; visible only to counselors; metadata-level only contributions to risk (count + recency, not content).
- **Interventions** — full history across all scopes and years, with status, outcomes, sessions logged, participation records.
- **Risk History** — every recomputation with timestamp, score, band, factor breakdown; overrides visible inline.

#### C3. Intervention Builder (Multi-Scope)
A unified builder supporting all four scopes:

**Scope picker first** (Individual / Section / Grade Level / School-Wide):
- **Individual** — select student.
- **Section** — select section in the active year.
- **Grade Level** — select grade in the active year.
- **School-Wide** — auto-targets all enrolled students in the active year.

**Plan form (two-layer)**:
- **Public fields** — type (remedial, tutoring, counseling, peer support, parent conference, external referral, SEL program, attendance campaign, study skills workshop), frequency, start date, end date, schedule, accommodations needed, what staff should do, target outcomes.
- **Sensitive fields** — rationale, counseling-derived context, specific behavioral concerns. Visible only to counselor and principal.

**Save actions**:
- Individual: **Save as Planned → Activate** directly.
- Section / Grade / School-Wide: **Save as Planned → Submit for Principal Approval**.

#### C4. Recommendation Queue
- AI-generated `RecommendationDraft` cards from Gemini, grouped by scope (Individual / Section / Grade / School).
- Each card shows: triggering pattern or risk profile, suggested type and scope, Gemini-rendered rationale.
- Actions:
  - **Open in Builder** — pre-fills the Intervention Builder; counselor edits, then saves as actual Intervention.
  - **Dismiss with reason** — draft remains in system as evidence of consideration but never affects students.

#### C5. Feedback Queue
A unified review center for `InterventionNote` records:
- Filter tabs: **All / Observations / Revision Requests / Outcome Observations**.
- Each item: contributor (teacher/adviser/principal), intervention reference, timestamp, body, suggested change if any.
- Disposition actions per note:
  - **Acknowledge** — no plan change, but logged.
  - **Incorporate** — opens the Intervention Builder in revision mode; on save creates an `InterventionRevision` linked to this note.
  - **Discuss** — opens in-app message thread on the note.

#### C6. Revision History (per intervention)
- Chronological list of `InterventionRevision` records: what fields changed, who changed them, why, whether triggered by a specific feedback note.
- **Re-approval status** — if a revision was significant, shows pending/approved by principal with timestamp.
- **Interim revision flag** — surfaces principal-authored interim revisions for counselor review on return.

#### C7. Pattern Detection Inbox
- All pattern matches relevant to the counselor (all four scopes).
- Cards link to: affected student/section/grade/school, contributing data points, suggested action.
- Cross-reference view: see if multiple students share the same pattern (early signal of class-wide issues).

#### C8. Outcome Tracking
- For each closed intervention: outcome record, contributing observation notes, participation summary (per student for broader-scope plans via `InterventionParticipation`).
- Outcome feeds into next risk recompute — successful interventions reduce risk; unsuccessful may elevate.

---

### D. Principal — The Oversight
*Focus: school-wide trends, approval authority, governance.*

#### D1. School-Wide Dashboard
- Risk distribution by grade level, section, sex, learning modality.
- Drill-down: school → grade level → section → individual student.
- Year-over-year comparison slot.

#### D2. Bias Monitoring Dashboard
- Risk band distribution across **sex / learning modality / SPED status**.
- Disparity flags when distributions exceed configured thresholds.
- Drill into flagged groups; review underlying profiles; one-click link to Algorithm Config if calibration adjustment is warranted.

#### D3. Approval Center
- Pending **section, grade-level, and school-wide** interventions awaiting approval.
- Pending **significant revisions** to previously approved broader-scope interventions (re-approval queue).
- Each item: full plan (public + sensitive fields), student-by-student impact preview, counselor's rationale, approve / request changes / reject actions.

#### D4. Risk Override Interface
- For any student: view current classification and explainability, click **Override**, choose new band, enter mandatory written justification. Recorded with timestamp, principal ID, original score, override band, reasoning. Original assessment remains linked.

#### D5. Interim Revision Interface
- When the counselor is unavailable and an active intervention needs urgent revision: open the intervention → **Interim Revision** action → edit fields + mandatory justification → activates immediately, flagged as interim, surfaces in counselor queue for review on return.

#### D6. Cohort Analysis
- Select grade level + multiple school years (e.g., "Grade 9, last 3 SYs").
- Side-by-side: risk band distributions, intervention counts, outcome rates.
- Year-over-year drift indicators.
- Export summary.

#### D7. Intervention Outcomes Review
- Aggregate intervention outcomes by scope, type, period.
- What's working, what isn't.
- Full visibility into rationale (including sensitive context) for governance.

#### D8. Read-Only Access
- Full student data (excluding individual counseling note bodies).
- Audit log (read-only).
- Revision history (read-only).

#### D9. Observation Note Submission
- Principal can submit Observation Notes on any intervention (read-everywhere status grants observation rights everywhere).

---

## 3. AI Literacy Surfaces

These appear in addition to per-role pages.

### 3.1 "How does this work?" Pages
- One per algorithm component: Risk Scoring, Pattern Detection, Recommendation Engine.
- Plain-language walk-through of inputs, weights, thresholds, outputs.

### 3.2 Interactive Risk Simulator ("What-If")
- Pick a student (or a sandbox synthetic profile).
- Toggle hypothetical inputs (attendance +5 days, grade +10 in Math, behavioral incident removed).
- See risk score and band recompute in real time with factor breakdown.
- "Reset" returns to actual data.

### 3.3 Decision Audit Trail
- For any flagged student, show the chain: raw data points → sub-scores → final score → band → pattern matches → recommendation drafts → counselor action.

### 3.4 AI Literacy Assistant
- In-app chat anchored to current page context. Powered by Gemini. Answers questions like "Why is this student High Risk?" or "What does Academic Decline Cluster mean?" using the actual data surfaces.

---

## 4. Core User Flows

Each flow corresponds to a spec flow (Section 11) or a cross-cutting workflow. Flows specify the screens involved and the actions taken.

### Flow 1 — Teacher's Daily Routine *(spec Flow A)*
1. Login → **My Classes** grid.
2. Open a section → **Attendance Sheet** → enter today's attendance (keyboard-driven).
3. Switch to **Gradebook** → enter new quarter scores.
4. Review **At-Risk Students Panel** → click into a student → read Explainability Panel.
5. Optionally log a **Behavioral Incident**.
6. End-to-end: 5–10 minutes.

### Flow 2 — Counselor: Data → Decision *(spec Flow B)*
1. **Notifications bell** → pattern match alert ("Academic Decline Cluster").
2. **Caseload Dashboard** → open student → **Full Student Profile**.
3. **Overview tab** → review Explainability Panel.
4. **Recommendation Queue** → open draft → click **Open in Builder**.
5. **Intervention Builder** → edit public + sensitive fields → **Save as Planned** → **Activate** (individual scope).
6. Schedule first session; assign responsible staff.

### Flow 3 — Counselor: Section-Wide Intervention *(spec Flow C)*
1. **Pattern Detection Inbox** → section-level alert (e.g., "Concentrated Risk — 9-Newton, Math").
2. Review underlying data; **Intervention Builder** → scope = Section → 9-Newton → draft remedial plan.
3. Save → **Submit for Principal Approval**.
4. Principal opens **Approval Center** → reviews rationale + student-by-student impact → **Approve**.
5. Intervention activates; teachers see public fields; adviser monitors participation via `InterventionParticipation`.

### Flow 4 — Principal: Bias Monitoring *(spec Flow D)*
1. **Bias Monitoring Dashboard** → notice High Risk rate disparity (e.g., 23% SPED vs 8% non-SPED).
2. Drill into flagged group → review profiles.
3. Determine: genuine differential need OR calibration issue.
4. If calibration: **Algorithm Config** → adjust SPED weight → log change with justification.

### Flow 5 — Principal: Risk Override *(spec Flow E)*
1. Open student → review High Risk classification.
2. Click **Override** → choose new band → enter justification.
3. Submit → override recorded; student profile shows override indicator with link to original assessment.

### Flow 6 — Admin: Consent Revocation *(spec Flow F)*
1. Parent contacts admin to revoke AI-assisted analysis consent.
2. **Consent Management** → open student → mark "AI Analysis" scope as revoked.
3. Gemini features disabled for this student; algorithmic scores still display; revocation logged.

### Flow 7 — Admin: Bulk Historical Import *(spec Flow G)*
1. **Import Wizard** → select target school year (e.g., SY 2023–2024).
2. Upload Roster CSV → preview → fix errors → commit.
3. Upload Grades CSV → preview → commit.
4. Upload Attendance CSV in monthly chunks.
5. Review **Import Log** entry.

### Flow 8 — Principal: Cross-Year Cohort Comparison *(spec Flow H)*
1. **Cohort Analysis** → select "Grade 9, last 3 SYs".
2. View side-by-side risk band distributions, intervention counts, outcome rates.
3. Flag year-over-year drift.
4. Export summary for faculty meeting.

### Flow 9 — Teacher Feedback → Plan Revision *(spec Flow I)*
1. Teacher opens active intervention → **Submit Revision Request** ("Tuesday conflicts; suggest M/W/F").
2. Counselor sees it in **Feedback Queue** → **Incorporate**.
3. Builder opens in revision mode → counselor edits schedule → save.
4. `InterventionRevision` logged with reference to the teacher's note.
5. Teacher receives notification of incorporation; adviser sees updated plan.

### Flow 10 — Teacher Logs a Session *(spec Flow J)*
1. Teacher opens active intervention → click **Log Session**.
2. Enter date, duration, attending students, brief observations.
3. Submit → session record visible to counselor; contributes to `InterventionParticipation` tracking.
4. No counselor review required.

### Flow 11 — Interim Revision (Counselor Unavailable) *(spec Flow K)*
1. Counselor on extended leave; urgent rescheduling needed (e.g., typhoon make-up days).
2. Principal opens intervention → **Interim Revision** → edit fields + justification.
3. Revision activates immediately, flagged as interim.
4. Counselor sees flagged revision in **Revision History / Feedback Queue** on return; can confirm or further adjust.

### Flow 12 — Significant Revision Triggers Re-Approval *(spec Section 6.6)*
1. Counselor revises a previously approved section-wide intervention.
2. System detects significant change (scope, type, duration beyond threshold, target population) → flags as significant.
3. Revision held pending → routed to Principal **Approval Center** (re-approval queue).
4. Principal approves → revision takes effect.

### Flow 13 — Outcome Closes the Loop *(spec Section 6.6)*
1. Counselor closes intervention → records outcome (Improved / No Change / Declined) + notes.
2. Outcome contributes to `InterventionParticipation` records (for broader-scope plans).
3. Next risk recomputation incorporates outcome into the Intervention History sub-score.
4. Student's band may shift; explainability panel reflects the new contributing factor.

### Flow 14 — AI Literacy Exploration *(spec Section 6.9)*
1. Teacher opens **Interactive Risk Simulator** from a student profile.
2. Toggles "What if attendance improves by 5 days?" → score drops in real time.
3. Reviews factor breakdown updates.
4. Clicks **"How does this work?"** to read the algorithm explainer.
5. Optionally opens **AI Literacy Assistant** to ask a follow-up question.

---

## 5. Intervention Visibility Matrix (UI Enforcement)

Every intervention surface must enforce this matrix. The frontend hides what the user cannot see; the backend re-enforces at the query level.

| Scope | Teacher (teaches student) | Section Adviser | Counselor | Principal | Admin |
|---|---|---|---|---|---|
| Individual — student they teach | Public fields | — | Full edit | Full view | Metadata only |
| Individual — student in their advisory | — | Public fields | Full edit | Full view | Metadata only |
| Individual — student elsewhere | None | None | Full edit | Full view | Metadata only |
| Section — their handled section | Public fields | View + edit limited | Full edit | Full view + approve | Metadata only |
| Section — other sections | None | None | Full edit | Full view | Metadata only |
| Grade level — their grade | Public fields | Public fields | Full edit | Full view + approve | Metadata only |
| Grade level — other grades | None | None | Full edit | Full view | Metadata only |
| School-wide | Public fields | Public fields | Full edit | Full view + approve | Metadata only |

**Public fields** = scope, type, schedule, accommodations needed, what staff should do, target outcomes, status.
**Sensitive fields** = rationale, counseling-derived context — counselor + principal only.
**Metadata only** = existence, scope, status, dates, owner — no clinical content, no feedback notes.

**Feedback rights are separate from edit rights.** Anyone with view rights can submit Observation Notes and Revision Requests. Edit rights apply only to the plan itself.

---

## 6. Notification Routing

| Event | Teacher | Adviser | Counselor | Principal |
|---|---|---|---|---|
| Student band crosses into Moderate/High | Their students | Their advisory | All caseload | Aggregate only |
| Student-level pattern match | Their students | Their advisory | All | — |
| Section-level pattern match | Their section | Their advisory | All | — |
| Grade-level pattern match | — | — | All | Their school |
| School-level pattern match | — | — | All | Their school |
| Feedback note disposition (ack/incorporate/discuss) | Contributor | Contributor | If counselor is contributor | If principal is contributor |
| Pending approval (broader-scope intervention) | — | — | — | Yes |
| Pending re-approval (significant revision) | — | — | — | Yes |
| Interim revision applied | — | — | Yes | — |
| Risk override applied | — | — | Yes | — |
| Consent revocation | — | — | If student in caseload | — |

---

## 7. Design Guidelines

### 7.1 AI Literacy First
- **Never show a result without the work.**
  - Don't say: "Student is High Risk."
  - Do say: "Student is High Risk (74%) — driven 40% by Math grade decline, 30% by 18% absence rate, 20% by Academic Decline Cluster pattern match, 10% by no prior intervention."
- Every algorithmic output is reproducible from the displayed factors.

### 7.2 Algorithm-First, AI-Second
- Risk scores, pattern matches, recommendation drafts are produced by **deterministic algorithms**.
- Gemini only renders narratives, drafts intervention text, and powers the literacy assistant.
- When Gemini is unavailable (quota, consent revoked, network), the algorithmic output still displays — only the narrative layer degrades.

### 7.3 Suggest, Don't Execute
- **`RecommendationDraft` ≠ `Intervention`.** Drafts are suggestions only; an Intervention exists only when a counselor explicitly creates one.
- Approval gates are not optional cosmetic flows; broader-scope interventions cannot activate without principal approval.

### 7.4 Human Accountability
- Every clinical decision has a named human owner with timestamp.
- Override / interim-revision / consent-revocation screens require justification text before submit.

### 7.5 Privacy in the UI
- Counseling note bodies never appear outside counselor views, including in tooltips, search results, or exports.
- Sensitive intervention fields collapse to "Sensitive — counselor/principal only" for unauthorized viewers.
- Admin's intervention list is metadata-only; rationale and feedback note bodies are masked.

### 7.6 Year-Scoped Everything
- Every analytical view has a school-year context.
- Switching years is deliberate; a banner reminds the user when viewing historical data.
- Cross-year views (cohort analysis, student profile history) are clearly labeled as such.

### 7.7 Responsiveness
- Mobile-responsive web (no native apps in scope).
- Teacher attendance and gradebook flows must work on tablet.

---

## 8. Out-of-Scope (Do Not Build)

Per spec Section 16:
- Student / parent self-service portal.
- Mobile native apps.
- Multi-school / multi-tenant architecture.
- Predictive ML modeling.
- External integrations (DepEd LIS, eSchool).
- Automated parent SMS / email notifications.
- Real-time collaborative editing on intervention planning.
- Voice / asynchronous threads on intervention notes (current model is single-thread per note).

---

## 9. Build Order (Mapped to 7-Week Roadmap)

| Week | Pages to Stand Up |
|---|---|
| 1 | Login, role-based shell, Year Switcher, Audit Log skeleton, seed users |
| 2 | Admin Import Wizard, Teacher My Classes + Attendance + Gradebook, Student Profile basics |
| 3 | Behavioral incident logging, Counseling Notes, Intervention Builder (all scopes), Feedback Queue, Revision History, Session Logging |
| 4 | Algorithmic engine surfacing — Risk Explainability Panel, Pattern Detection Inbox, Recommendation Queue |
| 5 | Caseload Dashboard, Class-Level Dashboard, School-Wide Dashboard, Cohort Analysis |
| 6 | Gemini narrative layer, "How does this work?" pages, Interactive Risk Simulator, AI Literacy Assistant |
| 7 | Consent Management, Bias Monitoring, Approval Center polish, demo data, QA |

If running behind, cut in this order: AI Literacy Assistant → Gemini-drafted recommendations (use templates instead) → SEL module → Cohort Analysis → broader-scope interventions (start with individual only) → in-app discussion on notes (keep only acknowledge/incorporate).

**Never cut:** Risk Scoring + Explainability, Audit Log, Consent, Role-based access, Individual Interventions, basic Feedback Workflow.
