# AEM Reference Scenario — "Maria Santos"

A single end-to-end scenario you can use as a **build verification checklist**. Every numbered step maps to one or more pages in [AEM_FLOW.md](AEM_FLOW.md) and one or more sections in the [AEM System Specification](AEM_System_Specification.md). If a step is not buildable in your current UI, that's a gap.

The scenario walks one student (Maria Santos) from school-year setup through risk surfacing, intervention, feedback loop, outcome, and oversight — touching every role and every major module.

---

## Cast

| Person | Role | Notes |
|---|---|---|
| **Ms. Cruz** | Admin | School registrar; runs imports and governance |
| **Mr. Reyes** | Teacher | Math teacher for 9-Newton |
| **Mrs. Lim** | Teacher + Section Adviser of 9-Newton | English teacher; adviser elevation |
| **Ms. Santos** | Counselor | School counselor; owns interventions |
| **Mr. Dela Cruz** | Principal | Oversight, approvals, overrides |
| **Maria Santos** | Grade 9 student (9-Newton, SY 2025–2026) | Subject of the scenario |

---

## Scene 0 — System Setup *(SY 2025–2026 begins)*

**Goal:** Establish year, users, sections, consent, and seed data.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 0.1 | Ms. Cruz | Activates SY 2025–2026; defines quarters | Admin → School Year & Term Setup | §4, §5 Admin |
| 0.2 | Ms. Cruz | Creates teacher/counselor/principal accounts; assigns Mrs. Lim as adviser of 9-Newton | Admin → User Management | §3, §5 Admin |
| 0.3 | Ms. Cruz | Imports student roster CSV (240 students); 8 LRN errors flagged → corrects → re-imports | Admin → Import Wizard (Roster step) | §6.11, Flow G |
| 0.4 | Ms. Cruz | Imports Q1 grades and Aug attendance | Import Wizard (Grades, Attendance steps) | §6.11 |
| 0.5 | Ms. Cruz | Records consent for Maria: Data Processing ✓, AI Analysis ✓, Intervention Planning ✓ | Admin → Consent Management | §6.10, §14 |
| 0.6 | Ms. Cruz | Confirms algorithm weights at defaults (30/25/20/15/10) | Admin → Algorithm Configuration | §7 |

**Verification checks:**
- [ ] Year Switcher shows "SY 2025–2026" everywhere.
- [ ] Import errors show row numbers + reasons.
- [ ] Maria's profile shows three consent badges = active.
- [ ] Audit Log has entries for each import and consent action.

---

## Scene 1 — Daily Data Capture *(Weeks 1–6 of Q2)*

**Goal:** Routine teacher data entry that will trigger risk recomputation.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 1.1 | Mr. Reyes | Takes attendance daily for 9-Newton Math; Maria has 4 absences in 2 weeks | Teacher → Class View → Attendance Sheet | §5 Teacher, §6.3, Flow A |
| 1.2 | Mr. Reyes | Enters Q2 Math grades; Maria drops from 85 → 72 | Teacher → Gradebook | §6.2 |
| 1.3 | Mrs. Lim | Sees adviser badge on 9-Newton; reviews all students in her advisory section | Teacher → My Classes (adviser view) | §3 adviser elevation |
| 1.4 | Mr. Reyes | Logs a behavioral observation (minor: missed homework streak) | Teacher → Student View → Behavioral Incident Logger | §6.4 |

**Verification checks:**
- [ ] Attendance sheet supports keyboard P/A/T/E entry.
- [ ] Mrs. Lim can see Maria even though she doesn't teach Maria's Math.
- [ ] Mr. Reyes cannot see counseling notes anywhere.

---

## Scene 2 — Algorithmic Surfacing *(triggered automatically by Scene 1 inputs)*

**Goal:** Risk score updates; pattern detection fires; recommendation draft queued.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 2.1 | System | Recomputes Maria's risk → **74 / High** | (background) | §7 |
| 2.2 | System | Factor breakdown stored: Academic 68, Attendance 71, Behavioral 22, Intervention History 0, Profile 10 | Persisted in `RiskAssessment` | §7 |
| 2.3 | System | Pattern Detector fires **"Academic Decline Cluster"** at student scope | `PatternMatch` record | §8 |
| 2.4 | System | Recommendation Engine emits draft: Individual Remedial + Parent Conference | `RecommendationDraft` | §10 |
| 2.5 | System | Notifications routed: Mr. Reyes + Mrs. Lim (student-level pattern); Ms. Santos (caseload + pattern + draft) | Notifications bell | §8 routing |

**Verification checks:**
- [ ] Maria's risk badge changes from Low/Moderate to **High** in Mr. Reyes's risk panel.
- [ ] Mr. Reyes can click the ⓘ icon and see the factor breakdown — but not the counseling-related ones (none here yet).
- [ ] Ms. Santos's Notifications bell shows the new pattern match.

---

## Scene 3 — Counselor: Data → Decision

**Goal:** Counselor reviews, drafts, and activates an individual intervention.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 3.1 | Ms. Santos | Opens Caseload Dashboard → Maria's new High entry | Counselor → Caseload Dashboard | §5 Counselor |
| 3.2 | Ms. Santos | Opens Full Student Profile → Overview → Explainability Panel | Counselor → Full Student Profile | §6.9 |
| 3.3 | Ms. Santos | Reviews Academic Trends (Math line chart), Attendance heatmap (sees Tuesday absences), Behavioral timeline | Profile tabs | §6.2–6.4 |
| 3.4 | Ms. Santos | Writes a private Counseling Note: "Mother mentioned grandfather's recent illness affecting Maria's focus" | Counseling Notes tab | §6.5 |
| 3.5 | Ms. Santos | Opens Recommendation Queue → clicks **Open in Builder** on the Remedial draft | Counselor → Recommendation Queue | §6.6, §10 |
| 3.6 | Ms. Santos | Edits public fields (schedule T/Th 3:30–4:30 PM); writes sensitive rationale referencing family context | Intervention Builder | §6.6 plan structure |
| 3.7 | Ms. Santos | Scope = Individual → **Save as Planned → Activate** (no approval needed) | Builder save action | §6.6 approval workflow |

**Verification checks:**
- [ ] Counseling Note is invisible to Mr. Reyes, Mrs. Lim, Mr. Dela Cruz.
- [ ] Explainability Panel shows weighted contributions in plain language.
- [ ] Gemini-rendered draft text is editable before save.
- [ ] Intervention status = **Active** immediately for individual scope.
- [ ] Audit Log captures: open profile, read counseling notes, create intervention.

---

## Scene 4 — Visibility & Teacher Execution

**Goal:** Teachers see public fields only; teacher logs a session.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 4.1 | Mr. Reyes | Opens Maria's intervention → sees **public fields only** (schedule, type, accommodations, target outcomes). Rationale hidden. | Teacher → Intervention View | §9 visibility matrix |
| 4.2 | Mrs. Lim | As adviser, sees the same public fields even though she doesn't teach Math | Teacher → Intervention View (adviser) | §9 |
| 4.3 | Mr. Dela Cruz | Sees full plan including sensitive rationale | Principal read-all | §9 |
| 4.4 | Ms. Cruz (Admin) | Sees the intervention metadata only (exists, scope=Individual, status=Active, owner=Santos) — no rationale, no notes | Admin → Intervention Metadata Audit | §5 Admin, §9 |
| 4.5 | Mr. Reyes | Runs first Tuesday session → clicks **Log Session** → records 45 min, 1 attendee, observations | Teacher → Intervention View → Log Session | §6.6 sessions, Flow J |

**Verification checks:**
- [ ] Sensitive field collapse: Mr. Reyes/Mrs. Lim see "Sensitive — counselor/principal only".
- [ ] Ms. Cruz cannot read any clinical content.
- [ ] `InterventionSession` record created; visible to Ms. Santos.
- [ ] No counselor review required for session logging.

---

## Scene 5 — The Feedback Loop

**Goal:** Teacher submits a Revision Request; counselor incorporates it.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 5.1 | Mr. Reyes | Maria misses two Tuesday sessions; submits **Revision Request**: "Tuesday conflicts with her CAT drill; suggest M/W/F" | Teacher → Intervention View → Submit Revision Request | §6.6, Flow I |
| 5.2 | Ms. Santos | Sees note in **Feedback Queue** (Revision Requests tab) | Counselor → Feedback Queue | §6.6 |
| 5.3 | Ms. Santos | Clicks **Incorporate** → Builder opens in revision mode → changes schedule to M/W/F → saves | Builder revision mode | §6.6 |
| 5.4 | System | Creates `InterventionRevision` linked to Mr. Reyes's note; revision flagged as **minor** (schedule tweak), no re-approval needed | Persisted | §6.6 minor vs significant |
| 5.5 | Mr. Reyes | Receives notification: "Your revision request was incorporated" | Notifications bell | §6.6 routing |
| 5.6 | Mrs. Lim | Adviser dashboard reflects updated schedule | Teacher → Intervention View (adviser) | §9 |

**Verification checks:**
- [ ] `InterventionRevision` shows the diff (T/Th → M/W/F), who, when, and linked note.
- [ ] Mr. Reyes gets a disposition notification.
- [ ] Total elapsed time from request → activation: hours, not days.

---

## Scene 6 — Section-Wide Pattern & Principal Approval

**Goal:** Broader-scope intervention with approval gate.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 6.1 | System | Section-level pattern fires: **Concentrated Risk** in 9-Newton Math (35% of section in Moderate/High) | `PatternMatch` (section scope) | §8 |
| 6.2 | Ms. Santos | Pattern Detection Inbox → opens section-level alert | Counselor → Pattern Detection Inbox | §6.7 |
| 6.3 | Ms. Santos | Builder → Scope = **Section** → 9-Newton → drafts section-wide remedial program (M/W after-school review) | Intervention Builder | §6.6 |
| 6.4 | Ms. Santos | Save → **Submit for Principal Approval** | Builder save | §6.6 approval workflow |
| 6.5 | Mr. Dela Cruz | **Approval Center** → reviews rationale + section impact preview → **Approves** | Principal → Approval Center | §5 Principal, Flow C |
| 6.6 | System | Intervention activates; all 9-Newton subject teachers see public fields; Mrs. Lim (adviser) gets full public view; participation records auto-created per student | `InterventionParticipation` per student | §6.6 participation |

**Verification checks:**
- [ ] Cannot activate section-wide plan without principal approval.
- [ ] Each student in 9-Newton has an `InterventionParticipation` record linked to this plan.
- [ ] Maria appears in **both** her individual remedial AND the section-wide program.

---

## Scene 7 — Significant Revision Triggers Re-Approval

**Goal:** Spec-mandated re-approval for significant changes.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 7.1 | Ms. Santos | Decides to extend the section-wide remedial from 4 weeks to 10 weeks (duration change beyond threshold) | Builder → Revision | §6.6 significant revision |
| 7.2 | System | Flags revision as **significant** → routes back to Principal **Approval Center** | Re-approval queue | §6.6 |
| 7.3 | Mr. Dela Cruz | Reviews → **Approves** the revision | Approval Center | §5 Principal |
| 7.4 | System | Revision applies; `InterventionRevision` records re-approval status | Persisted | §6.6 |

**Verification checks:**
- [ ] Minor revisions (schedule tweak in Scene 5) bypass re-approval.
- [ ] Significant revisions (duration / scope / type / target population) hold pending until principal approves.

---

## Scene 8 — Interim Revision When Counselor Is Unavailable

**Goal:** Spec Flow K — principal can act in counselor's absence.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 8.1 | Ms. Santos | Goes on extended medical leave | (offline) | — |
| 8.2 | School calendar | Typhoon make-up days shift schedules | (external) | — |
| 8.3 | Mr. Dela Cruz | Opens section-wide intervention → **Interim Revision** → reschedules sessions + enters justification | Principal → Interim Revision Interface | §5 Principal, §6.6, Flow K |
| 8.4 | System | Revision activates immediately, flagged as **interim** | `InterventionRevision` (interim flag) | §6.6 |
| 8.5 | Ms. Santos | Returns → sees interim revision flagged in Feedback Queue / Revision History; confirms or further adjusts | Counselor → Revision History | §6.6 |

**Verification checks:**
- [ ] Interim revisions require justification text.
- [ ] Interim flag visible to counselor on return.
- [ ] No stuck intervention while counselor offline.

---

## Scene 9 — Outcome Closes the Loop

**Goal:** Outcome feeds back into risk scoring.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 9.1 | Mrs. Lim | As intervention nears close, submits **Outcome Observation**: "Maria more engaged in last 3 weeks" | Teacher → Submit Outcome Observation | §6.6 note types |
| 9.2 | Ms. Santos | Closes Maria's individual intervention → records outcome = **Improved** + notes | Counselor → Intervention → Close | §6.6 outcome |
| 9.3 | System | Recomputes Maria's risk: Math recovered to 80, attendance to 95% → score drops to **52 / Moderate** | Risk Scoring Engine | §7 |
| 9.4 | System | Intervention History sub-score reflects successful outcome → contributes to lower future risk | Engine input | §6.6 outcome → risk |
| 9.5 | Maria's profile | Risk History tab shows: 74 High (Q2 mid) → 52 Moderate (Q3 close) with explainability for each | Profile → Risk History | §6.9 |

**Verification checks:**
- [ ] Outcome is required before close; cannot close without it.
- [ ] Next recompute reflects outcome in the Intervention History sub-score.
- [ ] Risk History tab is fully chronological with explainability per entry.

---

## Scene 10 — Principal Oversight

**Goal:** Bias monitoring, override authority, governance.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 10.1 | Mr. Dela Cruz | Opens **Bias Monitoring Dashboard** → SPED High Risk = 23%, non-SPED = 8% → disparity flagged | Principal → Bias Monitoring | §6.10, Flow D |
| 10.2 | Mr. Dela Cruz | Drills in → reviews SPED student profiles → determines calibration issue | Drill-down | Flow D |
| 10.3 | Mr. Dela Cruz | Algorithm Config → adjusts SPED weight → change logged with justification | Admin Algorithm Config (principal can view; admin executes) | §7, §14 |
| 10.4 | Mr. Dela Cruz | Disagrees with another student's High classification → **Override** → enters justification → submits | Principal → Risk Override Interface | §5 Principal, Flow E |
| 10.5 | Mr. Dela Cruz | Opens **Cohort Analysis** → compares Grade 9 SY 2023–24, 2024–25, 2025–26 → flags drift | Principal → Cohort Analysis | §6 cross-year, Flow H |

**Verification checks:**
- [ ] Override requires written justification.
- [ ] Original assessment still visible after override.
- [ ] Bias dashboard disparities surface visibly.
- [ ] Cohort comparison shows year-over-year side by side.

---

## Scene 11 — Consent Revocation

**Goal:** Spec Flow F — feature degradation, not data loss.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 11.1 | Maria's parent | Contacts Ms. Cruz to revoke AI Analysis consent | (external) | §6.10 |
| 11.2 | Ms. Cruz | Admin → Consent Management → Maria → marks "AI Analysis" revoked | Admin → Consent Management | Flow F |
| 11.3 | System | Disables Gemini features for Maria: no AI narratives in her profile; algorithmic scores still display | UI degradation | §6.10 |
| 11.4 | Ms. Santos | Opens Maria's profile → sees banner: "AI analysis disabled per consent" → numeric risk + explainability still present | Counselor view | §6.10 |

**Verification checks:**
- [ ] No Gemini text appears anywhere for Maria after revocation.
- [ ] Algorithmic risk score and factor breakdown still display.
- [ ] Revocation logged in Audit Log.

---

## Scene 12 — AI Literacy in Practice

**Goal:** Users learn how the algorithm works by interacting with it.

| # | Actor | Action | Page / Flow | Spec Ref |
|---|---|---|---|---|
| 12.1 | Mr. Reyes | Opens **"How does this work?"** for Risk Scoring | Footer link → explainer | §6.9 |
| 12.2 | Mr. Reyes | Opens **Interactive Risk Simulator** with Maria's profile → toggles "+5 attendance days" → watches score drop in real time | AI Literacy → What-If | §6.9, Flow N |
| 12.3 | Mrs. Lim | Asks AI Literacy Assistant: "Why is Academic Decline Cluster a pattern?" → gets plain-language answer | AI Literacy Assistant | §6.9 |
| 12.4 | Mr. Dela Cruz | Reviews **Decision Audit Trail** for an overridden student → sees raw data → sub-scores → final → pattern → recommendation → his override | Decision Audit Trail | §6.9 |

**Verification checks:**
- [ ] Simulator updates without page reload.
- [ ] Every algorithmic output has at least one literacy surface attached.
- [ ] AI Literacy Assistant degrades gracefully (template fallback) when Gemini is unavailable.

---

## Master Verification Checklist

Use this when you think you're "done" with a milestone.

### Roles & Permissions
- [ ] All four roles have distinct dashboards and menus.
- [ ] Adviser elevation grants section-wide read in advisory section.
- [ ] Counseling notes are invisible to non-counselors.
- [ ] Sensitive intervention fields are invisible to teachers and admin.
- [ ] Admin intervention list is metadata-only.

### Year & Enrollment
- [ ] Year Switcher persists across navigation.
- [ ] Historical years show "Viewing historical data" banner.
- [ ] Students persist across years; enrollment data is per-year.
- [ ] Cohort comparison works across at least three school years.

### Data Capture
- [ ] Attendance Sheet is keyboard-driven.
- [ ] Gradebook supports pre/post-tests.
- [ ] Behavioral incident logger captures category, severity, description.
- [ ] Import Wizard supports all 6 CSV types with preview, error report, full success/rollback.

### Algorithmic Engine
- [ ] Risk score 0–100 with band Low/Moderate/High.
- [ ] Factor breakdown shown on every score.
- [ ] Multi-scope pattern detection (student/section/grade/school) with routing.
- [ ] Recommendation drafts queued separately from interventions.
- [ ] Drafts that are dismissed remain as evidence.

### Intervention Lifecycle
- [ ] Builder supports all four scopes.
- [ ] Public vs sensitive field separation enforced.
- [ ] Individual scope activates directly.
- [ ] Section/Grade/School-wide require principal approval.
- [ ] Significant revisions re-trigger approval.
- [ ] Interim revisions available to principal with justification.
- [ ] Session logging by any conducting staff.
- [ ] Participation records per student for broader-scope plans.
- [ ] Outcome on close feeds next risk recompute.

### Feedback Loop
- [ ] Three note types: Observation, Revision Request, Outcome Observation.
- [ ] Counselor disposition: Acknowledge / Incorporate / Discuss.
- [ ] Notifications routed back to contributors.

### Governance
- [ ] Consent records per student, scoped, with revocation.
- [ ] Audit log append-only with filtering.
- [ ] Bias monitoring across sex / learning modality / SPED.
- [ ] Overrides require written justification.

### AI Literacy
- [ ] "How does this work?" explainer pages exist.
- [ ] Interactive Risk Simulator works.
- [ ] Decision Audit Trail traces data → score → action.
- [ ] Gemini falls back gracefully (quota, consent revoked, network).
- [ ] No result ever displays without showing the work.

---

## How to Use This Document

1. **As a build verifier:** Walk through each Scene end to end in your running app. Tick the verification checks. Any unchecked item is a gap.
2. **As a demo script:** Use Scene 0 → 12 in order for a faculty or research demo.
3. **As a regression script:** After any major change, re-walk the scenario to ensure nothing broke.
4. **As an alignment check:** If a spec feature does not appear in this scenario, either the scenario is incomplete or the feature is unused — investigate either way.

If you change the spec, update this scenario. If the scenario can no longer be walked, the build has drifted from the spec.
