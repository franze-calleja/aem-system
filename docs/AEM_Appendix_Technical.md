# Appendix — System Architecture, Features, and Algorithms

**System:** Algorithmic Educational Management (AEM) System
**Study:** *Integrating AI Literacy and Data Analytics Using Algorithmic Educational Management (AEM) System for Student Support and Intervention Planning*
**Document date:** 12 September 2026
**Basis:** Direct review of the implemented codebase (not design intent). Every claim below was verified against source files, which are cited in-line.

---

## A. System Classification

The AEM System is an **Early Warning System (EWS)** for secondary-school student support, implemented as a **rule-based algorithmic decision support system (DSS)** built on a **weighted additive scoring model**, with a **large language model** (Google Gemini) confined to generating plain-language explanations of algorithmic output.

The governing design rule is: **the algorithm decides, the AI explains.** The LLM cannot alter a score, fire a rule, or create an intervention.

Established names for each component, by disciplinary audience:

| Audience | Recognised term | Component it names |
|---|---|---|
| Education research / policy | Early Warning System (EWS); Early Warning Indicator (EWI) | The system as a whole; the ABC (Attendance–Behavior–Course performance) signal set |
| Mathematics / computer science | Weighted Additive Scoring Model; Simple Additive Weighting (SAW) | The risk-score formula (§D.1) |
| Operations research | Multi-Criteria Decision Analysis (MCDA) | The weighted-criteria aggregation method |
| Software engineering | Decision Support System with human-in-the-loop | The architectural pattern |
| Artificial intelligence | Rule-based / symbolic AI; hybrid neuro-symbolic | Pattern detection (symbolic) + Gemini narrative layer (neural) |

**The system is deliberately not a machine-learning system.** There is no training phase, no learned weights, no held-out test set, and no probabilistic output. Rationale is given in §H.

---

## B. Technology Stack

| Layer | Technology | Version | Role in the system |
|---|---|---|---|
| Language | TypeScript | 5.x | Whole codebase; strict typing end-to-end |
| Web framework | Next.js (App Router) | 16.2.4 | Server-rendered application; React Server Components are the default rendering mode |
| UI library | React | 19.2.4 | Component model; client components used only for form state, transitions, and event handlers |
| Runtime | Node.js | LTS | Server runtime (Next.js Node runtime, not Edge) |
| Authentication | Auth.js (`next-auth`) | v5 beta | Credentials provider, JWT session strategy; role carried in token and session |
| Password hashing | bcryptjs | 3.x | Cost factor 10 |
| ORM | Prisma | 7.8 | Type-safe data access via the `@prisma/adapter-pg` driver adapter |
| Database | PostgreSQL | 16 | Relational store; containerised via Docker |
| Input validation | Zod | 4.x | Schema validation on every server-action input |
| Styling | Tailwind CSS | v4 | PostCSS plugin model; design tokens in `app/globals.css` |
| Large language model | Google Gemini (`@google/genai`) | model `gemini-flash-latest` | Narrative generation only (§D.4) |
| CSV processing | `csv-parse` | 6.x | Bulk import pipeline (§C.7) |
| Containerisation | Docker / Docker Compose | — | Multi-stage production image (Next.js standalone output); migrations applied on container boot |

**Architectural conventions enforced throughout:**
- **Server-first.** Data is fetched directly from PostgreSQL via Prisma at render time in Server Components. No client-side data-fetching layer exists.
- **Mutations via Server Actions.** All 62 write operations are React Server Actions (33 files under `app/actions/`), each of which validates input with Zod, authorises the caller, writes an audit record, and returns a serialisable result object.
- **No client-side persistence of domain data.** Student, grade, attendance, and intervention data exist only in PostgreSQL. Cookies carry session and active-school-year selection only.

---

## C. Major Feature Modules

Eleven functional modules, corresponding to specification §6.

### C.1 Student Profile Module
Persistent student identity (Learner Reference Number, name, sex, birth date, SPED status, guardian details) separated from per-school-year enrollment context (section, grade level, learning modality, enrollment status). This split allows a student record to persist across years while each year's academic, attendance, behavioral, and risk data attaches to that year's enrollment. SPED status changes are versioned in a dedicated history table.

### C.2 Academic Tracking Module
Per-subject, per-quarter grade records with five assessment kinds (regular, quiz, periodical, pre-test, post-test), score/max-score pairs, and recorder attribution.

### C.3 Attendance Module
Daily per-enrollment attendance with four statuses (present, absent, tardy, excused), uniquely constrained to one record per student per date.

### C.4 Behavioral & SEL Module
Behavioral incident records classified by four categories and three severity levels. Separately, periodic **Social-Emotional Learning assessments** rate four dimensions (emotional wellbeing, stress level, peer relationships, student self-assessment) on a four-point concern scale (thriving / stable / at-risk / critical). SEL records are counselor-authored; the principal sees dimension levels but never the free-text notes; teachers and administrators have no access at any layer.

### C.5 Counseling Module
Free-text counseling notes attached to an enrollment. Note bodies are readable only by counselors — enforced in the query helper, not in the interface — and **every successful read is itself audit-logged**, not only writes.

### C.6 Intervention Module (multi-scope)
The system's clinical core. Intervention plans carry a scope (individual student, section, grade level, or school-wide), one of fourteen plan types, a status lifecycle (draft → pending approval → active → completed / cancelled), a named human owner, schedule, accommodations, staff actions, and target outcomes.

Supporting mechanisms:
- **Sensitive-field separation.** Plan rationale and counseling context live in a separate table readable by counselors and the principal only.
- **Per-participant outcome tracking** (improving / stable / declining / completed), recorded even for individual-scope plans so outcome analysis is uniform across scopes.
- **Structured feedback channel.** Teachers submit observations, revision requests, or outcome observations against a plan; each carries a status (open / acknowledged / incorporated / dismissed).
- **Revision history.** Every plan edit writes a revision row containing a structured diff, a stated reason, and a pointer to the feedback note that triggered it.
- **Automatic re-approval routing.** Changes to scope, type, target, or a duration change exceeding 30 days are classified as *significant*; a significant change to an active broader-scope plan automatically returns the plan to pending-approval status.
- **Interim revision.** The principal may revise an active plan when the counselor is unavailable; such revisions are flagged `isInterim` and separately audited.
- **Teacher referral pathway.** Teachers cannot create interventions. They submit a structured referral (suggested type, rationale, urgency) that a counselor accepts or declines. Referrals are stored separately from algorithm-generated recommendation drafts so that human-originated and algorithm-originated provenance remain distinguishable in analysis.

### C.7 Import Module
CSV bulk-import pipeline with eight validators (roster, staff, teaching assignments, grades, attendance, behavioral records, SEL assessments, historical interventions). Each validator is a pure function that parses, normalises (including status-code aliases such as `P`/`PRESENT`, `T`/`LATE`/`TARDY`), validates row-by-row, and returns a per-row result set. The administrator-facing import wizard previews valid and invalid rows before any write; commits are transactional and audit-logged.

### C.8 Algorithmic Engine
Four layers, documented in §D.

### C.9 AI Layer
Gemini narrative generation with caching and graceful degradation, documented in §D.4.

### C.10 AI Literacy Module
Documented in §E.

### C.11 Governance Module
Documented in §F.

---

## D. The Algorithmic Engine

The engine is a strict four-layer pipeline. Output flows forward only; no later layer feeds back into an earlier one.

```
Raw inputs: grades, attendance, behavioral records, learning modality,
            intervention history
      │
      ▼
Layer 1 — Risk Scoring          → score 0–100, band, factor breakdown
      │
      ▼
Layer 2 — Pattern Detection     → rule matches with structured evidence
      │
      ▼
Layer 3 — Recommendation Mapping → intervention drafts (suggested, not enacted)
      │
      ▼
Layer 4 — AI Narrative           → plain-language prose (no decision authority)
```

### D.1 Layer 1 — Risk Scoring (weighted additive model)

**Source:** `lib/risk/engine.ts`. Implemented as a **pure function** — identical inputs plus identical configuration version always produce identical output, with no side effects. This property is what makes scores reproducible and auditable.

**Aggregation.** Five dimension sub-scores, each on 0–100, combined by normalised weights:

$$\text{score} = \sum_{i=1}^{5} s_i \cdot \frac{w_i}{\sum_j w_j}$$

rounded to one decimal place. Weight normalisation means the configured weights need not sum to 1.

**Default weights and inputs:**

| Dimension | Default weight | Inputs used |
|---|---|---|
| Academic performance | 30% | General weighted average, quarterly trend slope, failing-subject count |
| Attendance | 25% | Absence rate, tardiness rate, longest consecutive-absence run |
| Behavioral | 20% | Severity-weighted incident count |
| Intervention history | 15% | Count of prior completed plans and their outcome distribution |
| Profile factors | 10% | Learning modality |

**Sub-score formulas as implemented:**

*Academic.* Quarterly average $q_k$ = mean of $(\text{score}/\text{maxScore}) \times 100$ over that quarter's grade rows. GWA = the same mean over all grade rows. A subject counts as failing when its across-quarter mean falls below 75%. The trend slope is the **ordinary least-squares regression slope** of quarterly average on quarter number:

$$\text{slope} = \frac{\sum(x_k - \bar{x})(y_k - \bar{y})}{\sum(x_k - \bar{x})^2}$$

$$s_{\text{academic}} = \min\bigl(100,\ 0.5(100 - \text{GWA}) + \min(30, \max(0, -3 \cdot \text{slope})) + \min(30,\ 15 \cdot n_{\text{failing}})\bigr)$$

*Attendance.* With $r_a$ = absence rate and $r_t$ = tardy rate:

$$
\text{absenceRisk} =
\begin{cases}
70 + \min\bigl(30,\ 200(r_a - 0.15)\bigr) & r_a \geq 0.15 \\[4pt]
70 \cdot \dfrac{r_a - 0.08}{0.07} & 0.08 \leq r_a < 0.15 \\[4pt]
0 & r_a < 0.08
\end{cases}
$$

$$s_{\text{attendance}} = \min\bigl(100,\ \text{absenceRisk} + 0.5\min(15,\ 100 r_t) + \min(20,\ 5 c)\bigr)$$

where $c$ is the longest unbroken run of absences in date order.

*Behavioral.* With severity weights HIGH = 3, MODERATE = 2, LOW = 1, and a saturation cap of 12:

$$s_{\text{behavioral}} = \min\left(100,\ \frac{3n_H + 2n_M + n_L}{12} \times 100\right)$$

*Intervention history.* This dimension measures **whether prior support worked** — the one signal the other four dimensions cannot observe. It deliberately assigns **no** risk for merely being under an active plan: the conditions justifying the plan are already counted by the academic, attendance, and behavioral dimensions, so charging for the plan itself would double-count and create a perverse feedback loop in which helping a student raises their risk score. With $p$ = number of prior completed plans:

$$s_{\text{history}} = \text{clamp}_{[0,100]}\Bigl(R[\min(p,3)] + \min(40,\ 20 n_{\text{declining}}) - \min(30,\ 15 n_{\text{improving}})\Bigr)$$

where $R = [0, 10, 25, 40]$. A favourable prior outcome is **protective** — it subtracts risk.

*Profile.* Modular learning modality contributes 15; blended contributes 5; face-to-face and online contribute 0.

**Banding.** Score → band by configurable thresholds; defaults: 0–39 LOW, 40–69 MODERATE, 70–100 HIGH.

**Missing-data policy.** A dimension with no underlying records contributes 0, not an imputed value. Absent data never manufactures risk.

**Versioned configuration.** Weights, band thresholds, per-rule toggles, and bias-flagging thresholds live in an `AlgorithmConfig` row. Each configuration change creates a new immutable version with a recorded justification and author. **Every risk assessment stores a foreign key to the configuration version that produced it**, so any historical score can be reproduced exactly.

**Assessment history.** Every compute run writes a new assessment row rather than updating in place; the latest row per enrollment is current and all prior rows are retained as history.

### D.2 Layer 2 — Pattern Detection (rule-based / production rules)

**Source:** `lib/patterns/rules.ts` (rule definitions), `lib/patterns/detector.ts` (executor).

Eight hand-coded boolean tests in the production-rule form *if conditions, then conclusion*. Each is individually toggleable through the versioned configuration. Every match writes a row with a structured **evidence payload** — the exact values that caused the rule to fire — so a match is explainable by reading the rule and its evidence together. There is no learned weighting, no probabilistic activation, and no threshold not stated in the source.

**Student-scope rules (5):**

| Rule | Firing condition as implemented |
|---|---|
| `ACADEMIC_DECLINE_CLUSTER` | Trailing run of ≥ 2 consecutive quarter-over-quarter declines in overall average **and** absence rate ≥ 15% |
| `DISENGAGEMENT_SIGNAL` | Tardiness rate ≥ 10% **and** severity-weighted behavioral count ≥ 2 **and** absence rate ≥ 8% |
| `CRISIS_WARNING` | Longest consecutive-absence run ≥ 5 days **and** severity-weighted behavioral count ≥ 3 |
| `RECOVERY_TRACKING` | An active intervention exists **and** ≥ 2 consecutive quarters of improving average |
| `CHRONIC_CONCERN` | ≥ 2 prior interventions closed with "no change" or "declined" **and** currently in the HIGH band |

**Section-scope rules (3):**

| Rule | Firing condition as implemented |
|---|---|
| `CONCENTRATED_RISK` | More than 30% of the section in the MODERATE or HIGH band |
| `SUBJECT_STRUGGLE` | Any subject in the section with a failure rate above 40% |
| `ATTENDANCE_EROSION` | Section absence rate exceeds the school average by more than 5 percentage points |

`RECOVERY_TRACKING` is worth noting methodologically: the rule set detects **improvement** as well as deterioration, so the system surfaces evidence that an intervention is working, not only evidence of decline.

### D.3 Layer 3 — Recommendation Mapping (deterministic lookup)

**Source:** `lib/patterns/recommendations.ts`.

A static one-to-one map from pattern rule to suggested intervention type, paired with a rationale template that interpolates the matched evidence values into a sentence.

| Triggering rule | Suggested intervention type |
|---|---|
| `ACADEMIC_DECLINE_CLUSTER` | Academic support |
| `DISENGAGEMENT_SIGNAL` | Counseling session |
| `CRISIS_WARNING` | Immediate counseling |
| `RECOVERY_TRACKING` | Positive reinforcement |
| `CHRONIC_CONCERN` | Case review |
| `CONCENTRATED_RISK` | Section intervention |
| `SUBJECT_STRUGGLE` | Subject remediation |
| `ATTENDANCE_EROSION` | Attendance program |

The output is a **recommendation draft**, a distinct record type that is explicitly *not* an intervention. A counselor reviews each draft and may instantiate it (with or without edits), create a different plan instead, or dismiss it. Dismissed drafts are retained as evidence that the suggestion was considered and rejected, but never affect the student.

This separation — *the system suggests, humans decide* — is the operationalisation of the study's human-accountability commitment.

### D.4 Layer 4 — AI Narrative (Google Gemini, text-only)

**Source:** `lib/ai/gemini.ts` (client wrapper), `lib/ai/narrative.ts` (prompt construction).

Gemini receives already-computed algorithmic output — scores, bands, sub-score breakdowns, rule matches, rationale text — and returns two to four sentences of plain prose. Three narrative types are generated: a **risk narrative** for the counselor's view of a student, a **recommendation narrative** attached to each draft in the counselor's queue, and a **school summary** for the principal's dashboard.

Constraints enforced in the implementation:

1. **No decision authority.** The LLM is never given write access to scores, rules, drafts, or plans. Its output is stored as text and displayed as text.
2. **Algorithm-first display.** The numeric breakdown is rendered independently of the narrative. When narrative generation is unavailable, the breakdown still renders in full and a short note explains the absence.
3. **Graceful degradation.** The generation function never throws. It returns a typed failure reason — missing API key, quota exhausted, network failure, empty response, or **consent revoked** — and each surface renders the corresponding explanation.
4. **Consent gating.** If a student's AI-analysis consent is revoked, the call short-circuits before the SDK is invoked; no student data reaches the external service.
5. **Content-addressed caching.** Responses are cached in an `AICache` table keyed by the SHA-256 hash of `model :: prompt`. Re-rendering the same student's profile costs zero tokens. Changing a prompt template or model implicitly invalidates the cache. An explicit regenerate control bypasses the cache when a user knows context has changed.

---

## E. AI Literacy Features

The specification frames AI literacy in three layers; each is implemented by identifiable system features.

**Passive literacy — explainability is unavoidable.** No risk score is displayed anywhere in the system without its factor breakdown. The explainability panel shows each dimension's sub-score, its weight, its weighted contribution, and the underlying values (GWA, absence rate, incident counts) that produced it.

**Active literacy — the What-If Simulator** (`/counselor/what-if`). Users modify hypothetical inputs — quarterly averages, absence rate, behavioral counts, learning modality — and observe the resulting score and band. Methodologically important: the simulator calls **the same `computeRiskScore` function used in production scoring**. There is no parallel simulation model, so what the simulator shows is exactly what the engine would produce for a real student with those inputs. The simulator involves no LLM and functions with no API key configured.

**Reflective literacy — three features that model critical evaluation:**
- The **Decision Audit Trail** (`/counselor/students/[id]/audit`) renders a single chronological sequence per student spanning risk assessments, pattern matches, recommendation drafts, interventions, plan revisions, and feedback notes — making the full data-to-decision chain inspectable as one narrative.
- The **bias monitoring panel** on the principal dashboard makes algorithmic fairness a visible, routine object of review (§F.4).
- The **risk override mechanism** makes human disagreement with the algorithm an explicit, recorded act rather than a silent workaround (§F.5).

**Structured instruction.** Four dedicated explanation pages under `/learn` cover how the risk score is computed, what each pattern rule looks for, and — notably — *what the system decides and what it does not*, which enumerates the five things the algorithm does (aggregate, rank, rule-check, draft, log) against the decisions it never makes. Role-specific guided tutorials with on-screen spotlighting are provided for all four roles.

---

## F. Governance and Ethics Mechanisms

### F.1 Role model
Four roles with distinct data scopes: **Administrator** (system configuration and governance; no access to clinical or counseling data), **Teacher** (assigned sections only), **Counselor** (all students, full behavioral and counseling access), **Principal** (read-all, override and approval authority). Within the teacher role, a designated **section adviser** gains read access to all students in the advisory section, including those they do not teach — reflecting the actual responsibility structure of Philippine high schools.

### F.2 Three-layer access control
| Layer | Mechanism | Function |
|---|---|---|
| Request | `proxy.ts` (Next.js 16 proxy, Node runtime) | Redirects unauthenticated requests to login and wrong-role requests to a forbidden state, by URL prefix |
| Page | Per-role server layout | Server-side role assertion on every page render (defense in depth) |
| Query | Role-gated server-only query helpers in `lib/*/queries.ts` | Sensitive fields are withheld in the data-access function itself, before any interface code runs |

At the third layer, the access decision precedes the database round-trip: a request for SEL assessments or counseling notes from a non-counselor role returns an empty result without querying at all. Sensitive intervention fields are stripped for roles outside counselor and principal. The interface is treated as the second line of defense, never the first.

### F.3 Audit logging
An append-only `AuditLog` table with **41 distinct action types**, indexed by user, resource, action, and time. Coverage:
- **All writes**, always.
- **Sensitive reads** — counseling notes and SEL assessments log a read event, not only a write.
- **Authentication events** — login, failed login (including rate-limited attempts), logout, password change — handled centrally in the Auth.js event callbacks.
- **Algorithmic events** — risk recomputation, configuration change, pattern match, recommendation drafted, recommendation dismissed, risk override.
- **Governance events** — consent granted, consent revoked, import, report exported, school-year switch.

Append-only behaviour is enforced at the database level, not only by convention.

### F.4 Consent management
Per-student consent records across three scopes — data processing, AI analysis, and intervention planning — each independently grantable and revocable, with grant and revocation timestamps retained. Revocation degrades features rather than deleting data: revoking AI-analysis consent suppresses narrative generation for that student while the algorithmic output remains fully visible.

### F.5 Bias monitoring
The principal dashboard renders risk-band distribution broken down by **sex** and **learning modality**, alongside grade-level and section breakdowns. A disparity flag fires when a group's HIGH-band rate exceeds the school average by more than a configurable multiplier (default 50%), stored in the versioned algorithm configuration. A downloadable bias-breakdown report carries the same figures.

### F.6 Risk override
The principal may override a risk band. The override requires **written justification** and snapshots the original score and band at the moment of override, so the algorithmic assessment remains reconstructable even after subsequent recomputation. Overrides are separately audited and can be cleared, with the clearing act also recorded.

### F.7 Notifications
Four in-app notification types: risk-band increase, referral accepted, referral declined, approval requested. Notification payloads deliberately carry **no sensitive content** — they name the student and the event but never a rationale, counseling note, or SEL detail. Recipients must open the linked page, where the normal query-layer access rules apply.

### F.8 Authentication hardening
JWT sessions; bcrypt password hashing at cost factor 10; login throttling at 5 failed attempts per 15 minutes per IP address, applied *before* any database work so brute-force attempts cannot consume hashing cycles; successful login clears the throttle bucket. Administrator-minted credentials (bulk staff import, password reset) set a `mustChangePassword` flag that funnels every route to the password-change screen until the user selects their own credential.

### F.9 Year-scoped data
Every analytical query is filtered by school year. Historical years remain intact and browsable through a year switcher; scheduled recomputation deliberately targets only the active year so that a schedule cannot silently rewrite settled historical records.

---

## G. Reporting and Scheduled Processing

**Report generation.** Four CSV reports, each declaring its permitted roles *and* scoping its own rows to the caller: risk roster (counselor, principal, teacher — a teacher receives only their assigned sections), intervention pipeline and outcomes (counselor, principal), attendance summary by section (all four roles, teacher-scoped), and bias-monitoring breakdown (principal only). Scoping is applied in the report generator rather than in the page, so the download route cannot be used to circumvent it. Every export is audit-logged.

**Scheduled recomputation.** An HTTP endpoint (`/api/cron/recompute`) runs the full engine — scoring, pattern detection, and recommendation generation — for the active school year on an external schedule. Authentication is a shared bearer secret rather than a session, since no user stands behind a scheduled tick; if the secret is unconfigured the endpoint refuses to run rather than defaulting open. Band increases detected during a run emit notifications to the relevant teachers and principal.

**Deployment.** Multi-stage Docker image using Next.js standalone output; database migrations applied automatically at container start; a health endpoint for container liveness probes; a production compose stack that does not expose the database port.

---

## H. Methodological Justification: Why Rule-Based, Not Machine Learning

Recorded because it is the question most likely to be asked of this contribution.

1. **Explainability outweighs marginal predictive accuracy in this setting.** When a counselor is asked why a student is flagged, the system must answer in auditable terms — *this sub-score is 78 because the general weighted average is 65 and the trend slope is −5.2 per quarter, contributing 23 points of the total*. Post-hoc explanation methods for neural models (saliency maps, attention weights) supply rationalisations that the interpretability literature has repeatedly shown can be unfaithful to the underlying computation.

2. **Small N.** A single secondary school produces hundreds, not millions, of student-year records. Models trained at that scale tend to overfit or to learn noise. Expert-specified weights with documented justification are the appropriate method at this data scale.

3. **High stakes with slow feedback.** A flag results in counseling sessions, guardian contact, and sometimes referral. The system must produce outputs that a professional can defend in a meeting on the day it is questioned.

4. **Auditable bias.** With an explicit weighted formula, the question *does this weighting produce disparate HIGH-risk rates across groups?* is answerable by inspecting the formula against the data — which the bias-monitoring panel does directly. In learned models, bias arising from training-data composition resists that form of inspection.

5. **Consistency with established practice.** Operational early warning systems in education — the Chicago On-Track Indicator, the National High School Center's EWS framework, most state dropout-prevention systems — are weighted additive models. Clinical risk scores (APACHE II, Glasgow Coma Scale, CHA₂DS₂-VASc) follow the same pattern in medicine for the same reasons.

**Suggested citation paths.** EWS in education: National High School Center, *Early Warning Systems: A Synthesis of Research and Practice*; Allensworth & Easton (2005), *The On-Track Indicator as a Predictor of High School Graduation*. Simple additive weighting: Fishburn (1967); Hwang & Yoon (1981), *Multiple Attribute Decision Making*. Rule-based systems: Hayes-Roth (1985), *Rule-based systems*, CACM 28(9); Russell & Norvig, *Artificial Intelligence: A Modern Approach*. Interpretability: Rudin (2019), *Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead*, Nature Machine Intelligence 1(5), 206–215. Human-in-the-loop decision support: Power (2002), *Decision Support Systems*.

---

## I. Implementation Scale

Measured from the repository on 12 September 2026.

| Measure | Count |
|---|---|
| Database models | 28 |
| Database enumerations | 26 |
| Schema migrations | 14 |
| Application pages / routes | 50 |
| Server actions (write operations) | 62, across 33 domain-grouped files |
| Audit action types | 41 |
| Pattern-detection rules | 8 (5 student-scope, 3 section-scope) |
| Risk-score dimensions | 5 |
| Intervention plan types | 14 |
| CSV import validators | 8 |
| Automated report definitions | 4 |
| Verification scripts | 20 |
| Application source | ~33,000 lines of TypeScript / TSX |
| Development phases completed | 12 (Phases 0 through 11b) |

**Reference dataset.** The system holds two school years: SY 2025–2026, containing the reference walkthrough scenario (250 enrollments), and SY 2026–2027, loaded from a real school's records — 576 students across 17 sections in Grades 7–10, with 31 staff accounts (1 principal, 1 guidance counselor, 1 records officer, 28 teachers of whom 17 are section advisers).

---

## J. Corrections to Earlier Documentation

Two statements in the project's design documents do not match the implementation. Both matter if quoted in the manuscript, and the implementation — not the design document — is what should be reported.

1. **Query-layer access control is implemented as role-gated server-only query helper functions, not as a Prisma client extension.** Specification §14 and the developer contract both describe "Prisma extensions"; no Prisma client extension exists in the codebase. The enforcement is real and is genuinely below the interface layer — sensitive fields are withheld inside the data-access functions in `lib/*/queries.ts`, before any page code runs — but it is function-level, not ORM-middleware-level. The accurate description is given in §F.2.

2. **SPED status does not enter the risk score.** The algorithm document lists the profile dimension's inputs as "SPED status, learning modality"; the implemented `computeProfileBreakdown` function takes learning modality alone. SPED status is captured in the student record, versioned in a change-history table, and used in governance and demographic views — but it contributes zero to the computed risk score. §D.1 states this correctly. This is arguably the more defensible design (a protected characteristic does not directly raise a risk classification), but it must be reported as implemented.
