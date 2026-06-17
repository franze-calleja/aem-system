@AGENTS.md

# AEM System — Project Instructions

You are working on the **Algorithmic Educational Management (AEM) System** — a high school student-support and intervention-planning platform that operationalizes data analytics and AI literacy. This file is the contract for *how* to build it. Read it before touching code.

## Source-of-truth documents (read these first)

1. [docs/AEM_System_Specification.md](docs/AEM_System_Specification.md) — what the system is, what every feature does, the four roles, the algorithmic engine, the governance rules. **Every feature must trace back to this.**
2. [docs/AEM_FLOW.md](docs/AEM_FLOW.md) — page map, user flows, visibility matrix.
3. [docs/AEM_Scenario_Maria.md](docs/AEM_Scenario_Maria.md) — end-to-end reference scenario; use it as a regression checklist.
4. [docs/AEM_Development_Phases.md](docs/AEM_Development_Phases.md) — build order, phase status, what's done and what's next. **Always update this when finishing work.**

If you're about to add a feature that isn't in the spec, stop and ask. If you're about to skip a phase task, stop and ask.

---

## Stack (with version gotchas — these are not your training-data defaults)

| Layer | Choice | Critical notes |
|---|---|---|
| Framework | **Next.js 16.2.4** (App Router) | `middleware.ts` is now `proxy.ts` (Node runtime only). `cookies()`, `headers()`, `params`, `searchParams` are **async — always `await`**. Turbopack is the default. |
| React | **19.2.4** | Server Components default. Only add `"use client"` when you need state, effects, browser APIs, or event handlers. |
| Auth | **Auth.js v5** (`next-auth@beta`) | JWT sessions. Role lives in token + session via callbacks. Audit happens in `events.signIn` / `events.signOut` / `authorize` — not in wrappers. |
| ORM | **Prisma 7** + `@prisma/adapter-pg` | `datasource.url` is **removed** from `schema.prisma`. URL lives in `prisma.config.ts`. Client requires a driver adapter — see [lib/prisma.ts](lib/prisma.ts). |
| DB | **PostgreSQL 16** (Docker, port `5433`) | `docker compose up -d` to start. Volume `aem_pgdata` persists data across restarts. |
| Styling | **Tailwind v4** | PostCSS plugin model. Theme tokens live in [app/globals.css](app/globals.css). |
| Validation | **Zod 4** | Every server action input goes through `z.object(...).safeParse`. |
| Password hashing | **bcryptjs** | Cost factor 10. |
| Dev port | **3010** | Don't change. |

Before touching anything Next.js-specific you haven't seen recently, consult `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`. AGENTS.md says it; mean it.

---

## File layout

```
app/
  page.tsx                    # Login (public)
  layout.tsx                  # Root layout
  api/auth/[...nextauth]/     # Auth.js handlers
  actions/                    # Server actions (auth, school-year, …)
  admin/                      # Admin pages (role-protected via layout)
  teacher/
  counselor/
  principal/
components/
  auth/                       # Login form
  roles/{role}/               # Role-specific UI
  roles/shared/               # Cross-role UI (workspace, sidebar)
  shell/                      # Year switcher, logout, banners
  ui/                         # Headless primitives (sidebar)
lib/
  prisma.ts                   # Prisma client singleton (with pg adapter)
  audit.ts                    # logAudit()
  session.ts                  # requireSession, requireRole, roleLandingPath
  active-year.ts              # School-year resolution + cookie
prisma/
  schema.prisma               # No `url` line (Prisma 7)
  migrations/
  seed.ts
proxy.ts                      # Next 16 RBAC (renamed from middleware.ts)
prisma.config.ts              # Prisma 7 config (datasource URL lives here)
docker-compose.yml            # Postgres 16 on :5433
docs/                         # Spec + flow + scenario + phases
```

When you add new code, match this layout. Don't invent parallel structures.

---

## Conventions (non-negotiable)

### 1. Server-first, always
- Default to **Server Components**. Fetch directly from Prisma at render time.
- `"use client"` only for: form state, transitions, browser APIs, event handlers.
- Don't pass DB models to client components blindly — pick fields explicitly (avoid leaking sensitive content via props).

### 2. Mutations go through Server Actions
- File location: [app/actions/](app/actions/) grouped by domain.
- Top of file: `"use server"`.
- Validate input with Zod.
- Call `requireSession` or `requireRole` at the top.
- Log audit before returning success.
- Return a serializable result (`{ ok: true, ... } | { ok: false, error }`), not a thrown error, unless redirecting.

### 3. RBAC enforcement at three layers
| Layer | File | What it does |
|---|---|---|
| Edge | [proxy.ts](proxy.ts) | Redirect unauth → `/`, wrong role → `/?forbidden=1` |
| Page | `app/{role}/layout.tsx` | Server-side `requireRole(...)` (defense-in-depth) |
| Query | Prisma extension (Phase 2+) | Teacher can only read their assigned sections' students; counseling notes are counselor-only at the DB-query layer |

If you add an API route or server action, **always call `requireSession` / `requireRole`**. Don't trust the proxy alone.

### 4. Audit is not optional
Every sensitive operation calls `logAudit({ action, userId, resourceType, resourceId, metadata })`:
- **Writes:** always.
- **Sensitive reads** (counseling notes — Phase 3+, intervention sensitive fields, override history): always.
- **Auth events:** handled centrally in [auth.ts](auth.ts) (`events.signIn`, `events.signOut`, `authorize`'s failure path). Don't duplicate in wrappers.

If a write code path doesn't have a `logAudit` call, the work isn't done.

### 5. No `localStorage` for domain data
- Sessions, school-year selection, UI preferences → cookies via Next's async `cookies()` API.
- Domain data (students, grades, attendance, interventions) → Prisma. Period.
- Existing `localStorage` stores ([teacher-class-store.ts](components/roles/teacher/teacher-class-store.ts), [counselor-store.ts](components/roles/counselor/counselor-store.ts)) are Phase-0 scaffolding being deleted as their features migrate.

### 6. Year-scoped queries
Every analytical query has a school-year filter. The active year resolves via [lib/active-year.ts](lib/active-year.ts) → `getActiveSchoolYear()`. Pass `schoolYearId` through, never assume.

### 7. Sensitive vs public fields
The spec is explicit (§6.6, §9):
- **Sensitive intervention fields** (`rationale`, `counselingContext`) → counselor + principal only. Returned `null` or stripped to other roles by the API layer.
- **Counseling note bodies** → counselors only.
- **Admin intervention view** → metadata only (existence, scope, status, dates, owner — no rationale, no notes).

When you write a query that touches these, the role filter is part of the query. The UI is the second line of defense, not the first.

### 8. Explainability is a feature, not a debug log
Every algorithmic output (risk score, pattern match, recommendation) ships with its factor breakdown. The UI never shows a score without showing why. (Phase 4+.)

### 9. Don't expand scope
The current phase's tasks are the contract. If you discover work outside the phase's `Definition of Done`, write it down in [docs/AEM_Development_Phases.md](docs/AEM_Development_Phases.md) under the appropriate phase — don't sneak it in.

### 10. Don't add abstractions for hypothetical needs
Three similar lines is better than a premature framework. Add the abstraction the second time you need it, not the first. The spec is large enough on its own.

---

## Tooling commands

```bash
# Database
npm run db:up         # docker compose up -d (Postgres)
npm run db:down       # stop
npm run db:migrate    # prisma migrate dev
npm run db:reset      # drop + re-migrate + re-seed
npm run db:studio     # GUI at localhost:5555
npm run db:seed       # tsx prisma/seed.ts

# Dev
npm run dev           # http://localhost:3010
npm run build         # production build
npx tsc --noEmit      # typecheck
npm run lint          # eslint
```

After every Prisma schema change: `npm run db:migrate` (one migration per logical change, descriptive name).

---

## Seed accounts (dev only)

| Email | Password | Role |
|---|---|---|
| `admin@school.edu` | `admin123` | ADMIN |
| `teacher@school.edu` | `teacher123` | TEACHER |
| `adviser@school.edu` | `adviser123` | TEACHER (adviser of 9-Newton) |
| `counselor@school.edu` | `counselor123` | COUNSELOR |
| `principal@school.edu` | `principal123` | PRINCIPAL |

Active SY: `SY 2025-2026`. Sections: 9-Newton, 9-Curie. Maria Santos is enrolled in 9-Newton — she's the protagonist of the reference scenario.

---

## Working agreements

- **Read the phase tracker first.** [docs/AEM_Development_Phases.md](docs/AEM_Development_Phases.md) has current status. Check off tasks as you ship them; don't batch.
- **One phase per session** unless explicitly told otherwise. Don't half-finish a phase to jump ahead.
- **Walk the reference scenario** at phase boundaries. If you can't, the phase isn't done.
- **No new UI without backend.** If a screen can't talk to a real API, wire existing scaffolding to the API instead of building more localStorage UI.
- **Migrations ship with the PR** that introduces them.
- **Type-safe end-to-end.** No `any`. No `as unknown as X` to silence errors — fix the type.
- **Comments** only when the *why* is non-obvious. Skip restating the *what*.
- **Commit messages**: imperative, scoped. Co-authored-by line for AI work.

---

## When in doubt

| Question | Answer location |
|---|---|
| Does this feature belong in scope? | [docs/AEM_System_Specification.md](docs/AEM_System_Specification.md) |
| What page does this feature live on? | [docs/AEM_FLOW.md](docs/AEM_FLOW.md) |
| What's the user journey? | [docs/AEM_Scenario_Maria.md](docs/AEM_Scenario_Maria.md) |
| What phase are we in? | [docs/AEM_Development_Phases.md](docs/AEM_Development_Phases.md) |
| How does this Next 16 API work now? | `node_modules/next/dist/docs/` |
| Is this Prisma 7 syntax different? | [prisma.config.ts](prisma.config.ts) is the canonical example; check the upgrade guide otherwise |

If you can't find the answer, ask the user. Don't guess at architecture.
