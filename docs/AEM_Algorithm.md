# AEM Algorithm — Approach & Naming

This document explains *what kind of algorithm* the Algorithmic Educational Management (AEM) system uses, what it is called in the academic literature, and why this approach was chosen over alternatives. It is intended for readers who are not the AI agent maintaining the codebase: thesis evaluators, demo attendees, future contributors, school staff.

If you want to navigate the code, every section ends with a "**Where it lives**" pointer.

---

## TL;DR

The AEM system is an **Early Warning System (EWS) for student support**, implemented as a **rule-based algorithmic decision support system** with a **weighted additive scoring model** at its core, augmented by a **large language model** (Google Gemini) that generates plain-language explanations of algorithmic outputs without participating in any decision.

In one sentence: **the algorithm decides, the AI explains.**

This is deliberately *not* a machine-learning system. The reasons are explained in [Section 5](#5-why-this-approach-and-not-machine-learning).

---

## 1. What this system is — names that apply

Depending on the audience, the system goes by different established names:

| Audience | Term they will recognise | Why it fits |
|---|---|---|
| Education research / policy | **Early Warning System (EWS)** or **Early Warning Indicator (EWI) system** | Combines Attendance, Behavior, and Course-performance ("ABC") signals to flag at-risk students before crisis |
| Computer science / mathematics | **Weighted Additive Scoring Model** / **Simple Additive Weighting (SAW)** | The formal name for the risk-score formula |
| Operations research | **Multi-Criteria Decision Analysis (MCDA)** | The branch of OR that studies weighted-criteria scoring |
| Software engineering | **Decision Support System (DSS)** with a **human-in-the-loop** | The architectural pattern: the system informs, humans decide |
| AI literature | **Rule-Based / Symbolic AI**, with a **hybrid neuro-symbolic** explanation layer | Pattern detection is production rules; Gemini is the neural piece, used only for prose |

Most common in education-research papers: **"Early Warning System"** is the default term and the easiest citation path.

---

## 2. The four algorithmic layers

The system is built in four layers, each doing one job. Outputs of earlier layers feed later layers, but never the other way around.

```
   ┌─────────────────────────────────────────────────────────┐
   │ Raw inputs: grades, attendance, behavioral records,     │
   │             SPED status, learning modality              │
   └─────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Layer 1 — Risk Scoring  (weighted additive model)       │
   │ Output: score 0–100, band LOW/MODERATE/HIGH, factor     │
   │         breakdown (RiskAssessment row)                  │
   └─────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Layer 2 — Pattern Detection  (rule-based)               │
   │ Output: PatternMatch rows at student / section scope    │
   └─────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Layer 3 — Recommendation Mapping  (lookup table)        │
   │ Output: RecommendationDraft rows (suggested, not        │
   │         enacted — counselor decides)                    │
   └─────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Layer 4 — AI Narrative (Gemini, text-only)              │
   │ Output: 2–4 sentences of plain-language prose,          │
   │         cached. No decisions ever change here.          │
   └─────────────────────────────────────────────────────────┘
```

### 2.1 Risk Scoring — Weighted Additive Model

The score is the weighted sum of five sub-scores (each 0–100). Default weights and bands (admin-configurable):

| Dimension | Weight | Inputs |
|---|---|---|
| Academic Performance | **30%** | Overall GWA, per-quarter trend slope, failing-subject count |
| Attendance | **25%** | Absence rate, tardy rate, longest consecutive-absence run |
| Behavioral & SEL | **20%** | Severity-weighted incident count (HIGH×3 + MOD×2 + LOW×1) |
| Intervention History | **15%** | Active/closed plans + past outcome distribution |
| Profile Factors | **10%** | SPED status, learning modality |

Final score → band:
- **0–39** → LOW
- **40–69** → MODERATE
- **70–100** → HIGH

**Versioned configuration.** Weights, band thresholds, and rule toggles all live in a versioned `AlgorithmConfig` row. Every change creates a new immutable version. Every `RiskAssessment` carries a pointer back to the config version that produced it — so a score can always be reproduced exactly.

**Pure function.** Same inputs + same config version → same output. No randomness, no side effects. This is what makes the scores audit-friendly.

**Where it lives:** [lib/risk/engine.ts](../lib/risk/engine.ts) — the engine. [lib/risk/types.ts](../lib/risk/types.ts) — the data shapes. Admin UI: [app/admin/algorithm/page.tsx](../app/admin/algorithm/page.tsx).

### 2.2 Pattern Detection — Rule-Based / Expert System

After every score recompute, the system runs eight pattern rules. Each rule is a hand-coded boolean test — what AI literature calls a **production rule** ("if conditions, then conclusion").

**Student-level rules (5):**
- *Academic Decline Cluster* — 3+ consecutive quarters of declining grades AND absence rate > 15%
- *Disengagement Signal* — rising tardiness trend AND recent behavioral incident AND missing assessments
- *Crisis Warning* — sudden HIGH-severity behavioral incident AND counseling flag AND grade drop in same period
- *Recovery Tracking* — post-intervention grade improvement AND attendance recovery
- *Chronic Concern* — multiple closed interventions with "no change" or "declined" outcome

**Section-level rules (3):**
- *Concentrated Risk* — > 30% of section in MODERATE or HIGH band
- *Subject Struggle* — section average failing in a specific subject
- *Attendance Erosion* — section absence rate exceeds school average by significant margin

Each match becomes a `PatternMatch` row with structured `evidence` (the exact values that made the rule fire). Because rules are deterministic, *every match is explainable by reading the rule*. There is no learned weighting, no probabilistic activation, no opaque threshold.

**Where it lives:** [lib/patterns/rules.ts](../lib/patterns/rules.ts) — the rule definitions. [lib/patterns/detector.ts](../lib/patterns/detector.ts) — the executor.

### 2.3 Recommendation Mapping — Lookup Table

A static map: pattern rule → suggested intervention type + rationale template.

Example:
```
ACADEMIC_DECLINE_CLUSTER → {
  suggestedType: "ACADEMIC_TUTORING",
  rationale: "Three declining quarters with X% absences suggest..."
}
```

Output is a `RecommendationDraft` row — explicitly **not** an `Intervention`. The counselor reviews each draft and decides whether to instantiate it as a real intervention (possibly with edits, possibly de novo, possibly dismissed). Dismissed drafts remain as evidence of consideration but never affect students.

This separation — "the system *suggests*, humans *decide*" — is foundational to the AEM design philosophy.

**Where it lives:** [lib/patterns/recommendations.ts](../lib/patterns/recommendations.ts).

### 2.4 AI Narrative — Gemini (text-only)

Gemini Flash takes the algorithmic output (numbers, bands, rule matches, draft rationale) as a prompt and produces 2–4 sentences of plain-language prose. Three kinds of narrative are generated:

- **Risk narrative** — explains a student's risk profile to a counselor (e.g. *"Maria's overall risk is moderate at 58/100, driven largely by attendance: 16.7% absences with a 3-day consecutive run last week..."*)
- **Recommendation narrative** — turns an algorithmic rationale into a human-readable suggestion
- **School summary** — paragraph for the principal dashboard summarising the school's current state

Gemini **never** changes a score, fires a rule, or instantiates an intervention. If the API key is unset, quota is exhausted, the network fails, or the student's AI-analysis consent is revoked, the corresponding narrative simply does not render — and the algorithmic output below it remains fully visible. Each surface shows a small fallback note explaining why the AI text is missing.

**Caching.** Identical (prompt, model) pairs hit a SHA-256-keyed cache (`AICache` table) and skip the SDK call. Re-rendering the same student's profile costs zero tokens.

**Where it lives:** [lib/ai/gemini.ts](../lib/ai/gemini.ts) — the wrapper. [lib/ai/narrative.ts](../lib/ai/narrative.ts) — the prompt builders.

---

## 3. End-to-end example

Maria Santos (LRN `100000000001`, Grade 9 — Newton) walks through every layer.

**Inputs (raw):**
- 9 grade entries across subjects, quarter averages 85/82/78/75 (descending trend)
- 80 attendance days, 13 absences (16.7%), 5 tardies, longest consecutive run = 3
- 2 behavioral incidents — 1 MODERATE, 1 LOW
- SPED status: NONE, Learning modality: FACE_TO_FACE

**Layer 1 — Risk Scoring:**
- Academic sub-score ≈ 38 (GWA 80, negative trend slope)
- Attendance sub-score ≈ 71 (absence rate above the 15% high threshold)
- Behavioral sub-score ≈ 17 (low weighted-incident count)
- Intervention History ≈ 0 (no priors)
- Profile ≈ 0 (no risk factors)
- **Weighted sum ≈ 38·0.30 + 71·0.25 + 17·0.20 + 0·0.15 + 0·0.10 = 32.6**
- Band: **LOW** (under 40)

(*Numbers here are illustrative; real values depend on the actual rows.*)

**Layer 2 — Pattern Detection:** the *Academic Decline Cluster* rule fires (3 declining quarters + absence rate > 15%). One `PatternMatch` row, evidence captures the four quarterly averages and the absence rate.

**Layer 3 — Recommendation:** the rule maps to `ACADEMIC_TUTORING` with a templated rationale. One `RecommendationDraft` row, status `OPEN`.

**Layer 4 — AI Narrative:** Gemini reads the score breakdown and produces a 3-sentence paragraph for the counselor. The counselor sees both — algorithmic explainability panel (always) and the narrative (when consent + key allow).

**Counselor action:** they click "Open in Builder" on the recommendation, edit the schedule, save. The draft transitions to `INSTANTIATED`; a real `Intervention` is created with `status: ACTIVE`.

Every step in this chain — score, rule match, draft, intervention — is visible chronologically on the [Decision Audit Trail](../app/counselor/students/%5Bid%5D/audit/page.tsx) page.

---

## 4. The What-If Simulator — same engine, different inputs

The What-If Simulator at `/counselor/what-if` lets a user tweak hypothetical inputs (quarter averages, absence rate, behavioral counts, SPED status, modality) and see how the risk engine reacts.

**It uses the exact same `computeRiskScore` function as production scoring.** Inputs synthesise minimal `Grade` / `Attendance` / `BehavioralRecord` rows; the engine runs over them; the result renders in the explainability panel. There is no parallel "simulation engine" — what you see in the simulator is what the engine would produce for a real student with those inputs.

This is the system's **AI-literacy surface**: users learn how the algorithm responds to data by changing data and watching the score move. It works without the Gemini key because no AI is involved.

**Where it lives:** [app/counselor/what-if/page.tsx](../app/counselor/what-if/page.tsx) + [components/counselor/what-if-simulator.tsx](../components/counselor/what-if-simulator.tsx) + [app/actions/risk/what-if.ts](../app/actions/risk/what-if.ts).

---

## 5. Why this approach (and not machine learning)

The most common question reviewers ask is "why not deep learning?" Here is the deliberate answer.

### What this system is *not*

- ❌ Not a machine-learning system. There is no training step, no learned weights, no held-out test set.
- ❌ Not a predictive model in the statistical sense. There are no probability distributions, no confidence intervals, no ROC curves.
- ❌ Not AI-driven decision-making. The AI (Gemini) never decides anything.
- ❌ Not a black box. Every output traces back to a formula or rule that a human can read.

### Why this matters in a school-support context

**1. Explainability beats predictive accuracy.** When a counselor is asked "why is Maria flagged HIGH risk?", "the algorithm thinks so" is not an acceptable answer. The system must be able to say: "her academic sub-score is 78 because GWA is 65 and her trend slope is −5.2 per quarter; that contributed 23 points to her overall score; the academic-decline-cluster rule fired because the third quarter dropped below 75 while her absence rate stayed above 15%." Every clause in that sentence comes from an auditable computation. A neural network cannot offer that — and where it tries (saliency maps, attention weights), it offers post-hoc rationalisations that researchers have shown are often misleading.

**2. Small N. Schools are small.** A typical Philippine high school has hundreds, not millions, of student-years of data. ML models trained on small N either overfit or learn the noise. Hand-tuned weighted scoring with domain-expert review is appropriate for this scale.

**3. High stakes, slow feedback.** When the system says "this student is at risk", a counselor schedules sessions, parents are contacted, sometimes a referral is made. Mistakes cost time and trust. The system must therefore err on the side of "I can defend this in a meeting" — and that means rule-based plus weighted scoring, not ML.

**4. Bias is auditable.** With weighted scoring, you can ask "does this weight scheme produce disparate HIGH-risk rates across demographic groups?" and answer it directly by inspecting the formula and the data. The dashboard's bias-monitoring panel does exactly this. With ML, that question is genuinely hard — model bias often arises from training-data composition in ways that resist inspection.

**5. The literature agrees.** Established education EWSs — the Chicago On-Track Indicator, the National High School Center's EWS, most state-level dropout-prevention systems — are weighted-additive scoring models, not ML. Clinical scoring systems (APACHE II, Glasgow Coma Scale, CHA₂DS₂-VASc) follow the same pattern in medicine for the same reasons.

This system is therefore **conservative by design**. The AI literacy contribution is to *teach users why that conservatism is a feature, not a limitation* — through the What-If simulator, the Decision Audit Trail, and the explainability panels on every risk score.

---

## 6. Suggested citations

For thesis writing, the following citation paths cover each layer:

- **EWS in education** — *National High School Center, "Early Warning Systems: A Synthesis of Research and Practice."* US Dept of Ed publications. Chicago Consortium on School Research, "The On-Track Indicator as a Predictor of High School Graduation" (Allensworth & Easton, 2005).
- **Simple Additive Weighting** — Fishburn, P. C. (1967). *Additive utilities with incomplete product sets*. Hwang, C. L., & Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and Applications.*
- **Rule-based / expert systems** — Russell & Norvig, *Artificial Intelligence: A Modern Approach*, chapter on knowledge representation. Hayes-Roth, F. (1985). *Rule-based systems*. Communications of the ACM, 28(9).
- **Explainability vs accuracy** — Rudin, C. (2019). *Stop explaining black box machine learning models for high stakes decisions and use interpretable models instead.* Nature Machine Intelligence, 1(5), 206–215.
- **Human-in-the-loop decision support** — Power, D. J. (2002). *Decision Support Systems: Concepts and Resources for Managers.*

---

## 7. Code map (quick reference)

| Layer | File | Purpose |
|---|---|---|
| Risk engine | [lib/risk/engine.ts](../lib/risk/engine.ts) | `computeRiskScore` — pure function |
| Risk types | [lib/risk/types.ts](../lib/risk/types.ts) | `RiskWeights`, `RiskFactors`, etc. |
| Pattern rules | [lib/patterns/rules.ts](../lib/patterns/rules.ts) | 8 production rules |
| Pattern executor | [lib/patterns/detector.ts](../lib/patterns/detector.ts) | Runs rules against current data |
| Recommendation | [lib/patterns/recommendations.ts](../lib/patterns/recommendations.ts) | Rule → intervention type lookup |
| AI client | [lib/ai/gemini.ts](../lib/ai/gemini.ts) | Cached Gemini wrapper, fallback paths |
| AI prompts | [lib/ai/narrative.ts](../lib/ai/narrative.ts) | Risk / recommendation / school summary prompts |
| Run engine (admin) | [app/admin/algorithm/page.tsx](../app/admin/algorithm/page.tsx) | UI to trigger recompute + edit weights |
| Run engine (CLI) | [scripts/run-risk-engine.ts](../scripts/run-risk-engine.ts) | One-off engine runner |
| What-If simulator | [app/counselor/what-if/page.tsx](../app/counselor/what-if/page.tsx) | Live engine over hypothetical inputs |
| Audit trail | [app/counselor/students/[id]/audit/page.tsx](../app/counselor/students/%5Bid%5D/audit/page.tsx) | Chronological event view per student |

---

## 8. Glossary

- **EWS** — Early Warning System. The education-research term for systems that combine student data into a risk indicator.
- **ABC of EWS** — Attendance, Behavior, Course performance — the three signal families most EWSs use.
- **SAW** — Simple Additive Weighting. The formal name for the weighted-sum scoring model.
- **MCDA** — Multi-Criteria Decision Analysis. The OR branch that studies how to combine multiple criteria into a decision score.
- **Production rule** — In AI, a single "if conditions, then conclusion" statement. The building block of rule-based systems.
- **Symbolic AI** — AI built on explicit rules and logic, in contrast to **statistical / neural AI** which learns from data.
- **Human-in-the-loop** — A system design where the algorithm informs but does not finalise decisions; a human is always the final actor.
- **Hybrid / neuro-symbolic** — Architectures that combine symbolic (rule-based) and neural (LLM/ML) components, each doing what it is best at.
- **Composite risk index** — Any score that combines multiple weighted indicators into one number. The risk score here is a composite risk index.
- **Pure function** — A function whose output depends only on its inputs, with no side effects. The risk engine is a pure function; this is what makes scores reproducible.
