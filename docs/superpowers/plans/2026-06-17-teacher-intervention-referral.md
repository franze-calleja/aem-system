# Teacher Intervention Referral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let teachers initiate an intervention via a structured *referral* that a counselor reviews and converts into a real, counselor-owned intervention — preserving the spec's single-owner governance model.

**Architecture:** A new `InterventionReferral` model (STUDENT scope only) mirrors the existing `RecommendationDraft → Intervention` conversion flow but is human-originated. Teachers create PENDING referrals scoped to students they teach/advise. Counselors accept (pre-fills the existing intervention builder, links the referral, flips it to ACCEPTED) or decline (with a reason). Teachers see the outcome.

**Tech Stack:** Next.js 16 (App Router, async `cookies`/`searchParams`), React 19 Server Components, Prisma 7 + pg adapter, Zod 4, Auth.js v5, Tailwind v4.

## Global Constraints

- Next.js 16.2.4 — `searchParams`/`params` are async; always `await`. Dev port 3010.
- React 19 — Server Components by default; `"use client"` only for state/handlers.
- Every server action: `"use server"`, Zod `safeParse`, `requireRole(...)` at top, `logAudit(...)` before returning success, return `{ ok: true, ... } | { ok: false, error }`.
- Prisma 7 — no `url` in schema; driver adapter in [lib/prisma.ts](lib/prisma.ts). One migration per logical change, descriptive name.
- Type-safe end-to-end: no `any`, no `as unknown as X`.
- Teacher referrals are STUDENT scope only. Referral `rationale` is teacher text, NOT counselor-sensitive context.
- No automated test framework exists. Verification gates per task: `npx tsc --noEmit`, `npm run lint`, and (for UI/routing) `npm run build`. Final task does a runtime walk on `http://localhost:3010`.
- Spec: [docs/superpowers/specs/2026-06-17-teacher-intervention-referral-design.md](docs/superpowers/specs/2026-06-17-teacher-intervention-referral-design.md). Already on branch `feat/teacher-intervention-referral`.

---

## File Structure

- `prisma/schema.prisma` — new enums + `InterventionReferral` model + relations + 3 audit actions (Task 1)
- `lib/teacher/queries.ts` — teacher referral read helpers + scope guard (Task 2)
- `app/actions/teacher/referrals.ts` — `createReferralAction` (Task 3)
- `app/teacher/refer/page.tsx` + `components/teacher/referral-form.tsx` — teacher UI (Task 4)
- `components/roles/teacher/teacher-config.ts` — nav (Task 4)
- `lib/intervention/queries.ts` — `getReferralForPrefill` + extend `RecommendationPrefill` (Task 5)
- `app/actions/counselor/interventions.ts` — accept branch (Task 5)
- `app/actions/counselor/referrals.ts` — `declineReferralAction` (Task 5)
- `app/counselor/referrals/page.tsx` + `components/counselor/referral-queue.tsx` — counselor UI (Task 6)
- `components/roles/counselor/counselor-config.ts` — nav (Task 6)
- `app/counselor/interventions/new/page.tsx` + `components/counselor/intervention-builder-form.tsx` — accept wiring (Task 6)
- `docs/AEM_Development_Phases.md` — record the work (Task 7)

---

### Task 1: Schema, enums, relations, audit actions, migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `InterventionReferral` model; enums `ReferralStatus { PENDING ACCEPTED DECLINED }`, `ReferralUrgency { LOW MEDIUM HIGH }`; `AuditAction` values `REFERRAL_CREATED`, `REFERRAL_ACCEPTED`, `REFERRAL_DECLINED`; relation field `Intervention.referralResult`.

- [ ] **Step 1: Add the two enums.** In `prisma/schema.prisma`, near the other intervention enums (after `enum InterventionStatus { ... }`), add:

```prisma
enum ReferralStatus {
  PENDING
  ACCEPTED
  DECLINED
}

enum ReferralUrgency {
  LOW
  MEDIUM
  HIGH
}
```

- [ ] **Step 2: Add the three audit actions.** In `enum AuditAction { ... }`, after `INTERIM_REVISION`, add:

```prisma
  REFERRAL_CREATED
  REFERRAL_ACCEPTED
  REFERRAL_DECLINED
```

- [ ] **Step 3: Add the `InterventionReferral` model.** After the `RecommendationDraft` model, add:

```prisma
// Teacher-originated referral: a structured proposal a counselor converts into
// a real intervention. STUDENT scope only. Mirrors RecommendationDraft but is
// human-originated — kept separate to preserve algorithm-vs-human provenance.
model InterventionReferral {
  id            String          @id @default(cuid())
  referredById  String
  referredBy    User            @relation("ReferralAuthor", fields: [referredById], references: [id], onDelete: Restrict)
  studentId     String
  student       Student         @relation(fields: [studentId], references: [id], onDelete: Cascade)
  schoolYearId  String
  schoolYear    SchoolYear      @relation(fields: [schoolYearId], references: [id], onDelete: Cascade)

  suggestedType InterventionType
  rationale     String
  urgency       ReferralUrgency @default(MEDIUM)

  status        ReferralStatus  @default(PENDING)
  declineReason String?
  reviewedById  String?
  reviewedAt    DateTime?

  resultingInterventionId String?       @unique
  resultingIntervention   Intervention? @relation("ReferralResult", fields: [resultingInterventionId], references: [id], onDelete: SetNull)

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([schoolYearId, status])
  @@index([referredById])
  @@index([studentId])
}
```

- [ ] **Step 4: Add inverse relation fields.** Add one line to each related model's field list:

In `model User { ... }`:
```prisma
  referralsAuthored InterventionReferral[] @relation("ReferralAuthor")
```
In `model Student { ... }`:
```prisma
  referrals InterventionReferral[]
```
In `model SchoolYear { ... }`:
```prisma
  referrals InterventionReferral[]
```
In `model Intervention { ... }`:
```prisma
  referralResult InterventionReferral? @relation("ReferralResult")
```

- [ ] **Step 5: Create the migration.**

Run: `npm run db:migrate -- --name add_intervention_referral`
Expected: migration created and applied; "Your database is now in sync with your schema." (Docker Postgres must be up: `npm run db:up`.)

- [ ] **Step 6: Regenerate client + typecheck.**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: client generated; typecheck passes (no errors).

- [ ] **Step 7: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add InterventionReferral model and audit actions

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 2: Teacher referral query helpers

**Files:**
- Modify: `lib/teacher/queries.ts`

**Interfaces:**
- Consumes: `prisma`, Prisma client types from Task 1.
- Produces:
  - `getReferableStudents(userId: string, schoolYearId: string): Promise<ReferableStudent[]>` where `ReferableStudent = { id: string; label: string; sectionLabel: string }`.
  - `canTeacherReferStudent(userId: string, studentId: string, schoolYearId: string): Promise<boolean>`.
  - `getTeacherReferrals(userId: string, schoolYearId: string): Promise<TeacherReferralRow[]>` where `TeacherReferralRow = { id: string; studentLabel: string; suggestedType: string; urgency: string; status: string; declineReason: string | null; resultingInterventionId: string | null; createdAt: Date }`.

- [ ] **Step 1: Add helper code.** Append to `lib/teacher/queries.ts`:

```typescript
export type ReferableStudent = { id: string; label: string; sectionLabel: string };

/**
 * Distinct sectionIds the teacher teaches or advises in the given year.
 */
async function teacherSectionIds(userId: string, schoolYearId: string): Promise<string[]> {
  const rows = await prisma.teacherAssignment.findMany({
    where: { userId, schoolYearId },
    select: { sectionId: true },
  });
  return Array.from(new Set(rows.map((r) => r.sectionId)));
}

/** Students enrolled in any section the teacher teaches/advises this year. */
export async function getReferableStudents(
  userId: string,
  schoolYearId: string,
): Promise<ReferableStudent[]> {
  const sectionIds = await teacherSectionIds(userId, schoolYearId);
  if (sectionIds.length === 0) return [];
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId, status: "ACTIVE", sectionId: { in: sectionIds } },
    include: {
      student: { select: { id: true, lastName: true, firstName: true, lrn: true } },
      section: { select: { gradeLevel: true, name: true } },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  // Dedupe by student (a student could appear via multiple assignments).
  const seen = new Set<string>();
  const out: ReferableStudent[] = [];
  for (const e of enrollments) {
    if (seen.has(e.student.id)) continue;
    seen.add(e.student.id);
    out.push({
      id: e.student.id,
      label: `${e.student.lastName}, ${e.student.firstName} · ${e.student.lrn}`,
      sectionLabel: `${e.section.gradeLevel} · ${e.section.name}`,
    });
  }
  return out;
}

/** Authoritative scope guard for the create action. */
export async function canTeacherReferStudent(
  userId: string,
  studentId: string,
  schoolYearId: string,
): Promise<boolean> {
  const sectionIds = await teacherSectionIds(userId, schoolYearId);
  if (sectionIds.length === 0) return false;
  const count = await prisma.studentEnrollment.count({
    where: { schoolYearId, studentId, status: "ACTIVE", sectionId: { in: sectionIds } },
  });
  return count > 0;
}

export type TeacherReferralRow = {
  id: string;
  studentLabel: string;
  suggestedType: string;
  urgency: string;
  status: string;
  declineReason: string | null;
  resultingInterventionId: string | null;
  createdAt: Date;
};

export async function getTeacherReferrals(
  userId: string,
  schoolYearId: string,
): Promise<TeacherReferralRow[]> {
  const rows = await prisma.interventionReferral.findMany({
    where: { referredById: userId, schoolYearId },
    include: { student: { select: { firstName: true, lastName: true, lrn: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    studentLabel: `${r.student.lastName}, ${r.student.firstName} · ${r.student.lrn}`,
    suggestedType: r.suggestedType,
    urgency: r.urgency,
    status: r.status,
    declineReason: r.declineReason,
    resultingInterventionId: r.resultingInterventionId,
    createdAt: r.createdAt,
  }));
}
```

- [ ] **Step 2: Typecheck.**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit.**

```bash
git add lib/teacher/queries.ts
git commit -m "feat(teacher): referral query helpers and scope guard

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 3: `createReferralAction`

**Files:**
- Create: `app/actions/teacher/referrals.ts`

**Interfaces:**
- Consumes: `canTeacherReferStudent` (Task 2), `requireRole`, `getActiveSchoolYear`, `logAudit`, `prisma`.
- Produces: `createReferralAction(input: unknown): Promise<{ ok: true; referralId: string } | { ok: false; error: string }>`.

- [ ] **Step 1: Write the action.** Create `app/actions/teacher/referrals.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { logAudit } from "@/lib/audit";
import { canTeacherReferStudent } from "@/lib/teacher/queries";

const TYPE = z.enum([
  "ACADEMIC_SUPPORT",
  "COUNSELING_SESSION",
  "IMMEDIATE_COUNSELING",
  "POSITIVE_REINFORCEMENT",
  "CASE_REVIEW",
  "SECTION_INTERVENTION",
  "SUBJECT_REMEDIATION",
  "ATTENDANCE_PROGRAM",
]);

const inputSchema = z.object({
  studentId: z.string().min(1, "Student is required."),
  suggestedType: TYPE,
  rationale: z.string().trim().min(1, "Reason is required.").max(4000),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export type CreateReferralResult =
  | { ok: true; referralId: string }
  | { ok: false; error: string };

export async function createReferralAction(input: unknown): Promise<CreateReferralResult> {
  const session = await requireRole("TEACHER");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const sy = await getActiveSchoolYear();
  if (!sy) return { ok: false, error: "No active school year." };

  const allowed = await canTeacherReferStudent(session.user.id, data.studentId, sy.id);
  if (!allowed) {
    return { ok: false, error: "You can only refer students in your assigned sections." };
  }

  const referral = await prisma.interventionReferral.create({
    data: {
      referredById: session.user.id,
      studentId: data.studentId,
      schoolYearId: sy.id,
      suggestedType: data.suggestedType,
      rationale: data.rationale,
      urgency: data.urgency,
    },
    select: { id: true },
  });

  await logAudit({
    action: "REFERRAL_CREATED",
    userId: session.user.id,
    resourceType: "InterventionReferral",
    resourceId: referral.id,
    metadata: { studentId: data.studentId, suggestedType: data.suggestedType, urgency: data.urgency },
  });

  revalidatePath("/teacher/refer");
  revalidatePath("/counselor/referrals");
  return { ok: true, referralId: referral.id };
}
```

- [ ] **Step 2: Typecheck + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit.**

```bash
git add app/actions/teacher/referrals.ts
git commit -m "feat(teacher): createReferralAction with scope guard and audit

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 4: Teacher refer page, form, and nav

**Files:**
- Create: `app/teacher/refer/page.tsx`
- Create: `components/teacher/referral-form.tsx`
- Modify: `components/roles/teacher/teacher-config.ts`

**Interfaces:**
- Consumes: `getReferableStudents`, `getTeacherReferrals` (Task 2), `createReferralAction` (Task 3), existing searchable select.
- Produces: route `/teacher/refer`.

- [ ] **Step 1: Confirm the searchable-select component path.**

Run: `ls components/ui/ components/roles/shared 2>/dev/null | grep -i select; grep -rln "SearchableSelect\|searchable-select" components | head`
Expected: prints the component file. Use that import path as `<SearchableSelect>` below. If the export name differs, match it. (Recent commit e9fda3f added a searchable select for student/section selection.)

- [ ] **Step 2: Write the client form.** Create `components/teacher/referral-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReferralAction } from "@/app/actions/teacher/referrals";

type Student = { id: string; label: string; sectionLabel: string };

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "ACADEMIC_SUPPORT", label: "Academic support" },
  { value: "COUNSELING_SESSION", label: "Counseling session" },
  { value: "IMMEDIATE_COUNSELING", label: "Immediate counseling" },
  { value: "POSITIVE_REINFORCEMENT", label: "Positive reinforcement" },
  { value: "CASE_REVIEW", label: "Case review" },
  { value: "SUBJECT_REMEDIATION", label: "Subject remediation" },
];

const URGENCY_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

export default function ReferralForm({ students }: { students: Student[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState("");
  const [suggestedType, setSuggestedType] = useState("ACADEMIC_SUPPORT");
  const [rationale, setRationale] = useState("");
  const [urgency, setUrgency] = useState<string>("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createReferralAction({ studentId, suggestedType, rationale, urgency });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStudentId("");
      setRationale("");
      setUrgency("MEDIUM");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Student</span>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        >
          <option value="" disabled>Select a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.label} — {s.sectionLabel}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Suggested intervention type</span>
        <select
          value={suggestedType}
          onChange={(e) => setSuggestedType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Reason / rationale</span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          maxLength={4000}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="What you're seeing in class that prompts this referral."
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Urgency</span>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {URGENCY_OPTIONS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </label>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={pending || !studentId || !rationale}
        className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit referral"}
      </button>
    </form>
  );
}
```

> Note: a native `<select>` keeps the form dependency-free. If the existing `SearchableSelect` (Step 1) is preferred for the student picker, swap the student `<select>` for it, passing `options={students.map((s) => ({ id: s.id, label: \`${s.label} — ${s.sectionLabel}\` }))}` and wiring `value`/`onChange` to `studentId`/`setStudentId`.

- [ ] **Step 3: Write the server page.** Create `app/teacher/refer/page.tsx`:

```tsx
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getReferableStudents, getTeacherReferrals } from "@/lib/teacher/queries";
import ReferralForm from "@/components/teacher/referral-form";

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DECLINED: "border-rose-200 bg-rose-50 text-rose-700",
};

export default async function TeacherReferPage() {
  const session = await requireRole("TEACHER");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const [students, referrals] = await Promise.all([
    getReferableStudents(session.user.id, sy.id),
    getTeacherReferrals(session.user.id, sy.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Refer a Student</h1>
        <p className="mt-1 text-sm text-slate-600">
          Propose an intervention for a student in your sections. A counselor reviews and decides — they own any plan that results.
        </p>
      </header>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          You have no assigned students in {sy.label}.
        </div>
      ) : (
        <ReferralForm students={students} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Your referrals ({referrals.length})
        </h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-slate-500">No referrals yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {referrals.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">{r.studentLabel}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {r.suggestedType} · urgency {r.urgency} · {r.createdAt.toLocaleDateString()}
                </p>
                {r.status === "ACCEPTED" && r.resultingInterventionId && (
                  <Link
                    href={`/teacher/intervention-feedback`}
                    className="mt-1 inline-block text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
                  >
                    Intervention created — view in Intervention Feedback
                  </Link>
                )}
                {r.status === "DECLINED" && r.declineReason && (
                  <p className="mt-1 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                    Declined: {r.declineReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Add the nav item.** In `components/roles/teacher/teacher-config.ts`, add to the `TEACHER_NAV` array (after the "Intervention Feedback" entry):

```typescript
  {
    title: "Refer a Student",
    href: "/teacher/refer",
    description:
      "Propose an intervention for a student in your sections; a counselor reviews and decides.",
  },
```

- [ ] **Step 5: Typecheck, lint, build.**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass; `/teacher/refer` appears in the build route list.

- [ ] **Step 6: Commit.**

```bash
git add app/teacher/refer components/teacher/referral-form.tsx components/roles/teacher/teacher-config.ts
git commit -m "feat(teacher): refer-a-student page, form, and nav

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 5: Counselor accept/decline backend + prefill query

**Files:**
- Modify: `lib/intervention/queries.ts` (extend `RecommendationPrefill`, add `getReferralForPrefill`)
- Modify: `app/actions/counselor/interventions.ts` (accept branch in `createInterventionAction`)
- Create: `app/actions/counselor/referrals.ts` (`declineReferralAction`)

**Interfaces:**
- Consumes: existing `RecommendationPrefill`, `resolveScopeLabels`, `createInterventionAction` internals.
- Produces:
  - `RecommendationPrefill` gains `source: "RECOMMENDATION" | "REFERRAL"` and optional nothing else (referral id reuses `id`).
  - `getReferralForPrefill(id: string, schoolYearId: string): Promise<RecommendationPrefill | null>`.
  - `createInterventionAction` input gains `triggeringReferralId?: string`.
  - `declineReferralAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }>`.

- [ ] **Step 1: Extend the prefill type and add the referral prefill query.** In `lib/intervention/queries.ts`, change the `RecommendationPrefill` type to add a `source` discriminator:

```typescript
export type RecommendationPrefill = {
  id: string;
  scope: PatternScope;
  scopeTargetId: string;
  suggestedType: string;
  rationale: string;
  scopeLabel: string;
  source: "RECOMMENDATION" | "REFERRAL";
};
```

Then in `getRecommendationForPrefill`, add `source: "RECOMMENDATION"` to the returned object. Add this new function next to it:

```typescript
export async function getReferralForPrefill(
  id: string,
  schoolYearId: string,
): Promise<RecommendationPrefill | null> {
  const r = await prisma.interventionReferral.findFirst({
    where: { id, status: "PENDING", schoolYearId },
    include: { student: { select: { firstName: true, lastName: true, lrn: true } } },
  });
  if (!r) return null;
  return {
    id: r.id,
    scope: "STUDENT",
    scopeTargetId: r.studentId,
    suggestedType: r.suggestedType,
    rationale: r.rationale,
    scopeLabel: `${r.student.lastName}, ${r.student.firstName} · ${r.student.lrn}`,
    source: "REFERRAL",
  };
}
```

- [ ] **Step 2: Add `triggeringReferralId` to the create input schema.** In `app/actions/counselor/interventions.ts`, in `inputSchema`, after the `triggeringRecommendationId` line add:

```typescript
  triggeringReferralId: z.string().min(1).optional().or(z.literal("")),
```

- [ ] **Step 3: Resolve and validate the referral before the transaction.** In `createInterventionAction`, right after the existing `draftToInstantiate` resolution block (the `if (data.triggeringRecommendationId) { ... }`), add:

```typescript
  // Optional referral acceptance — validate it exists and is pending.
  let referralToAccept: { id: string } | null = null;
  if (data.triggeringReferralId) {
    const referral = await prisma.interventionReferral.findFirst({
      where: { id: data.triggeringReferralId, status: "PENDING", schoolYearId: sy.id },
      select: { id: true },
    });
    if (!referral) {
      return { ok: false, error: "Referral not found or already reviewed." };
    }
    referralToAccept = referral;
  }
```

- [ ] **Step 4: Link + flip the referral inside the transaction.** Inside the `prisma.$transaction(async (tx) => { ... })`, after the `if (draftToInstantiate) { ... }` block (before `return created;`), add:

```typescript
    if (referralToAccept) {
      await tx.interventionReferral.update({
        where: { id: referralToAccept.id },
        data: {
          status: "ACCEPTED",
          resultingInterventionId: created.id,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
    }
```

- [ ] **Step 5: Audit the acceptance.** After the existing `INTERVENTION_CREATED` `logAudit(...)` call in `createInterventionAction`, add:

```typescript
  if (referralToAccept) {
    await logAudit({
      action: "REFERRAL_ACCEPTED",
      userId: session.user.id,
      resourceType: "InterventionReferral",
      resourceId: referralToAccept.id,
      metadata: { interventionId: intervention.id },
    });
  }
```

Also add `revalidatePath("/counselor/referrals");` near the existing `revalidatePath("/counselor/interventions");` at the end.

- [ ] **Step 6: Write the decline action.** Create `app/actions/counselor/referrals.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { logAudit } from "@/lib/audit";

const inputSchema = z.object({
  referralId: z.string().min(1),
  reason: z.string().trim().min(1, "A reason is required.").max(2000),
});

export type DeclineReferralResult = { ok: true } | { ok: false; error: string };

export async function declineReferralAction(input: unknown): Promise<DeclineReferralResult> {
  const session = await requireRole("COUNSELOR");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { referralId, reason } = parsed.data;

  const sy = await getActiveSchoolYear();
  if (!sy) return { ok: false, error: "No active school year." };

  const referral = await prisma.interventionReferral.findFirst({
    where: { id: referralId, status: "PENDING", schoolYearId: sy.id },
    select: { id: true },
  });
  if (!referral) return { ok: false, error: "Referral not found or already reviewed." };

  await prisma.interventionReferral.update({
    where: { id: referral.id },
    data: {
      status: "DECLINED",
      declineReason: reason,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  await logAudit({
    action: "REFERRAL_DECLINED",
    userId: session.user.id,
    resourceType: "InterventionReferral",
    resourceId: referral.id,
    metadata: { reason },
  });

  revalidatePath("/counselor/referrals");
  revalidatePath("/teacher/refer");
  return { ok: true };
}
```

- [ ] **Step 7: Typecheck + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 8: Commit.**

```bash
git add lib/intervention/queries.ts app/actions/counselor/interventions.ts app/actions/counselor/referrals.ts
git commit -m "feat(counselor): accept/decline referral backend and prefill query

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 6: Counselor referrals queue, nav, and accept wiring

**Files:**
- Create: `app/counselor/referrals/page.tsx`
- Create: `components/counselor/referral-queue.tsx`
- Modify: `components/roles/counselor/counselor-config.ts`
- Modify: `app/counselor/interventions/new/page.tsx`
- Modify: `components/counselor/intervention-builder-form.tsx`

**Interfaces:**
- Consumes: `declineReferralAction` (Task 5), `getReferralForPrefill` (Task 5).
- Produces: route `/counselor/referrals`; `new` page accepts `fromReferral` searchParam; form submits `triggeringReferralId` when `prefill.source === "REFERRAL"`.

- [ ] **Step 1: Wire the form to submit the right trigger field.** In `components/counselor/intervention-builder-form.tsx`, in the `payload` object, replace the `triggeringRecommendationId: prefill?.id,` line with:

```typescript
      triggeringRecommendationId: prefill?.source === "REFERRAL" ? undefined : prefill?.id,
      triggeringReferralId: prefill?.source === "REFERRAL" ? prefill?.id : undefined,
```

- [ ] **Step 2: Accept `fromReferral` in the new-intervention page.** In `app/counselor/interventions/new/page.tsx`:
  - Change the `searchParams` type to `Promise<{ fromRecommendation?: string; fromReferral?: string }>`.
  - Import `getReferralForPrefill` alongside `getRecommendationForPrefill`.
  - After destructuring, compute prefill from either source:

```tsx
  const { fromRecommendation, fromReferral } = await searchParams;

  const targets = await getInterventionTargets(sy.id);
  const prefill = fromRecommendation
    ? await getRecommendationForPrefill(fromRecommendation, sy.id)
    : fromReferral
      ? await getReferralForPrefill(fromReferral, sy.id)
      : null;
```

  - Update the amber prefill banner to be source-aware:

```tsx
        {prefill && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {prefill.source === "REFERRAL"
              ? <>Prefilled from teacher referral <span className="font-mono">{prefill.id}</span>. On save this referral will be marked ACCEPTED.</>
              : <>Prefilled from recommendation draft <span className="font-mono">{prefill.id}</span>. On save this draft will be marked INSTANTIATED.</>}
          </p>
        )}
```

- [ ] **Step 3: Write the decline client component.** Create `components/counselor/referral-queue.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { declineReferralAction } from "@/app/actions/counselor/referrals";

export type ReferralCard = {
  id: string;
  studentLabel: string;
  teacherLabel: string;
  suggestedType: string;
  urgency: string;
  rationale: string;
  createdAt: string;
};

function DeclineBox({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
        Decline
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Reason (shared with the referring teacher)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
      />
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || !reason}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await declineReferralAction({ referralId, reason });
              if (!result.ok) { setError(result.error); return; }
              router.refresh();
            })
          }
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Declining…" : "Confirm decline"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

const URGENCY_TONE: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function ReferralQueue({ referrals }: { referrals: ReferralCard[] }) {
  if (referrals.length === 0) {
    return <p className="text-sm text-slate-500">No pending referrals.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {referrals.map((r) => (
        <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-800">{r.studentLabel}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCY_TONE[r.urgency] ?? ""}`}>
              {r.urgency}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Referred by {r.teacherLabel} · suggests {r.suggestedType} · {r.createdAt}
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">{r.rationale}</p>
          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={`/counselor/interventions/new?fromReferral=${r.id}`}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Accept &amp; create intervention
            </Link>
            <DeclineBox referralId={r.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Write the counselor referrals page.** Create `app/counselor/referrals/page.tsx`:

```tsx
import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { prisma } from "@/lib/prisma";
import ReferralQueue, { type ReferralCard } from "@/components/counselor/referral-queue";

export default async function CounselorReferralsPage() {
  await requireRole("COUNSELOR");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const rows = await prisma.interventionReferral.findMany({
    where: { schoolYearId: sy.id, status: "PENDING" },
    include: {
      student: { select: { firstName: true, lastName: true, lrn: true } },
      referredBy: { select: { name: true, email: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });

  const referrals: ReferralCard[] = rows.map((r) => ({
    id: r.id,
    studentLabel: `${r.student.lastName}, ${r.student.firstName} · ${r.student.lrn}`,
    teacherLabel: r.referredBy.name ?? r.referredBy.email,
    suggestedType: r.suggestedType,
    urgency: r.urgency,
    rationale: r.rationale,
    createdAt: r.createdAt.toLocaleDateString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Teacher Referrals</h1>
        <p className="mt-1 text-sm text-slate-600">
          {referrals.length} pending referral{referrals.length === 1 ? "" : "s"} in {sy.label}. Accept to pre-fill a new intervention you own, or decline with a reason.
        </p>
      </header>
      <ReferralQueue referrals={referrals} />
    </div>
  );
}
```

- [ ] **Step 5: Add the counselor nav item.** In `components/roles/counselor/counselor-config.ts`, add an entry (after "Caseload" or before "Feedback", matching the existing object shape with `href: "/counselor/referrals"`, a `title`/label, and `description`). Match the exact field names used by the other entries in that file.

- [ ] **Step 6: Typecheck, lint, build.**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass; `/counselor/referrals` and the updated `/counselor/interventions/new` appear in the route list.

- [ ] **Step 7: Commit.**

```bash
git add app/counselor/referrals components/counselor/referral-queue.tsx components/roles/counselor/counselor-config.ts app/counselor/interventions/new/page.tsx components/counselor/intervention-builder-form.tsx
git commit -m "feat(counselor): referrals queue, accept prefill wiring, and nav

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

### Task 7: End-to-end runtime walk + phase tracker update

**Files:**
- Modify: `docs/AEM_Development_Phases.md`

- [ ] **Step 1: Ensure DB + dev server are up.**

Run: `npm run db:up && (curl -sf -o /dev/null http://localhost:3010 || echo "start dev: npm run dev")`
Expected: Postgres up; dev server reachable (start it if not). Use the Docker CLI path if needed: `export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"`.

- [ ] **Step 2: Walk the happy path (manual, in browser).**
  1. Log in as a demo teacher who has sections (e.g. `adviser.faraday@school.edu` / `demo123`). Go to **Refer a Student** → submit a referral for a student in their section. Confirm it appears under "Your referrals" as PENDING.
  2. Log in as `counselor@school.edu` / `counselor123` → **Teacher Referrals**. Confirm the referral is listed. Click **Accept & create intervention** → confirm the builder is prefilled (student + type + rationale) with the amber "Prefilled from teacher referral" banner → save.
  3. Confirm redirect to the new intervention. Back in **Teacher Referrals**, the referral is gone from the pending queue.
  4. As the teacher again → **Refer a Student**: the referral now shows ACCEPTED with a link.

- [ ] **Step 3: Walk the decline path.** As teacher submit another referral → as counselor **Decline** with a reason → as teacher confirm it shows DECLINED with the reason text.

- [ ] **Step 4: Verify audit + linkage via SQL.**

Run:
```bash
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin"
docker exec aem-postgres psql -U aem -d aem -t -c "select action, count(*) from \"AuditLog\" where action like 'REFERRAL%' group by action;"
docker exec aem-postgres psql -U aem -d aem -t -c "select status, count(*) from \"InterventionReferral\" group by status;"
```
Expected: `REFERRAL_CREATED`, `REFERRAL_ACCEPTED`, `REFERRAL_DECLINED` rows present; referral statuses reflect the walk (≥1 ACCEPTED with a non-null resultingInterventionId, ≥1 DECLINED).

- [ ] **Step 5: Negative scope check.** Confirm a teacher cannot refer a student outside their sections: the `/teacher/refer` student dropdown only lists their roster, and `canTeacherReferStudent` guards the action server-side (code review confirms the guard is called before create). Optionally verify by calling the action with a foreign studentId in a scratch script — expected `{ ok: false }`.

- [ ] **Step 6: Update the phase tracker.** In `docs/AEM_Development_Phases.md`, add a short entry under the appropriate phase recording: teacher intervention referral (teacher proposes → counselor accepts/declines), model `InterventionReferral`, routes `/teacher/refer` and `/counselor/referrals`, audit actions added. Check off as shipped.

- [ ] **Step 7: Commit.**

```bash
git add docs/AEM_Development_Phases.md
git commit -m "docs: record teacher intervention referral in phase tracker

Co-authored-by: Claude <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** §Data model → Task 1. §Teacher side (form + status) → Tasks 3–4. §Counselor side (queue, accept prefill, decline) → Tasks 5–6. §RBAC/scope → Task 2 guard + Task 3 enforcement. §Audit → Tasks 3, 5. §Feedback loop (Pending/Accepted-linked/Declined+reason) → Task 4 status list + Task 5 decline. §Testing checklist → Task 7. §YAGNI exclusions honored (STUDENT scope only; no edit/withdraw; no discussion threads).
- **Type consistency:** `RecommendationPrefill.source` defined in Task 5 Step 1, consumed in Task 6 Steps 1–2. `triggeringReferralId` added to schema (Task 5 Step 2), set by form (Task 6 Step 1), consumed by action (Task 5 Steps 3–4). `ReferralCard` defined and exported in Task 6 Step 3, imported in Step 4. Helper names (`getReferableStudents`, `canTeacherReferStudent`, `getTeacherReferrals`, `getReferralForPrefill`, `createReferralAction`, `declineReferralAction`) consistent across tasks.
- **Single FK:** `InterventionReferral.resultingInterventionId` is the only link column; `Intervention.referralResult` is its inverse — no duplicate `triggeringReferralId` column on Intervention (the create action's `triggeringReferralId` is action *input*, not a DB column).
