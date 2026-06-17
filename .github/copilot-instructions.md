# AEM System — Copilot Instructions

You are assisting on the **Algorithmic Educational Management (AEM) System** — a high school student-support platform. The canonical project instructions live in [CLAUDE.md](../CLAUDE.md) and are duplicated here for GitHub Copilot, which doesn't follow `@file` imports.

Read [CLAUDE.md](../CLAUDE.md) **first** for the full contract. The summary below is for quick reference, not a substitute.

---

## Stack — version gotchas

- **Next.js 16** — `proxy.ts` (not `middleware.ts`). `cookies()` / `headers()` / `params` / `searchParams` are **async — always `await`**. Turbopack default. Node 20.9+.
- **React 19** — Server Components default; `"use client"` only when you genuinely need it.
- **Auth.js v5** (`next-auth@beta`) — JWT sessions; role in token + session; audit in `events.signIn` / `events.signOut` / `authorize`.
- **Prisma 7** + `@prisma/adapter-pg` — `datasource.url` is **gone from `schema.prisma`**; it lives in `prisma.config.ts`. Client needs a driver adapter.
- **PostgreSQL 16** via Docker on **port 5433**.
- **Tailwind v4**, **Zod 4**, **bcryptjs**.

When unsure about a Next.js API, read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before generating code.

---

## Project structure

```
app/                      # Routes (App Router)
  actions/                # Server actions ("use server" at top)
  api/auth/[...nextauth]/ # Auth.js handlers
  {role}/                 # Role pages — guarded by app/{role}/layout.tsx
components/
  roles/{role}/           # Role-specific UI
  roles/shared/           # Cross-role shell
  shell/                  # Year switcher, logout, banners
  ui/                     # Headless primitives
lib/
  prisma.ts               # Singleton client (with pg adapter)
  audit.ts                # logAudit()
  session.ts              # requireSession / requireRole / roleLandingPath
  active-year.ts          # School-year cookie + resolution
prisma/
  schema.prisma           # No `url` line
  seed.ts
proxy.ts                  # RBAC at request edge
prisma.config.ts          # Prisma 7 datasource URL
docs/                     # Spec, flow map, scenario, phase tracker
```

---

## Non-negotiable conventions

### Server-first
Default to Server Components. Fetch from Prisma at render time. Add `"use client"` only for forms, transitions, browser APIs, or event handlers.

### Mutations = Server Actions
- Top of file: `"use server"`.
- Validate input with Zod.
- Call `requireSession` / `requireRole` at the top.
- Call `logAudit` on success.
- Return `{ ok: true, ... } | { ok: false, error: string }`.

### RBAC at three layers
1. **`proxy.ts`** — request edge (unauth → `/`, wrong role → `/?forbidden=1`).
2. **`app/{role}/layout.tsx`** — `requireRole(...)` at the page layer.
3. **Prisma extensions** (Phase 2+) — teachers can only read their assigned students; counseling notes are counselor-only at the **query** layer, not just the UI.

Every server action and route handler must independently call `requireSession` or `requireRole`.

### Audit everything sensitive
- Writes always log.
- Sensitive reads (counseling notes, intervention sensitive fields, overrides) always log.
- Auth events handled centrally in `auth.ts`. Don't duplicate in wrappers.

### No `localStorage` for domain data
Sessions and prefs → cookies. Domain data → Prisma. The existing `localStorage` stores under `components/roles/.../*-store.ts` are pre-existing scaffolding being removed phase by phase. Do not add more.

### Year-scoped queries
Every analytical read is scoped by `schoolYearId`. Use `getActiveSchoolYear()` from `lib/active-year.ts`.

### Sensitive vs public fields
- Sensitive intervention fields (`rationale`, `counselingContext`) — counselor + principal only.
- Counseling note bodies — counselor only.
- Admin sees intervention **metadata only** (no rationale, no notes).

Enforce at the query/API layer. UI hiding is the second line of defense.

### Explainability is a feature
Every risk score, pattern, and recommendation ships with its factor breakdown. Never display a number without the reasoning.

### Don't expand scope
Current-phase tasks are the contract. New work belongs in [docs/AEM_Development_Phases.md](../docs/AEM_Development_Phases.md) under the right phase, not snuck in.

### Don't over-abstract
Three similar lines is better than a premature framework. Add the abstraction on the second use, not the first.

---

## Required behaviors when generating code

| Situation | Required behavior |
|---|---|
| Add a server action | `"use server"`, Zod-validate inputs, `requireRole`, `logAudit`, return tagged union |
| Add a Prisma model | Update `schema.prisma`, generate migration, regenerate client, update `seed.ts` if needed |
| Add a sensitive field | Add role-based field stripping at the query layer (not just the component) |
| Add a write path | `logAudit({ action, userId, resourceType, resourceId, metadata })` before returning |
| Add a page | Server Component if possible; use the role's layout for the shell; never re-render the sidebar yourself |
| Add a form | `<form action={serverAction}>` or `useTransition` + server action; never call DB directly from a client component |
| Read `cookies()` / `headers()` / `params` | `await` them — Next 16 made them async |
| Reference school year | `getActiveSchoolYear()` from `lib/active-year.ts`; never hardcode `"SY 20XX-20XX"` |

---

## Forbidden patterns

- ❌ Direct DB access from client components or via `fetch('/api/...')` to bypass server actions
- ❌ `MOCK_ACCOUNTS`, hardcoded user lists, or any auth shortcut
- ❌ `localStorage.setItem('aem-…')` for domain data
- ❌ Synchronous `cookies()` / `headers()` / `params` (Next 15 pattern — removed in 16)
- ❌ `middleware.ts` file (renamed to `proxy.ts` in Next 16)
- ❌ `url = env("DATABASE_URL")` in `schema.prisma` (removed in Prisma 7)
- ❌ Showing a risk score / pattern / recommendation without the factor breakdown
- ❌ Sneaking out-of-phase work into a PR — log it in the phase tracker instead
- ❌ Any clinical decision (creating an intervention, overriding a risk band, revising a plan) without a named human owner and an audit entry

---

## Tooling

```bash
npm run db:up         # docker compose up -d
npm run db:migrate    # prisma migrate dev
npm run db:seed       # reload seed data
npm run db:studio     # browse DB
npm run dev           # localhost:3010
npx tsc --noEmit      # typecheck
```

---

## Where the truth lives

| Question | File |
|---|---|
| What does the system do? | [docs/AEM_System_Specification.md](../docs/AEM_System_Specification.md) |
| What pages exist? | [docs/AEM_FLOW.md](../docs/AEM_FLOW.md) |
| What's the end-to-end story? | [docs/AEM_Scenario_Maria.md](../docs/AEM_Scenario_Maria.md) |
| What phase are we in? | [docs/AEM_Development_Phases.md](../docs/AEM_Development_Phases.md) |
| Full conventions | [CLAUDE.md](../CLAUDE.md) |
