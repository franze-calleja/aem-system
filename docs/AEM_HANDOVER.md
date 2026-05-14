# AEM System — Session Handover

**Last session ended:** 2026-05-14 (Phase 2 complete + audit done)
**Next session starts at:** Phase 2.5 — Admin UI gaps (scope agreed below)

This document is for the AI agent picking up the next session cold. **Read it first**, then read the files it points to.

---

## 1. Where to start — file reading order (10 min)

1. **[CLAUDE.md](../CLAUDE.md)** — non-negotiable project conventions (Next 16 / React 19 / Auth.js v5 / Prisma 7 specifics, RBAC layers, audit requirements). Read in full.
2. **[docs/AEM_Development_Phases.md](AEM_Development_Phases.md)** — phase tracker. Scroll to the bottom: it shows what's done (Phase 1 / 1.5 / 2a / 2b / 2c / 2d), the closing audit, and ends with the next phase to plan (Phase 2.5).
3. **[docs/AEM_System_Specification.md](AEM_System_Specification.md)** — spec (only consult sections relevant to the current phase).
4. **[docs/AEM_FLOW.md](AEM_FLOW.md)** — page map (consult for upcoming admin pages).
5. **[docs/AEM_Scenario_Maria.md](AEM_Scenario_Maria.md)** — reference scenario; Scene 0 (admin setup + consent) and Scene 11 (consent revocation) are the scenes Phase 2.5 unblocks.

You don't need to read the source code unless modifying a specific area. The conventions in CLAUDE.md are enough to understand the patterns.

---

## 2. Current state — what's shipped

| Phase | Status | Coverage |
|---|---|---|
| 1 — Foundations | ✅ | Auth.js v5, Prisma 7 schema, RBAC proxy, audit log helper, seed users |
| 1.5 — UI Alignment | ✅ | Role layouts, RoleShell/RoleOverview, removed duplicated sidebar boilerplate |
| 2a — Schema + Roster import | ✅ | Grade/Attendance/BehavioralRecord models, Import Wizard Step 1-2 |
| 2b — Remaining imports | ✅ | Grades / Attendance / Behavioral CSV steps; generic `<CsvStep>` |
| 2c — Teacher UI on DB | ✅ | My Classes, Class detail (4 tabs: Roster/Attendance/Gradebook/Behavioral), 3 server actions |
| 2d — Counselor + Principal profile | ✅ | DB-backed caseload, shared `<StudentProfileView>` used by both roles |

**Audit at end of Phase 2 (recorded in tracker):**
- `npx tsc --noEmit` ✅ clean
- `npm run lint` ✅ clean
- `npm run build` ✅ succeeds (18 routes)
- Zero `localStorage` for domain data anywhere
- Zero hardcoded `SY 20XX-20XX` strings anywhere
- ~5,280 LOC of Phase 0 scaffolding removed
- All 4 roles' RBAC verified via curl probes (200 own / 307 forbidden)
- Audit log has 5 distinct action types firing
- DB state: 1 SY, 2 sections, 5 subjects, 5 users, 20 students (10 seed + 10 from test import), 9 grades, 22 attendance rows, 5 behavioral records

---

## 3. Next phase — Phase 2.5 (scope locked-in)

**Why this phase:** Admin functions are currently seed-only. No human can create users, school years, sections, audit log entries, or process consent revocations through the UI. Data models exist; only views are missing. ~1 session estimated.

### Deliverables agreed with the user:

1. **`/admin/users`** — User management
   - List users (role + status)
   - Create user (email, name, role, password → bcrypt cost 10)
   - Suspend / reactivate
   - Reset password
   - Assign teachers to sections (`/admin/users/[id]/assignments` or inline)
   - All writes call `logAudit({ action: CREATE | UPDATE | DELETE, resourceType: "User", … })`

2. **`/admin/setup`** — School year + section + subject management
   - Create / activate school year (exactly one active at a time — enforce at app layer)
   - Create sections within a year (gradeLevel + name)
   - Create subjects per year (code + name)
   - Audited

3. **`/admin/audit`** — Audit log viewer
   - Searchable / filterable table (user, action, resourceType, date range)
   - Pagination
   - Detail panel renders `metadata` JSON
   - **Read-only** — append-only enforcement is app-layer; spec defers DB-level grants to Phase 7

4. **`/admin/consent`** — Consent management
   - List students × 3 consent scopes
   - Grant / revoke per scope
   - Revocation requires `notes` (written justification)
   - Audit actions `CONSENT_GRANTED` / `CONSENT_REVOKED` already exist in enum

5. **Update [components/roles/admin/admin-config.ts](../components/roles/admin/admin-config.ts)** so nav links to all of the above

### Definition of Done for 2.5
- All 4 admin pages render and accept input through the UI (no more seed.ts dependence to demo basic flows)
- Every mutation hits `requireRole("ADMIN")` + `logAudit(...)`
- Typecheck + lint + build clean
- Scenes 0.1-0.2 and 11 from [AEM_Scenario_Maria.md](AEM_Scenario_Maria.md) walkable
- Tracker updated with retro

### Phases that come after 2.5 (not yet planned in detail)
- **Phase 3** — Intervention Module (largest single phase, 2-3 sessions)
- **Phase 4** — Algorithmic Engine (risk scoring + pattern detection + recommendation drafts)
- **Phase 5** — Dashboards (school-wide, cohort, bias monitoring)
- **Phase 6** — AI Layer (Gemini integration, "How does this work?", What-If simulator)
- **Phase 7** — Governance polish + demo data

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
| Sensitive fields | Counseling note bodies, intervention rationale → counselor + principal only. Strip at the query layer, not the UI. |
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
# Expected: 5. If 0, run: npm run db:reset && npm run db:seed

# 3. Confirm codebase is clean
npx tsc --noEmit       # should be zero output
npm run lint           # should be zero errors

# 4. Read the tracker
# docs/AEM_Development_Phases.md — bottom of file shows last retro + next phase

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

Active SY: `SY 2025-2026`. Maria Santos (LRN `100000000001`, 9-Newton) is the protagonist of the reference scenario — has imported grades / attendance / behavioral data for verification.

---

## 6. Working agreements observed (the user's style)

These came out across the conversation; honor them unless told otherwise:

- **One phase per session.** Don't half-finish a phase to jump ahead. Verify Definition of Done before closing.
- **Walk the spec → flow → scenario.** When adding a feature, the user expects it to trace back to a section in [AEM_System_Specification.md](AEM_System_Specification.md) and a page in [AEM_FLOW.md](AEM_FLOW.md).
- **Verification scripts are kept in `scripts/`.** When server actions can't be tested via cURL (auth context issues), write a one-off script that mirrors the action's commit logic and uses the same `lib/` modules. Don't delete them after; future debugging benefits.
- **Phase tracker is the source of truth for status.** Always update [docs/AEM_Development_Phases.md](AEM_Development_Phases.md) at the end of a phase with a retrospective.
- **User confirms direction before risky moves.** When choosing between approaches, use `AskUserQuestion` with 2-3 concrete options and a recommendation. The user has consistently picked the recommendation; reasoning that fits this style works.
- **No emojis in code or output** unless explicitly asked.
- **Type safety end-to-end.** No `any`. No `as unknown as X`. Fix the type properly.
- **Stub future-phase pages explicitly** ("Available in Phase X") rather than leaving dead UI or 404s.
- **Comments only where the *why* is non-obvious.** Code should read itself.

---

## 7. Known debt + gotchas

| Item | Where | Plan |
|---|---|---|
| Prisma `$extends` global RBAC | Considered in Phase 2a, deferred | Re-evaluate if a future query forgets the helper |
| DB-level append-only `AuditLog` grants | App-layer enforcement only | Phase 7 |
| Caseload urgency is a manual signal (not the risk score) | `app/counselor/caseload/page.tsx` | Phase 4 replaces with the real engine output |
| Verification scripts duplicate server-action logic | `scripts/verify-*.ts` | Refactor to a shared `lib/import/commit-*.ts` only if they drift |
| No automated tests | — | Add when Phase 4 ships (pure functions are testable) |
| IMPORT audit row never tested via real UI commit | `app/actions/import/*` | Will fire on first real wizard commit; verify when convenient |
| Adviser-only assignments | `app/actions/teacher/grades.ts` rejects them with a clear error | Confirmed working as designed |
| Next 16 docs bundled at `node_modules/next/dist/docs/` | Reference for breaking changes | Read `01-app/02-guides/upgrading/version-16.md` before any Next-API change |

---

## 8. If you finish Phase 2.5 in this session

Ask the user what they want next. The audit report (end of [AEM_Development_Phases.md](AEM_Development_Phases.md)) presented three reasonable directions:

1. **Phase 4 — Algorithmic Engine** — risk scoring, pattern detection, recommendation drafts. Unblocks Scene 2 + every explainability surface.
2. **Phase 3 — Intervention Module** — largest single phase, 2-3 sessions. Unblocks Scenes 3-9.
3. Something else the user introduces.

The user previously preferred algorithmic engine ahead of intervention module (pattern: build the brains, then the UX that consumes them), but this isn't binding — confirm with them.

---

## 9. Final note

The codebase is in a healthy state at the start of this handover: clean typecheck, clean lint, working build, zero localStorage for domain data, every Phase 2 DoD item verified. Don't sacrifice that. If you find yourself adding `any`, `as unknown as`, or `localStorage.setItem("aem-...")`, stop and pick a different approach.

Good luck. The user is patient and collaborative — when in doubt, ask with options.
