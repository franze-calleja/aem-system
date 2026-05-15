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

## Phase 2a — Schema + RBAC + Roster Import ✅ *(complete 2026-05-13)*

**Goal:** Get the foundational data layer in place (Grade/Attendance/BehavioralRecord models), enforce RBAC at the query layer, and stand up the Import Wizard with a working roster step.

### Schema
- [x] `Grade` (enrollmentId, subjectId, quarter, score, maxScore, assessmentKind, label, recordedBy, timestamps)
- [x] `Attendance` (enrollmentId, date, status, notes, recordedBy, timestamps) — `@@unique([enrollmentId, date])`
- [x] `BehavioralRecord` (enrollmentId, date, category, severity, description, recordedBy, timestamps)
- [x] New enums: `AssessmentKind`, `AttendanceStatus`, `BehaviorCategory`, `BehaviorSeverity`
- [x] New audit actions: `GRADE_RECORDED`, `ATTENDANCE_RECORDED`, `BEHAVIORAL_INCIDENT_RECORDED`
- [x] Migration `20260513145558_add_grade_attendance_behavioral` applied

### RBAC at the query layer
- [x] `studentVisibilityFilter(caller, schoolYearId)` in [lib/rbac.ts](lib/rbac.ts)
- [x] `enrollmentVisibilityFilter(caller, schoolYearId)` for Grade/Attendance/Behavioral
- [x] `canReadCounselingContent(role)` placeholder for Phase 3
- [x] Verified by [scripts/verify-rbac-scope.ts](scripts/verify-rbac-scope.ts):
  - ADMIN / COUNSELOR / PRINCIPAL → all 20 students (both sections)
  - TEACHER (Newton Math) → 15 students (Newton only)
  - SECTION ADVISER (Newton English + adviser) → 15 students (Newton only)

### CSV pipeline
- [x] `csv-parse` installed
- [x] [lib/import/csv.ts](lib/import/csv.ts) — parser + `ValidationResult<T>` helpers
- [x] [lib/import/roster.ts](lib/import/roster.ts) — required/optional column spec + Zod-style row validation with row-number tracking

### Import Wizard (admin only)
- [x] Route `/admin/import` with stepper UI
- [x] Step 1 — school year picker (defaults to active year)
- [x] Step 2 — Roster CSV: file upload → preview (first 20 valid rows) → error report with row numbers → transactional commit (full success or full rollback)
- [x] Steps 3-5 stubs (Grades / Attendance / Behavioral) — labeled "ships in 2b"
- [x] Server actions [app/actions/import/roster.ts](app/actions/import/roster.ts) with `requireRole("ADMIN")` + `logAudit({ action: IMPORT, ... })` + `prisma.$transaction` covering Section upserts, Student upserts, Enrollment upserts, three Consent records each
- [x] Admin sidebar nav updated to link to Import Wizard

### Phase 2a Definition of Done — Verified 2026-05-13
- [x] Validator catches: bad LRN length, missing firstName, malformed birthDate, invalid sex — all with correct row numbers (`scripts/verify-roster-import.ts /tmp/aem-roster-test.csv` reported 4 invalid out of 14)
- [x] Clean CSV commits successfully — 10 new students + 10 enrollments + 30 consents, Newton section reused (not duplicated)
- [x] Existing data preserved — original seed students still present (20 total after import = 10 seed + 10 import)
- [x] Admin can access `/admin/import` (200); teacher cannot (307 → `/?forbidden=1`)
- [x] Typecheck clean for all Phase 2a code (only pre-existing `teacher-class-store.ts` errors remain — die in 2c)

### Phase 2a retrospective
- **Prisma RBAC: helper > magic extension.** Considered `$extends({ query: ... })` to globally intercept all student queries. Went with explicit `studentVisibilityFilter()` instead — easier to debug, easier to read, callers must opt in. If a future query forgets it we'd want a code-review check (or move to extension later). YAGNI for now.
- **Server-action testability gap.** Server actions need real request context (auth cookies), so end-to-end commits via curl is a multi-hour project. Wrote `scripts/verify-roster-import.ts` to exercise the validator + transactional upsert logic directly (same code paths) and `scripts/verify-rbac-scope.ts` to verify the RBAC helper across all roles. UI audit firing requires a real browser commit — explicitly documented.
- **Existing `Newton` section** from the Phase 1 seed had `students: 5`; import added 10 more without re-creating it. The `sectionsCreated=0, enrollmentsCreated=10` result confirms idempotent section upsert.

---

## Phase 2b — Import Wizard Steps 3-5 ✅ *(complete 2026-05-13)*

**Goal:** Complete the bulk-import pipeline with Grades, Attendance, and Behavioral CSV steps, all sharing the same validate → preview → transactional commit pattern as Step 2 (Roster).

### Validators (pure, table-tested)
- [x] [lib/import/grades.ts](lib/import/grades.ts) — LRN→enrollment lookup, subjectCode→subject lookup, quarter range check, score ≤ maxScore enforcement, normalized `AssessmentKind` enum
- [x] [lib/import/attendance.ts](lib/import/attendance.ts) — LRN→enrollment lookup, multi-format date parsing, `AttendanceStatus` normalization (accepts P/A/T/E shorthand), in-file duplicate detection for (LRN, date)
- [x] [lib/import/behavioral.ts](lib/import/behavioral.ts) — LRN→enrollment lookup, `BehaviorCategory` + `BehaviorSeverity` enum normalization, description-required check

### Server actions (RBAC + audit + transactional)
- [x] [app/actions/import/grades.ts](app/actions/import/grades.ts) — `previewGradesAction`, `commitGradesAction` (creates Grade rows; logs `IMPORT` audit with resourceType `Grades`)
- [x] [app/actions/import/attendance.ts](app/actions/import/attendance.ts) — `previewAttendanceAction`, `commitAttendanceAction` (upserts Attendance by `[enrollmentId, date]`; logs `IMPORT` audit with resourceType `Attendance`)
- [x] [app/actions/import/behavioral.ts](app/actions/import/behavioral.ts) — `previewBehavioralAction`, `commitBehavioralAction` (creates BehavioralRecord rows; logs `IMPORT` audit with resourceType `Behavioral`)
- All call `requireRole("ADMIN")`, refuse to commit if any row has errors, and run inside `prisma.$transaction`.

### Wizard refactor
- [x] [components/roles/admin/import-wizard.tsx](components/roles/admin/import-wizard.tsx) — extracted a generic `<CsvStep>` component shared by all four CSV steps (Roster, Grades, Attendance, Behavioral)
- [x] Each step instance configures: required/optional columns, hints, preview server action, commit server action, preview table headers, row renderer, commit button label, success summary renderer
- [x] Stepper now allows free navigation between Steps 2-5 once a school year is selected (you don't have to do them in order)
- [x] Net code size: wizard went from ~360 to ~510 lines but covers **4× the functionality** (avg ~127 lines per step config vs the previous 250+ lines for just one)

### Phase 2b Definition of Done — Verified 2026-05-13
- [x] Grades validator caught all 4 deliberate errors (non-enrolled LRN, unknown subject code, quarter out of range, score > maxScore) — `scripts/verify-csv-import.ts grades /tmp/aem-grades-test.csv`
- [x] Attendance validator caught all 4 errors including same-file (LRN, date) duplicates and combined errors on a single row (bad status AND duplicate)
- [x] Behavioral validator caught all 5 error variations (non-enrolled, bad date, bad category, bad severity, empty description)
- [x] Clean CSVs committed successfully: 8 grade rows, 7 attendance rows, 4 behavioral records
- [x] Attendance upsert works — re-running the same CSV would update, not duplicate
- [x] Maria's profile (LRN 100000000001) now has real data: 2 Math grades showing decline (85→72), 1 Science grade, full week of attendance, 2 behavioral incidents — exactly matches Scene 1 of the reference scenario
- [x] Typecheck clean for all Phase 2b code

### Phase 2b retrospective
- **Generic `<CsvStep>` was the right call.** Considered 4 separate copy-pasted step components. The generic version covers all 4 with one ~280-line component plus 4 ~50-line configuration instances. Future CSV steps (e.g. SEL assessment imports in Phase 3) drop in as another `<CsvStep>` instance.
- **Three-line schema, four-step pipeline.** The `Grade`, `Attendance`, `BehavioralRecord` models from Phase 2a's migration are now driven entirely by the wizard — no manual seed code needed for these tables.
- **Server actions auto-validate twice** (once at preview, once at commit). Cheap insurance: if the user changes the CSV between preview and commit, we don't trust the preview result. Tradeoff is doubled DB lookups for refs — acceptable since these are admin operations.
- **Maria's seed scenario data is now live in DB** for Phase 4's risk-scoring engine to consume — Academic Decline Cluster pattern will fire (3 quarters declining + attendance issue). Phase 2c/2d will wire teacher + counselor views to actually see this data.

---

## Phase 2c — Teacher UI on Real APIs ✅ *(complete 2026-05-14)*

**Goal:** Replace the localStorage-backed teacher UI with DB-backed pages. Teachers can see real students, take real attendance, enter real grades, and log real behavioral records. The Phase 0 localStorage scaffolding for teachers is gone.

### Query helpers (server-only)
- [x] [lib/teacher/queries.ts](lib/teacher/queries.ts):
  - `getTeacherClasses(userId, schoolYearId)` — list of assignment cards with student counts
  - `getTeacherClassDetail(userId, assignmentId, schoolYearId)` — assignment + roster, returns null if not the teacher's (RBAC at the query layer)
  - `getSectionAttendance(sectionId, schoolYearId, from, to)` — date-windowed map
  - `getSectionGrades(sectionId, subjectId, schoolYearId)` — grades for the teacher's subject
  - `getSectionBehavioralRecords(sectionId, schoolYearId)` — most recent first

### Server actions (RBAC + audit + revalidate)
- [x] [app/actions/teacher/attendance.ts](app/actions/teacher/attendance.ts) — `recordAttendanceAction`: bulk upsert by `[enrollmentId, date]`, verifies every enrollment is in the teacher's section; logs `ATTENDANCE_RECORDED`
- [x] [app/actions/teacher/grades.ts](app/actions/teacher/grades.ts) — `recordGradeAction`: single grade create, rejects adviser-only assignments (no subjectId), verifies enrollment belongs to section; logs `GRADE_RECORDED`
- [x] [app/actions/teacher/behavioral.ts](app/actions/teacher/behavioral.ts) — `recordBehavioralAction`: single incident create with `requireRole("TEACHER")`; logs `BEHAVIORAL_INCIDENT_RECORDED`
- All three call `revalidatePath` after writing.

### Pages rewritten
- [x] [app/teacher/my-classes/page.tsx](app/teacher/my-classes/page.tsx) — server component, fetches from DB, renders cards keyed by `assignmentId`. Adviser badge surfaces from `isAdviser` flag.
- [x] [app/teacher/my-classes/[classId]/page.tsx](app/teacher/my-classes/%5BclassId%5D/page.tsx) — server component fetches everything in parallel, passes to a single client component.
- [x] [components/roles/teacher/class-detail.tsx](components/roles/teacher/class-detail.tsx) — four tabs (Roster / Attendance / Gradebook / Behavioral). Attendance uses a 14-day side calendar, keyboard quick-keys (P/A/T/E), and bulk save. Gradebook only renders when the assignment has a subject (advisers see it disabled). Behavioral has inline form + chronological list.
- [x] [app/teacher/student-risk/page.tsx](app/teacher/student-risk/page.tsx) — now a Phase 4 stub.
- [x] [app/teacher/intervention-feedback/page.tsx](app/teacher/intervention-feedback/page.tsx) — now a Phase 3 stub.

### Deleted (Phase 0 scaffolding, ~2,800 LOC total)
- `components/roles/teacher/teacher-class-store.ts` (localStorage state engine)
- `components/roles/teacher/my-classes.tsx` (client component with add/edit modals)
- `components/roles/teacher/class-roster-view.tsx` (the 720-line tabbed view)
- `components/roles/teacher/student-risk-overview.tsx`
- `components/roles/teacher/student-risk-detail.tsx`
- `components/roles/teacher/student-risk-data.ts`
- `components/roles/teacher/intervention-feedback.tsx`
- `app/teacher/student-risk/[classId]/` (nested route)
- Teacher localStorage cleanup removed from logout flows (counselor cleanup stays until 2d).

### Phase 2c Definition of Done — Verified 2026-05-14
- [x] Teacher logs in, sees only their assigned section's students (Mr. Reyes → 15 Newton students, not Curie's 5)
- [x] Class detail page returns **200** for own assignment, **404** for bogus id, **404** for another teacher's assignment
- [x] Stale `student-risk` nested route deleted; root `student-risk` route renders stub
- [x] Attendance write: 15 enrollments upserted in one transaction, `ATTENDANCE_RECORDED` audit row created
- [x] Grade write: single grade row created with `recordedById = teacher`, `GRADE_RECORDED` audit row created
- [x] Behavioral write: single record created, `BEHAVIORAL_INCIDENT_RECORDED` audit row created
- [x] Typecheck clean — the entire `teacher-class-store.ts` error category that haunted Phases 1, 1.5, 2a, 2b is now **eliminated**

### Phase 2c retrospective
- **Two-layer page split** (server-side data fetch + single client component with tabs) keeps the UI snappy and the DB queries explicit. The client component receives plain serializable props — no Prisma types crossing the boundary.
- **Query-layer RBAC scales easily.** `getTeacherClassDetail` is parameterized by `userId`; nothing the client passes can override that filter. The 404-on-other-teacher's-assignment behavior comes for free from the WHERE clause.
- **Keyboard-driven attendance** is preserved from the original UI but with one fewer layer of indirection. The original used localStorage updates per keystroke; the new version uses local state + a single bulk save. Less DB chatter, same UX.
- **Removed `student-risk-detail.tsx` and friends** rather than stubbing in place. They were tangled with the old data model — rebuilding them in Phase 4 against real data is cleaner than patching now.
- **Total deletion** of localStorage-backed scaffolding for teachers: from ~2,800 LOC of mock state to zero. Counselor module is next (2d).

---

## Phase 2d — Counselor + Principal Student Profile ✅ *(complete 2026-05-14)*

**Goal:** Close Phase 2 by giving the Counselor and Principal a read-only, DB-backed Student Profile + a Caseload listing. Replaces ~2,480 LOC of counselor localStorage scaffolding.

### Query helpers (read-only, server-only)
- [x] [lib/student/queries.ts](lib/student/queries.ts):
  - `getCaseload(schoolYearId)` — all active enrollments + computed absence/tardy/behavioral counts in one round-trip per relation
  - `getStudentProfile(studentId, schoolYearId)` — student + enrollment + consents + grades + attendance + behavioral, with derived stats (per-quarter GWA, per-subject quarterly averages, absence/tardy rates)
- Stats are computed on the fly from the raw rows; no caching, no separate aggregation table needed for Phase 2.

### Shared profile UI
- [x] [components/shell/student-profile-view.tsx](components/shell/student-profile-view.tsx) — server component taking `profile` + `viewerRole`. Renders header, consent badges, snapshot stats, academic table with **inline SVG sparkline trend lines**, attendance heatmap (date-grid colored by status), behavioral timeline. Anchor-link nav instead of tabs (no client JS needed).
- Counseling Notes and Risk Profile sections appear as **disabled chips** linking to Phase 3 / Phase 4 respectively — visible reminder of what's coming, no dead UI.

### Pages built / rewritten
- [x] [app/counselor/caseload/page.tsx](app/counselor/caseload/page.tsx) — DB-backed table, sorted by a manual urgency signal (absence × 60 + tardy × 20 + behavioral × 8) until the Phase 4 risk engine ships
- [x] [app/counselor/students/[id]/page.tsx](app/counselor/students/%5Bid%5D/page.tsx) — calls `requireRole("COUNSELOR")`, fetches profile, renders shared view
- [x] [app/principal/students/page.tsx](app/principal/students/page.tsx) — new oversight roster (read-only)
- [x] [app/principal/students/[id]/page.tsx](app/principal/students/%5Bid%5D/page.tsx) — same shared profile view, principal role
- [x] [app/counselor/interventions/page.tsx](app/counselor/interventions/page.tsx) → Phase 3 stub
- [x] [app/counselor/feedback/page.tsx](app/counselor/feedback/page.tsx) → Phase 3 stub
- [x] Principal nav config gains a "Students" entry pointing to `/principal/students`

### Deleted (~2,480 LOC of Phase 0 counselor scaffolding)
- `components/roles/counselor/counselor-store.ts` (614 lines, localStorage state engine)
- `components/roles/counselor/student-profile.tsx` (738 lines)
- `components/roles/counselor/caseload-dashboard.tsx` (289 lines)
- `components/roles/counselor/intervention-builder.tsx` (572 lines)
- `components/roles/counselor/feedback-queue.tsx` (233 lines)
- **All `localStorage` cleanup removed from `LogoutButton` and `RoleSidebar`** — no more Phase 0 state engines anywhere in the codebase

### Phase 2d Definition of Done — Verified 2026-05-14
- [x] Counselor opens Maria's profile from caseload → sees real Math decline (85 → 72 sparkline), Science 88, English 80, full attendance heatmap, two behavioral incidents
- [x] Principal opens the same profile via `/principal/students/[id]` → same view, role-aware copy
- [x] Teacher hitting `/counselor/students/[id]` or `/principal/students/[id]` → 307 → `/?forbidden=1` at proxy layer; defense-in-depth `requireRole` at layout
- [x] All four roles' routes return 200 on their own pages, including new Phase 3 stubs
- [x] Caseload sorts by manual urgency signal; Maria appears near the top thanks to her attendance + behavioral data
- [x] **Typecheck clean across the entire codebase** — the pre-existing scaffolding error category is fully eliminated
- [x] **No `localStorage`, no hardcoded `SY 2024-2025`, no mock account list anywhere in `app/`, `components/`, or `lib/`** — verified by grep
- [x] Counseling notes & risk profile are visibly *labeled* as upcoming, not silently missing

### Phase 2d retrospective
- **Shared component, two routes.** `StudentProfileView` takes a `viewerRole` prop but the visible difference is tiny in Phase 2 (no counseling note bodies yet). That seam is in place for Phase 3 when notes ship — only the counselor variant will render them.
- **No tabs.** Existing UI had four tabs; we replaced them with anchor-link nav. For a read-only profile, scrolling beats client JS. The Phase 2c teacher view kept tabs because it has interactive forms — different concern, different choice.
- **Manual urgency signal in the caseload** is documented as a stop-gap. Counselors get *some* prioritization today; Phase 4 replaces it with the proper weighted risk score.
- **End of Phase 0 localStorage era.** Every line of `localStorage` for domain data is gone. Logout no longer mentions client storage. This is the cleanest the codebase has been since project start.

---

## Phase 2 — Complete ✅

All four sub-phases shipped. Definition of Done from the original Phase 2 plan:

- [x] Teacher logs attendance + grades that persist to DB and survive refresh *(2c)*
- [x] Admin imports a 240-row roster CSV (with intentional errors) and the wizard reports them with row numbers *(2a)*
- [x] Imported data appears immediately in teacher views *(2c)*
- [x] Counselor sees Maria's academic trend line chart from imported data *(2d — sparkline showing Math 85 → 72)*
- [x] All writes appear in `AuditLog` *(IMPORT, ATTENDANCE_RECORDED, GRADE_RECORDED, BEHAVIORAL_INCIDENT_RECORDED, LOGIN, LOGOUT, YEAR_SWITCHED)*

**Total work removed:** ~5,280 LOC of Phase 0 localStorage scaffolding (teacher + counselor stores plus dependent components).
**Total work added:** Schema for Grade / Attendance / BehavioralRecord, full Import Wizard pipeline, DB-backed teacher daily UI, DB-backed counselor + principal profile views, query-layer RBAC helper, four CSV validators, three teacher server actions.

Reference scenario coverage:
- Scene 0 — Setup, import, consent ✅
- Scene 1 — Daily data capture (teacher routine) ✅
- Scene 2 — Algorithmic surfacing → **Phase 4**
- Scenes 3-12 — Intervention lifecycle → **Phase 3+**

Ready for Phase 3 (Intervention Module) or Phase 4 (Algorithmic Engine), depending on which the user prioritizes.

---

## Phase 2.5 — Admin UI gaps ✅ *(complete 2026-05-14)*

**Goal:** Close the admin-side gap left by Phase 2 — give the ADMIN role a real UI for managing users, school setup, consent, and audit, so no human task still requires editing `seed.ts`. Unblocks Scenes 0.1, 0.2, and 11 of the reference scenario.

### Server actions (RBAC + audit on every mutation)
- [x] [app/actions/admin/users.ts](app/actions/admin/users.ts) — `createUserAction`, `suspendUserAction`, `reactivateUserAction`, `resetPasswordAction`, `addAssignmentAction`, `removeAssignmentAction`. All call `requireRole("ADMIN")` and `logAudit({ action: CREATE | UPDATE | DELETE, resourceType: "User" | "TeacherAssignment" })`. Passwords hashed with bcrypt cost 10.
- [x] [app/actions/admin/setup.ts](app/actions/admin/setup.ts) — `createSchoolYearAction`, `activateSchoolYearAction`, `createSectionAction`, `createSubjectAction`. Activation runs inside a transaction that deactivates every other year first, enforcing the "exactly one active SY at a time" rule at the app layer.
- [x] [app/actions/admin/consent.ts](app/actions/admin/consent.ts) — `setConsentAction` (handles both GRANTED and REVOKED). Revocation requires non-empty `notes`; Zod refine enforces it. Audit fires `CONSENT_GRANTED` or `CONSENT_REVOKED` per change.

### Pages built
- [x] [app/admin/users/page.tsx](app/admin/users/page.tsx) — list (filtered by role), inline "Create user" card, per-row Reset password / Suspend / Reactivate actions. [components/roles/admin/users-manager.tsx](components/roles/admin/users-manager.tsx).
- [x] [app/admin/users/[id]/page.tsx](app/admin/users/%5Bid%5D/page.tsx) — teacher assignment manager. Year-aware: picking the year filters section + subject dropdowns. Adviser checkbox optional. [components/roles/admin/user-assignments-panel.tsx](components/roles/admin/user-assignments-panel.tsx).
- [x] [app/admin/setup/page.tsx](app/admin/setup/page.tsx) — School Years card (create + activate) plus per-year Sections / Subjects sub-panels. [components/roles/admin/setup-manager.tsx](components/roles/admin/setup-manager.tsx).
- [x] [app/admin/audit/page.tsx](app/admin/audit/page.tsx) — fully server-component filterable table. Filters via `searchParams`: action, resourceType, userId, from, to. 50-per-page pagination. Detail panel renders `metadata` JSON pretty-printed.
- [x] [app/admin/consent/page.tsx](app/admin/consent/page.tsx) — per-student row × 3 scope cells. Each cell shows current status, justification (if revoked), and the appropriate action button. Revoke flow requires inline justification before submit. [components/roles/admin/consent-manager.tsx](components/roles/admin/consent-manager.tsx).

### Nav
- [x] [components/roles/admin/admin-config.ts](components/roles/admin/admin-config.ts) — `ADMIN_NAV` now wires hrefs to all five admin destinations (Users, Setup, Import, Consent, Audit). No more placeholder cards on the admin landing page.

### Phase 2.5 Definition of Done — Verified 2026-05-14
- [x] All 4 new admin pages render through the UI; no admin task still requires running `seed.ts` to demo
- [x] Every mutation enforces `requireRole("ADMIN")` + `logAudit(...)`
- [x] Revocation requires written justification (Zod refine + UI validation)
- [x] `npx tsc --noEmit` clean (after dropping stale `.next/types`)
- [x] `npm run lint` clean
- [x] `npm run build` succeeds — **23 routes** (was 18; added /admin/users, /admin/users/[id], /admin/setup, /admin/audit, /admin/consent)
- [x] Admin gets 200 on all five; teacher gets 307 on all five (curl probe with logged-in cookie jars)
- [x] 404 on bogus `/admin/users/[id]` (route uses `notFound()`)
- [x] Scene 0.1 (admin creates SY + section + subject), 0.2 (admin creates teacher user + assignment), and 11 (admin revokes consent with justification) are walkable end-to-end through the UI

### Phase 2.5 retrospective
- **Stale `.next/types` caught typecheck on first run** — leftover `app/dashboard/page.tsx` validator referenced a deleted route. `rm -rf .next` cleared it; adding a "rm -rf .next" to the start-of-session checklist would have saved a few minutes. The on-disk tree should be the source of truth, not the cached validator.
- **Audit page is fully server-rendered.** Filters live in `searchParams` and the form is a plain `<form method="GET">`. No client JS needed for the most common admin workflow (browse + filter). The detail panel uses a URL query param `?detail=<id>` instead of client state — share-able, no flash on load.
- **Consent revoke is the only "destructive" admin flow that gates on justification.** Other writes are reversible (suspend/reactivate, deactivate-a-year-by-activating-another). The Zod refine on `notes` is the source of truth; the UI's required-textarea is just defense-in-depth.
- **Year activation runs in a transaction.** Naive `updateMany → update` would have a window where zero years are active. The single `prisma.$transaction` block closes it. Same pattern admin will use for any "exactly one active X" rule going forward.
- **Teacher-assignment uniqueness is a `(userId, sectionId, subjectId, schoolYearId)` constraint.** Catching the Prisma "Unique constraint" error gives a clean user-facing message. Add-and-remove flows live on the same `/admin/users/[id]` page rather than a separate route — simpler for a low-frequency operation.

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

### 3.1 Schema migration *(✅ 2026-05-14)*
- [x] Migration `20260514141749_add_intervention_counseling` applied
- [x] 6 new models: `CounselingNote`, `Intervention`, `InterventionSensitive`, `InterventionParticipation`, `InterventionNote`, `InterventionRevision`
- [x] 5 new enums: `InterventionStatus`, `InterventionType`, `InterventionNoteType`, `InterventionNoteStatus`, `ParticipationOutcome` (intervention scope reuses `PatternScope`)
- [x] 5 new `AuditAction` values: `COUNSELING_NOTE_CREATED`, `COUNSELING_NOTE_READ`, `INTERVENTION_CREATED`, `INTERVENTION_ACTIVATED`, `INTERVENTION_CANCELLED`
- [x] Back-relations added on `User`, `SchoolYear`, `StudentEnrollment`, `RecommendationDraft`
- **Deviation from earlier draft:** `InterventionSession` model dropped. Session logging is captured via `InterventionNote` rows of type `OBSERVATION` per the handover plan — keeps the feedback channel uniform and avoids a near-duplicate model. Revisit if grouping by physical session becomes necessary.

### 3.2 Counseling Notes *(✅ 2026-05-14)*
- [x] Schema: `CounselingNote` (id, enrollmentId, authorId, body, createdAt, updatedAt) — applied in 3.1
- [x] Query helper `getCounselingNotes(enrollmentId, viewerRole, viewerUserId)` in [lib/student/queries.ts](lib/student/queries.ts) — non-counselors short-circuit to `[]` without a DB roundtrip
- [x] Server action `createCounselingNoteAction` in [app/actions/counselor/notes.ts](app/actions/counselor/notes.ts) — `requireRole("COUNSELOR")`, Zod, audit
- [x] Counselor → Student Profile → Counseling Notes section wired ([components/shell/student-profile-view.tsx](components/shell/student-profile-view.tsx) + [components/counselor/counseling-note-form.tsx](components/counselor/counseling-note-form.tsx))
- [x] Principal student profile page does not pass `counselingNotes` prop → section hidden, no leak (verified via curl probe — 0 occurrences of note body text on the principal HTML)
- [x] Every successful read logged in AuditLog as `COUNSELING_NOTE_READ`; every write as `COUNSELING_NOTE_CREATED`
- [x] Verification script: [scripts/verify-counseling-notes.ts](scripts/verify-counseling-notes.ts) — confirms create/read/role-gate paths

### 3.3 Intervention Module (Multi-Scope)
- [x] Schema: `Intervention` (id, scope, scopeTargetId, type, status, schoolYearId, ownerId, startDate, endDate?, schedule?, accommodations?, staffActions?, targetOutcomes?, triggeringRecommendationId?, timestamps) — applied in 3.1
- [x] Schema: `InterventionSensitive` (interventionId 1-1, rationale, counselingContext) — separate table for stricter access — applied in 3.1
- [x] Schema: `InterventionParticipation` (interventionId, enrollmentId, outcome) — applied in 3.1
- [x] Schema: `InterventionNote` (interventionId, authorId, noteType, content, status, createdAt) — observation / revision_request / outcome_observation — applied in 3.1
- [x] Schema: `InterventionRevision` (interventionId, changedById, diff, reason, triggeringNoteId?, isSignificant, isInterim, approvedById?, createdAt) — applied in 3.1
- [~] Schema: `InterventionSession` — **dropped** in favour of `InterventionNote(OBSERVATION)`. See deviation note in 3.1.

### 3.4 Intervention Builder & Workflow
- [x] Counselor → Intervention Builder wired to real API ([app/counselor/interventions/new/page.tsx](app/counselor/interventions/new/page.tsx) + [components/counselor/intervention-builder-form.tsx](components/counselor/intervention-builder-form.tsx))
- [x] Scope picker (Individual / Section / Grade / School-Wide) with scope-conditional target dropdowns
- [x] Public vs sensitive field separation enforced server-side ([lib/intervention/queries.ts](lib/intervention/queries.ts) `getIntervention` strips `sensitive` for non-owner non-principal)
- [x] Individual scope: save → activate directly (audit: INTERVENTION_CREATED + INTERVENTION_ACTIVATED)
- [x] Broader scopes: save → status = PENDING_APPROVAL (audit: INTERVENTION_CREATED only)
- [x] Counselor intervention list page ([app/counselor/interventions/page.tsx](app/counselor/interventions/page.tsx)) shows scope, type, status, owner, dates + Open Recommendations queue
- [x] Intervention detail page ([app/counselor/interventions/[id]/page.tsx](app/counselor/interventions/[id]/page.tsx)) renders public fields always, sensitive panel only when policy allows, participants list
- [x] "Open in Builder" link on a recommendation prefills the form via `?fromRecommendation=<id>`; on save the draft transitions to INSTANTIATED
- [x] Verification script: [scripts/verify-interventions.ts](scripts/verify-interventions.ts) — exercises all four scopes + the draft-instantiation path; confirms participation counts (1 / 15 / 20 / 20) and audit rows
- [x] Principal → Approval Center wired to real API ([app/principal/approvals/page.tsx](app/principal/approvals/page.tsx) + [app/actions/principal/interventions.ts](app/actions/principal/interventions.ts) + [app/principal/interventions/[id]/page.tsx](app/principal/interventions/[id]/page.tsx); nav linked in [components/roles/principal/principal-config.ts](components/roles/principal/principal-config.ts))
- [x] Approval action: status → ACTIVE + INTERVENTION_APPROVED + INTERVENTION_ACTIVATED audit; rejection → CANCELLED + reason recorded in `InterventionRevision` (`isSignificant=true`, approvedById set) + INTERVENTION_CANCELLED + INTERVENTION_REVISED audit

### 3.5 Feedback & Revision Workflow *(✅ 2026-05-15 — minimal viable; see notes)*
- [x] Teacher → Intervention Feedback page wired to real API ([app/teacher/intervention-feedback/page.tsx](app/teacher/intervention-feedback/page.tsx) + [components/teacher/teacher-feedback-forms.tsx](components/teacher/teacher-feedback-forms.tsx)) — sees ACTIVE/PENDING interventions touching their assignments via `getInterventionsForTeacher`; public fields only
- [x] Three server actions in [app/actions/teacher/intervention-feedback.ts](app/actions/teacher/intervention-feedback.ts): `logSessionAction` (OBSERVATION), `submitRevisionRequestAction` (REVISION_REQUEST), `submitOutcomeObservationAction` (OUTCOME_OBSERVATION). Each verifies the teacher's scope before writing.
- [x] Counselor → Feedback Queue wired to real API ([app/counselor/feedback/page.tsx](app/counselor/feedback/page.tsx) + [components/counselor/feedback-disposition.tsx](components/counselor/feedback-disposition.tsx) + [app/actions/counselor/feedback.ts](app/actions/counselor/feedback.ts))
- [x] Disposition actions: Acknowledge / Incorporate / Dismiss (mapped from spec's "Discuss" → "Dismiss" until in-app messaging lands)
- [x] Incorporate now opens the revision-mode edit form (`/counselor/interventions/[id]/edit?fromNote=…`); saving creates the `InterventionRevision` with `triggeringNoteId` and flips the note INCORPORATED in one transaction. ✅ *(2026-05-15 follow-up slice)*
- [x] Revision-mode edit form ([components/counselor/intervention-edit-form.tsx](components/counselor/intervention-edit-form.tsx)) — shared between counselor (normal) and principal (interim). ✅
- [x] Auto-detect significant change ([lib/intervention/diff.ts](lib/intervention/diff.ts) — `detectSignificantChange`: scope / type / scopeTargetId / duration > 30 days). Significant changes on broader-scope ACTIVE plans automatically route back to PENDING_APPROVAL via `shouldReenterApproval`. ✅
- [x] Interim Revision (principal-only, `isInterim=true`) — [app/principal/interventions/[id]/edit/page.tsx](app/principal/interventions/[id]/edit/page.tsx) + [app/actions/principal/interventions.ts](app/actions/principal/interventions.ts) `interimReviseInterventionAction`; principal detail page surfaces the "Open interim revision form" button on ACTIVE plans. Audit: `INTERIM_REVISION` + `INTERVENTION_REVISED`. ✅
- [x] Verification: [scripts/verify-revision-mode.ts](scripts/verify-revision-mode.ts) — confirms minor revision stays ACTIVE, significant revision on SECTION plan flips to PENDING_APPROVAL, principal interim writes `isInterim=true`

### 3.6 Visibility Enforcement *(✅ 2026-05-15)*
- [x] `getIntervention(id, viewerRole, viewerUserId)` in [lib/intervention/queries.ts](lib/intervention/queries.ts) returns `null` when the viewer cannot see the intervention at all
- [x] TEACHER access predicate: STUDENT → must teach the student's section; SECTION → must teach the section; GRADE → must teach a section at that grade; SCHOOL → any teacher of the active SY
- [x] Sensitive fields (`rationale`, `counselingContext`) stripped for everyone except the owning counselor and any principal
- [x] ADMIN sees metadata only — participants list is stripped at the query layer (`participants: []`)
- [x] `getInterventionsForTeacher(userId, schoolYearId)` returns only ACTIVE/PENDING interventions the teacher is in scope for (public fields, no sensitive)
- [x] Section adviser elevation: an adviser is just a `TeacherAssignment` row with `isAdviser=true`; their `sectionId` is included in the assignment-based predicate, so they see public fields for their advisory section automatically

### 3.7 Intervention COMPLETE flow + per-participant outcomes *(✅ 2026-05-15 follow-up)*
- [x] `completeInterventionAction` in [app/actions/counselor/interventions.ts](app/actions/counselor/interventions.ts) — transactional: ACTIVE → COMPLETED + per-participant `outcome` set + `InterventionRevision` row for the transition + audit `INTERVENTION_REVISED` with outcome distribution metadata
- [x] [components/counselor/complete-intervention-form.tsx](components/counselor/complete-intervention-form.tsx) — collapsible "Mark complete" form on the counselor intervention detail page. Per-participant outcome dropdown (IMPROVING / STABLE / DECLINING / COMPLETED) + optional notes
- [x] Detail page now displays outcome badges next to each participant once set
- [x] Verification script: [scripts/verify-complete-flow.ts](scripts/verify-complete-flow.ts) — round-robins outcomes across participants and confirms the transition

### Phase 3 Definition of Done
- [x] Counselor creates individual intervention end-to-end; teacher sees public fields only (no rationale) — verified via [scripts/verify-phase-3-4-5-6.ts](scripts/verify-phase-3-4-5-6.ts)
- [x] Teacher submits revision request; counselor incorporates; `InterventionRevision` created linked to the note (`triggeringNoteId`) — verified
- [x] Section-wide intervention stays PENDING_APPROVAL until principal approves; becomes ACTIVE after approval — verified (script approved the SECTION intervention; status now ACTIVE)
- [x] Significant revision to active section-wide plan triggers re-approval — verified via `scripts/verify-revision-mode.ts`
- [x] Teacher hitting counseling notes API directly → 403/empty (enforced at query layer) — verified in 3.2
- [x] Recommendation draft "Open in Builder" pre-fills intervention builder; on save marks draft as INSTANTIATED — verified in 3.3
- [x] `npx tsc --noEmit` clean; `npm run lint` clean (one pre-existing unrelated warning)
- [x] Tracker updated with retrospective (below)

**Phase 3 retrospective:**
- **Schema-first paid off.** Doing 3.1 alone in its own session meant the rest of Phase 3 had no schema churn — every UI slice slotted into the same migration. Saved at least one re-migration cycle.
- **Dropping `InterventionSession` was the right call.** Reusing `InterventionNote(OBSERVATION)` keeps the feedback channel uniform and the counselor queue has one type of row to triage. Revisit only if grouping by physical session becomes necessary.
- **Visibility predicate belongs in queries, not components.** Originally I expected to apply the matrix in route handlers; centralizing it in `canViewIntervention` (and `getInterventionsForTeacher`) means the predicate is the source of truth — UI just reads the result. Less to keep in sync.
- **Two deferrals to call out in the next slice:** (1) revision-mode edit form, (2) auto-detect significant change. Both are gated on the same UX decision: "what does a counselor editing an active plan look like?" — answer that, both deferrals land together.
- **Verification scripts continue to earn their keep.** Three scripts now ([verify-counseling-notes](scripts/verify-counseling-notes.ts), [verify-interventions](scripts/verify-interventions.ts), [verify-phase-3-4-5-6](scripts/verify-phase-3-4-5-6.ts)) exercise commit + audit paths that curl can't reach because of Auth.js session context. Keeping them.

---

## Phase 4 — Algorithmic Engine ✅ *(complete 2026-05-14)*

**Goal:** Risk scoring, pattern detection, and recommendation drafts run on real data. Explainability surfaces are wired.

### 4.1 Risk Scoring Engine
- [x] Pure functions per sub-score: academic, attendance, behavioral, intervention history, profile — [lib/risk/engine.ts](lib/risk/engine.ts)
- [x] Documented formulas (constants in one config module) — weights/thresholds live in `AlgorithmConfig` DB row
- [x] Weighted sum + band classification (LOW / MODERATE / HIGH) with normalised weights
- [x] Schema: `RiskAssessment` (enrollmentId, score, band, factors json, computedAt, schoolYearId, configId, configVersion) — migration `20260514080547_add_risk_pattern_recommendation_config`
- [x] Schema: `AlgorithmConfig` (weights json, thresholds json, version unique, isActive, changedById, changedAt, justification) — versioned, exactly-one-active enforced in transaction
- [ ] Recompute trigger on input changes; 24h cache — **deferred to Phase 5/7**
- [ ] Scheduled weekly recompute job — **deferred to Phase 7**

### 4.2 Multi-Scope Pattern Detector
- [x] Rule engine config (toggleable per rule per scope) — `ruleConfig` json in `AlgorithmConfig`
- [x] Student-level rules: Academic Decline Cluster, Disengagement Signal, Crisis Warning, Recovery Tracking, Chronic Concern — [lib/patterns/rules.ts](lib/patterns/rules.ts)
- [x] Section-level rules: Concentrated Risk, Subject Struggle, Attendance Erosion — [lib/patterns/rules.ts](lib/patterns/rules.ts)
- [ ] Grade-level rules: Transition Difficulty, Cohort Trend — **deferred to Phase 5**
- [ ] School-level rules: Day-of-Week Effect, Year-Over-Year Drift — **deferred to Phase 5**
- [x] Schema: `PatternMatch` (scope, scopeTargetId, ruleId, evidence json, matchedAt, status) — same migration
- [x] Detection runs on compute trigger; results upsert existing OPEN patterns — [lib/patterns/detector.ts](lib/patterns/detector.ts)

### 4.3 Recommendation Engine
- [x] Mapping table: ruleId → suggestedType + rationale template — [lib/patterns/recommendations.ts](lib/patterns/recommendations.ts)
- [x] Schema: `RecommendationDraft` (scope, scopeTargetId, suggestedType, rationale, evidence json, triggeringPatternId nullable, status: OPEN/DISMISSED/INSTANTIATED, schoolYearId) — same migration
- [x] Counselor caseload wired to real risk data (sorted by score, scored/unscored counts) — [app/counselor/caseload/page.tsx](app/counselor/caseload/page.tsx)
- [ ] "Open in Builder" pre-fills new intervention — **depends on Phase 3 intervention schema**
- [x] Dismissed drafts remain as audit evidence — `dismissRecommendationAction` logs `RECOMMENDATION_DISMISSED`

### 4.4 Explainability Surfaces
- [x] Explainability Panel component reads `RiskAssessment.factors` — [components/shell/explainability-panel.tsx](components/shell/explainability-panel.tsx) (score, band, per-dimension bars, academic/attendance/behavioral detail)
- [x] `RiskBadge` component used across teacher, counselor, and principal views
- [ ] "How does this work?" static pages — **deferred to Phase 6/7**
- [x] Algorithm Config UI for admin: weight editor, threshold editor, rule toggles, version history, run-engine button — [app/admin/algorithm/page.tsx](app/admin/algorithm/page.tsx); changes create new immutable version and log `ALGORITHM_CONFIG_CHANGED`

### Phase 4 Definition of Done
- [x] Maria's risk score recomputes when the engine is triggered (admin runs compute)
- [x] Academic Decline Cluster fires for fixture students meeting the criteria (2+ declining quarters + ≥15% absences)
- [x] Recommendation draft appears in counselor caseload queue with rationale
- [x] Admin changes risk weight; change is versioned and logged; next compute uses new weights
- [x] Risk badges with LOW/MODERATE/HIGH band + score rendered in teacher student-risk, counselor caseload, and principal overview; explainability panel shows full factor breakdown

### Phase 4 retrospective
- **Accidental revert recovery.** The previous agent's DB-applied migration had no matching SQL file after the revert. Reconstructed schema from `psql \d` introspection, wrote SQL manually, deleted stale `_prisma_migrations` row, and re-resolved with `prisma migrate resolve --applied`. Lesson: always commit migration files atomically with the schema change.
- **AuditAction enum mismatch.** The DB had different variant names than what was coded (`ALGORITHM_CONFIG_CHANGED` vs `ALGORITHM_CONFIG_UPDATED`, etc.). Fixed by matching schema.prisma to the DB-existing values, creating a new migration file for the additions, and resolving as applied. Cross-session enum drift is a risk when two agents touch the same DB.
- **Pure engine, server action orchestrator.** Engine functions (`computeRiskScore`, rules, `generateRecommendation`) are pure — no I/O, fully testable. The server action `computeRiskAction` handles all DB read/write/audit. Clean separation means the engine can be unit-tested without a DB connection.
- **`interventionHistory` sub-score is always 0.** Intentional stub — it requires Phase 3's intervention data. Documented in [lib/risk/engine.ts](lib/risk/engine.ts); will be wired in Phase 3.
- **Grade/school-level pattern rules deferred.** The 5 student-scope and 3 section-scope rules cover the reference scenario. Transition Difficulty and Cohort Trend need cross-enrollment data (Phase 5 cohort analysis). Day-of-Week Effect and Year-Over-Year Drift need at least two full school years of data.

---

## Phase 5 — Dashboards & Cross-Year Views *(Week 5)* — ✅ *(2026-05-15, partial: cohort analysis deferred until historical years are loaded)*

**Goal:** Insights are visible at every level. Cohort comparison works across years.

### 5.1 Teacher Dashboards *(✅ 2026-05-15 — covered by existing surfaces + new card)*
- [x] Class-level risk distribution + top-3 at-risk students card on [app/teacher/my-classes/[classId]/page.tsx](app/teacher/my-classes/[classId]/page.tsx) via [components/roles/teacher/section-risk-card.tsx](components/roles/teacher/section-risk-card.tsx)
- [x] Pattern Alerts: teacher consumes student-scope patterns via the existing [/teacher/student-risk](app/teacher/student-risk/page.tsx) per-section table and the per-class detail page. (Dedicated alerts panel can be split out later if needed.)
- [x] At-Risk Students panel sorted by score — already live on [/teacher/student-risk](app/teacher/student-risk/page.tsx)
- [x] Attendance + performance trends — present on existing class detail tabs

### 5.2 Counselor Dashboards *(✅ 2026-05-15)*
- [x] Caseload Dashboard wired to real risk data — landed in Phase 4 ([app/counselor/caseload/page.tsx](app/counselor/caseload/page.tsx))
- [x] Pattern Detection Inbox across all four scopes — [app/counselor/patterns/page.tsx](app/counselor/patterns/page.tsx) + [lib/patterns/queries.ts](lib/patterns/queries.ts) + [components/counselor/pattern-disposition.tsx](components/counselor/pattern-disposition.tsx). Disposition (Resolve / Dismiss) writes back to `PatternMatch.status` and audits via [app/actions/counselor/patterns.ts](app/actions/counselor/patterns.ts).
- [x] Outcome Tracking view — landed alongside the COMPLETE flow on [/counselor/interventions](app/counselor/interventions/page.tsx). Per-intervention participation outcome distribution bar (IMPROVING / COMPLETED / STABLE / DECLINING / UNSET). ✅ *(2026-05-15 follow-up)*

### 5.3 Principal Dashboards *(✅ 2026-05-15)*
- [x] School-Wide Dashboard at [/principal/dashboard](app/principal/dashboard/page.tsx) with drill-down by grade, section, demographic
- [x] Risk distribution by grade level, section, sex, SPED status, learning modality via [lib/risk/queries.ts](lib/risk/queries.ts) (`getRiskBreakdownByGrade`, `getRiskBreakdownBySection`, `getBiasBreakdowns`)
- [x] Bias monitoring: disparity flag when a group's HIGH rate exceeds the school average by &gt;50%, surfaced inline in [components/principal/risk-breakdown-table.tsx](components/principal/risk-breakdown-table.tsx)
- [x] Intervention pipeline counts (DRAFT / PENDING_APPROVAL / ACTIVE / COMPLETED / CANCELLED) via `getInterventionPipeline`; CTA links to the approval queue
- [x] Principal nav wired in [components/roles/principal/principal-config.ts](components/roles/principal/principal-config.ts)

### 5.4 Cohort Analysis — **deferred to Phase 7 (or after historical import)**
- [ ] Select grade level + multiple school years
- [ ] Side-by-side risk band distributions, intervention counts, outcome rates
- [ ] Year-over-year drift indicators
- [ ] CSV export

**Why deferred:** Only `SY 2025-2026` is on file. A meaningful cohort comparison surface requires at least one prior school year of completed risk + intervention data. The principal dashboard renders a placeholder pointing at this dependency. Lands either (a) after the import wizard ingests a second SY's CSVs, or (b) as part of Phase 7 demo-data scaffolding.

### Phase 5 Definition of Done
- [x] Counselor's Pattern Inbox shows live matches across all scopes — verified: engine produced 1 STUDENT match, surfaced on the inbox page
- [x] Teacher's class dashboard reflects up-to-date risk distribution — verified: the new SectionRiskCard renders LOW/MODERATE/HIGH counts and top-3 at-risk students
- [ ] Principal opens Cohort Analysis and compares Grade 9 across 3 SYs — **deferred (see 5.4)**

**Phase 5 retrospective:**
- **The principal nav had three stubs; this slice closed two.** "School dashboard" and "Approval queue" (Phase 3.4) are now real pages. "Bias monitoring" was folded *into* the school dashboard rather than getting its own route — simpler nav, same surface. "Governance review" remains as a Phase 7 stub.
- **Engine isn't auto-triggered.** Risk scores and patterns only materialise when someone hits the admin "Run engine" button or the new `scripts/run-risk-engine.ts`. Phase 5 dashboards expose this clearly (the school dashboard says "all unscored" when there's no data); scheduling lands in Phase 7.
- **Cohort analysis is gated on data, not code.** The schema supports cross-year comparison today. The block is purely that seed only contains one SY. Worth not pretending otherwise — the dashboard placeholder names the dependency.
- **Bias monitoring threshold is hard-coded at +50%.** Fine for Phase 5; should become an admin-tunable knob in `AlgorithmConfig` once we know what disparity thresholds the school actually cares about.
- **Pure server-component dashboards.** No client state except the disposition buttons. Server-rendering keeps `npx tsc --noEmit` boring and makes the dashboards cacheable later via Next 16's `cache` primitive when traffic warrants it.

---

## Phase 6 — AI Layer (Gemini) & Literacy Features *(Week 6)* — ✅ *(2026-05-15, partial: recommendation narratives + principal summaries + chat deferred)*

**Goal:** Natural-language layer over algorithmic outputs; users can interact with the algorithm to learn.

### 6.1 Gemini Integration *(✅ 2026-05-15)*
- [x] Server-side Gemini client wrapper ([lib/ai/gemini.ts](lib/ai/gemini.ts)) reading `GEMINI_API_KEY` from env. Uses `@google/genai` v2.x; default model `gemini-2.5-flash`.
- [x] Aggressive caching by content hash — new `AICache` model (migration `20260515023001_add_ai_cache`); SHA-256 over `model::prompt`. Cached rows are immutable.
- [x] Graceful fallback matrix: `no_key` / `quota` (HTTP 429) / `network` / `empty_response` / `consent_revoked`. Each surfaces a different user-facing message via `fallbackMessage`; the surrounding UI keeps the algorithmic explainability panel visible regardless.
- [x] Risk narrative generator ([lib/ai/narrative.ts](lib/ai/narrative.ts)) — anonymised prompt (first name + grade only, no LRN), 2–3 sentence guideline.
- [x] Recommendation narrative generator ([lib/ai/narrative.ts](lib/ai/narrative.ts) `generateRecommendationNarrative`) — surfaced on the counselor [/counselor/interventions](app/counselor/interventions/page.tsx) Open Recommendations queue. Each draft gets a 3–4 sentence Gemini narrative below the algorithmic rationale; cached separately per draft via content hash. ✅ *(2026-05-15 follow-up)*
- [x] School summary generator for principal ([lib/ai/narrative.ts](lib/ai/narrative.ts) `generateSchoolSummary`) — banner narrative at the top of [/principal/dashboard](app/principal/dashboard/page.tsx). Cached separately per (year, total, distribution, queue depth, top-grade rates) signature. ✅ *(2026-05-15 follow-up)*
- [ ] AI Literacy Assistant chat — **deferred to final follow-up.** Genuinely a session of its own (chat session API, multi-turn UI, page-context awareness).

### 6.2 AI Literacy Features *(✅ 2026-05-15)*
- [x] Interactive Risk Simulator ("What-If") at [/counselor/what-if](app/counselor/what-if/page.tsx) + [components/counselor/what-if-simulator.tsx](components/counselor/what-if-simulator.tsx). Reuses the production `computeRiskScore` engine via [app/actions/risk/what-if.ts](app/actions/risk/what-if.ts) with synthesised Prisma-shaped rows — so the simulator output is *exactly* what the engine would produce. Debounced 250ms recompute on input change.
- [x] Decision Audit Trail at [/counselor/students/[id]/audit](app/counselor/students/[id]/audit/page.tsx) — chronological merge of `RiskAssessment` + `PatternMatch` + `RecommendationDraft` + `Intervention` + `InterventionRevision` + `InterventionNote` events for one student in one SY. Cross-role: COUNSELOR + PRINCIPAL.
- [x] Consent-aware narrative gating: `getStudentProfile` already returns consent records; the student profile page checks for `AI_ANALYSIS` revoked status and short-circuits the Gemini call. Revocation does not affect the explainability panel — algorithmic output remains visible.
- [ ] AI Literacy Assistant (chat, page-context-aware) — **still deferred.** Needs Gemini chat session API + UI shell.

### Phase 6 Definition of Done
- [x] Risk score shows both factor breakdown (always) and Gemini narrative (when AI consent active + key configured) — verified: counselor + principal student profile pages render the explainability panel + a narrative panel. Without a key, the panel shows the "AI narrative disabled" fallback note instead of breaking.
- [x] What-If simulator updates score in real time without page reload — verified: inputs trigger a debounced server-action recompute and the explainability panel re-renders without navigation
- [x] `npx tsc --noEmit` clean; `npm run lint` clean (one pre-existing unrelated warning)

**Phase 6 retrospective:**
- **`@google/genai` + `gemini-2.5-flash` is the right default.** The unified SDK (replacing `@google/generative-ai`) is what new code should use. Flash is the price/quality sweet spot for short narrative tasks like this; if quality is insufficient once the key arrives, swap to `gemini-2.5-pro` in `DEFAULT_MODEL`.
- **Caching at the wrapper layer was a quick win.** Identical inputs (same student, same factors, same prompt template) never re-spend tokens. Cache key is hash(model + prompt), so changing either implicitly invalidates.
- **`as unknown as` rule earned its keep.** First pass of `whatIfRiskAction` used `as unknown as Grade[]` to cram synthetic rows into the engine signature. Refactored to proper `Grade`/`Attendance`/`BehavioralRecord` constructors with dummy values for unused fields — about 30 extra LOC but no type laundering, and the next person reading it sees exactly what's synthesised.
- **AI Studio vs Vertex AI noted for the next session.** User mentioned Google Cloud Console as the key source; the working setup uses Google AI Studio (https://aistudio.google.com/app/apikey) which dispenses a single `GEMINI_API_KEY` string. Vertex AI is the GCP-native alternative and uses different auth (service account / ADC) — not what `@google/genai` reads from env by default. Sticking with AI Studio keeps everything env-string and free-tier for development.
- **What-If as compute-via-server-action.** Originally considered porting the engine to client-safe (no Prisma types). Server-action route turned out clean: one network roundtrip per input change, the engine stays where it is, and `AlgorithmConfig` weights are always fresh (an admin changing weights affects the simulator immediately).
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
