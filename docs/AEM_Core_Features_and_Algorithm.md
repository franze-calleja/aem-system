# AEM System: Core Features and Algorithm

## Purpose

The Algorithmic Educational Management (AEM) System helps a high school identify students or sections that may need additional support. It combines school data with explainable rules to produce risk indicators, detect concerning patterns, and prepare intervention suggestions.

The system supports human decision-making. It does **not** automatically make interventions active or replace counselor, teacher, or principal judgment.

> **Algorithm classification:** The AEM System uses a **deterministic rule-based algorithm**, not a machine-learning model. Its score formulas, weights, thresholds, and pattern conditions are defined in system configuration and source code. The same input data and configuration always produce the same result. After the algorithm calculates the risk score, factor breakdown, pattern matches, and recommendation data, selected structured results can be passed to a large language model (Gemini) to translate them into a clearer, human-readable message. The large language model explains the calculated result; it does not change the score, band, evidence, rules, or intervention decision.

## Core Features

### 1. Role-based workspaces

The system has four roles with different permissions:

| Role | Core responsibility |
|---|---|
| Admin | Manages school years, imports data, users, consent, algorithm settings, and audit records. |
| Teacher | Views assigned classes, records attendance, grades, and behavioral observations, and sees relevant student risk information. |
| Counselor | Reviews caseloads, risk explanations, pattern alerts, recommendations, counseling information, and intervention plans. |
| Principal | Reviews school-level dashboards, approves broader interventions, monitors bias indicators, and may override a risk band with a justification. |

Access is enforced at the route and query level. Teachers only see students in their assigned sections, while sensitive counseling and intervention content is restricted to the appropriate roles.

### 2. School-year-based student records

Student data is organized by school year. The main records used by the support process are:

- student profile and enrollment;
- grades by subject and quarter;
- daily attendance;
- behavioral records with severity levels;
- interventions, participation, and outcomes; and
- consent and audit records.

This lets the school compare current and historical years without mixing records from different enrollments.

### 3. CSV data import

Administrators can import roster, grade, attendance, behavioral, intervention-history, and SEL-related data through CSV files. The process validates data before committing it, shows row-level errors, previews valid rows, and saves each accepted batch transactionally.

### 4. Student risk assessment

For each active enrollment, the system computes a score from 0 to 100 and assigns a risk band:

| Band | Score |
|---|---:|
| Low | 0–39.9 |
| Moderate | 40–69.9 |
| High | 70–100 |

The system stores both the result and its factor breakdown. Staff therefore see why a student was classified, rather than receiving an unexplained label.

### 5. Pattern alerts

Beyond individual scores, the system evaluates patterns that may be meaningful to teachers and counselors. It currently supports student-level and section-level alerts, preserving the data evidence that caused each match.

### 6. Intervention recommendations and workflow

A pattern match produces a recommendation draft, such as academic support, a counseling session, subject remediation, or an attendance program. A counselor reviews the suggestion and may edit, dismiss, or convert it into a real intervention plan.

Section-, grade-, and school-wide plans can require principal approval. Intervention outcomes feed into later risk computations.

### 7. Governance and explainability

The system includes:

- an audit trail for sensitive actions;
- consent controls, including AI-analysis consent;
- versioned algorithm settings;
- principal risk-band overrides that require written justification;
- bias-monitoring views; and
- explanatory panels and a what-if simulator for understanding score changes.

Gemini can generate optional plain-language narratives. It does not calculate the risk score or make intervention decisions.

## Implemented Algorithm

The AEM System combines a deterministic, configurable, rule-based algorithm with a large language model (Gemini) to produce useful and understandable results. The rule-based algorithm calculates the structured results—risk scores, bands, factor breakdowns, pattern matches, and recommendation drafts—from school data. Gemini then translates selected results into clearer, human-readable explanations for staff. Given the same data and algorithm configuration, the rule-based calculation produces the same result.

### Step 1: Calculate five sub-scores

Each dimension produces a sub-score from 0 to 100.

| Dimension | Default weight | Implemented calculation |
|---|---:|---|
| Academic performance | 40% | Uses overall grade average, quarter-to-quarter grade trend, and the number of subjects averaging below 75%. |
| Attendance | 30% | Uses absence rate, tardiness rate, and the longest consecutive sequence of absences. |
| Behavioral records | 20% | Uses severity-weighted behavioral incidents: Low = 1, Moderate = 2, High = 3. |
| Intervention history | 5% | Uses completed intervention count and previous improving or declining outcomes. |
| Profile | 5% | Uses learning modality: Modular adds more risk than Blended; face-to-face adds none. |

The initial configuration is stored in the database and can be changed by an administrator. Configuration changes are versioned, and each saved assessment records the configuration version used.

### Step 2: Combine the sub-scores

The final score is a normalized weighted sum:

```text
Risk score =
  (Academic × 0.40) +
  (Attendance × 0.30) +
  (Behavioral × 0.20) +
  (Intervention history × 0.05) +
  (Profile × 0.05)
```

The engine normalizes configured weights before applying them, so the calculation remains valid if an administrator changes the values.

### Step 3: Classify the score

The default thresholds are:

- **High:** score of 70 or above
- **Moderate:** score from 40 up to 69.9
- **Low:** score below 40

### Step 4: Detect patterns

After risk scores are computed, the pattern detector evaluates the following enabled rules.

#### Student-level rules

| Pattern | Implemented condition |
|---|---|
| Academic Decline Cluster | At least three consecutively declining quarter averages and an absence rate of at least 15%. |
| Disengagement Signal | Tardiness rate of at least 10%, behavioral severity total of at least 2, and absence rate of at least 8%. |
| Crisis Warning | At least five consecutive recorded absences and behavioral severity total of at least 3. |
| Recovery Tracking | An active intervention and at least three quarters of continuous academic improvement. |
| Chronic Concern | At least two unfavorable completed-intervention outcomes while the student is currently High risk. |

#### Section-level rules

| Pattern | Implemented condition |
|---|---|
| Concentrated Risk | More than 30% of active students in a section are Moderate or High risk. |
| Subject Struggle | More than 40% of recorded grades in a subject are failing, below 75%. |
| Attendance Erosion | The section absence rate is more than 5 percentage points above the school-wide rate. |

### Step 5: Generate a recommendation draft

Each pattern maps to a suggested support type. Examples include:

| Pattern | Suggested support |
|---|---|
| Academic Decline Cluster | Academic support |
| Disengagement Signal | Counseling session |
| Crisis Warning | Immediate counseling |
| Chronic Concern | Case review |
| Concentrated Risk | Section intervention |
| Subject Struggle | Subject remediation |
| Attendance Erosion | Attendance program |

The output is a recommendation draft with its supporting evidence and rationale. Only a counselor can turn a draft into an actual intervention.

## Connection Between the Rule-Based Algorithm and AI

The rule-based engine creates the system's authoritative algorithmic data. Gemini AI is then used only to express selected outputs in clear natural language.

```text
School data
(grades, attendance, behavior, interventions, profile)
                              ↓
Rule-based algorithm
(formula, thresholds, and if/then pattern rules)
                              ↓
Authoritative structured outputs saved in the database
• RiskAssessment: score, band, and factor breakdown
• PatternMatch: matched rule and evidence
• RecommendationDraft: suggested support and rationale
                              ↓
Optional Gemini AI prompt
(receives the approved structured output as context)
                              ↓
AI-generated narrative
• plain-language risk explanation
• counselor-facing recommendation narrative
• principal dashboard summary
                              ↓
Human review and decision
```

### What the algorithm produces

The rule-based engine produces structured, auditable data records:

- a numerical risk score and Low, Moderate, or High band;
- a breakdown of each contributing sub-score;
- detected student or section patterns with the evidence that triggered them; and
- recommendation drafts linked to the triggering pattern.

These records are the source of truth. They are stored with the algorithm configuration version used to create them.

### What AI produces

Gemini receives selected algorithmic outputs and produces optional text, such as a plain-language explanation of the score, a counselor-facing recommendation narrative, or a principal summary. AI responses are cached and can be unavailable when consent is revoked, an API key is absent, the service is unavailable, or quota is exhausted.

The AI narrative does **not** change the risk score, risk band, pattern match, recommendation type, or stored algorithmic evidence. It also cannot create or activate an intervention. If AI is unavailable, staff still see the complete rule-based result and its factor breakdown.

## Processing Flow

```text
Grades + attendance + behavioral records + intervention outcomes + profile
                              ↓
                  Five explainable sub-scores
                              ↓
                    Weighted risk score (0–100)
                              ↓
                  Low / Moderate / High risk band
                              ↓
             Student and section pattern-rule evaluation
                              ↓
      Evidence-backed recommendation drafts for counselor review
                              ↓
      Human decision: create, revise, dismiss, or override support plan
```

## Current Scope Notes

- The engine can run manually and through a protected scheduled-recompute endpoint. A deployment scheduler must call that endpoint for automated runs.
- Grade-level and school-level pattern rules are not implemented yet.
- The current profile sub-score uses learning modality only. SPED status and age-versus-grade are not part of the implemented score.
- SEL records are stored and surfaced separately but do not currently contribute to the five-dimension risk calculation.
- Gemini enhances explanations in natural language only. The rule engine and score breakdown remain the source of truth.
