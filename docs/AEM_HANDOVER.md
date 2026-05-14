# AEM System — Session Handover

**Last session ended:** 2026-05-14 (Phases 2.5 + 4 complete; Phase 3.1 schema + 3.2 counseling notes + 3.3 intervention builder shipped — builder is counselor-side only, approval center is next)
**Next session starts at:** Phase 3.4 — Principal Approval Center (list PENDING_APPROVAL interventions; approve → status ACTIVE + audit INTERVENTION_APPROVED; reject → status CANCELLED + reason in InterventionRevision + audit INTERVENTION_REVISED)

This document is for the AI agent picking up the next session cold. **Read it first**, then read the files it points to.

---

## 1. Where to start — file reading order (10 min)

1. **[CLAUDE.md](../CLAUDE.md)** — non-negotiable project conventions (Next 16 / React 19 / Auth.js v5 / Prisma 7 specifics, RBAC layers, audit requirements). Read in full.
2. **[docs/AEM_Development_Phases.md](AEM_Development_Phases.md)** — phase tracker. Scroll to the Phase 3 section: that's the active work. Phases 0–2.5 and 4 are complete.
3. **[docs/AEM_System_Specification.md](AEM_System_Specification.md)** — spec §7 (Intervention Module), §8 (Counseling Notes), §6.6 (visibility matrix). These are the sections relevant to Phase 3.
4. **[docs/AEM_FLOW.md](AEM_FLOW.md)** — page map §4 (Counselor pages), §5 (visibility matrix). Consult for the intervention builder, approval center, and feedback queue.
5. **[docs/AEM_Scenario_Maria.md](AEM_Scenario_Maria.md)** — Scenes 3-10 are the reference walkthrough for Phase 3.

---

## 2. Current state — what's shipped

| Phase | Status | Coverage |
|---|---|---|
| 1 — Foundations | ✅ | Auth.js v5, Prisma 7 schema, RBAC proxy, audit log helper, seed users |
| 1.5 — UI Alignment | ✅ | Role layouts, RoleShell/RoleOverview, removed duplicated sidebar boilerplate |
| 2a — Schema + Roster import | ✅ | Grade/Attendance/BehavioralRecord models, Import Wizard Steps 1-2 |
| 2b — Remaining imports | ✅ | Grades / Attendance / Behavioral CSV steps; generic `<CsvStep>` |
| 2c — Teacher UI on DB | ✅ | My Classes, Class detail (4 tabs), 3 server actions |
| 2d — Counselor + Principal profile | ✅ | DB-backed caseload, shared `<StudentProfileView>` |
| 2.5 — Admin UI gaps | ✅ | Users, School setup, Audit log, Consent management; all admin tasks UI-complete |
| 4 — Algorithmic Engine | ✅ | Risk scoring engine, 8 pattern rules (student + section scope), recommendation engine, explainability panel, admin algorithm config UI |

**Phase 3 (Intervention Module) has NOT been started.** See Section 3 for the full plan.

**Audit at end of Phase 3.1 (2026-05-14):**
- `npx tsc --noEmit` ✅ zero errors
- Migration state clean (`prisma migrate status` → "Database schema is up to date")
- 5 migrations applied (latest: `20260514141749_add_intervention_counseling`)
- DB state: 1 active SY, 2 sections, 5 subjects, 5 users, 20 students, AlgorithmConfig v1 seeded (isActive=true), 0 RiskAssessment rows, 0 Intervention/CounselingNote rows (tables created, awaiting Phase 3.2+ writes)

---

## 3. Next phase — Phase 3: Behavioral, Counseling & Intervention Module

**Why this comes before Phase 5/6:** Phase 3 delivers the intervention lifecycle that counselors actually use. Phase 4 recommendation drafts already exist in the DB — but "Open in Builder" (converting a draft to a real intervention) can't be wired until the intervention schema exists. Phase 3 unblocks that link and feeds the `interventionHistory` sub-score in the risk engine.

**Estimated effort:** 2-3 sessions. The schema is the biggest upfront cost; the workflow is incremental after that.

### 3.1 Schema migration *(✅ shipped 2026-05-14 — `20260514141749_add_intervention_counseling`)*

**Deviation to note:** `InterventionSession` was dropped. Session logging is captured via `InterventionNote(noteType=OBSERVATION)` rows per the original plan — keeps the feedback channel uniform. Revisit only if grouping by physical session becomes necessary.

Six new models to add to `prisma/schema.prisma`:

```
CounselingNote      id, enrollmentId (FK), authorId (FK→User), body, createdAt, updatedAt
Intervention        id, scope (PatternScope), scopeTargetId, type, status, schoolYearId,
                    ownerId (FK→User), startDate, endDate?, schedule?, accommodations?,
                    staffActions?, targetOutcomes?, triggeringRecommendationId? (FK→RecommendationDraft SET NULL),
                    createdAt, updatedAt
InterventionSensitive  id, interventionId (1-1 FK→Intervention), rationale, counselingContext
InterventionParticipation  id, interventionId (FK), enrollmentId (FK), outcome? (enum: IMPROVING/STABLE/DECLINING/COMPLETED)
InterventionNote    id, interventionId (FK), authorId (FK→User), noteType (enum: OBSERVATION/REVISION_REQUEST/OUTCOME_OBSERVATION),
                    content, status (enum: OPEN/ACKNOWLEDGED/INCORPORATED/DISMISSED), createdAt
InterventionRevision  id, interventionId (FK), changedById (FK→User), diff (Json), reason, triggeringNoteId? (FK→InterventionNote SET NULL),
                      isSignificant (Boolean), isInterim (Boolean), approvedById? (String, no FK), createdAt
```

New enums: `InterventionScope` (alias for PatternScope or reuse it), `InterventionStatus` (DRAFT/PENDING_APPROVAL/ACTIVE/COMPLETED/CANCELLED), `InterventionType` (ACADEMIC_SUPPORT/COUNSELING_SESSION/IMMEDIATE_COUNSELING/POSITIVE_REINFORCEMENT/CASE_REVIEW/SECTION_INTERVENTION/SUBJECT_REMEDIATION/ATTENDANCE_PROGRAM), `InterventionNoteType`, `InterventionNoteStatus`, `ParticipationOutcome`.

New AuditActions to add to the enum: `COUNSELING_NOTE_CREATED`, `COUNSELING_NOTE_READ`, `INTERVENTION_CREATED`, `INTERVENTION_ACTIVATED`, `INTERVENTION_CANCELLED`.

After schema: `npm run db:migrate` with a descriptive name (`add_intervention_counseling`).

### 3.2 Counseling Notes (counselor-only, Phase 3.2)

- Server action `createCounselingNoteAction` in `app/actions/counselor/notes.ts`:
  - `requireRole("COUNSELOR")`, Zod-validate `{ enrollmentId, body }`, create `CounselingNote`, `logAudit({ action: "COUNSELING_NOTE_CREATED" })`
- Query helper `getCounselingNotes(enrollmentId, viewerRole)` in `lib/student/queries.ts`:
  - Returns notes only if `viewerRole === "COUNSELOR"` — otherwise returns `[]`
  - Every successful fetch calls `logAudit({ action: "COUNSELING_NOTE_READ" })`
- Wire into `StudentProfileView` — the "Counseling Notes" chip is already stubbed; enable it for counselors only
- Teacher hitting the notes API directly → 403 (enforced at the query layer, not just UI)

### 3.3 Intervention Builder (Phase 3.3)

- New page `app/counselor/interventions/new/page.tsx` (currently a stub at `app/counselor/interventions/page.tsx`)
- Server action `createInterventionAction` in `app/actions/counselor/interventions.ts`:
  - `requireRole("COUNSELOR")`, Zod-validate all fields
  - Individual scope → status = ACTIVE directly
  - Section/Grade/School scope → status = PENDING_APPROVAL
  - Creates `InterventionSensitive` row alongside `Intervention`
  - If `triggeringRecommendationId` provided: mark that `RecommendationDraft` as INSTANTIATED
  - `logAudit({ action: "INTERVENTION_CREATED" })`
- Counselor intervention list page (`/counselor/interventions`) showing status, scope, owner, dates
- Intervention detail page showing public fields + sensitive fields (for owner/principal only)

### 3.4 Principal Approval Center (Phase 3.4)

- New page `app/principal/approvals/page.tsx` — lists PENDING_APPROVAL interventions
- Server action `approveInterventionAction` / `rejectInterventionAction` in `app/actions/principal/interventions.ts`:
  - `requireRole("PRINCIPAL")`, Zod-validate `{ interventionId, reason? }`
  - Approve: status → ACTIVE; `logAudit({ action: "INTERVENTION_APPROVED" })`
  - Reject: status → CANCELLED with reason in a new `InterventionRevision` row; `logAudit({ action: "INTERVENTION_REVISED" })`
- Principal nav: add "Approval queue" entry

### 3.5 Teacher Feedback + Revision Workflow (Phase 3.5)

- Wire `app/teacher/intervention-feedback/page.tsx` (currently a stub)
- Teacher sees active interventions for their sections (public fields only — no rationale, no counselingContext)
- Server actions in `app/actions/teacher/intervention-feedback.ts`:
  - `logSessionAction` — creates `InterventionNote` (type: OBSERVATION)
  - `submitRevisionRequestAction` — creates `InterventionNote` (type: REVISION_REQUEST, status: OPEN)
  - `submitOutcomeObservationAction` — creates `InterventionNote` (type: OUTCOME_OBSERVATION)
- Counselor feedback queue (`/counselor/feedback`) — currently a stub:
  - Lists open `InterventionNote` rows for counselor-owned interventions
  - Disposition actions: Acknowledge / Incorporate / Dismiss
  - Incorporate → opens the intervention in "revision mode"; saving creates an `InterventionRevision` linked to the triggering note
  - Significant-change detector: scope change, type change, duration > 30 days beyond original → sets `isSignificant=true` → routes to principal re-approval queue

### 3.6 Visibility Enforcement (Phase 3.6)

Enforce at the query layer (not just the UI):

| Viewer | Can see |
|---|---|
| TEACHER | Intervention: scope, type, status, dates, staffActions, targetOutcomes (public fields only). No rationale, no counselingContext, no notes. |
| COUNSELOR | Everything for interventions they own; public fields for others' interventions |
| PRINCIPAL | Everything except counseling note bodies |
| ADMIN | Metadata only: scope, type, status, dates, ownerId — no rationale, no notes, no sessions |
| Section Adviser | Public fields for all interventions targeting their advisory section |

Write a `getIntervention(id, viewerRole, viewerUserId)` query helper in `lib/intervention/queries.ts` that strips fields at the query level.

### Phase 3 Definition of Done
- [ ] Counselor creates individual intervention end-to-end; teacher sees public fields only (no rationale)
- [ ] Teacher submits revision request; counselor incorporates; `InterventionRevision` created linked to the note
- [ ] Section-wide intervention stays PENDING_APPROVAL until principal approves; becomes ACTIVE after approval
- [ ] Significant revision to active section-wide plan triggers principal re-approval
- [ ] Teacher hitting counseling notes API directly → 403/empty (enforced at query layer)
- [ ] Recommendation draft "Open in Builder" pre-fills intervention builder; on save marks draft as INSTANTIATED
- [ ] `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds
- [ ] Tracker updated with retrospective

---

## 4. Conventions you must follow (summary; full version in CLAUDE.md)

| Topic | Rule |
|---|---|
| Server-first | Server Components by default. Add `"use client"` only when needed (forms, transitions, browser APIs). |
| Async APIs | Next 16: `cookies()`, `headers()`, `params`, `searchParams` are async — always `await`. |
| Middleware | File is **`proxy.ts`** (not `middleware.ts`). Node runtime only. |
| Prisma | URL lives in `prisma.config.ts`, **not** `schema.prisma`. Client needs `@prisma/adapter-pg`. |
| Mutations | Server actions only — `"use server"`, Zod input, `requireRole(...)`, `logAudit(...)`, return `{ ok: true } \| { ok: false, error }`. |
| RBAC | Three layers: `proxy.ts` (edge) + `requireRole` in `app/{role}/layout.tsx` (page) + query-layer filter (when reading scoped data). |
| Audit | Every write logs. Sensitive reads log. Auth events centrally in `auth.ts` (`events.signIn/signOut`, `authorize`). |
| State | **NO `localStorage`** for domain data. Cookies for session/year prefs only. |
| Year scoping | Every analytical query takes `schoolYearId`. Get it from `getActiveSchoolYear()` in `lib/active-year.ts`. |
| Sensitive fields | Counseling note bodies + intervention rationale/counselingContext → query-layer field stripping, not just UI hiding. |
| requireRole signature | Takes `Role \| Role[]` — e.g. `requireRole(["COUNSELOR", "PRINCIPAL"])`, not spread args. |
| Scope | Stay in-phase. New work goes into the tracker under the appropriate phase, not snuck into this one. |
| Abstractions | Three similar lines beats a premature framework. Add the abstraction on the second use. |

---

## 5. Start-of-session checklist

```bash
# 1. Confirm Docker is up (volume persists data across sessions)
docker ps --filter "name=aem-postgres"
# If not running:
docker compose up -d
# Wait for ready:
until docker exec aem-postgres pg_isready -U aem -d aem; do sleep 1; done

# 2. Confirm DB has data
docker exec aem-postgres psql -U aem -d aem -c "SELECT COUNT(*) FROM \"User\";"
# Expected: ≥5. If 0, run: npm run db:reset && npm run db:seed

# 3. Confirm codebase is clean
npx tsc --noEmit       # should be zero output
npm run lint           # should be zero errors

# 4. Read the tracker
# docs/AEM_Development_Phases.md — Phase 3 section shows the next tasks

# 5. Dev server
npm run dev            # http://localhost:3010
```

**Seed accounts:**

| Email | Password | Role |
|---|---|---|
| `admin@school.edu` | `admin123` | ADMIN |
| `teacher@school.edu` | `teacher123` | TEACHER (Mr. Reyes, Math 9-Newton) |
| `adviser@school.edu` | `adviser123` | TEACHER (Mrs. Lim, English + adviser of 9-Newton) |
| `counselor@school.edu` | `counselor123` | COUNSELOR (Ms. Santos) |
| `principal@school.edu` | `principal123` | PRINCIPAL (Mr. Dela Cruz) |

Active SY: `SY 2025-2026`. Maria Santos (LRN `100000000001`, 9-Newton) is the reference scenario protagonist — has imported grades/attendance/behavioral data and will have a risk assessment once the engine is triggered.

---

## 6. Working agreements observed (the user's style)

- **One phase per session.** Don't half-finish a phase to jump ahead. Verify Definition of Done before closing.
- **Walk the spec → flow → scenario.** Every feature traces back to [AEM_System_Specification.md](AEM_System_Specification.md) and a page in [AEM_FLOW.md](AEM_FLOW.md).
- **Verification scripts are kept in `scripts/`.** When server actions can't be tested via cURL (auth context issues), write a one-off script that exercises the same commit logic. Don't delete them.
- **Phase tracker is the source of truth for status.** Always update [docs/AEM_Development_Phases.md](AEM_Development_Phases.md) at the end of a phase with a retrospective.
- **Update the handover doc** at the end of each phase / when the user asks.
- **User confirms direction before risky moves.** Two or three concrete options with a recommendation. The user has consistently picked the recommendation.
- **No emojis in code or output** unless explicitly asked.
- **Type safety end-to-end.** No `any`. No `as unknown as X`. Fix the type properly.
- **Stub future-phase pages explicitly** ("Available in Phase X") rather than leaving dead UI or 404s.
- **Comments only where the *why* is non-obvious.** Code should read itself.

---

## 7. Known debt + gotchas

| Item | Where | Plan |
|---|---|---|
| `interventionHistory` sub-score always returns 0 | `lib/risk/engine.ts` | Wire after Phase 3 intervention schema ships |
| Recommendation draft "Open in Builder" not yet linked | `app/counselor/caseload/page.tsx` (recommendations) | Phase 3.3 — link draft → intervention builder |
| Grade/school-level pattern rules not yet implemented | `lib/patterns/rules.ts` | Phase 5 (needs cross-year data) |
| Scheduled weekly risk recompute | — | Phase 7 |
| Prisma `$extends` global RBAC | Considered in Phase 2a, deferred | Re-evaluate if a query forgets the helper |
| DB-level append-only `AuditLog` grants | App-layer enforcement only | Phase 7 |
| No automated tests | — | Add in Phase 7; Phase 4 pure functions are good candidates |
| Next 16 docs bundled at `node_modules/next/dist/docs/` | Reference for breaking changes | Read `01-app/02-guides/upgrading/version-16.md` before any Next-API change |

---

## 8. Phases remaining after Phase 3

| Phase | Focus | Blocker |
|---|---|---|
| 5 — Dashboards | School-wide, cohort, bias monitoring | Needs Phase 3 intervention data for outcome tracking |
| 6 — AI Layer | Gemini narratives, What-If simulator, AI literacy | Needs Phase 4 risk data (already done) |
| 7 — Governance polish | DB-level audit, demo data, QA | Last |

Phase 4 is already done. Phase 5 can partially run now (risk distribution charts exist). Phase 6 can start with Phase 4 data — no intervention dependency for the risk narrative.

---

## 9. Final note

The codebase is in a healthy state: zero TypeScript errors, zero localStorage for domain data, clean migrations, all four roles RBAC-verified. Phase 3 is a large schema migration + multiple new pages — plan the migration first, verify it applies cleanly, then build the UI incrementally.
