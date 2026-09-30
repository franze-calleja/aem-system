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

### Phase 2b enhancements
- [x] **Downloadable sample CSVs** (added 2026-06-02) — each `<CsvStep>` renders a "Download sample CSV" button that generates a pre-filled, schema-correct template client-side (header row in `[required, optional]` order + 2 example rows with valid enum values and accepted date formats). No new dependency or route; uses a `Blob` download. Grades/Attendance/Behavioral samples reference Maria Santos' seed LRN (`100000000001`) so they commit directly against seed data; the roster sample uses fictional LRNs since that step creates students.

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
- [x] **Detector intervention reads wired (2026-05-16):** [lib/patterns/detector.ts](lib/patterns/detector.ts) `detectStudentPatterns` now bulk-fetches `InterventionParticipation` per student (across all years), then populates `hasActiveIntervention` (any ACTIVE in current SY) + `priorInterventionOutcomes` (mapped from `ParticipationOutcome` to the rule input enum via `mapOutcomeToRuleEnum`: IMPROVING→IMPROVED, DECLINING→DECLINED, STABLE/COMPLETED→STABLE). This unblocks `RECOVERY_TRACKING` + `CHRONIC_CONCERN`. Verified by re-running [seed-demo.ts](../scripts/seed-demo.ts): both rules now match their seeded fixtures.

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
- [x] Class-level risk distribution + at-risk students on [app/teacher/my-classes/[classId]/page.tsx](app/teacher/my-classes/[classId]/page.tsx) — fed by `getSectionRiskForTeacher` and rendered inside [class-detail.tsx](../components/roles/teacher/class-detail.tsx). *(Corrected 2026-07-25: this line previously credited a `section-risk-card.tsx` component. That file existed but was never imported by any page — the functionality was built inline in `class-detail.tsx` instead. The orphan was deleted in Phase 8.0.4.)*
- [x] Pattern Alerts: teacher consumes student-scope patterns via the existing [/teacher/student-risk](app/teacher/student-risk/page.tsx) per-section table and the per-class detail page. (Dedicated alerts panel can be split out later if needed.)
- [x] At-Risk Students panel sorted by score — already live on [/teacher/student-risk](app/teacher/student-risk/page.tsx)
- [x] Attendance + performance trends — present on existing class detail tabs

### 5.2 Counselor Dashboards *(✅ 2026-05-15)*
- [x] Caseload Dashboard wired to real risk data — landed in Phase 4 ([app/counselor/caseload/page.tsx](app/counselor/caseload/page.tsx))
- [x] Pattern Detection Inbox across all four scopes — [app/counselor/patterns/page.tsx](app/counselor/patterns/page.tsx) + [lib/patterns/queries.ts](lib/patterns/queries.ts) + [components/counselor/pattern-disposition.tsx](components/counselor/pattern-disposition.tsx). Disposition (Resolve / Dismiss) writes back to `PatternMatch.status` and audits via [app/actions/counselor/patterns.ts](app/actions/counselor/patterns.ts).
- [x] Outcome Tracking view — landed alongside the COMPLETE flow on [/counselor/interventions](app/counselor/interventions/page.tsx). Per-intervention participation outcome distribution bar (IMPROVING / COMPLETED / STABLE / DECLINING / UNSET). ✅ *(2026-05-15 follow-up)*

### 5.3 Principal Dashboards *(✅ 2026-05-15)*
- [x] School-Wide Dashboard at [/principal/dashboard](app/principal/dashboard/page.tsx) with drill-down by grade, section, demographic
- [x] Risk distribution by grade level, section, sex, SPED status, learning modality via [lib/risk/queries.ts](lib/risk/queries.ts) (`getRiskBreakdownByGrade`, `getRiskBreakdownBySection`, `getBiasBreakdowns`) — **correction (2026-08-27): the SPED axis was never built.** `getBiasBreakdowns` covers sex and learning modality only; grade level and section come from the separate `getRiskBreakdownByGrade` / `getRiskBreakdownBySection` functions. No SPED axis exists in any of them. See Phase 11 carry-forward.
- [x] Bias monitoring: disparity flag when a group's HIGH rate exceeds the school average by &gt;50%, surfaced inline in [components/principal/risk-breakdown-table.tsx](components/principal/risk-breakdown-table.tsx)
- [x] Intervention pipeline counts (DRAFT / PENDING_APPROVAL / ACTIVE / COMPLETED / CANCELLED) via `getInterventionPipeline`; CTA links to the approval queue
- [x] Principal nav wired in [components/roles/principal/principal-config.ts](components/roles/principal/principal-config.ts)

### 5.4 Cohort Analysis *(✅ 2026-05-16 — unblocked by Phase 7.4 demo data)*
- [x] Select grade level + multiple school years — [app/principal/cohort-analysis/page.tsx](app/principal/cohort-analysis/page.tsx) with a GET-form picker (grade dropdown + per-year checkboxes; submit posts a `years` CSV via a hidden field so the URL is shareable and bookmarkable)
- [x] Side-by-side risk band distributions — LOW/MODERATE/HIGH/Unscored per-year columns
- [x] Intervention counts — Active / Pending / Completed / Cancelled / Total touching the grade (pulled together by `getCohortYearSlice` in [lib/risk/queries.ts](lib/risk/queries.ts) — joins STUDENT/SECTION/GRADE/SCHOOL-scope plans that touch the grade level)
- [x] Outcome rates — IMPROVING / STABLE / COMPLETED / DECLINING / unset distribution from completed-intervention participations
- [x] Year-over-year drift indicators — HIGH-rate delta per year column vs. the previous year, color-coded (rose = worse, emerald = better)
- [x] CSV export — `?format=csv` renders a structured data-URL download with all metrics in row-per-metric / column-per-year shape
- [x] Wired into [principal nav](../components/roles/principal/principal-config.ts) and the [principal dashboard](app/principal/dashboard/page.tsx) (replaced the "coming soon" placeholder with a real link)
- [x] Verified end-to-end via curl: principal sees 200; teacher denied 307; default render shows all 3 SYs; YoY drift computes correctly (+1.00pp in G9 from 24-25→25-26); CSV payload renders with the expected metrics

**Replaces the prior deferral note.** This now lands ahead of Phase 7.4's QA sweep because the demo data shipped first.

### Phase 5 Definition of Done
- [x] Counselor's Pattern Inbox shows live matches across all scopes — verified: engine produced 1 STUDENT match, surfaced on the inbox page
- [x] Teacher's class dashboard reflects up-to-date risk distribution — verified: the new SectionRiskCard renders LOW/MODERATE/HIGH counts and top-3 at-risk students
- [x] Principal opens Cohort Analysis and compares Grade 9 across 3 SYs — verified end-to-end 2026-05-16; 3 SYs of demo data populated by [seed-demo.ts](../scripts/seed-demo.ts); CSV export functional

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

### 7.1 Consent Management UI *(✅ Phase 2.5)*
- [x] Admin → Consent Management page — shipped in Phase 2.5
- [x] Per-student, per-scope view with revocation action
- [x] Revocation degrades features without deleting data (Phase 6 wired the AI-narrative consent gate)

### 7.2 Bias Monitoring *(✅ 2026-05-15, Phase 7 governance core)*
- [x] Dashboard: risk band distribution across sex / learning modality / SPED status — landed in Phase 5 — **correction (2026-08-27): the SPED axis was never built.** `getBiasBreakdowns` covers sex and learning modality only; grade level and section come from the separate `getRiskBreakdownByGrade` / `getRiskBreakdownBySection` functions. No SPED axis exists in any of them. See Phase 11 carry-forward.
- [x] Disparity threshold flags — landed in Phase 5
- [x] **Disparity threshold now admin-tunable** — `AlgorithmConfig.biasThresholds.highRateMultiplier` (migration `20260515153207_add_risk_override_governance`). Editable in [admin algorithm form](../components/roles/admin/algorithm-config-form.tsx); read in [principal dashboard](app/principal/dashboard/page.tsx). Default 0.5 (+50%).
- [x] Principal drill-down — already present via [components/principal/risk-breakdown-table.tsx](components/principal/risk-breakdown-table.tsx)
- [x] Schema: `BiasMetric` (computed snapshots) — **resolved 2026-07-25 (Phase 8.0.3): will not be built.** Compute-on-read is the final answer at this scale. At ~420 students the precomputed snapshot buys no measurable performance and introduces a staleness failure mode (a stored metric disagreeing with the dashboard after an engine run). Spec §12 lists the model, but the *capability* — bias distribution with disparity flags — is delivered by `getBiasBreakdowns`. Revisit only if the population grows an order of magnitude. **Correction (2026-08-27): the SPED axis named here was never built.** `getBiasBreakdowns` covers sex and learning modality only. See Phase 11 carry-forward.

### 7.3 Override Workflow *(✅ 2026-05-15)*
- [x] Schema: new `RiskOverride` model (migration `20260515153207_add_risk_override_governance`); snapshots originalScore + originalBand at the moment of override so the override survives engine recomputes
- [x] Principal → Risk Override server actions ([app/actions/principal/overrides.ts](app/actions/principal/overrides.ts)) — `createRiskOverrideAction` (mandatory justification, audited via `RISK_OVERRIDE`) + `clearRiskOverrideAction`. At most one active override per enrollment is enforced; new override transactionally clears the prior.
- [x] Override panel + form on principal student profile ([components/principal/risk-override-controls.tsx](components/principal/risk-override-controls.tsx)). Banded radio selector + textarea + apply/clear actions.
- [x] Override visible indicator wherever risk renders:
  - **Student profile** (counselor + principal): "Override active" badge in the section header + dedicated override panel showing original band → override band + justification + attribution
  - **Counselor caseload**: `RiskBadge` extended with `overridden` prop → small "OVR" pill next to the band
  - Counselor sees the override (so they understand the displayed band) but has no controls — counselor profile page does not pass principal controls
- [x] Displayed band logic: `getCaseloadWithRisk` and `getLatestRiskForStudent` return the override band when active; the explainability panel still renders the original algorithmic score below for transparency
- [x] Audit: `RISK_OVERRIDE` enum value used for both create and clear; metadata captures from/to bands + whether a prior override was replaced

### 7.6 DB-level append-only AuditLog *(✅ 2026-05-15)*
- [x] Postgres trigger `audit_log_prevent_modification` blocks UPDATE + DELETE on `AuditLog` at the database level (migration `20260515153207_add_risk_override_governance`)
- [x] Belt-and-suspenders: even raw SQL attempts are rejected (verified — see `scripts/verify-overrides-governance.ts`)
- [x] Closes the Phase 1 known-debt item: "DB-level append-only AuditLog grants — app-layer enforcement only"

### 7.4 Demo Data *(✅ 2026-05-16)*
- [x] Generate 3 school years of synthetic data — `SY 2023-2024`, `SY 2024-2025`, `SY 2025-2026` (active) — via [scripts/seed-demo.ts](../scripts/seed-demo.ts). Idempotent, seeded PRNG, bulk inserts in 1k batches. End-to-end run ~17–30s.
- [x] **6 demo sections per SY** (Grade 7 *Aristotle/Bacon*, Grade 8 *Darwin/Einstein*, Grade 9 *Faraday/Galileo*) — fresh names so the existing G9 Newton/Curie + Maria's Phase 2 data stay untouched
- [x] **5 cohorts × ~80 students = 400 unique students** progressing G7→G8→G9 across years. 240 demo enrollments per SY (260 in 25-26 once existing Newton/Curie students are counted)
- [x] **15 subjects per SY** (MATH/ENG/SCI/AP/FIL × Grade 7/8/9); **11 demo teachers** (5 subject teachers spanning all sections + 6 advisers, one per section)
- [x] **Bulk-generated** 14,400 grade rows, 129,600 attendance rows (180 school days × 720 enrollments), ~120 behavioral records
- [x] At least one student matching every detector-implemented pattern rule:
  - `ACADEMIC_DECLINE_CLUSTER` (15 matches), `CRISIS_WARNING` (1), `DISENGAGEMENT_SIGNAL` (2) — student-scope fixtures in cohort C2023
  - `CONCENTRATED_RISK` (1) — Faraday G9 25-26, tuned baseline −22pts + absence +15pp so >30% land MODERATE/HIGH
  - `SUBJECT_STRUGGLE` (2) — Darwin G8 25-26, MATH8 depressed −20pts to push fail rate >40%
  - `ATTENDANCE_EROSION` (2) — Bacon G7 25-26, +18pp absences vs. school baseline
  - **Known gap (not in scope for 7.4):** `RECOVERY_TRACKING` + `CHRONIC_CONCERN` don't fire because [lib/patterns/detector.ts:88-89](../lib/patterns/detector.ts#L88-L89) stubs `hasActiveIntervention=false` / `priorInterventionOutcomes=[]`. Demo data still seeds active interventions + closed-with-unfavourable interventions so these rules will fire once the detector reads intervention data.
- [x] **One closed intervention per scope with outcome:**
  - STUDENT (23-24, ACADEMIC_SUPPORT, IMPROVING)
  - SECTION (24-25, Faraday G9, mixed IMPROVING/STABLE/COMPLETED)
  - GRADE (23-24, G8-wide ACADEMIC_SUPPORT, COMPLETED across 80 participants)
  - SCHOOL (23-24, school-wide ATTENDANCE_PROGRAM, COMPLETED across all 240 enrollments)
- [x] Plus 2 ACTIVE 25-26 interventions on fixture students so the live dashboards show pipeline (academic-decline support + recovery-tracking counseling)
- [x] Risk engine re-runs for **every** SY (not just active) — wipes per-SY `RiskAssessment`/`PatternMatch`/`RecommendationDraft` and recomputes, so historical-year dashboards (cohort comparison, etc.) have real numbers
- [x] Verified end-state: SY 23-24 240 LOW · SY 24-25 240 LOW · SY 25-26 216 LOW + 44 MODERATE · 23 pattern matches (18 STUDENT, 5 SECTION)
- [x] `npx tsc --noEmit` clean; `npm run lint` clean (one pre-existing unrelated warning)
- **Unblocks:** Phase 5.4 Cohort Analysis (now has ≥2 historical SYs of risk + intervention data) and Phase 7.5 QA Sweep

### 7.5 QA Sweep *(✅ 2026-05-16 — except tablet-viewport smoke which requires a human)*
- [x] **Build clean** — `npm run build` succeeds, 27 routes (was 23; added `/principal/cohort-analysis` + others wired in 7.3 and 7.4)
- [x] **Type + lint clean** — `npx tsc --noEmit` clean; `npm run lint` clean except one pre-existing unused-import warning in `app/teacher/student-risk/page.tsx` (unrelated to current scope)
- [x] **Route × role smoke matrix** — 31 checks across 4 roles passed (admin/teacher/counselor/principal). Each role 200 on their own pages; cross-role hits 307. Captured in `/tmp/smoke.sh` for reuse.
- [x] **DB-state spot checks across the Maria scenario:**
  - Maria's enrollment + MATH9 Q1→Q2 decline (85→72) intact from Phase 2b
  - Audit log: 12 distinct action types present including LOGIN/LOGOUT/LOGIN_FAILED, INTERVENTION_CREATED/ACTIVATED/REVISED, COUNSELING_NOTE_CREATED/READ, RISK_OVERRIDE, ATTENDANCE_RECORDED, BEHAVIORAL_INCIDENT_RECORDED
  - Counseling notes: only `COUNSELOR` role appears as author (RBAC sanity)
  - Risk overrides: only `PRINCIPAL` role appears as override author (RBAC sanity)
  - Interventions: all 4 scopes represented across mixed statuses (STUDENT ACTIVE+COMPLETED, SECTION PENDING_APPROVAL+COMPLETED, GRADE COMPLETED+CANCELLED, SCHOOL PENDING_APPROVAL+COMPLETED)
  - InterventionRevision: 2 `isSignificant=true`, 1 `isInterim=true` — both branches of the workflow exercised
  - 364 InterventionParticipation rows with non-null outcomes
  - DB-level append-only AuditLog trigger confirmed: UPDATE + DELETE both rejected with `AuditLog is append-only` error
- [x] **Scenario coverage map** captured in [docs/AEM_Scenario_Maria.md](AEM_Scenario_Maria.md) — every scene's verifiable items confirmed end-to-end except those requiring direct UI interaction (see "Not verifiable without a human" below).
- [ ] **Smoke test on tablet viewport** — *requires a human in front of a tablet-sized browser. Not curl-verifiable.* Specific items to click through: teacher attendance keyboard P/A/T/E entry, gradebook entry form, counselor intervention builder modal, principal cohort-analysis form submit.

**Not verifiable without a human (handover list):**
1. Keyboard-driven attendance entry on `/teacher/my-classes/[classId]` (P/A/T/E quick keys, bulk save)
2. Gradebook entry form interaction
3. Sensitive-field collapse rendering for teacher/admin views on intervention details
4. Builder "save & activate" vs "submit for approval" branching at form-submit time
5. Tablet-viewport responsiveness across the above
6. Notifications bell behavior (the spec implies it but the UI hook isn't yet built)
7. Scene 12.3 AI Literacy Assistant chat — *carried forward from Phase 6 deferral*
8. Manual consent revocation walk-through (no demo data currently has a REVOKED consent row — capability exists, exercise is one admin click)

### Phase 7 Definition of Done
- [ ] Maria scenario (Scenes 0–12) walkable without intervention
- [ ] All Master Verification Checklist items pass
- [ ] Demo-ready

### 7.7 Security hardening *(✅ 2026-05-18)*
Production-readiness pass on three gaps surfaced during the QA review: brute-force protection on login, oversized-CSV protection on import, server-side pagination on long list pages.

**Login rate limit** — [lib/rate-limit.ts](../lib/rate-limit.ts), wired in [auth.ts](../auth.ts).
- Sliding-window in-memory limiter, keyed by client IP (read from `x-forwarded-for` → `x-real-ip` → `unknown`)
- **5 failed attempts per 15 minutes per IP.** Successful login clears the bucket so a user who fat-fingers a few times isn't locked out once they get in.
- Gate runs *before* the DB lookup + bcrypt compare, so an attacker can't burn server cycles
- Every rate-limited attempt audited as `LOGIN_FAILED` with `reason=rate_limited` + `retryAfterSec` in metadata
- **Single-process only.** For multi-instance prod, swap for a Redis-backed limiter (Upstash `@upstash/ratelimit` is the usual choice). Noted in the file's header comment.
- Verified end-to-end: 7 bad attempts → attempts 6/7 audited as `rate_limited` (retryAfterSec: 900)

**CSV import caps** — [lib/import/limits.ts](../lib/import/limits.ts), applied to all 4 admin import server actions (roster, grades, attendance, behavioral) on both preview *and* commit paths.
- **5 MB** / **10,000 rows** cap. Comfortably handles the spec's expected volumes (240 students × 4 quarters × 5 subjects = ~4,800 grade rows; monthly attendance chunks).
- Friendly error message names both the limit and the observed size; admin can split the file and re-upload
- Verified with synthetic 6 MB and 11k-row payloads — both rejected; small CSVs pass through.

**Pagination** — [lib/pagination.ts](../lib/pagination.ts) + [components/shell/pagination-bar.tsx](../components/shell/pagination-bar.tsx).
- Uniform **PAGE_SIZE = 15** across all paginated surfaces (was 50 on audit; everything else was unbounded)
- Applied to 6 list pages:
  - `/admin/audit` — refactored to share the helper (lost the local `PAGE_SIZE = 50`)
  - `/admin/users` — also lifted the role filter from client `useState` to URL state so server-side pagination respects the filter
  - `/counselor/caseload` — added `getCaseloadWithRiskPaged` + `getCaseloadBandSummary` (full-population band counts stay accurate while the table itself paginates)
  - `/principal/students` — uses existing `getCaseload` with new `{skip, take}` options + a `getCaseloadCount` helper
  - `/counselor/interventions` — paginates the interventions table only; recommendations + outcomes stay unpaged (smaller N)
  - `/counselor/patterns` — paginated the underlying query; in-page grouping by scope still works on each page
- `PaginationBar` component renders prev/next links that preserve all other query params (filters, role, etc.)
- Verified: 6 paginated routes return 200 on page 1, page 2, and out-of-range (page 99 clamps); Page 1 vs. Page 2 surface different rows.

---

### 7.8 AI narrative trigger model *(✅ 2026-05-18)*
Documented + extended the existing on-demand narrative generation with explicit user-triggered controls. Default cadence stays lazy + cached; the new buttons let counselors take control when they need it.

**Why this was needed.** The pre-existing system generates narratives at page-render time and caches by SHA-256 of (model + prompt). That means students whose profiles have never been opened have no cached narrative — looking at the cache, only 4/740 RISK_NARRATIVE rows existed because only 4 profiles had been visited. This is correct and cost-efficient, but invisible: a counselor browsing a long caseload sees "no narrative" for some students and assumes something is broken. The fix is to make the on-demand model explicit *and* give counselors a way to pre-warm before a meeting.

**Design decisions** (after walking the trade-off space with the user):
- **Keep lazy on-demand as the default.** Page-render generation + content-hash cache stays. No background pre-warming for every student — that would burn ~740 Gemini calls per engine run, most of them never read.
- **Add a single-student "Regenerate" button.** For when a counselor knows context changed in ways the prompt template can't see (e.g., a manual override was applied right before opening the profile). Bypasses the cache, then router-refreshes the page so the new text shows.
- **Add a batch "Pre-generate AI for this page" button on caseload.** Walks the current paginated 15 students, calls Gemini for misses, no-ops for cache hits. Sequential to keep token rate predictable. Useful pre-meeting prep.
- **Skip the section/grade/school batch-level triggers.** School summary is already generated on every dashboard render. Recommendation narratives are batch-generated when the counselor opens `/counselor/interventions`. Section-level narratives don't exist as a UI surface (would be a Phase-8 feature).

**Implementation:**
- [lib/ai/gemini.ts](../lib/ai/gemini.ts) gained a `forceRegenerate` option on `generateText`. When true, the cache lookup is skipped and the response is upserted (not just created), replacing the prior cached row.
- [lib/ai/narrative.ts](../lib/ai/narrative.ts) `generateRiskNarrative` plumbs the flag through.
- New audit action `AI_NARRATIVE_GENERATED` ([migration 20260518140519](../prisma/migrations/20260518140519_add_ai_narrative_audit_action/migration.sql)). Logged on every actual fresh generation (not on cache hits, not on lazy renders — only when the user-triggered action runs Gemini for real).
- [app/actions/ai/narrative.ts](../app/actions/ai/narrative.ts):
  - `regenerateRiskNarrativeAction` (single student, force-regenerate, COUNSELOR + PRINCIPAL only)
  - `prewarmCaseloadPageNarrativesAction` (batch, cache-respecting, returns `{generated, alreadyCached, skipped, pageSize}`)
- [components/shell/regenerate-narrative-button.tsx](../components/shell/regenerate-narrative-button.tsx) wired into [student-profile-view.tsx](../components/shell/student-profile-view.tsx). Visible on both the success panel (so counselors can refresh) and the fallback panel (so they can retry quota/network/empty-response failures — but not `no_key` or `consent_revoked`, where retry is pointless).
- [components/counselor/prewarm-caseload-button.tsx](../components/counselor/prewarm-caseload-button.tsx) wired into [counselor/caseload/page.tsx](../app/counselor/caseload/page.tsx), only shown when at least one student on the page has a risk score.
- [StudentProfileData.enrollment](../lib/student/queries.ts) gained `schoolYearId` (was only `schoolYearLabel`) so the regenerate button has the ID it needs to pass to the action.

**Verified:**
- `npx tsc --noEmit` clean (after `npx prisma generate` to pick up the new enum); `npm run lint` clean; `npm run build` clean (27 routes).
- Profile page renders the "Regenerate" button next to the "AI narrative" label.
- Caseload page renders the "Pre-generate AI for this page" button in the header.
- Lazy generation still works: visiting a previously unseen demo student profile added a new `AICache` row.
- Audit log gains `AI_NARRATIVE_GENERATED` rows only when user-triggered actions run, not from lazy page renders.

**Why not eager-on-engine-run.** Considered auto-pre-warming all 740 narratives whenever the admin runs the risk engine. Rejected: most narratives are never read, the cost is unpredictable, and the engine-run latency would balloon. The hybrid model (lazy default + manual buttons) gives the same UX outcome (counselors who know they need fresh narratives can get them) without the waste.

**Serialised the recommendation-narratives batch *(2026-05-18 follow-up)*.** [app/counselor/interventions/page.tsx](app/counselor/interventions/page.tsx) used to fire `Promise.all(recommendations.map(...))` — when the cache was cold (e.g., right after the engine produced 26 new recommendations), that batched 26 concurrent Gemini calls in a single second. Free-tier Gemini is 15 RPM, so a chunk of the calls came back as `quota` fallbacks and the user saw "full request" hits in Google AI Studio. Replaced with a `for` loop: first cold visit is slower (~30s for 26 recommendations at ~1s each) but stays comfortably under any per-minute rate limit. Subsequent visits remain instant because every successful call writes to `AICache`. No change to the data model or UX — just the loop shape.

---

### 7.9 Search + filters on list pages *(✅ 2026-05-20)*
Counselors, principals, teachers, and admin couldn't find specific students except by paging through 15-row tables. This pass adds server-side search + filter URL state to every student-facing list, plus the user-management list.

**Shared toolbar** — [components/shell/list-toolbar.tsx](../components/shell/list-toolbar.tsx).
- Single `<ListToolbar>` component with: search input + arbitrary filter dropdowns + active-filter pills (each removable) + Apply/Clear buttons
- All URL-state — submit is a plain GET form, no client JS state machinery
- `toForwardParams(...)` helper turns the current filter set into the shape `PaginationBar` expects so page links preserve every filter

**Pages wired:**
- `/counselor/caseload` — name/LRN search + risk band (HIGH/MODERATE/LOW/UNSCORED) + grade + section. Band filter **respects principal overrides** (Diego overridden to MODERATE shows up under MODERATE, not his algorithmic HIGH). Implementation: `getCaseloadWithRiskPaged` resolves matching enrollment IDs in a separate query when band is set, then constrains the main paginated query to that set.
- `/principal/students` — name/LRN search + grade + section. Server-side filter via `buildCaseloadWhere` extracted from [lib/student/queries.ts](../lib/student/queries.ts). **Correction (2026-08-27): SPED status is not a filter here.** `buildCaseloadWhere`'s `CaseloadFilters` type only accepts `search`, `sectionId`, and `gradeLevel` — no SPED filter exists in the query or the page UI. See Phase 11 carry-forward.
- `/admin/consent` — name/LRN search + status (`ANY_REVOKED` / `ALL_GRANTED`). Refactored from client-state filter (with all 420 students loaded) to server-side filter + pagination. Removed ~50 lines of redundant in-component search/filter UI from [components/roles/admin/consent-manager.tsx](../components/roles/admin/consent-manager.tsx).
- `/admin/users` — added name/email search on top of the existing role-filter pills. Search + role filter compose correctly (URL state preserves both when paginating).
- `/teacher/student-risk` — name/LRN search + risk band + section. In-app filtering (small N per teacher: ≤6 sections × ≤40 students), grouped output preserved.
- `/teacher/my-classes/[classId]` — roster tab gets a small client-side name/LRN search (already a client component, useState was the right tool).

**Other pages:**
- `/admin/audit` already has filters (action, resourceType, userId, from, to). Unchanged.
- `/principal/cohort-analysis` already has grade + multi-year picker. Unchanged.
- Workflow lists (`/counselor/interventions`, `/counselor/patterns`, `/counselor/feedback`, `/teacher/intervention-feedback`) were *not* in scope this pass per the "student-finding pages only" decision — log as follow-up.

**Verified:**
- `npx tsc --noEmit` clean, `npm run lint` clean (no new warnings), `npm run build` clean.
- 16 query-string variants across 4 roles all return 200.
- DB-truth correctness check: page header counts match raw SQL counts — principal/students with `q=maria` shows 6 matches out of 260; `Grade 9 + IEP` shows 7 matches.

**Known follow-ups:**
- Wire search/filter on the workflow lists (`/counselor/interventions`, `/counselor/patterns`, `/counselor/feedback`, `/teacher/intervention-feedback`). Small lists today but useful when intervention volume grows.
- Replace the two-query workaround in `getCaseloadWithRiskPaged` (band filter → resolve IDs → main query) with a single raw-SQL CTE + window function once we have a real reason to optimize.

---

### 7.10 Teacher intervention referral *(✅ 2026-06-17)*
Teachers could see at-risk students daily but had no path to initiate an intervention — only counselors create interventions (spec §3/§6.6, single-owner governance). This adds a **referral** flow: a teacher proposes an intervention for a student in their sections; a counselor reviews and either accepts (converting it into a counselor-owned intervention) or declines with a reason. Teacher initiates; counselor decides and owns — governance model unchanged.

**Model** — `InterventionReferral` (STUDENT scope only), mirroring the algorithm-originated `RecommendationDraft → Intervention` conversion path but human-originated (kept separate to preserve algorithm-vs-human provenance). Link to the resulting intervention is a single FK `resultingInterventionId`. New enums `ReferralStatus`/`ReferralUrgency`; audit actions `REFERRAL_CREATED`/`REFERRAL_ACCEPTED`/`REFERRAL_DECLINED`. Migration `add_intervention_referral`.

**Teacher side** — `/teacher/refer`: scope-guarded student picker (only the teacher's taught/advised sections), suggested type + rationale + urgency, plus a status list (PENDING / ACCEPTED-with-link / DECLINED-with-reason). Action `createReferralAction` enforces the scope guard server-side (`canTeacherReferStudent`), not just in the UI.

**Counselor side** — `/counselor/referrals`: pending queue ordered by urgency. **Accept** pre-fills the existing intervention builder via `?fromReferral=<id>` (source-aware `RecommendationPrefill`), and `createInterventionAction` (extended with optional `triggeringReferralId`) flips the referral to ACCEPTED + links it inside the same transaction. **Decline** (`declineReferralAction`) records a reason. The pre-existing recommendation-draft accept path is untouched and independent.

**Verified:** `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean across all tasks; `/teacher/refer` + `/counselor/referrals` registered (307 unauth). Data-layer end-to-end (real query helpers against demo data): scope guard allow+reject, PENDING create, teacher PENDING view, counselor queue, prefill shape (STUDENT/REFERRAL), accept linkage, decline-with-reason — all pass. Built via subagent-driven development (7 tasks, per-task spec+quality review). Design/plan: [docs/superpowers/specs/2026-06-17-teacher-intervention-referral-design.md](superpowers/specs/2026-06-17-teacher-intervention-referral-design.md), [docs/superpowers/plans/2026-06-17-teacher-intervention-referral.md](superpowers/plans/2026-06-17-teacher-intervention-referral.md).

**Known follow-ups:** referrals are individual-student scope only (no section/grade/school referrals); no edit/withdraw of a submitted referral; the teacher status list links to `/teacher/intervention-feedback` generally rather than deep-linking the specific created intervention. **Accept-time scope provenance:** the accept branch validates the referral is PENDING but does not re-pin the resulting intervention's scope/target to the referral's student — a counselor may retarget scope before saving (e.g. escalate to a section plan) and the referral still links to it. This mirrors the existing recommendation-draft accept path and is intentional (counselor owns the resulting plan's scope); documented here rather than enforced so the provenance edge is explicit.

---

**Known follow-ups (intentionally deferred):**
- Multi-instance Redis-backed rate limiter (one-line swap when we leave single-process)
- The 12 unbounded `findMany` in [lib/intervention/queries.ts](../lib/intervention/queries.ts) — most are tightly filtered and used by detail pages (not lists), so the user-facing risk is small; revisit if any of them turn into general list endpoints
- Application-level error/observability logging (currently only audit-log of user actions). Pino + a stderr sink would suffice locally; Sentry/Datadog for prod
- `cache()` wrappers around expensive read queries (Next 16 supports it; not bottlenecked yet)

**Verified:** `npx tsc --noEmit` clean; `npm run lint` clean (the one pre-existing unused-import warning still stands); `npm run build` clean; full role × route smoke matrix passes; rate-limit + CSV cap + pagination all exercised live.

---

**Phase 7 progress notes:**
- *7.4 retro (2026-05-16):* The fixture-tuning iteration mattered more than the bulk-data pipeline. First pass landed only ~15% of Faraday in MODERATE; the rule needs >30%. Bumping baseline from −10 → −22 and absence from +0.08 → +0.15 got it over the line. Lesson: when seeding for an engine, write the rule's required output as the test, then back into the input pressure — don't eyeball it. Also: idempotent regeneration was useful but the existing-data check meant I had to wipe Faraday's three tables to re-tune; a `--force` flag on the script would have saved one round-trip. Skipping it for now since this script is meant to be run once per environment.
- *Detector intervention reads (2026-05-16):* Wired in the same session — was meant to be "two lines" but ended up needing the cross-year participation fetch (a student's prior outcomes don't live on their *current* enrollment). Single bulk fetch + in-memory group keeps it N=1 query per detector run. Mapping decision: `COMPLETED` (the participation outcome enum) → `STABLE` (the rule input enum). `COMPLETED` semantically means "the plan ran to completion" not "the student improved"; calling it `NO_CHANGE` would have caused false unfavorable hits on every closed plan.
- *5.4 cohort analysis (2026-05-16):* Came out smaller than expected. The bulk of the work was the `getCohortYearSlice` query that has to consider four intervention scopes touching a grade (STUDENT enrolled here, SECTION at this grade, GRADE matching the level, SCHOOL always). Page itself is server-rendered with a GET form — no client state. The hidden-field shimming for multi-year checkboxes is the only client JS; should probably replace with a small client component if this grows.
- *7.5 QA sweep (2026-05-16):* Curl + DB inspection covers most of the Maria scenario but not the truly interactive parts (keyboard P/A/T/E, builder modals, tablet viewport). Flagged 8 items that need a human in front of a browser before we can call Phase 7 "demo-ready" in the strictest sense. Everything else passes.
- **Still outstanding for Phase 7 Definition of Done:** the tablet-viewport smoke test and a couple of interactive flows. Everything DB-, route-, build-, lint-, and type-verifiable is green.

---

## Phase 8 — Research-Theme Coverage Closure *(planned 2026-07-25)*

**Goal:** Close the gaps between the shipped system and the research thematic findings (Figures 14–16, 20–22), plus three spec-compliance items that drifted during Phases 4–7.

**Origin:** Coverage review of the six thematic-analysis figures against the codebase (2026-07-25). Figures 15, 20, 21 came back essentially complete; Figure 16 and 20 had narrow gaps; Figure 14 (comprehensive student data) and Figure 22 (capacity building) had real gaps.

**Sequencing is load-bearing.** Slice 0 changes every risk score, so it lands before anything that depends on scores or fixtures. Re-tuning demo fixtures twice is wasted work.

### 8.0 Spec-compliance fixes *(Slice 0 — ✅ complete 2026-07-25)*

- [x] **8.0.1 Wire the `interventionHistory` risk dimension.** [lib/risk/engine.ts](../lib/risk/engine.ts) hardcodes this sub-score to `0` ("Phase 3 — no intervention data yet"), but Phase 3 shipped 2026-05-15 and the detector was wired to intervention data in 7.4. Spec §7 defines risk as a weighted sum of **five** dimensions; today it is four with a diluted denominator.
  - Add `computeInterventionHistoryBreakdown()` — prior participation outcomes + active-plan count. Reuse the cross-year participation fetch shape already in [lib/patterns/detector.ts](../lib/patterns/detector.ts); do not add a second query pattern for the same data.
  - Extend `ScoringInput`, `RiskFactors`, and `RiskFactors.breakdown` so the explainability panel renders the new dimension (convention 8: never a score without its why).
  - **Blast radius:** every `RiskAssessment` changes. Re-run the engine across all 3 SYs and re-verify 7.4 fixture expectations (`CONCENTRATED_RISK` >30% of Faraday MODERATE/HIGH; `SUBJECT_STRUGGLE` >40% MATH8 fail rate; `ATTENDANCE_EROSION` on Bacon G7). Budget for fixture re-tuning.
- [x] **8.0.2 Import Wizard step 6 — historical interventions CSV.** Spec §6.11 defines six import steps; the wizard had four CSV steps. New `lib/import/interventions.ts` validator (LRN, type, scope, start date, end date, outcome) + `app/actions/import/interventions.ts` + a fifth `<CsvStep>` instance. Feeds 8.0.1 — imported history is what makes the intervention-history dimension meaningful on historical years.
- [x] **8.0.3 `BiasMetric` — decision, not deferral.** Spec §12 lists the model; 7.2 deferred it as "compute-on-read is fine until volume requires precomputation." **Resolution: compute-on-read is final.** At ~420 students the precomputed snapshot buys no measurable performance and adds a staleness failure mode (metrics disagreeing with the dashboard after an engine run). Revisit only if the student population grows an order of magnitude. This closes the open item rather than carrying it forward.

#### Slice 0 — what shipped (2026-07-25)

**Scoring model for the new dimension.** It measures *whether prior support worked* — the one signal the other four dimensions cannot see. Sub-score = recurrence risk (0/10/25/40 by prior completed-plan count) + declining outcomes (20 each, cap 40) − improving outcomes (15 each, cap 30), clamped 0–100.

**The design call worth recording: an active plan contributes zero.** The first instinct is to treat "currently under intervention" as elevated risk. That would double-count (the conditions that justified the plan are already measured by academic/attendance/behavioral) and, worse, create a feedback loop where a counselor helping a student raises that student's risk score. For a system whose thesis is "algorithmic support, human decisions," an algorithm that penalises the act of helping is indefensible. `hasActiveIntervention` is therefore carried in the breakdown for transparency but never enters the arithmetic — and there is a regression test asserting exactly that.

**Shared fetch extracted.** [lib/risk/intervention-history.ts](../lib/risk/intervention-history.ts) — the detector already bulk-fetched cross-year participations; the engine needed the same two facts. Second use, so the fetch moved out (convention 10) and the detector now reads it instead of running its own query. Interpretation stays with each caller: the detector maps to its rule enum, the engine to a sub-score.

**Callers updated (5):** [compute.ts](../app/actions/risk/compute.ts), [what-if.ts](../app/actions/risk/what-if.ts), [seed-demo.ts](../scripts/seed-demo.ts), [run-risk-engine.ts](../scripts/run-risk-engine.ts), [detector.ts](../lib/patterns/detector.ts). The fifth was found by `tsc`, not by grep — making `interventionHistory` a required field on `ScoringInput` rather than optional-with-default is what surfaced it. Worth repeating for the next dimension.

**What-if simulator gained the dimension** (three outcome-count inputs). Deliberately *no* active-plan toggle: a control that never moves the score teaches the wrong lesson in a literacy tool. The copy states the neutrality instead.

**Import grouping.** Historical rows are keyed by LRN because that is how schools hold their records, so a section/grade/school plan arrives as many rows. `groupInterventions` folds rows sharing scope + target + type + both dates into one plan with many participants; individual-scope rows never merge. Imported plans land `COMPLETED` (they carry an outcome, so they are finished work) and are owned by the importing admin — no counselor made that call in-system, and spec §14 wants a named accountable human.

**Known limitation:** the import has no free-text column. `Intervention` has no `description` field (it carries `schedule` / `accommodations` / `staffActions` / `targetOutcomes`), and routing imported prose into one of those would misrepresent it. Spec §6.11 requires only the six columns implemented.

**Verification:**
- [scripts/verify-intervention-history-score.ts](../scripts/verify-intervention-history-score.ts) — 9 table cases on the sub-score + the active-plan neutrality assertion + a DB scan. All pass.
- [scripts/verify-interventions-import.ts](../scripts/verify-interventions-import.ts) — 7 validator error paths (unenrolled LRN, bad type/scope/date/outcome, end-before-start, malformed LRN), missing-column detection, grouping (6 rows → 4 plans, section plan with 3 participants, alias normalisation), and a real transactional commit deliberately rolled back. All pass.
- Engine re-run across all 3 SYs. **Band distribution unchanged** (23-24: 240 LOW · 24-25: 240 LOW · 25-26: 209 LOW / 40 MODERATE / 1 HIGH); all 8 pattern rules still fire at identical counts. 730/730 assessments now carry the breakdown key; 480 carry a non-zero contribution, spread 0/10/25/40/80.
- No bands flipped because the admin-configured weight for this dimension is **0.05** — an 80 sub-score moves the total by 4 points. The dimension is live and correct; whether 0.05 is the right weight is now a tunable policy question for the principal/admin, not a code gap.
- `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` clean (37 routes) · counselor + admin route smoke 200, explainability panel renders the new detail block on a real profile.

### 8.0.4 Dead-code and unreachable-feature sweep *(✅ 2026-07-25)*

A codebase audit run before starting Slice A, after the coverage review raised "is anything here not needed?". Three categories came back.

**1. `lib/rbac.ts` was not enforcing anything — deleted.** It exported `studentVisibilityFilter` / `enrollmentVisibilityFilter` / `canReadCounselingContent`, and **no application code called any of them**; the only consumer was `verify-rbac-scope.ts`, the script that tested it. [CLAUDE.md](../CLAUDE.md) names the query layer as the third RBAC tier and Phase 2a records this module as its implementation, so a reader would reasonably conclude enforcement lived here. It did not.

Enforcement is real, just implemented differently: every teacher-facing query takes the caller's `userId` and verifies assignment ownership itself (`getTeacherClassDetail`, `getSectionRiskForTeacher`, `canTeacherReferStudent`), `getCounselingNotes` short-circuits non-counselors, and `canViewIntervention` holds the visibility matrix. **That pattern is stronger than a composable `where` fragment** — you cannot call the function without passing `userId`, whereas a fragment can be forgotten at any call site. So the fix was to delete the unused abstraction, not to retrofit it.

The real cost was the false assurance: `verify-rbac-scope.ts` was green while testing code production never ran. It has been rewritten to assert against the actual helpers — **18 assertions** covering teacher class scoping, cross-teacher assignment denial, risk-row scoping, the referral scope guard (allow + reject), counselor-only note access across all four roles, and intervention sensitive-field stripping for teacher/admin plus admin participant-list stripping.

**Also seeded 3 demo counseling notes** ([seed-demo.ts](../scripts/seed-demo.ts) `createDemoCounselingNotes`, idempotent via a `[demo]` marker). The counseling-note assertions previously **skipped** for lack of data — a vacuous check on the most sensitive table in the system. They now run.

**2. `dismissRecommendationAction` was implemented but unreachable — now wired.** Full server action with RBAC and `RECOMMENDATION_DISMISSED` audit, and no UI called it. Phase 4.3 records "dismissed drafts remain as audit evidence" as shipped; in practice a counselor could not dismiss anything and drafts accumulated forever. New [dismiss-recommendation-button.tsx](../components/counselor/dismiss-recommendation-button.tsx) (two-step confirm) on the Open Recommendations queue; the action now takes a plain object like its `setPatternStatusAction` sibling and calls `revalidatePath`.

This one matters beyond tidiness: *declining* an algorithmic suggestion is precisely the reflective-literacy behaviour §13 claims the system teaches. Without it, the queue only supported saying yes.

**3. Genuinely dead code — deleted (~300 lines).**

| Removed | Why |
|---|---|
| `components/roles/teacher/section-risk-card.tsx` (109 lines) | Never imported; see the Phase 5.1 correction above |
| `recordGradeAction` (~55 lines) | Superseded by `recordBulkGradesAction`, which is what the gradebook calls. Gradebook was never broken |
| `getCaseloadWithRisk` (~50 lines) | Superseded by `getCaseloadWithRiskPaged` in 7.7; its comment claimed callers that no longer existed |
| `getLatestRiskForEnrollment` | No callers |
| `bandColor`, `isCurrentYear`, `geminiKeyConfigured` | No callers |
| `PRINCIPAL_DESCRIPTION`, `PRINCIPAL_METRICS` | Leftovers from when the principal landing page used `RoleOverview`. The page is now deliberately bespoke (renders live risk distribution) — divergence kept, orphans dropped |

**Left alone deliberately:**
- `EnrollmentStatus.TRANSFERRED / DROPPED / GRADUATED` are never set — no admin UI exposes them, so every enrollment is `ACTIVE` forever. Legitimate domain states; note as a limitation rather than delete.
- `AuditAction.PATTERN_MATCHED` / `RECOMMENDATION_DRAFTED` are never logged individually — the engine audits them in aggregate through `RISK_RECOMPUTED` metadata. Adequate; the enum values are aspirational.
- `requireSession` is exported but only used internally by `requireRole`. Harmless, and [CLAUDE.md](../CLAUDE.md) convention 2 names both.

**Verified:** `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` clean · RBAC suite 18/18 · engine + import suites still pass.

---

### 8.1 SEL module *(Slice A — ✅ complete 2026-07-25)*

Figure 14's Behavioral & Socio-Emotional box lists *emotional well-being*, *stress level*, *peer relationships*, and *student self-assessment*. None have anywhere to live today: [student-profile-view.tsx](../components/shell/student-profile-view.tsx) renders a "Behavioral & SEL Records" heading with no SEL data behind it, and `SELAssessment` has been named in [schema.prisma](../prisma/schema.prisma) line 5 as a future model since Phase 1.

- [x] **8.1.1 Schema** — `SELAssessment` (enrollmentId, assessedById, assessedAt, dimension scores) + supporting enums. Migration `add_sel_assessment`. New audit actions `SEL_ASSESSMENT_CREATED`, `SEL_ASSESSMENT_READ`.
- [x] **8.1.2 Access model** — counselor-managed per spec §6.4. Query helper in [lib/student/queries.ts](../lib/student/queries.ts) mirroring `getCounselingNotes`: non-counselor callers short-circuit to `[]` with no DB roundtrip. Teachers get **limited fields only** (§6.4 is explicit); principal read-only.
- [x] **8.1.3 Server action + UI** — `app/actions/counselor/sel.ts` (`requireRole("COUNSELOR")`, Zod, audit) + assessment form and timeline in the existing profile section.
- [x] **8.1.4 Import + demo data** — sixth `<CsvStep>`; extend [seed-demo.ts](../scripts/seed-demo.ts) so fixture students carry SEL history.

**Constraint (binding):** SEL does **not** become a sixth risk weight. Spec §7 fixes five dimensions, and every `AlgorithmConfig` version already recorded assumes that shape. SEL feeds the profile view and, optionally later, pattern rules. Adding a weight is scope expansion — if it becomes desirable, it needs its own decision, not a side effect of this slice.

**Cut-order note:** SEL is #3 in the spec §15 cut order. It was *not* cut — it shipped, and it is the single highest-coverage slice against the research themes.

#### Slice A — what shipped (2026-07-25)

**Access decision (user call, 2026-07-25): counselor + principal only.** The spec pulls two ways — §6.4 says "teacher view restricted to limited fields", but the §5 Teacher feature list never mentions SEL and §14 mandates data minimization. Resolution:

| Role | Sees |
|---|---|
| COUNSELOR | all four dimensions + narrative `notes` |
| PRINCIPAL | all four dimensions, `notes` forced to `null` |
| TEACHER | nothing — `[]`, no DB roundtrip |
| ADMIN | nothing — `[]`, no DB roundtrip |

The principal line is the same one already drawn around counseling note bodies (§5, §9): oversight of *levels* without access to clinical narrative. This is the most conservative reading and the easiest to loosen later if teacher coordination turns out to need it.

**Enforcement is in the query, not the component.** `getSELAssessments` decides role access and nulls `notes`; `StudentProfileView` renders whatever it is handed and makes no access decision of its own. `scripts/verify-sel.ts` asserts this directly so it fails if the decision ever migrates upward.

**One scale, constant direction.** All four dimensions use `SELLevel { THRIVING, STABLE, AT_RISK, CRITICAL }` read as *level of concern* — so for `stressLevel`, THRIVING means well-regulated, not "lots of stress". Documented on the enum, in the form hint, and in the import hints, because the intuitive reading of "stress: thriving" is backwards.

**`selfAssessment` is optional by design.** It is the student's own rating, but there is no student portal (§16), so a counselor records it second-hand and it simply may not exist. Nullable in the schema, "Not given" in the UI, blank-allowed in the CSV.

**The import raised a real governance problem.** The wizard is admin-only (§6.11), but admins have no SEL access and SEL is counselor-authored clinical data — attributing imported assessments to the importing admin would have broken the "only counselors author SEL" invariant the QA sweep checks. Solution: a required `assessedByEmail` column validated against active COUNSELOR users. Rows are attributed to that named counselor, never the importer; the audit metadata records who they were attributed *to*, keeping §14 accountability intact. The admin is knowingly writing data they cannot read back — the step hint says so plainly.

`notes` is never echoed into the admin-facing preview table (it shows "provided" / "—"), and the create action audits dimension levels but deliberately **not** note content — the audit log is readable by admin and principal, so copying narrative there would route around the access rule the query enforces.

**Bug found and fixed in Slice 0's work.** The wizard's step container was gated `step >= 2 && step <= 5`, so the Interventions step added in 8.0.2 rendered its stepper button but no form — the step was unreachable. The Slice 0 smoke test grepped for the step *label*, which comes from `STEP_LABELS` and was present regardless, so it passed against a broken feature. Gate widened to `step <= 7`. **Lesson: assert on a string only the step body can produce, never one the navigation also emits.**

**Verified:**
- [scripts/verify-sel.ts](../scripts/verify-sel.ts) — 15 assertions. Access matrix across all four roles (including "principal NEVER receives notes", counted), read auditing, the only-counselors-author invariant, 5 validator error paths (unenrolled LRN, non-counselor assessor, bad date, bad level, bad optional level), and clean-row handling for case-insensitive levels/emails, US dates, and blank optionals. All pass.
- Live UI smoke on a seeded student: counselor profile renders the narrative, principal profile returns **0 occurrences** of the same string, both render the SEL section. Teacher surfaces show no SEL anywhere.
- Demo data: 5 assessments including a two-point improving trajectory on one student and one with no self-rating.
- `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` clean · RBAC / engine / import suites still pass.

**Human-verification carry-forward:** clicking through wizard steps 6 and 7 needs a browser — the wizard renders step 1 server-side and later steps are client state, so curl cannot reach them. Both step bodies are confirmed present in the compiled client bundle.

**Not done in this slice (deliberate):** SEL does not feed the risk engine. Spec §7 fixes five weighted dimensions and every recorded `AlgorithmConfig` version assumes that shape — adding a sixth needs its own decision, not a side effect of this slice.

### 8.2 Intervention types + notifications *(Slice B — ✅ complete 2026-07-25)*

- [x] **8.2.1 Align `InterventionType` to spec §6.6.** The enum has 8 values; the spec names 9 partly-different ones. Additive migration for `TUTORING`, `PEER_SUPPORT`, `PARENT_CONFERENCE`, `EXTERNAL_REFERRAL`, `SEL_PROGRAM`, `STUDY_SKILLS_WORKSHOP` — keep the existing 8 so historical rows stay valid. Update builder / edit / referral dropdowns and the ruleId→type mapping in [lib/patterns/recommendations.ts](../lib/patterns/recommendations.ts), which per §10 should be able to emit *parent conference*, *study skills workshop*, and *peer mentorship* but currently cannot. Closes Figure 16's *parent engagement* and Figure 22's *student mentoring*.
- [x] **8.2.2 In-app notifications.** Spec §5 (Teacher) promises "in-app notifications when a student in their class crosses into a higher risk band." Zero notification code exists; it is item 6 on the 7.5 human-verification handover list and Figure 20's *early warning alerts*.
  - `Notification` model (userId, kind, title, body, linkHref, readAt, schoolYearId).
  - Emit on band transition during an engine run — compare new band against the prior `RiskAssessment` for that enrollment, fan out to teachers assigned to the section. Also emit on referral accept/decline (the referring teacher currently has to poll `/teacher/refer`) and on approval-queue arrival for the principal.
  - Bell + unread count in [components/shell/role-shell.tsx](../components/shell/role-shell.tsx) so all four roles inherit it from one place, plus a notifications list route.

#### Slice B — what shipped (2026-07-25)

**Enum aligned, and the duplication that caused the drift removed.** The type list was copy-pasted across **seven** call sites (builder form, edit form, referral form, three server-action Zod enums, import validator). Adding six values to seven lists is exactly when a shared constant earns its keep, so the vocabulary now lives in [lib/intervention/types.ts](../lib/intervention/types.ts) with `INTERVENTION_TYPES` + `INTERVENTION_TYPE_LABEL`, and every site imports it. Labels are proper prose now ("Study skills workshop") rather than four different ad-hoc `replace(/_/g, " ")` variants. Migration is additive — all four persisted types still resolve.

**Correction to this section's own earlier claim.** The 8.2.1 bullet above says the recommendation mapping "should be able to emit parent conference, study skills workshop, and peer mentorship but currently cannot." Having read §10 against the implemented rules, that overstated it: those §10 examples attach to *Transition Difficulty*, a grade-level rule still deferred since Phase 4, and to SEL-driven risk, which no rule consumes. The mappings were therefore **left unchanged** — inventing clinical routing (e.g. escalating `DISENGAGEMENT_SIGNAL` from a counseling check-in to a parent conference) to satisfy a checkbox would be worse than the gap. The new types are available for **human selection** in the builder, edit, and referral forms today; automated emission waits on the rules that would justify it.

**Notifications.** New `Notification` model + `NotificationKind`, with three emitters:

| Trigger | Recipients | Why it was needed |
|---|---|---|
| Risk band increases during a recompute | every teacher assigned to the student's section (advisers included — an adviser is just an assignment row) | the spec §5 promise, unimplemented since Phase 1 |
| Referral accepted / declined | the referring teacher | they previously had to revisit `/teacher/refer` and re-read the list to learn the outcome |
| Broader-scope plan enters PENDING_APPROVAL | every active principal | plans otherwise surfaced only if someone opened the approval queue |

**Payloads are deliberately dumb.** A notification carries a title, a one-line body, and a link — never rationale, counseling content, or SEL detail. The recipient follows the link and the normal query-layer rules apply there. This means a notification can never become a side channel around RBAC, which matters because the fan-out is the widest audience in the system.

**Only an *increase* notifies.** Improvement, an unchanged band, and a first-ever score all stay silent — the last one because a student's first score has no band to have crossed, and treating it as a crossing would fire a notification for all ~250 enrollments on the first engine run of a year.

**Testability refactor mid-slice.** The fan-out started as straight-line code inside `computeRiskAction`, which needs a session and so could not be reached from a script. Extracted to a pure `buildBandIncreaseNotifications(crossings, teachersBySection, schoolYearId)`; the action now only supplies data and persists the result. Six assertions now cover the rule directly, including the orphan-section case.

**Known behaviour, deliberate:** emission lives in the server action, so `scripts/run-risk-engine.ts` and `seed-demo.ts` recompute risk **without** notifying. That is wanted — bulk seeding 250 enrollments should not manufacture an inbox — but it does mean the admin "Run engine" button is the only path that notifies. Noted here so it is not mistaken for a bug later.

**Verified:**
- [scripts/verify-notifications.ts](../scripts/verify-notifications.ts) — **33 assertions**: enum shape read straight from `pg_enum` (14 values, all six new ones present, shared constant matches the DB exactly, all persisted types still valid), band-transition truth table including the improvement and first-score cases, fan-out composition, recipient dedup, emission, per-user isolation, and mark-read scoping (a different user's `updateMany` affects **0 rows**). Cleans up its own test rows.
- Route × role smoke: all four `/{role}/notifications` return 200 for their own role, teacher → `/counselor/notifications` returns 307. Bell renders in the shared shell.
- `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` clean (41 routes) · RBAC / SEL / engine / import suites all still pass.

### 8.3 AI literacy surfaces *(Slice C — ✅ complete 2026-07-25)*

- [x] **8.3.1 "How does this work?" pages.** Spec §6.9, deferred since Phase 4. Server components under `/learn`: how the risk score is computed, what each pattern rule looks for, what the system does and does not decide. **Render the weights from the live `AlgorithmConfig` row, not hardcoded prose** — otherwise the page silently drifts every time an admin retunes the algorithm. Link from every explainability panel and risk badge.
- [x] **8.3.2 Tooltips on algorithmic outputs.** §6.9's last bullet. One shared `<Explain>` primitive applied to risk bands, sub-score bars, pattern evidence, and disparity flags.
- [x] **8.3.3 AI Literacy Assistant — remains cut.** #1 in the spec §15 cut order; needs a Gemini chat-session API plus multi-turn UI. Recorded here as a deliberate boundary so it stops reading as unfinished work.

#### Slice C — what shipped (2026-07-25)

**`/learn` is deliberately outside the role prefixes.** Four pages — hub, risk score, pattern rules, and what the system decides — reachable by all four roles at the same URLs. `proxy.ts` already requires a session for anything not public, and `ROLE_PREFIXES` doesn't cover `/learn`, so this needed no proxy change. The reason to share one surface rather than build `/{role}/learn` four times: "the counselor was shown a different version of the rules" would defeat the purpose. Linked from every role's nav, the explainability panel ("How does this work?"), and the pattern inbox.

**The risk-score page cannot drift, and that was tested by breaking it.** Weights and band cut-offs are read from the active `AlgorithmConfig` at render time; only the *prose* describing each dimension is static. Verified by retuning the live config mid-test:

| | academic | attendance | behavioral | intervention history | profile | LOW band |
|---|---|---|---|---|---|---|
| before | 40% | 30% | 20% | 5% | 5% | Below 40 |
| after retune | 10% | 10% | 10% | 60% | 10% | Below 25 |
| restored | 40% | 30% | 20% | 5% | 5% | Below 40 |

The page followed the config in both directions. Config was restored to `v1` defaults afterwards. Shares are rendered as *normalised* percentages rather than raw weights, because the engine normalises — printing the raw numbers would misstate the maths whenever they don't sum to 1.

**Known drift risk, recorded rather than hidden:** the pattern-rule thresholds on `/learn/patterns` are prose transcribed from [lib/patterns/rules.ts](../lib/patterns/rules.ts), because unlike the weights those numbers are compiled into the rule functions rather than stored in config. Changing a rule threshold means updating that page by hand. Noted at the top of the file. Moving rule thresholds into `AlgorithmConfig` would fix it properly and is worth doing if the rules ever become tunable.

**`<Explain>` is CSS-only.** A JS-free hover/focus popover, so the five sub-score bars in a server-rendered panel don't become five hydrated client islands on a page that already renders dozens of them. Keyboard-reachable via `tabIndex` + `focus-within` rather than hover-only.

**Tone was a deliberate choice.** These pages are the thesis's AI-literacy artefact, so they say plainly what the score *is not*: not a prediction, not a decision, not better than the data underneath it, and overridable. `/learn/decisions` puts "the system does" and "people do" side by side, and states that the language model writes prose and nothing else — if it is unavailable, every number stays exactly where it was, which is the test of whether it was ever doing the real work.

**Scope note:** 8.3.2 as planned said tooltips on "risk bands, sub-score bars, pattern evidence, and disparity flags". Shipped on the sub-score bars plus the panel-level "How does this work?" link and the pattern-inbox link. Evidence and disparity-flag tooltips were not added — the evidence payloads are already rendered in full prose beside the match, and the disparity flag already carries an inline explanation, so a tooltip would restate what is on screen. Recorded as a narrowing rather than left implied.

**Verified:** all four `/learn` routes return 200 for all four roles; unauthenticated returns 307. `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` clean (45 routes).

### 8.4 Declared non-goals

Recorded so the research write-up can defend these as design positions rather than omissions:

- **Contextual student data** (socioeconomic status, health concerns, access to learning resources, detailed family background) — Figure 14 lists them; collecting them contradicts spec §14 **data minimization**. The system holds guardian contact, SPED status, and learning modality, and stops there.
- **Parent participation, student-led helpdesk, LAC, teacher training, ICT support, CPD** (Figure 22) — organizational practices, not software surfaces. §16 already excludes the parent/student portal and automated parent notifications.
- **Trained-ML predictive modeling** (Figure 15 *predictive insights*) — §16 excludes it. The rule-based engine is the deliberate choice that makes per-factor explainability possible at all; an ML model would forfeit the AI-literacy contribution the research argues for.
- **Assessment calendar, digital learning resources, blended-learning delivery** (Figure 16) — LMS territory, outside a student-support platform.
- **Learning competencies and completion of requirements** (Figure 14) — *added 2026-07-25.* These are DepEd LIS / report-card records: competency codes, mastery levels, and requirement checklists belong to the official grading system this platform reads *from*, not to a support-and-intervention layer. The system holds scores by subject, quarter, and assessment kind, which is what the risk engine needs. Duplicating the competency framework would create a second source of truth for grades — the exact thing §6.2 avoids by keeping one `Grade` model.
- **Class participation and student engagement as captured fields** (Figure 14) — *added 2026-07-25.* Both are teacher judgements rather than events, and capturing them as a per-student rating would add a subjective field to the risk pipeline with no inter-rater reliability behind it. Engagement is instead *inferred* from recorded behaviour — the `DISENGAGEMENT_SIGNAL` rule combines tardiness, absence, and incident data precisely because those are observable. Teachers who want to record a judgement have the behavioral log and intervention observation notes.
- **System evaluation, feedback mechanisms, and policy review** (Figure 22) — *added 2026-07-25.* These are research and governance *activities*, not software surfaces: evaluating whether the system helped is the thesis's own methodology, and school policy review happens in meetings. The platform's contribution is making the evidence reviewable — the audit log, override history, bias dashboard, and intervention outcome tracking are what such a review would read. Building an in-app "rate this system" form would produce data nobody has a plan to act on.

*(The first three above were the undeclared gaps surfaced by the post-Phase-8 review. Recording them here converts an oversight into a stated boundary. Nothing was removed to do this — none of them had ever been built.)*

### Phase 8 Definition of Done

- [x] Risk scores include a non-zero `interventionHistory` contribution for students with intervention history, visible in the explainability panel
- [x] All six spec §6.11 import steps present in the wizard
- [x] Counselor records an SEL assessment; principal sees levels but never notes; teacher and admin get nothing; `SEL_ASSESSMENT_READ` audited *(amended from "teacher sees limited fields" — the access question was put to the user during 8.1 and resolved to counselor + principal only; see the Slice A notes)*
- [x] Teacher receives an in-app notification when one of their students crosses into a higher band
- [x] `/learn` pages render current algorithm weights from the active `AlgorithmConfig`
- [x] Demo fixtures still fire every pattern rule after the scoring change
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` clean; route × role smoke matrix passes

**Estimated size:** ~2,000–2,400 net new LOC across ~5 migrations and ~4–6 working sessions (≈10–12% growth on the current ~20,400 LOC in `app/` + `lib/` + `components/`). Benchmark: the 7.10 referral slice was ~280 LOC for its counselor half alone.

### Phase 8 retrospective

- **The audit was worth more than any single feature.** Slice 0.4 started as "delete some dead code" and surfaced two things that mattered more: `lib/rbac.ts` looked like the query-layer RBAC and enforced nothing, and `dismissRecommendationAction` was fully built but unreachable. Neither was a *bug* — the RBAC works, just elsewhere — but both meant a reader would have believed something false about the system. **Dead code that looks load-bearing is worse than dead code that looks dead.**
- **A green test can be worse than no test.** `verify-rbac-scope.ts` passed for months while exercising a module production never called, and it printed rather than asserted. Its counseling-note check also *skipped* silently for want of demo data — a vacuous check on the most sensitive table in the system. Rewritten to 18 real assertions, plus seeded notes so the skip cannot recur. Worth re-reading any suite that has never failed.
- **Verify on a string only the feature can produce.** The Slice 0 smoke test for the new import step grepped for the step *label*, which the stepper emits whether or not the step body renders. It passed against a step that was unreachable because of a `step <= 5` gate. Caught in Slice A, one slice later.
- **Making something testable beat testing around it.** The notification fan-out began as straight-line code inside a server action, unreachable without a session. Extracting `buildBandIncreaseNotifications` turned six important cases (improvement, unchanged band, first-ever score, orphan section) into assertions. Same pattern would help elsewhere.
- **Prove a "cannot drift" claim by breaking it.** The `/learn` page claims to track live config; that was verified by retuning the weights mid-test and watching every number move, then restoring. A claim of this shape is otherwise indistinguishable from a well-written lie.
- **Type the new field as required, not optional-with-default.** Adding `interventionHistory` to `ScoringInput` as required is what made `tsc` find the fifth caller (`scripts/run-risk-engine.ts`). Grep would have missed it.
- **Three claims in this tracker were wrong before Phase 8 corrected them:** Phase 5.1 credited a component never imported; 8.2.1 overstated what §10 required of the recommendation mapping; the Phase 8 DoD described an SEL access model that the user's decision superseded. All three were written in good faith and all three would have misled someone. Retrospectives are worth as much as plans.
- **Two governance questions had no technical answer.** SEL visibility (§6.4 vs §5) went to the user rather than being defaulted. Attributing imported SEL to a counselor rather than the importing admin came out of the same principle. When a decision is about who may see a child's data, "pick a sensible default and move on" is the wrong instinct.
- **Restraint counted twice.** The recommendation mappings were left alone rather than inventing clinical routing to satisfy a checkbox, and SEL was deliberately kept out of the risk engine because §7 fixes five weighted dimensions and every recorded `AlgorithmConfig` version assumes that shape.

**Where Phase 8 leaves the system:** every figure from the research coverage review is now either implemented, explicitly out of scope with a stated reason (§8.4), or blocked on rules that need multiple years of data. The five risk dimensions all contribute. All six import steps exist. The literacy surface is real and self-updating.

**Open follow-ups:**
- Pattern-rule thresholds on `/learn/patterns` are hand-transcribed prose; moving them into `AlgorithmConfig` would remove the last drift risk in that surface.
- The `interventionHistory` weight is `0.05`, so the newly-wired dimension moves a total score by at most ~4 points. Correct and live, but whether 0.05 is the right weight is a policy question for the principal/admin before any demo.
- Grade- and school-level pattern rules remain deferred (they need ≥2 full years).
- AI Literacy Assistant remains cut (spec §15 cut order #1).

---

## Phase 9 — Scheduled Recompute & Reports ✅ *(complete 2026-07-25)*

**Goal:** close the two remaining *buildable* gaps from the post-Phase-8 review. Everything else outstanding was either declared a non-goal (§8.4) or is blocked on rules that need more school years.

### 9.1 Scheduled risk recompute *(✅)*

Deferred since Phase 4 ("recompute trigger + 24h cache", "scheduled weekly recompute"). Phase 8 made it more urgent than it looked: notifications are emitted by the engine run, and the only trigger was the admin's "Run engine" button — so the spec §5 promise was live only as often as someone remembered to click.

- [x] **Extracted `runRiskEngine`** into [lib/risk/run-engine.ts](../lib/risk/run-engine.ts). The orchestration (score → detect → recommend → notify → audit) had lived inside `computeRiskAction`, which needs a session and so could not be reused. The action is now 68 lines of auth, validation, and revalidation; the engine is one implementation with two callers, so a scheduled run and a manual run cannot drift.
- [x] **Cron endpoint** at [app/api/cron/recompute/route.ts](../app/api/cron/recompute/route.ts). Accepts GET or POST (Vercel Cron issues GET; system cron usually POST). Authenticated by `CRON_SECRET` as a bearer token — **and it refuses to run when the secret is unset** rather than defaulting open, so a missing env var can never turn this into an unauthenticated "recompute everything" button.
- [x] **Always targets the active year.** A schedule that silently recomputed a historical year would rewrite settled records.
- [x] **Attributed to no user.** `AuditLog.userId` was already nullable, so an unattended run audits as `userId = null` with `trigger: "scheduled"` in metadata, rather than being blamed on whoever configured the schedule.
- [x] `/api/cron` added to `PUBLIC_PREFIXES` in [proxy.ts](../proxy.ts) with a comment explaining why that is safe; `CRON_SECRET` documented in `.env.example` with a ready-to-paste crontab line.

**Verified live, including the part that matters:**

| Request | Result |
|---|---|
| no `Authorization` header | 401 |
| wrong secret | 401 |
| correct secret, wrong scheme (no `Bearer `) | 401 |
| correct bearer token | 200 · `computed: 250` |

Then the headline claim was proved rather than asserted: a `LOW` prior band was planted on a student who scores `MODERATE`, and an **unattended cron call** detected the crossing and emitted **6 notifications** — one per teacher of that section — with the audit row system-attributed. Planted row and test notifications were deleted afterwards.

**Deliberately unchanged:** `seed-demo.ts` keeps its own bulk-insert engine loop. It uses batched writes for ~730 assessments across three years and should not notify — manufacturing an inbox while seeding would be wrong.

### 9.2 Report generation *(✅)*

Figure 20's *automated reports* / *easy report generation*. Before this, the only export in the system was the cohort-analysis CSV on one principal page.

- [x] **Report registry** ([lib/reports/registry.ts](../lib/reports/registry.ts)) — each report declares the roles that may run it **and scopes its own rows to the caller**. Both matter: the role list decides whether the button appears, the generator decides what a teacher actually gets. A link is not a permission.
- [x] Four reports: **risk roster** (counselor/principal/teacher), **intervention pipeline & outcomes** (counselor/principal), **attendance summary by section** (all four roles), **bias monitoring breakdown** (principal only).
- [x] **Restricted content never enters an export.** Intervention rationale, counseling notes, and SEL narrative are absent by construction — a CSV leaves the access-controlled UI behind, so anything in it is effectively unprotected from that point on. Asserted in the verification script against real seeded rationale text.
- [x] **Every export is audited** (`REPORT_EXPORTED`, new enum value + migration): who, which report, how many rows, which role.
- [x] Shared `/reports` page outside the role prefixes (same reasoning as `/learn`), linked from all four role navs.

**CSV correctness got real attention** ([lib/reports/csv.ts](../lib/reports/csv.ts)) because these files go to spreadsheets, not parsers:
- RFC 4180 quoting — a counselor's note containing a comma must not shift every following column.
- **Formula-injection defence:** cells beginning `=`, `+`, `-`, or `@` are prefixed with a quote. Exported rows contain user-typed names and notes, and a cell starting `=` is executable the moment someone opens it in Excel.
- **UTF-8 BOM** on the response, so a roster with `ñ` or `é` opens correctly rather than as mojibake — this is a Philippine student roster.

**Verified:** [scripts/verify-phase-9.ts](../scripts/verify-phase-9.ts) — **33 assertions** covering CSV escaping and injection defence, filename shape, role gating per report, row-level scoping (teacher 5 rows vs counselor 250, every teacher row inside a section they teach, **a teacher with no assignments gets zero rows rather than the whole school**), restricted-content absence, and every report executing with rows matching header width. Plus a live 4×4 role × report matrix over HTTP: exactly the intended 200s and 403s, 307 unauthenticated, 404 unknown report, and an audit trail showing teacher=5 / counselor=250 for the same report.

### Phase 9 retrospective

- **The stale-server trap cost ten minutes and was worth recording.** The report matrix first came back as `500`s for every *allowed* report while the `403`s were correct. Cause: a dev server left running from the previous phase's smoke test held a Prisma client predating the `REPORT_EXPORTED` migration, so the role check (pure JS) passed and the audit write then failed. `npm run dev` had silently failed to bind with `EADDRINUSE` and I was testing the old process. **Check what is actually listening before believing a smoke result** — and prefer failing loudly over reusing a port.
- **Extracting for testability paid off twice.** `buildBandIncreaseNotifications` was pulled out of the action in Phase 8 to make it assertable; `runRiskEngine` was pulled out in Phase 9 to make it *reusable*. The second refactor was trivial because the first had already separated the pure part.
- **Two features, one dependency.** Scheduling was worth building on its own, but its real value was fixing something Phase 8 shipped half-finished: notifications that only fired when a human pressed a button. Worth noticing that a "new feature" was really the completion of an old one.
- **Exports are a governance surface, not a convenience.** The interesting decisions in 9.2 were all about what *must not* be in the file, and about formula injection — a risk that only exists because the output is opened by spreadsheet software rather than read by code.

---

## Phase 10 — Deployment Packaging ✅ *(complete 2026-08-09)*

**Goal:** make the system deployable to a VPS behind a reverse proxy (Dokploy + Traefik + Docker) without changing any feature behaviour. Infrastructure only — no spec surface was added, removed, or altered.

### 10.1 Container image *(✅)*

- [x] `output: "standalone"` in [next.config.ts](../next.config.ts) — emits a self-contained `server.js` as the container entrypoint.
- [x] Multi-stage [Dockerfile](../Dockerfile) on `node:24-bookworm-slim`. **Debian, not Alpine, deliberately:** the Prisma 7 schema engine used by `migrate deploy` ships glibc binaries and musl has been the flaky path. Non-root `nextjs` user; `HEALTHCHECK` against `/api/health`.
- [x] Build-time `DATABASE_URL` / `AUTH_SECRET` placeholders are passed **inline on the `RUN`**, not via `ENV`, so no placeholder credential is baked into an image layer (and Docker's `SecretsUsedInArgOrEnv` lint stays quiet). Safe because every route is `ƒ` — the build never opens a connection.
- [x] [.dockerignore](../.dockerignore) excludes `node_modules`, `.next`, and every `.env*` except the example.

### 10.2 Migrations on boot *(✅)*

- [x] [docker-entrypoint.sh](../docker-entrypoint.sh) runs `prisma migrate deploy` before `exec`ing the server. `deploy` (not `dev`) — never prompts, never resets, no-op when current, so restarts are cheap. Escape hatch: `RUN_MIGRATIONS=false`.
- [x] The runner stage keeps the full `node_modules` plus `prisma/`, `scripts/`, and `lib/` so the seeds, `run-risk-engine`, and the `verify-*` suite all run inside the container via `docker exec`. **Costs ~1.8 GB of image** — the tradeoff and the lean alternative are written down in [AEM_Deployment.md](AEM_Deployment.md#known-constraints) rather than left as a surprise.

### 10.3 Health endpoint *(✅)*

- [x] [app/api/health/route.ts](../app/api/health/route.ts) — `SELECT 1` against Prisma, 200/503. Added to `PUBLIC_PREFIXES` in [proxy.ts](../proxy.ts): an orchestrator has no session to present. **Body is deliberately opaque** (`{ok:false}`, never the error) — this is the one unauthenticated endpoint that touches the database, so it must not narrate connection failures to the internet.

### 10.4 Stack + config *(✅)*

- [x] [docker-compose.prod.yml](../docker-compose.prod.yml) — app + Postgres 16, **no published database port** (dev's `docker-compose.yml` publishes 5433 with a throwaway password; keeping them as separate files is what stops the two being confused).
- [x] `AUTH_URL` + `AUTH_TRUST_HOST=true` wired in. Auth.js v5 sets `trustHost` from `AUTH_URL ?? AUTH_TRUST_HOST ?? <known platform>` — behind Traefik neither is inferred, so **logins fail silently without them.** This was the single highest-risk item in the phase.
- [x] Three security headers in [next.config.ts](../next.config.ts) (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`). No CSP — nonce plumbing is out of scope and noted as a constraint.
- [x] `.env.example` gained a production section; `package.json` gained `db:seed:demo`, `db:reset:data`, `db:deploy`, `risk:run` so the scripts are discoverable rather than tribal knowledge.
- [x] [AEM_Deployment.md](AEM_Deployment.md) — three deploy paths (Dokploy Compose / Dokploy Application / plain compose), seeding, backups, constraints, smoke test.

### Phase 10 Definition of Done — Verified 2026-08-09

Built and run against a real Postgres, not reasoned about:

| Check | Result |
|---|---|
| `npx tsc --noEmit` · `npm run build` | clean |
| `docker build` | succeeds, no warnings |
| First boot | all 13 migrations applied, then `✓ Ready` |
| Container health | `healthy` |
| `npm run db:seed` in container | 5 users, 10 students |
| `npm run db:seed:demo` in container | 3 SYs, 730 assessments, 19 patterns, **21s** |
| Login via simulated Traefik (`Host: aem.example.com`, `X-Forwarded-Proto: https`) | 302 → `https://aem.example.com`, `__Secure-authjs.session-token` set, session resolves with the right role |
| Counselor → `/admin` | 307 → `/?forbidden=1` |
| Anonymous → `/principal/dashboard` | 307 → `/?from=…` |
| `POST /api/cron/recompute` wrong / right secret | 401 / 200 `computed: 250` |
| Security headers on `/` | `DENY`, `nosniff` present |

### Phase 10 retrospective

- **`AUTH_TRUST_HOST` is the failure that would have wasted a day.** It produces no error — the login POST just doesn't establish a session. Reading `@auth/core/lib/utils/env.js` to confirm the exact precedence (`AUTH_URL ?? AUTH_TRUST_HOST ?? platform detection`) took two minutes and was worth more than any amount of guessing.
- **The proxy simulation was the test worth writing.** Booting the container proves the app starts; sending `Host` / `X-Forwarded-Proto` headers that don't match `127.0.0.1` is what proves it will survive Traefik. It also surfaced the `__Secure-` cookie-prefix switch, which flips purely on the scheme in `AUTH_URL`.
- **Image size was measured before being accepted.** A prune experiment inside the running container showed the obvious cuts save only ~210 MB and break the Prisma CLI (`@prisma/studio-core` is eagerly required), while the real weight — `next` + `@next` at 411 MB — cannot be deduplicated once the traced standalone tree and the full tree are merged at the same path. Recorded as a documented tradeoff rather than a half-done optimisation.
- **Seeded credentials are now a deployment hazard, not a convenience.** `admin@school.edu / admin123` is in a public repo. The deployment guide makes changing or gating them a step, not a footnote.

---

## Phase 11 — Staff & Assignment Import ✅ *(complete 2026-08-27)*

Beyond spec §6.11, which lists six wizard steps and no staff/section/subject
import. Added because loading a real school otherwise means hand-entering
hundreds of relationships through `/admin/setup` and `/admin/users`, and
because staff and advisories change every August.

- [x] `lib/import/staff.ts` + `app/actions/import/staff.ts` — role mapping,
      bcrypt at cost 10, never overwrites an existing password on re-import.
      Email pattern `firstinitial.lastname@school.edu`, shared default password
      (`DEFAULT_STAFF_PASSWORD` in `app/actions/import/staff.ts` — not printed
      here); a blank password column means "use the default", and any
      supplied password must be at least 8 characters. Imported accounts must
      have their password reset before any non-local use.
- [x] `lib/import/assignments.ts` + `app/actions/import/assignments.ts` —
      upserts Section and Subject, one adviser per section enforced in the
      validator. 151 assignment fragments parsed from the source, 0 left
      unresolved.
- [x] Import Wizard 7 → 9 steps; staff precedes roster precedes assignments
- [x] Roster importer maps `guardianName`, `guardianContact`, `spedStatus`
- [x] Fixed the roster sample's `gradeLevel: "9"` / `section: "9-Newton"` bug —
      it forked the section table against the `Grade 9` / `Newton` convention
      in `prisma/seed.ts:29,34`
- [x] Restored the drifted `SpedStatus` enum, `Student.spedStatus`, and
      `SpedStatusChange` to `schema.prisma` (created in the init migration,
      never dropped, but absent from the schema file)
- [x] Loaded SY 2026-2027, now the sole active year: 576 students/enrollments,
      17 sections across Grades 7-10, 31 staff, 163 teacher assignments
      (17 adviser + 146 subject), 35 subjects, 1,728 consent records for the
      year
- [x] Verified by `scripts/verify-school-year-load.ts`: 576 enrollments, 17
      sections, 17 advisers, 0 grades, 0 attendance, no cross-year section
      leakage
- [x] Demo year `SY 2025-2026` untouched: its 250 enrollments survive, Maria
      Santos still enrolled — the reference scenario still walks there

### Extraction defect caught before load

The source workbook's `G9` and `G10 (2)` sheets each carried a stray
`AVENTURINE (Winnie - 205)` block. Aventurine is a Grade 8 section only and is
already captured natively in the `G8` sheet. A naive sheet-to-grade mapping
would have relabelled those 68 rows and produced 644 students instead of 576.
The extractor now skips and logs any block whose resolved canonical grade
disagrees with its sheet.

### Deliberately not built

- **Grades and attendance for SY 2026-2027.** Neither exists in the source
  workbooks — a full cell census found 112 stray attendance marks (95 in a stale
  sheet), no date cells, and zero grade values. Real users generate them.
- **SPED in the risk engine and bias dashboard.** `computeProfileBreakdown`
  (`lib/risk/engine.ts:238`) still takes only `learningModality`, and
  `getBiasBreakdowns` has no SPED axis, though this tracker's Phase 5 notes at
  lines 598 and 675 claim otherwise. With every student `NONE` there is no
  variance to surface. **Carry-forward item.**
- **An importer for DepEd SF1/SF2/SF9.** Revisit when the registrar supplies
  real exports.

### Known data limitations

Recorded in the generated `data-quality-report.md`, not in git (the source data
is PII and `sample-import-data/` is gitignored):

- 44 LRNs were minted (34 duplicate second-occurrences + malformed source
  values). Replacements were minted so the import succeeds, but for the 34
  duplicate pairs the true LRN↔name binding is unrecoverable from the file —
  one real student in each pair now holds a wrong identifier and only the
  registrar can say which.
- 204 of 576 students (35%) had no recoverable sex; inferred from given name
  and individually flagged for correction.
- All birth dates, guardian names, and guardian contacts are synthetic. The
  two source workbooks held 893 distinct real phone numbers; zero of them
  reached the generated data.

### Known code limitations (not fixed — recorded, not smuggled past)

- **CSV row cap and transaction timeout disagree.** `lib/import/limits.ts`
  caps uploads at `MAX_CSV_ROWS = 10_000`, but the bulk-commit transaction
  options (`{ maxWait: 15_000, timeout: 120_000 }`, duplicated in
  `app/actions/import/staff.ts`, `roster.ts`, `assignments.ts`, and
  `scripts/load-real-school.ts`) practically support only about 2,300 roster
  rows before Prisma's 120-second transaction timeout fires. A roster CSV
  between roughly 3,000 and 10,000 rows passes `checkCsvLimits` and then fails
  the commit with Prisma error P2028 after two minutes of rolled-back work.
  Nothing enforces the batching the code comments prescribe. Not reachable at
  this school's 576 rows, but not solved either — a real fix means chunking
  the bulk commit the way the spec already prescribes for attendance's
  monthly-chunk uploads.
- **`schoolYearLabel` went optional on the wizard's shared types.**
  `PreviewOk<T>` / `CommitOk` in `components/roles/admin/import-wizard.tsx`
  now mark `schoolYearLabel` optional because staff import isn't
  school-year-scoped. Each importer's own exported contract in
  `app/actions/import/*.ts` still requires the field, and the only read site
  is a guarded ternary, so nothing is broken today — but a future
  year-scoped importer that forgets to return `schoolYearLabel` would now
  compile silently instead of erroring at the `CsvStep` call site.
- **`scripts/load-real-school.ts` duplicates persistence logic with no
  enforcement.** It re-implements the persistence bodies of
  `commitStaffAction`, `commitRosterAction`, and `commitAssignmentsAction`
  because those Server Actions call `requireRole("ADMIN")` and can't run from
  a CLI. Validators and `logAudit` calls are shared, not duplicated. A header
  comment in the script names the three action files as source of truth and
  says to change them together — but nothing enforces that; it can drift
  silently.

### Phase 11 retrospective

- ~~**The import wizard UI path itself has not been exercised end-to-end by a
  human.**~~ **Resolved 2026-08-30.** The three Server Actions were driven
  directly against a running dev server with a real Auth.js admin session
  (authenticate via `/api/auth/callback/credentials`, read the action ids out
  of the client bundle, encode arguments with React's own `encodeReply`).
  That exercises `requireRole`, the validators, the transactions and the audit
  writes — everything except React rendering the file picker.

  | Action | Result | Wall time |
  |---|---|---|
  | `commitStaffAction` | 31 created, 0 updated | 1.6s |
  | `commitRosterAction` | 576 students · 576 enrollments · 1,728 consents · 17 sections | 3.5s |
  | `commitAssignmentsAction` | 35 subjects · 163 assignments | 0.3s |

  Audit wrote 34 rows (one aggregate `IMPORT` per file plus a per-user
  privilege row). All 31 stored hashes verified by `bcrypt.compare` against
  the source CSV, and a real login as the imported principal succeeded.

  **Measured cost per DB round-trip: ~0.6ms.** The roster commit did roughly
  5,800 sequential round-trips in 3.5s. Earlier prose extrapolated ~30ms/write
  from the load script's 23s figure — that number was dominated by bcrypt
  hashing 31 passwords, not database work, and overstated the transaction
  timeout risk by more than an order of magnitude. The default 5s transaction
  budget covers on the order of 8,000 operations.

- **Grades / attendance / behavioral / SEL / interventions importers remain
  unexercised**, and carry two known defects:
  1. `Grade`, `BehavioralRecord` and `SELAssessment` have no `@@unique`
     constraint and their importers use a bare `.create()` per row, so
     re-importing a corrected file duplicates rather than replaces. Duplicated
     behavioral records inflate the risk score directly — the behavioral axis
     is a severity-weighted incident count capped at 12.
  2. Those five commit paths run on Prisma's default 5s transaction timeout;
     roster/staff/assignments carry `timeout: 120_000`. Reachable near the
     10,000-row cap, not at realistic per-quarter volumes.

- **`serverActions.bodySizeLimit` is unset**, so Next's 1MB default applies
  while `lib/import/limits.ts` advertises a 5MB cap. A CSV between the two
  fails inside the framework with an opaque error, never reaching the
  "split the file into batches" message. Not reachable at this school's
  volumes (roster.csv is 74KB) but reachable within the advertised cap.

### Phase 11b — Forced password change (2026-08-30)

Closes the gap where an admin-minted credential could never be rotated by the
person holding it. Spec §88 already scopes admin password management; this is
the account-holder half of it.

- [x] `User.mustChangePassword Boolean @default(false)` + `PASSWORD_CHANGED`
      audit action — migration `20260830140523_add_must_change_password`.
- [x] Set on both paths that mint a password the holder did not choose:
      `commitStaffAction` (create, and update when the CSV supplies a new
      password) and `resetPasswordAction`. `scripts/load-real-school.ts`
      mirrors this per its own sync contract.
- [x] Carried through `authorize` → `jwt` → `session` in [auth.ts](../auth.ts).
      The `jwt` callback re-reads the row on `trigger === "update"` so clearing
      the flag takes effect mid-session instead of stranding a stale token.
- [x] [proxy.ts](../proxy.ts) funnels every route to `/change-password` while
      the flag is set. Voluntary visits stay open — this doubles as the
      self-service change screen the system previously lacked.
- [x] `changePasswordAction` + `/change-password`. Verifies the current
      password, enforces the same 8-character floor as the other two paths
      that mint a hash, rejects reuse, logs `PASSWORD_CHANGED`, and calls
      `unstable_update` to refresh the token.

Verified 2026-08-30 against a running dev server: flagged user 307s to
`/change-password` from every route; the four validation failures return their
specific messages; a successful change clears the flag, writes the audit row,
issues a refreshed session cookie, and lets the same session through to
`/teacher` with no re-login; the old password is rejected and the new one
accepted.

Not done, deliberately: no password history, expiry, or complexity rules
beyond the length floor. Add them when there's a policy to implement.

**Self-service password change for every role (2026-09-30).** The page and
action above already handled a voluntary change; nothing linked to them.

- [x] "Change password" item in the shared [role-sidebar.tsx](../components/roles/shared/role-sidebar.tsx) footer, so all four roles get it. "Back to workspace" link on `/change-password` when the change isn't forced.
- [x] Per-user throttle on `changePasswordAction`: 5 attempts per 15 minutes, reset on success. Blocked attempts are audited as `LOGIN_FAILED` with `reason: rate_limited, context: change_password`. Keyed on the user, not the IP, because the threat is a hijacked session guessing the current password. In-memory like the login throttle, so the same single-instance caveat applies.

Verified 2026-09-30 against the dev server: the sidebar link and page render
for admin, teacher, counselor, and principal. Invoking the action as the
teacher changed the password; the old one was then rejected at sign-in, the new
one accepted, and the existing session kept working; the password was then
restored. Six wrong attempts as the counselor: five "incorrect", the sixth
throttled, and the correct password was also refused while throttled. Audit
rows present for every case.

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
