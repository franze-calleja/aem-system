# Algorithmic Educational Management (AEM) System

**Project Specification Document — Revision 3**

A web-based system for student support and intervention planning that integrates AI literacy and data analytics — built for high school deployment.

---

## 1. Project Purpose & Research Alignment

The AEM system supports a research study titled *"Integrating AI Literacy and Data Analytics Using Algorithmic Educational Management (AEM) System for Student Support and Intervention Planning."* It serves three intertwined goals:

1. **Data Analytics** — turn fragmented student data (academic, attendance, behavioral, socio-emotional) into actionable insights for educators.
2. **Algorithmic Decision Support** — classify students by risk level, detect concerning patterns, and recommend interventions using transparent, defensible algorithms.
3. **AI Literacy** — every algorithmic decision is explainable in plain language, and the system itself acts as a teaching tool for educators learning to work alongside algorithmic systems.

The system is the contribution. It is not a research prototype to validate one specific model — it is a complete educational management platform whose design embodies the integration of AI literacy with data analytics in a real school context.

---

## 2. System Philosophy

Four principles drive every design decision:

**Algorithmic, not LLM-as-classifier.** All risk classifications, pattern detections, and intervention triggers use deterministic, explainable algorithms (weighted scoring, statistical rules, threshold-based logic). This makes every output reproducible, auditable, and defensible. Large language models (Gemini) are reserved for natural-language tasks where they genuinely add value — generating narrative explanations, drafting recommendations in human-readable form, and powering the AI literacy assistant.

**Algorithmic support, human decisions.** The system identifies, surfaces, suggests, and explains — but never executes interventions on its own. Every clinical decision affecting a student is owned by a qualified human (typically the counselor) with documented accountability. Risk scores prompt attention; pattern detections raise flags; recommendation engines draft suggestions; but interventions only become real when a human creates one. This is foundational ethics for a system handling minors and is essential to research integrity when working with vulnerable populations.

**Explainability as a feature, not an afterthought.** Every risk score shows its contributing factors. Every recommendation shows its trigger conditions. Every algorithmic decision can be inspected and questioned. This is what makes the system a literacy tool — users learn how algorithmic systems work by using one.

**Ethics-by-design.** Consent records, audit logging, and bias monitoring are first-class system features, not bolt-ons. The data this system handles is sensitive (minors, behavioral records, counseling notes), and the architecture treats it accordingly.

---

## 3. User Roles & Permissions

Four roles, each with a distinct purpose:

| Role | Primary Purpose | Data Scope |
|------|----------------|------------|
| **Admin** | System operations and governance | All system config, no clinical/counseling data |
| **Teacher** | Daily academic and attendance tracking | Their assigned sections only |
| **Counselor** | Student welfare and intervention | All students, full behavioral & counseling access |
| **Principal** | Oversight, validation, school-wide insight | Read-all, override and approval authority |

### Permission boundaries

- Counseling notes are visible only to the authoring counselor and other counselors. Not to teachers, not to the principal (except via formal override request, which is itself logged).
- Teachers see risk scores for their students but not the underlying counseling data that contributed.
- The Principal can override a risk classification but must provide written justification, which is recorded as research data.
- Admin can manage users and consent but cannot view counseling notes or behavioral details.

### Section adviser elevation

Within the Teacher role, a teacher designated as **section adviser** for a particular section gains additional read access to all students in their advisory section, including students they don't personally teach in any subject. This reflects the actual responsibility structure of PH high schools — the adviser is the homeroom teacher who is the first point of contact for parents and is responsible for the section's overall welfare.

---

## 4. School Year & Enrollment Model

Students persist across school years, but their context — grade level, section, learning modality, status — changes annually. The system separates persistent identity from per-year context.

**Persistent records** (one per student, ever):
- Student identity: LRN, name, sex, birth date, guardian information
- SPED status (with date-tracked changes)

**Per-school-year records** (one per student per year):
- Enrollment: grade level, section, learning modality, status (active, transferred, dropped, graduated)
- All time-bound data: grades, attendance, behavioral records, interventions, risk assessments, counseling notes, SEL assessments

This separation enables:

- **Cross-year tracking** — see how a student progressed from Grade 9 to Grade 12
- **Cohort comparisons** — compare Grade 9 of 2023–2024 with Grade 9 of 2024–2025
- **Historical imports** — import multiple past years independently
- **Year-scoped algorithms** — risk scoring runs against the active year by default, with historical re-runs available for analysis

Every analytical view in the system has an active school year context. Switching between years is a deliberate action with a clear UI indicator showing which year is currently in view.

---

## 5. Features by Role

### Admin

**Purpose:** Keep the system running and governed.

- User management (create, suspend, reset passwords for teachers, counselors, principal)
- School year and term setup (define active year, quarters, semesters)
- Section and subject management per school year
- Teacher-to-section assignments (including adviser designation per section)
- Consent record management — view consent status per student, mark consents received, process revocations
- Audit log viewer with filtering (by user, by resource, by time range)
- **Import wizard** for bulk loading of student rosters, grades, attendance, behavioral records, and historical interventions per school year
- System configuration — risk score weights (with change history), threshold values for bands, pattern detection rule toggles
- Intervention metadata audit (sees that interventions exist, by whom, when, scope, status — but not rationale, counseling context, or feedback notes)

### Teacher

**Purpose:** Capture daily classroom data, stay aware of at-risk students, coordinate on interventions.

- View assigned sections and class rosters for the active school year
- Daily attendance entry (keyboard-driven for speed: present, absent, tardy, excused)
- Grade entry per quarter, per subject, per assessment type
- Pre-test and post-test recording for measuring learning gains
- Behavioral incident logging (category, severity, description)
- View their students' risk profiles with explanations of contributing factors
- View class-level dashboard — risk distribution, attendance trends, performance trends
- Receive in-app notifications when a student in their class crosses into a higher risk band
- **View intervention plans (public fields) for students they teach** — type, schedule, accommodations needed, what they should do, target outcomes
- **Section advisers**: view intervention plans (public fields) for all students in their advisory section, even ones they don't personally teach
- **Submit Observation Notes and Revision Requests** on interventions for students they teach (or, for advisers, any student in their advisory section)
- **Log sessions they personally conducted** as part of an active intervention (date, duration, observations)
- Provide structured feedback on student progress (text + structured tags)
- View grade-level and school-wide interventions (read-only, public fields)

### Counselor

**Purpose:** Manage student welfare, plan and execute interventions at all scopes, monitor outcomes.

- Caseload dashboard — all moderate and high-risk students, sortable by risk score, recent change, or intervention status
- Full student profile view (academic + attendance + behavioral + SEL + intervention history) across all years
- Counseling note CRUD (private to counselors)
- Social-Emotional Learning (SEL) assessment recording — periodic structured assessments
- **Intervention lifecycle management at all scopes** (individual, section, grade level, school-wide):
  - Plan: scope, type, frequency, duration, expected outcome, rationale (sensitive)
  - Activate: mark intervention as ongoing
  - Track: log sessions, observations, individual participation
  - Close: record outcome with notes
- **Intervention feedback queue** — review observation notes and revision requests submitted by teachers and advisers; acknowledge, incorporate into a revision, or open in-app discussion
- **Revision authority** — edit any active plan, with each edit creating a versioned `InterventionRevision` record. Significant revisions to broader-scope plans re-trigger principal approval.
- Generate intervention recommendation drafts (Gemini-assisted) and edit before saving as actual interventions
- View pattern detection alerts at all scopes (student, section, grade, school)
- Cross-reference: see if multiple students share the same risk pattern (early signal of class-wide issues)
- Full visibility into all intervention rationale, context, and revision history

### Principal

**Purpose:** Oversight, validation, school-wide decision-making, and approval authority.

- School-wide dashboard — risk distribution by grade level, section, sex, learning modality
- Drill-down from school → grade level → section → individual student
- Bias monitoring dashboard — risk band distribution across demographic dimensions, with disparity flags
- Override authority on risk classifications (with mandatory written justification)
- **Approval authority on broader-scope interventions** — section, grade-level, and school-wide interventions require principal approval before activation
- **Re-approval authority on significant revisions** to previously-approved broader-scope interventions
- **Interim revision authority** — when the counselor is unavailable and an active intervention needs urgent revision, the principal can authorize an interim revision with documented justification, surfaced for counselor review on return
- Submit Observation Notes on any intervention (read-everywhere status grants observation rights everywhere)
- Review aggregate intervention outcomes — what's working, what isn't, by scope
- Read-only access to audit log and revision history
- Read-only access to all student data (excluding individual counseling note bodies)
- Full visibility into intervention rationale (including sensitive context) for governance purposes

---

## 6. Core Modules

### 6.1 Student Profile Module

Maintains persistent identity (LRN, name, sex, birth date, guardian) and per-year enrollment context (grade level, section, learning modality, SPED status, enrollment status). All other modules attach to a Student via their active enrollment for the relevant school year.

### 6.2 Academic Tracking Module

Records grades by subject, quarter, and assessment type, scoped to school year. Distinguishes between regular grades, quizzes, periodical exams, pre-tests, and post-tests. Computes derived metrics: subject averages, overall GWA, grade trend (slope across quarters within a year), pre/post-test gain.

### 6.3 Attendance Module

Records daily attendance with status (present, absent, tardy, excused), scoped to school year. Computes absence rate, tardiness rate, and 30-day rolling trends. Detects consecutive absence patterns.

### 6.4 Behavioral & SEL Module

Captures behavioral incidents (category, severity, description, date) and Social-Emotional Learning assessments. Behavioral records are visible to teachers (limited fields) and counselors (full). SEL is counselor-managed.

### 6.5 Counseling Module

Counseling notes with strict access control — only counselors can read. Notes contribute to risk scoring only at the metadata level (count and recency), never the body content.

### 6.6 Intervention Module (Multi-Scope)

The intervention module supports four scopes, each with its own targeting model:

- **Individual** — one student
- **Section** — one section in one school year (e.g., 9-Newton, SY 2024–2025)
- **Grade Level** — entire grade level in one school year
- **School-Wide** — all enrolled students in one school year

Common intervention fields across scopes: type (remedial, tutoring, counseling, peer support, parent conference, external referral, SEL program, attendance campaign, study skills workshop), frequency, start date, end date, description, target outcome, status, school year, scope-specific target IDs.

#### From recommendation to intervention

The system *suggests*, humans *decide*. After data is input, the system automatically:

1. Recomputes risk scores
2. Runs pattern detection
3. Generates recommendation drafts that surface in the counselor's queue

A `RecommendationDraft` is a *suggestion* — it is not an `Intervention`. An intervention only exists once a counselor explicitly creates one (possibly from a recommendation, possibly de novo, possibly modified). This separation is foundational and reflects the "algorithmic support, human decisions" principle.

#### Plan structure

Plans have two layers:

- **Public fields** (visible to all involved staff per the visibility matrix): scope, type, schedule, accommodations needed, what staff should do, target outcomes, status
- **Sensitive fields** (counselor + principal only): rationale, counseling-derived context, specific behavioral concerns motivating the plan

#### Participation tracking

Even when an intervention is section-wide or broader, individual student outcomes are tracked separately via an `InterventionParticipation` record. This allows the system to ask: did *this specific student* improve as a result of the section-wide intervention? Without participation records, broad-scope interventions would have no measurable impact at the individual level.

#### Approval workflow

- Individual interventions: counselor plans → activates directly
- Section interventions: counselor plans → principal approves → activates
- Grade-level and school-wide: counselor plans → principal approves → activates

#### Revision & Feedback Workflow

Once an intervention is active, situations change. A student responds poorly. A schedule conflict emerges. New behavioral information surfaces in class. The plan needs to flex. The system handles this via a **single-owner, multi-contributor** model: the counselor owns and edits the plan; everyone involved can submit observations and revision requests through a structured feedback channel.

**Three feedback types** are captured as `InterventionNote` records:

- **OBSERVATION** — descriptive note about how the intervention is going from the staff member's vantage point ("Student attended Tuesday's session, engaged well; struggled Thursday")
- **REVISION_REQUEST** — explicit ask for plan change ("Tuesday/Thursday schedule conflicts with the student's other commitment; suggest moving to MWF")
- **OUTCOME_OBSERVATION** — feedback as the intervention concludes, contributing to the final outcome record

Notes are routed to the counselor's review queue. The counselor can:
- **Acknowledge** the note (no plan change, but logged)
- **Incorporate** the note into a revision (creates an `InterventionRevision` linked to the triggering note)
- **Discuss** with the contributor (in-app messaging on the note)

#### Plan ownership & edit rights

| Action | Counselor | Principal | Teacher (teaches student) | Section Adviser | Admin |
|--------|-----------|-----------|---------------------------|-----------------|-------|
| Edit plan core fields (type, schedule, accommodations) | Yes | Request changes | Submit feedback only | Submit feedback only | None |
| Edit sensitive fields (rationale, context) | Yes | Read | None | None | None |
| Change status (plan → active → closed) | Yes (with approval gate for broader scope) | Approve transitions | None | None | None |
| Log a session they personally ran | — | — | Yes (own sessions) | Yes (own sessions) | None |
| Submit observation note | Yes | Yes | Yes | Yes | None |
| Submit revision request | Yes | Yes | Yes | Yes | None |
| Record outcome | Yes (final) | Validate | Submit outcome observations | Submit outcome observations | None |
| Cancel/discontinue | Yes (with approval for broader scope) | Yes | Request only | Request only | None |

#### Revision history

Every plan edit creates an `InterventionRevision` record capturing what changed, who changed it, why, and whether the revision was triggered by a specific feedback note. This provides:
- Full audit trail (research artifact)
- Accountability for plan evolution
- Pattern visibility — are certain teachers' observations consistently leading to revisions? That's signal worth examining for teacher development.

#### Re-approval for significant revisions

For section, grade-level, and school-wide interventions that have already been approved by the principal:

- **Minor revisions** (schedule tweaks, accommodation adjustments, descriptive clarifications) → counselor revises directly
- **Significant revisions** (scope change, type change, duration change beyond a threshold, target population change) → re-trigger principal approval before the revision takes effect

The system flags revisions as minor or significant based on which fields changed, prompting the counselor when re-approval is needed.

#### Session logging

Distinct from plan editing: any staff member who personally conducts a session as part of an active intervention can log it. This creates an `InterventionSession` record with date, duration, attending students (for group interventions), and observation notes. Session logs are visible to the counselor and contribute to participation tracking. They are not plan edits and do not require counselor review.

#### Counselor unavailability edge case

If an active intervention needs urgent revision and the counselor is unavailable (extended leave, illness, end of school year transition), the principal can authorize an interim revision. The interim revision is flagged as such, recorded with the principal's justification, and surfaces in the counselor's queue for review on return. This prevents a stuck intervention while preserving accountability.

#### Outcome feedback into risk scoring

Outcomes feed back into the next risk recomputation — successful interventions reduce risk; unsuccessful ones may elevate it. This closes the loop: the system observes whether its suggested interventions actually help, and that observation adjusts future risk classifications.

### 6.7 Algorithmic Engine

Three sub-engines:

**Risk Scoring Engine** — computes a 0–100 risk score per student per period, with band classification.

**Multi-scope Pattern Detector** — runs configured rules at four levels:
- *Student-level* — per-student concerning combinations
- *Section-level* — concentrations within a single section
- *Grade-level* — patterns across an entire grade
- *School-level* — institution-wide signals

**Recommendation Engine** — maps risk profile signature to suggested intervention types. Operates at all scopes — can recommend section-level interventions when section-level patterns surface. Outputs are `RecommendationDraft` records, not `Intervention` records — only counselors create interventions.

All engines are pure functions over the data, callable on demand or on a schedule. Results are cached as `RiskAssessment`, `PatternMatch`, and `RecommendationDraft` records for historical tracking.

### 6.8 AI Layer (Gemini)

Used for natural-language tasks only:
- Generates plain-language narrative explanations of risk classifications
- Drafts intervention recommendations across scopes (counselor reviews and edits)
- Generates section, grade, and school-level narrative summaries for the principal
- Powers the AI literacy assistant

Server-side only. Aggressively cached. Falls back gracefully when quota is exhausted.

### 6.9 AI Literacy Module

Features explicitly designed to teach users how algorithmic systems work:
- Explainability panel on every risk score showing each factor's contribution
- "How does this work?" page explaining the algorithm in plain language
- Interactive risk simulator — adjust hypothetical student data and see how the score changes
- Decision audit trail — for any flagged student, show the chain of data points and rules
- Tooltips on every algorithmic output

### 6.10 Governance Module

**Consent management** — per-student consent records, scoped (data processing, AI-assisted analysis, intervention planning), with revocation handling. Revocation disables AI features for that student but does not delete data.

**Audit logging** — every read/write of sensitive resources logged automatically. Append-only.

**Bias monitoring** — periodic computation of risk band distribution across sex, learning modality, SPED status. Flags disparities exceeding configured thresholds.

### 6.11 Import Module

A dedicated import pipeline handles initial seeding and ongoing bulk data ingestion per school year. The wizard is admin-only and structured as a sequence:

1. **Select target school year** — all subsequent imports are bound to this year
2. **Student roster CSV** — creates persistent Student records if new (matched by LRN), creates StudentEnrollment records for the target year. Required columns: LRN, first name, last name, sex, birth date, grade level, section, learning modality, SPED status
3. **Grade data CSV** — by quarter, by subject. Required columns: LRN, subject code, quarter, score, max score
4. **Attendance CSV** — by date. Required columns: LRN, date, status. Can be uploaded in monthly chunks
5. **Behavioral records CSV** (optional) — Required columns: LRN, date, category, severity, description
6. **Historical interventions CSV** (optional) — Required columns: LRN, type, scope, start date, end date, outcome

Each import:
- Validates LRNs against enrolled students for the target year
- Shows a preview of the first 20 rows before commit
- Reports errors with row numbers and reasons
- Runs as a transaction — full success or full rollback per batch
- Logs the import event with file metadata, row count, and importer ID

This is the primary path for testing the system. Test data — whether real anonymized exports or synthetic seed data — flows through the same pipeline. The system handles them identically.

---

## 7. Risk Scoring Logic

The risk score is a weighted sum of five dimensions:

| Dimension | Weight | Inputs |
|-----------|--------|--------|
| Academic Performance | 30% | Current GWA vs threshold, grade trend slope, failing subject count, pre/post-test gain |
| Attendance | 25% | Absence rate, tardiness rate, 30-day trend, consecutive absence flag |
| Behavioral & SEL | 20% | Behavioral incident count (severity-weighted), SEL composite score |
| Intervention History | 15% | Active interventions, past outcome distribution, recurrence count |
| Profile Factors | 10% | SPED status, learning modality stability, age vs grade level |

Each dimension produces a 0–100 sub-score using documented formulas. Final score is the weighted sum. Bands: Low (0–39), Moderate (40–69), High (70–100). Thresholds and weights are admin-configurable; changes are versioned.

Output structure includes the score, band, and factor breakdown — this powers the explainability panel.

**Recomputation trigger** — recomputed when any input changes for a student, with a 24-hour cache to avoid thrashing. Scheduled weekly recompute catches staleness.

---

## 8. Multi-Scope Pattern Detection

The pattern detector evaluates rules at four scopes.

**Student-level patterns:**
- *Academic Decline Cluster* — three consecutive quarters of declining grades + absence rate above 15%
- *Disengagement Signal* — rising tardiness trend + recent behavioral incident + missing assessments
- *Crisis Warning* — sudden behavioral incident + counseling flag + grade drop in same period
- *Recovery Tracking* — post-intervention grade improvement + attendance recovery
- *Chronic Concern* — multiple closed interventions with "no change" or "declined" outcomes

**Section-level patterns:**
- *Concentrated Risk* — over 30% of section in moderate or high risk band
- *Subject Struggle* — section average failing in a specific subject
- *Attendance Erosion* — section absence rate exceeding school average by significant margin

**Grade-level patterns:**
- *Transition Difficulty* — entry-grade students showing higher risk concentration than other grades
- *Cohort Trend* — same grade level showing systematically different outcomes from prior year's cohort

**School-level patterns:**
- *Day-of-Week Effect* — significantly elevated absence rates on specific days
- *Year-Over-Year Drift* — overall risk distribution shifting compared to prior years

Each match generates a `PatternMatch` record routed to the appropriate role: student-level to teacher and counselor, section-level to adviser and counselor, grade-level and school-level to principal and counselor. All patterns are configurable — admins can enable, disable, or tune thresholds.

---

## 9. Intervention Visibility Matrix

| Scope | Teacher | Section Adviser | Counselor | Principal | Admin |
|-------|---------|-----------------|-----------|-----------|-------|
| Individual — student they teach | View public fields | — | Full edit | Full view | Metadata only |
| Individual — student in their advisory | — | View public fields | Full edit | Full view | Metadata only |
| Individual — student elsewhere | None | None | Full edit | Full view | Metadata only |
| Section — their handled section | View public fields | View + edit | Full edit | Full view + approve | Metadata only |
| Section — other sections | None | None | Full edit | Full view | Metadata only |
| Grade level — their grade | View public fields | View public fields | Full edit | Full view + approve | Metadata only |
| Grade level — other grades | None | None | Full edit | Full view | Metadata only |
| School-wide | View public fields | View public fields | Full edit | Full view + approve | Metadata only |

**Key rules:**
- "Public fields" = scope, type, schedule, accommodations needed, what staff should do, target outcomes, status
- "Sensitive fields" (rationale, counseling-derived context) = visible only to counselor and principal
- "Metadata only" for admin = existence, scope, status, dates, owner — no clinical content, no feedback notes
- "Approve" authority = principal must approve before broader-scope interventions can activate, and re-approve significant revisions
- Default time scope: current school year. Historical years require explicit grant.

**Feedback rights are separate from edit rights.** All staff with view rights on a plan can additionally submit observation notes and revision requests on that plan. Edit rights apply only to the plan itself; feedback rights are universal among involved staff. See Section 6.6 "Plan ownership & edit rights" for the full action matrix.

---

## 10. Recommendation Logic

Algorithmic mapping from risk profile to recommended intervention type and scope:

**Individual recommendations:**
- High individual risk driven primarily by academic factors → remedial classes or tutoring
- High individual risk driven primarily by attendance → home visit, parent conference, attendance contract
- High individual risk driven primarily by behavioral → counseling sessions, behavior plan
- High individual risk driven by SEL signals → group SEL program or individual counseling
- Mixed-driver high risk → comprehensive multi-modal plan

**Section recommendations:**
- Concentrated section risk → consider section-wide remedial program in the affected dimension
- Subject struggle pattern → recommend subject-specific intervention (curriculum review, teacher coaching, after-school review)

**Grade-level recommendations:**
- Transition difficulty pattern → orientation enhancement, study skills workshop, peer mentorship
- Cohort decline trend → grade-level academic intervention

**School-wide recommendations:**
- Day-of-week absenteeism → attendance campaign, parent communication
- Year-over-year drift → systemic review

The algorithm produces the recommendation type, scope, and rationale as a `RecommendationDraft`. Gemini renders it as a natural-language draft. The counselor reviews, edits, and decides whether to instantiate it as an actual `Intervention`. Drafts that are not instantiated remain in the system as evidence of consideration but never affect students.

---

## 11. Key User Flows

### Flow A — Teacher's daily routine

Teacher logs in → "My Classes" view → opens a section → takes attendance → enters new grades → reviews "At-Risk Students" panel → reads pattern alerts → optionally logs a behavioral observation. End-to-end: 5–10 minutes.

### Flow B — Counselor responding to a high-risk classification

Counselor sees new "High Risk" entry on caseload → opens student profile → reviews contributing factors → reviews counseling notes → clicks "Generate Recommendation" → Gemini drafts based on risk profile → counselor edits → clicks "Create Intervention from Draft" → saves as new individual Intervention with status "Planned" → schedules first session → assigns responsible staff.

### Flow C — Counselor proposing a section-wide intervention

Section-level pattern alert appears for Section 9-Newton (concentrated risk in math) → counselor reviews underlying data → drafts a section-wide remedial intervention → submits for principal approval → principal reviews rationale and student-by-student impact → approves → intervention activates → all involved teachers see the public fields and adjust their teaching → adviser monitors participation.

### Flow D — Principal reviewing bias monitoring

Principal opens Bias Monitoring panel → sees High Risk rate of 23% for SPED students vs 8% for non-SPED → drills in → reviews underlying SPED student profiles → determines whether disparity reflects genuine differential need or calibration issue → if calibration issue, opens algorithm config and adjusts SPED weight → change logged with justification.

### Flow E — Risk override

Principal reviews a student's High Risk classification, disagrees based on context → clicks "Override" → provides written justification → submits → override recorded with timestamp, principal ID, original score, override band, reasoning → student's displayed risk shows override with visible indicator and link to original assessment.

### Flow F — Consent revocation

Parent contacts admin to revoke AI-assisted analysis consent → admin opens student's consent records → marks "AI Analysis" scope as revoked → system disables Gemini features for this student → algorithmic risk scores still display, no AI narrative generated → revocation logged.

### Flow G — Bulk historical data import

Admin opens Import wizard → selects target school year (e.g., SY 2023–2024) → uploads student roster CSV → preview shows 240 students, 8 errors flagged for missing LRNs → admin corrects in source file, re-uploads → imports successfully → uploads grades CSV for the same year → uploads attendance CSV in monthly chunks → reviews import log. Admin can repeat for additional historical years.

### Flow H — Cross-year cohort comparison

Principal navigates to "Cohort Analysis" → selects "Grade 9, last 3 school years" → system displays risk band distributions, intervention counts, and outcome rates side-by-side across years → flags any year-over-year drift → principal exports summary for faculty meeting.

### Flow I — Teacher feedback triggers a plan revision

Math teacher observes that a Grade 9 student in a remedial intervention is consistently absent on Tuesday sessions due to a schedule conflict → teacher opens the student's intervention plan → submits a Revision Request: "Tuesday sessions conflict with student's other commitment, attendance has been 0/3; suggest moving to MWF" → counselor sees the request in their feedback queue → reviews context → revises the plan: schedule changed from T/Th to M/W/F → revision logged with reference to the teacher's request → teacher receives notification → adviser sees the updated plan reflected in their dashboard. Total elapsed time: hours, not days.

### Flow J — Teacher logs a session they ran

Math teacher conducts the Wednesday remedial session → opens the active intervention → clicks "Log Session" → enters date, duration (45 minutes), attending students (selects 4 of 6 enrolled), brief observations ("Reviewed quadratic formula. Two students still struggling with factoring.") → submits → session record visible to counselor → contributes to participation tracking. No counselor review needed; this is execution recording, not plan editing.

### Flow K — Interim revision when counselor is unavailable

Counselor is on extended medical leave → an active section-wide intervention needs urgent rescheduling due to a school calendar change → principal opens the affected intervention → uses "Interim Revision" action → enters new schedule and justification ("Counselor on medical leave; school calendar changed for typhoon make-up days; rescheduling sessions to maintain continuity") → submits → revision activates immediately, flagged as interim → counselor sees flagged revision in queue when returning, can confirm or further adjust.

---

## 12. Data Input Mapping

| Research Input | System Module(s) |
|----------------|------------------|
| 1. Student Academic Data | Academic Tracking — `Grade`, `Assessment` |
| 2. Attendance | Attendance Module — `Attendance` records, computed metrics |
| 3. Student Profile | Student Profile + Enrollment — `Student` (persistent), `StudentEnrollment` (per year) |
| 4. Behavioral & SEL Data | Behavioral & SEL Module — `BehavioralRecord`, `SELAssessment`, `CounselingNote` |
| 5. Intervention & Support Data | Intervention Module (multi-scope) — `Intervention`, `InterventionParticipation`, `InterventionNote`, `InterventionRevision`, `InterventionSession` |
| 6. Teacher & Instructional Data | Embedded in teacher feedback fields, intervention notes, session logs, and plan content |
| 7. AI-Generated Data | Algorithmic Engine + AI Layer — `RiskAssessment`, `PatternMatch`, `RecommendationDraft` |
| 8. Ethical & Data Governance Data | Governance Module — `ConsentRecord`, `AuditLog`, `BiasMetric` |

---

## 13. AI Literacy as a Research Contribution

This deserves its own section because it is the half of your title easiest to underdeliver on.

The system teaches AI literacy in three layered ways:

**Passive literacy** — every algorithmic output is explainable. Users see *why*, not just *what*. Over time, this builds intuition about how data combines into decisions.

**Active literacy** — the interactive risk simulator and "How does this work?" pages let users experiment. A teacher can ask "what would happen if this student improved attendance?" and see the score shift. This is hands-on algorithmic thinking.

**Reflective literacy** — the Principal's bias monitoring dashboard makes algorithmic fairness visible. The override mechanism makes human judgment explicit and recorded. The "system suggests, humans decide" separation between recommendation drafts and actual interventions models healthy skepticism toward algorithmic outputs. These features model the practice of critically evaluating algorithmic systems rather than accepting them blindly.

For your research methodology, you can cite specific features as the operationalization of "AI literacy integration." You're not just building a tool that uses AI — you're building one that teaches users to think critically about it.

---

## 14. Governance & Ethics Implementation

**Consent.** Every student must have an active consent record before any data analysis runs. Scoped (data processing, AI analysis, intervention planning). Revocation handled with feature degradation, not data loss.

**Audit.** Every read of counseling notes, every write to risk classifications, every override, every consent change, every import, every plan revision, every interim revision — logged. Append-only.

**Access control.** Enforced at the database query level via Prisma extensions, not just hidden in UI. A teacher cannot fetch counseling notes by hand-crafting an API request.

**Bias monitoring.** Distribution of risk bands across sex, learning modality, and SPED status. Significant disparities surface to the principal.

**Data minimization.** The system collects what's needed for the eight input categories; no creep.

**Human accountability.** Every clinical decision (creating an intervention, revising a plan, recording an outcome, overriding a classification) has a named human owner with timestamped accountability. No decision affecting a student is anonymous or algorithmic.

---

## 15. Development Roadmap (7 Weeks)

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Foundations — schema (with year/enrollment split), auth, RBAC, audit middleware, seed data | Login flow works for all four roles |
| 2 | Student profiles, enrollment, academic tracking, attendance + Import Wizard for these | Teachers can record daily data; admin can bulk-import |
| 3 | Behavioral, counseling, SEL, multi-scope intervention module with revision/feedback workflow | Counselors can manage caseloads; teachers can submit feedback and log sessions |
| 4 | Algorithmic engine — risk scoring, multi-scope pattern detection, recommendation logic | Students get classified; patterns surface; recommendation drafts queue up |
| 5 | Dashboards — teacher, counselor, principal (with year switcher and cross-year views) | Insights are visible |
| 6 | Gemini integration + AI literacy features | Natural-language layer + literacy panels |
| 7 | Governance polish (consent UI, bias monitoring), QA, demo data | Production-ready demo |

If running behind, cut order: AI literacy chatbot → recommendation Gemini drafts (use templates) → SEL module → cross-year cohort views → broader-scope interventions (start with individual only) → in-app discussion on notes (just acknowledge/incorporate). Never cut: risk scoring, audit log, consent, role-based access, individual interventions, basic feedback workflow.

---

## 16. Out of Scope (Future Work)

- Student/parent self-service portal
- Mobile native apps (web is mobile-responsive instead)
- Multi-school / multi-tenant architecture
- Predictive modeling using trained ML
- External system integration (DepEd LIS, eSchool)
- Automated parent notifications (SMS/email)
- Real-time collaboration on intervention planning
- AI literacy assessment of educator literacy gains
- Voice-based or asynchronous discussion threads on intervention notes (current model is single-thread per note)

---

## 17. Summary

The AEM system is a complete student support platform that operationalizes AI literacy and data analytics integration through deliberate design choices: algorithmic decisions over LLM classifications, the system as suggester rather than executor, explainability as a first-class feature, governance as a built-in module, multi-scope interventions reflecting actual school practice, a single-owner-multi-contributor revision workflow that respects clinical responsibility while honoring teacher observations, and a per-school-year data model that supports historical analysis and cohort comparison. AI assistance is limited to where it genuinely adds value. The four user roles map cleanly to actual high school staff structures, intervention visibility respects both operational coordination and clinical privacy, and every feature traces back to one or more of the eight input categories that define the research scope.

The system itself is the contribution. Its design embodies the integration the research argues for.
