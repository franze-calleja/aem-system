# AEM Development Phases — Progress Tracker

A living checklist for building the AEM system. Mirrors the spec's 7-week roadmap ([§15](AEM_System_Specification.md)) but expanded into verifiable tasks with current status.

**Update rule:** when a task ships, check it off and note the commit / PR. When a phase ends, write a one-line retrospective. Treat unchecked tasks as binding — don't move to the next phase with foundational gaps.

---

## Repo Snapshot — 2026-05-11

**Stack:** Next.js 16.2.4 (App Router) · React 19.2.4 · TypeScript · Tailwind v4 · Dev port 3010

**Existing work:** ~5,300 LOC of UI scaffolding (no backend).
- Mock login → role redirect
- Teacher pages: My Classes, Class Roster, Student Risk Overview/Detail, Intervention Feedback
- Counselor pages: Caseload, Student Profile, Intervention Builder, Feedback Queue
- Admin / Principal: shell placeholder
- State: `localStorage` only
- Duplicated, inconsistent domain types across two store files
- Hardcoded school year strings

**Missing foundation (the entire Phase 1):**
- No database / Prisma / migrations
- No real auth, sessions, or middleware
- No RBAC enforcement at the route or query level
- No audit logging
- No API routes — everything is client state
- No year/enrollment split
- No consent records
- No risk-scoring engine, pattern detector, recommendation engine
- No Gemini integration

**Implication:** Phase 1 starts from zero on the backend. Existing UI is reference scaffolding — most will be rewired (not rewritten) to real APIs as each module's backend lands.

---

## Phase 0 — Pre-flight ✅ *(complete 2026-05-11)*

- [x] Run `npm install` (node_modules absent)
- [x] Read `node_modules/next/dist/docs/` for Next 16 breaking changes (per AGENTS.md)
- [x] Confirm Postgres availability — chose **local Docker Compose** (`docker-compose.yml`, port 5433 to avoid host conflicts)
- [x] Decide auth approach — chose **Auth.js v5**
- [x] Add `.env.example` documenting required env vars (DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY)
- [ ] Set up Prettier + commit hooks (optional — skipped)

---

## Phase 1 — Foundations ✅ *(complete 2026-05-11)*

**Goal:** Login flow works for all four roles, backed by real auth, real DB, RBAC enforced, audit log capturing writes. Seed data exists.

### 1.1 Database & Schema
- [x] Install Prisma; configure `DATABASE_URL` (moved to `prisma.config.ts` for Prisma 7)
- [x] Schema: `User`, `Student` (+ `SpedStatusChange`), `SchoolYear`, `Section`, `Subject`, `StudentEnrollment`, `TeacherAssignment`, `ConsentRecord`, `AuditLog`
- [x] First migration applied (`prisma/migrations/20260511140850_init/`)
- [x] Seed script: 1 admin, 2 teachers (one adviser of 9-Newton), 1 counselor, 1 principal, 1 school year (SY 2025-2026 active), 2 sections (Newton, Curie), 5 subjects, 10 students with enrollments + 3 consents each (30 total)

### 1.2 Auth & Session
- [x] Auth.js v5 (`next-auth@beta`) with Credentials provider
- [x] bcryptjs password hashing
- [x] JWT sessions with role embedded in token + session
- [x] Login form rewired to real auth via [app/actions/auth.ts](app/actions/auth.ts) — `MOCK_ACCOUNTS` removed
- [x] Logout server action wired into sidebar + workspace header

### 1.3 RBAC
- [x] **Next 16 `proxy.ts`** (renamed from `middleware.ts`) — unauth → `/?from=...`, role mismatch → `/?forbidden=1`
- [x] `/admin/**` admin-only, `/teacher/**` teacher-only, `/counselor/**` counselor-only, `/principal/**` principal-only
- [x] Server-side helpers `requireSession` / `requireRole` / `roleLandingPath` in [lib/session.ts](lib/session.ts)
- [ ] **Prisma extension layer for query-level enforcement — DEFERRED to Phase 2** (will add when first data-bearing API routes land; current proxy-only is sufficient for Phase 1 with zero domain endpoints)
- [ ] **Append-only AuditLog enforced at DB grants level — DEFERRED to Phase 7** (currently enforced only in app layer)

### 1.4 Audit
- [x] `logAudit({ action, userId, resourceType, resourceId, metadata })` in [lib/audit.ts](lib/audit.ts) — captures IP + user-agent from `headers()`
- [x] Auth.js `events.signIn` → LOGIN audit (covers every entry path)
- [x] Auth.js `events.signOut` → LOGOUT audit
- [x] Credentials `authorize` → LOGIN_FAILED audit with reason metadata
- [x] Year switch → YEAR_SWITCHED audit

### 1.5 Global Shell
- [x] [components/shell/year-switcher.tsx](components/shell/year-switcher.tsx) reads from `SchoolYear` table
- [x] Selection persisted via httpOnly cookie (`aem_active_year`); fallback to `isActive` row
- [x] Historical-year banner in `RoleWorkspace`
- [x] Role-aware sidebar already in place; logout button wired

### Phase 1 Definition of Done — Verified 2026-05-11
- [x] All seeded users can log in with their real credentials (verified counselor + teacher via Auth.js callback)
- [x] Teacher cannot access `/admin` (verified 307 → `/?forbidden=1`)
- [x] Login, LOGIN_FAILED, LOGOUT all appear in `AuditLog` with userId + metadata
- [x] Year Switcher shows seeded `SY 2025-2026`; cookie-driven switch wired
- [x] Typecheck clean for all Phase 1 code (pre-existing scaffolding errors in `teacher-class-store.ts` carry over — to be replaced in Phase 2)

**Phase 1 retrospective:**
- **Prisma 7 surprise** — `datasource.url` was removed in Prisma 7; URL now lives in `prisma.config.ts` and the client needs a driver adapter (`@prisma/adapter-pg`). Cost ~10 minutes. Worth noting for future ORM upgrades.
- **Next 16 `middleware → proxy` rename** — caught early by reading bundled docs first. Used `proxy.ts` from the start, no rework.
- **Auth.js v5 events vs server-action audit** — first pass put audit in the server action only, which missed any direct Auth.js callback hit (e.g. cURL test). Moved to `events.signIn` / `authorize` so audit fires regardless of entry path. Lesson: instrument the framework, not the wrapper.
- **Deferred items** — Prisma RBAC extension and DB-level append-only audit are documented above. Track in Phase 2 / Phase 7 entries respectively.

---

## Phase 1.5 — UI Alignment ✅ *(complete 2026-05-11)*

**Goal:** Bring the scaffolded UI in line with Next 16 best practices and the spec's "year-scoped every analytical view" rule before adding Phase 2 features.

### What changed
- [x] New [components/shell/role-shell.tsx](components/shell/role-shell.tsx) — async server component that renders SidebarProvider + sidebar + sticky top bar (year switcher + logout + historical banner). Used by all role layouts.
- [x] New [components/shell/role-overview.tsx](components/shell/role-overview.tsx) — role landing page content (title + description + metrics + nav cards). Used by 4 role landing pages.
- [x] 4 new `app/{role}/layout.tsx` files — each calls `requireRole(...)` server-side (defense-in-depth on top of `proxy.ts`) and renders `<RoleShell>`.
- [x] 4 role config modules (`components/roles/{role}/{role}-config.ts`) — single source of truth for each role's badge/title/description/theme/nav/metrics.
- [x] 4 role landing pages slimmed to 12 lines each — just call `<RoleOverview>` with the role's config.
- [x] 9 subpages stripped of duplicated `SidebarProvider + RoleSidebar + SidebarInset` boilerplate. Each is now 4-10 lines and renders only the page's own content.
- [x] Deleted 5 obsolete files: `components/roles/shared/role-workspace.tsx` + 4 `components/roles/{role}/{role}-workspace.tsx`.
- [x] Removed user-visible hardcoded "SY 2024-2025" string in `caseload-dashboard.tsx`.

### What stayed
- All localStorage stores (`teacher-class-store.ts`, `counselor-store.ts`) — they get replaced in Phase 2/3 as each feature wires to real APIs.
- Logout's localStorage cleanup — needed until the stores are gone (cross-session data leak otherwise).
- Hardcoded "SY 2024-2025" inside the localStorage stores — same; dies with the stores.
- Visual design (Tailwind tokens, sidebar component, color themes).

### Verified
- [x] Typecheck — clean for all Phase 1.5 code. Pre-existing scaffolding errors in `teacher-class-store.ts` remain (out of scope).
- [x] Smoke tests — teacher landing + 3 teacher subpages → 200. Counselor landing + 3 counselor subpages → 200. Admin landing → 200. Principal landing → 200.
- [x] Cross-role denial — teacher → /counselor, /admin, /principal all return 307 → /?forbidden=1.
- [x] Year Switcher renders on every role landing and every subpage (single source: the layout).
- [x] Historical-year banner mechanism intact (toggles when active year ≠ current).

### Phase 1.5 retrospective
- **Postgres container had stopped** between sessions; volume `aem_pgdata` preserved all data so `docker compose up -d` brought everything back. Lesson: add a "Postgres still running?" check to the start of any session.
- **Layouts replace 9 duplicated shells** — net code shrinkage of ~250 lines. Year Switcher and historical banner now propagate to every page automatically; no per-page maintenance.
- **Defense-in-depth RBAC** — `proxy.ts` (edge) + `requireRole` in `app/{role}/layout.tsx` (page) is now in place. Third layer (Prisma extension for query-level) lands in Phase 2 when data-bearing endpoints arrive.
- **Principal theme** corrected from `amber` (which clashed with counselor) to `rose`. Each role now has a distinct color.

---

## Phase 2 — Data Capture & Import *(Week 2)*

**Goal:** Teachers can record daily data; admin can bulk-import. All data is year-scoped and RBAC-respected.

### 2.1 Student & Enrollment APIs
- [ ] CRUD for `Student` (admin)
- [ ] CRUD for `StudentEnrollment` per year (admin)
- [ ] Admin pages: Student list, Enrollment list per year

### 2.2 Academic Tracking
- [ ] Schema: `Subject` (already in Phase 1), `Grade` (id, enrollmentId, subjectId, quarter, score, maxScore, assessmentKind)
- [ ] API routes for grade entry (teacher scope-restricted)
- [ ] Wire Teacher → Gradebook UI to real API (replace `teacher-class-store.ts` localStorage)
- [ ] Pre-test / Post-test fields supported

### 2.3 Attendance
- [ ] Schema: `Attendance` (id, enrollmentId, date, status)
- [ ] API routes for attendance entry (teacher scope-restricted, keyboard-driven UX preserved)
- [ ] Wire Teacher → Attendance Sheet UI to real API
- [ ] Computed metrics on read: absence rate, tardiness rate, 30-day rolling, consecutive absence flag

### 2.4 Import Wizard (Admin)
- [ ] Stepper UI scaffolding (school year picker first)
- [ ] CSV parser with row-level validation
- [ ] Roster import: matches by LRN, creates Student + StudentEnrollment
- [ ] Grades import: validates LRN against year enrollment
- [ ] Attendance import: monthly chunk support
- [ ] Preview first 20 rows before commit
- [ ] Transactional commit (full success / full rollback)
- [ ] Error report with row numbers + reasons
- [ ] Import event logged in AuditLog with file metadata, row count, importer ID

### 2.5 Student Profile (basics)
- [ ] Counselor + Principal access to Full Student Profile shell
- [ ] Tabs: Overview, Academic Trends (line charts), Attendance (heatmap)
- [ ] Cross-year toggle (show data across enrollments)

### Phase 2 Definition of Done
- [ ] Teacher logs attendance + grades that persist to DB and survive refresh
- [ ] Admin imports a 240-row roster CSV (with intentional errors) and the wizard reports them with row numbers
- [ ] Imported data appears immediately in teacher views
- [ ] Counselor sees Maria's academic trend line chart from imported data
- [ ] All writes appear in AuditLog

**Phase 2 retrospective:** _(fill in when done)_

---

## Phase 3 — Behavioral, Counseling & Intervention Module *(Week 3)*

**Goal:** Counselors manage caseloads end-to-end; teachers submit feedback and log sessions. Multi-scope interventions work with the approval workflow.

### 3.1 Behavioral & SEL
- [ ] Schema: `BehavioralRecord`, `SELAssessment`
- [ ] Teacher: Behavioral Incident Logger (real API)
- [ ] Counselor: SEL Assessment CRUD
- [ ] Teacher view restricted to limited fields; counselor sees full

### 3.2 Counseling Notes
- [ ] Schema: `CounselingNote` (id, studentId, authorId, content, createdAt)
- [ ] API: counselor-only read/write enforced at Prisma layer
- [ ] Teacher / Admin cannot fetch even by direct API request
- [ ] Counselor → Student Profile → Counseling Notes tab wired
- [ ] Every read logged in AuditLog

### 3.3 Intervention Module (Multi-Scope)
- [ ] Schema: `Intervention` (id, scope, scopeTargetId, type, frequency, startDate, endDate, schedule, accommodations, staffActions, targetOutcomes, status, schoolYearId, ownerId)
- [ ] Schema: `InterventionSensitive` (id, interventionId, rationale, counselingContext) — separate table for stricter access
- [ ] Schema: `InterventionParticipation` (id, interventionId, enrollmentId, outcome)
- [ ] Schema: `InterventionNote` (id, interventionId, type enum, authorId, content, status, createdAt) — observation / revision_request / outcome_observation
- [ ] Schema: `InterventionRevision` (id, interventionId, changedBy, diff json, reason, triggeringNoteId nullable, isSignificant, isInterim, approvedBy nullable, createdAt)
- [ ] Schema: `InterventionSession` (id, interventionId, conductedBy, date, duration, attendingEnrollmentIds, observations)

### 3.4 Intervention Builder & Workflow
- [ ] Counselor → Intervention Builder wired to real API (replace [counselor-store.ts](components/roles/counselor/counselor-store.ts) localStorage)
- [ ] Scope picker (Individual / Section / Grade / School-Wide)
- [ ] Public vs sensitive field separation enforced server-side
- [ ] Individual scope: save → activate directly
- [ ] Broader scopes: save → status = pending approval
- [ ] Principal → Approval Center wired to real API
- [ ] Approval action: status → active; rejection records reason

### 3.5 Feedback & Revision Workflow
- [ ] Teacher → Intervention View: Log Session, Submit Observation, Submit Revision Request, Submit Outcome Observation
- [ ] Counselor → Feedback Queue wired to real API
- [ ] Disposition actions: Acknowledge / Incorporate / Discuss
- [ ] Incorporate opens Builder in revision mode; save creates `InterventionRevision` linked to triggering note
- [ ] Significant-change detector: scope, type, duration-beyond-threshold, target population → flags isSignificant
- [ ] Significant revisions to broader-scope plans route to Principal re-approval queue
- [ ] Interim Revision action (principal only) with mandatory justification, isInterim flag

### 3.6 Visibility Enforcement
- [ ] Intervention API filters fields by viewer role and scope (per matrix in [AEM_FLOW.md §5](AEM_FLOW.md))
- [ ] Admin sees metadata only (no rationale, no notes, no sessions)
- [ ] Section adviser elevation: sees public fields for all interventions in their advisory section

### Phase 3 Definition of Done
- [ ] Counselor creates individual intervention end-to-end; teacher sees public fields only
- [ ] Teacher submits revision request; counselor incorporates; revision logged with linked note
- [ ] Section-wide intervention requires principal approval before activation
- [ ] Significant revision to active section-wide plan triggers re-approval
- [ ] Counselor cannot see other counselors' notes? (decide policy — spec says all counselors share)
- [ ] Teacher cannot fetch counseling notes via direct API call (returns 403)

**Phase 3 retrospective:** _(fill in when done)_

---

## Phase 4 — Algorithmic Engine *(Week 4)*

**Goal:** Risk scoring, pattern detection, and recommendation drafts run on real data. Explainability surfaces are wired.

### 4.1 Risk Scoring Engine
- [ ] Pure functions per sub-score: academic, attendance, behavioral, intervention history, profile
- [ ] Documented formulas (constants in one config module)
- [ ] Weighted sum + band classification
- [ ] Schema: `RiskAssessment` (id, enrollmentId, score, band, factors json, computedAt, schoolYearId)
- [ ] Schema: `AlgorithmConfig` (id, weights json, thresholds json, version, changedBy, changedAt, justification) — versioned
- [ ] Recompute trigger on input changes; 24h cache
- [ ] Scheduled weekly recompute job

### 4.2 Multi-Scope Pattern Detector
- [ ] Rule engine config (toggleable per rule per scope)
- [ ] Student-level rules: Academic Decline Cluster, Disengagement Signal, Crisis Warning, Recovery Tracking, Chronic Concern
- [ ] Section-level rules: Concentrated Risk, Subject Struggle, Attendance Erosion
- [ ] Grade-level rules: Transition Difficulty, Cohort Trend
- [ ] School-level rules: Day-of-Week Effect, Year-Over-Year Drift
- [ ] Schema: `PatternMatch` (id, scope, scopeTargetId, ruleId, evidence json, matchedAt)
- [ ] Routing: matches route to appropriate role inboxes

### 4.3 Recommendation Engine
- [ ] Mapping table: risk profile signature → recommended type + scope
- [ ] Schema: `RecommendationDraft` (id, scope, scopeTargetId, suggestedType, rationale, evidence json, triggeringPatternId nullable, status: open/dismissed/instantiated, createdAt)
- [ ] Counselor Recommendation Queue wired to real API
- [ ] "Open in Builder" pre-fills new intervention; on save links draft → intervention and marks draft as instantiated
- [ ] Dismissed drafts remain as audit evidence

### 4.4 Explainability Surfaces
- [ ] Explainability Panel component reads `RiskAssessment.factors`
- [ ] Tooltip on every risk badge across teacher / counselor / principal views
- [ ] "How does this work?" static pages for Risk, Pattern, Recommendation (plain-language)
- [ ] Algorithm Config UI for admin (weight editor, threshold editor, rule toggles) — changes versioned

### Phase 4 Definition of Done
- [ ] Maria's risk score recomputes when grades or attendance change
- [ ] Academic Decline Cluster fires for a fixture student
- [ ] Recommendation draft appears in counselor queue with rationale
- [ ] Admin changes risk weight; change is versioned and logged; next recompute uses new weights
- [ ] Every risk badge has a working ⓘ icon → Explainability Panel

**Phase 4 retrospective:** _(fill in when done)_

---

## Phase 5 — Dashboards & Cross-Year Views *(Week 5)*

**Goal:** Insights are visible at every level. Cohort comparison works across years.

### 5.1 Teacher Dashboards
- [ ] Class-Level Dashboard: risk distribution chart, attendance trend, performance trend
- [ ] Pattern Alerts Panel (student + section scope, scoped to teacher's sections)
- [ ] At-Risk Students Panel sorted by score

### 5.2 Counselor Dashboards
- [ ] Caseload Dashboard wired to real risk data
- [ ] Pattern Detection Inbox (all four scopes)
- [ ] Outcome Tracking view

### 5.3 Principal Dashboards
- [ ] School-Wide Dashboard with drill-down: school → grade → section → student
- [ ] Risk distribution by grade level, section, sex, learning modality

### 5.4 Cohort Analysis
- [ ] Select grade level + multiple school years
- [ ] Side-by-side risk band distributions, intervention counts, outcome rates
- [ ] Year-over-year drift indicators
- [ ] CSV export

### Phase 5 Definition of Done
- [ ] Principal opens Cohort Analysis and compares Grade 9 across 3 SYs from seed data
- [ ] Counselor's Pattern Inbox shows live matches across all scopes
- [ ] Teacher's class dashboard reflects up-to-date risk distribution

**Phase 5 retrospective:** _(fill in when done)_

---

## Phase 6 — AI Layer (Gemini) & Literacy Features *(Week 6)*

**Goal:** Natural-language layer over algorithmic outputs; users can interact with the algorithm to learn.

### 6.1 Gemini Integration
- [ ] Server-side Gemini client (key in env)
- [ ] Aggressive caching by content hash
- [ ] Graceful fallback: when quota exhausted / consent revoked / network fails, display algorithmic output only
- [ ] Risk narrative generator (input: factor breakdown → output: 2–3 sentence plain-language explanation)
- [ ] Recommendation narrative generator (input: RecommendationDraft → output: editable plan text)
- [ ] Section / grade / school summary generator for principal

### 6.2 AI Literacy Features
- [ ] Interactive Risk Simulator ("What-If") page
- [ ] Decision Audit Trail page (per student)
- [ ] AI Literacy Assistant (chat, page-context-aware)
- [ ] Consent-aware: AI features disabled per student where AI consent revoked

### Phase 6 Definition of Done
- [ ] Risk score shows both factor breakdown (always) and Gemini narrative (when AI consent active)
- [ ] What-If simulator updates score in real time without page reload
- [ ] When `GEMINI_API_KEY` is unset, app still works — narratives fall back to template

**Phase 6 retrospective:** _(fill in when done)_

---

## Phase 7 — Governance Polish, QA, Demo Data *(Week 7)*

**Goal:** Production-ready demo. Consent, bias monitoring, and final hardening.

### 7.1 Consent Management UI
- [ ] Admin → Consent Management page
- [ ] Per-student, per-scope view with revocation action
- [ ] Revocation degrades features without deleting data

### 7.2 Bias Monitoring
- [ ] Schema: `BiasMetric` (computed snapshots)
- [ ] Dashboard: risk band distribution across sex / learning modality / SPED status
- [ ] Disparity threshold flags
- [ ] Principal drill-down

### 7.3 Override Workflow
- [ ] Principal → Risk Override (mandatory justification)
- [ ] Override record linked to original assessment
- [ ] Override visible indicator on student profile

### 7.4 Demo Data
- [ ] Generate 3 school years of synthetic data (~240 students/year, full grades/attendance/behavior)
- [ ] At least one student matching every pattern rule
- [ ] At least one closed intervention per scope with outcome

### 7.5 QA Sweep
- [ ] Walk every scene in [AEM_Scenario_Maria.md](AEM_Scenario_Maria.md) end-to-end
- [ ] All verification checklist items pass
- [ ] Type check, lint, build all clean
- [ ] Smoke test on tablet viewport (Teacher attendance + gradebook)

### Phase 7 Definition of Done
- [ ] Maria scenario (Scenes 0–12) walkable without intervention
- [ ] All Master Verification Checklist items pass
- [ ] Demo-ready

**Phase 7 retrospective:** _(fill in when done)_

---

## Cut Order (if running behind)

Per spec §15. Cut from the top of this list first. **Never cut anything below the line.**

1. AI Literacy Assistant
2. Gemini-drafted recommendations (use templates)
3. SEL module
4. Cross-year cohort views
5. Broader-scope interventions (start with individual only)
6. In-app discussion on notes (keep acknowledge / incorporate only)

— DO NOT CROSS —

- Risk scoring + Explainability
- Audit log
- Consent
- Role-based access (DB-enforced)
- Individual interventions
- Basic feedback workflow

---

## Working Agreements

- **One phase per working session** unless a phase is small. Don't half-finish a phase to jump ahead.
- **Update this file** at the start and end of every session: check off completed tasks, write the phase retrospective when closed, note blockers inline.
- **No new UI without backend.** If a screen can't talk to a real API, don't build it — wire existing scaffolding to the API instead.
- **Migrations are commits.** Every schema change ships with its migration file in the same PR.
- **Audit log is never optional.** If a write isn't logged, it's not done.
- **RBAC is enforced at the query layer**, not just routes. Test by hand-crafting an API request as the wrong role.
- **Walk the scenario** ([AEM_Scenario_Maria.md](AEM_Scenario_Maria.md)) at each phase boundary. Catch drift early.
