# Teacher Intervention Referral — Design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)
**Author:** AEM team

## Problem

Teachers see at-risk students daily but cannot initiate the intervention
process. Today, only counselors create interventions. The request was to let a
teacher "pass an intervention to a student." Doing that literally — letting
teachers create real interventions — would violate a **foundational governance
principle** of the system:

- **Spec §3:** "Every clinical decision affecting a student is owned by a
  qualified human (typically the counselor)... interventions only become real
  when a human creates one. This is foundational ethics for a system handling
  minors and is essential to research integrity."
- **Spec §6.6:** "An intervention only exists once a counselor explicitly
  creates one... This separation is foundational."
- The model is **single-owner (counselor), multi-contributor (everyone else).**

## Goal

Let teachers **initiate** an intervention via a structured **referral** that a
counselor reviews and converts into a real intervention. The teacher proposes;
the counselor decides and owns. This preserves the single-owner governance
model while closing the gap where teachers had no path to start the process.

This mirrors the existing `RecommendationDraft → Intervention` flow (a
suggestion the counselor converts via
`/counselor/interventions/new?fromRecommendation=<id>`), except the referral is
**human-originated** instead of algorithm-originated.

## Decisions (captured during brainstorming)

1. **Flow:** Teacher refers → counselor creates. (Not teacher-creates-and-owns.)
2. **Referral detail:** Structured "proposed plan" — student + suggested
   intervention type + rationale + urgency.
3. **Feedback loop:** Full — teacher sees Pending / Accepted (linked to the
   created intervention) / Declined (with the counselor's reason).
4. **Model:** New `InterventionReferral` model, kept separate from
   `RecommendationDraft` to preserve clean algorithm-vs-human provenance for
   audit and research integrity.

## Architecture

### 1. Data model

New model `InterventionReferral` (STUDENT scope only — teachers refer
individual students):

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

model InterventionReferral {
  id            String           @id @default(cuid())
  referredById  String           // teacher User
  referredBy    User             @relation("ReferralAuthor", fields: [referredById], references: [id], onDelete: Restrict)
  studentId     String
  student       Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  schoolYearId  String
  schoolYear    SchoolYear       @relation(fields: [schoolYearId], references: [id], onDelete: Cascade)

  suggestedType InterventionType
  rationale     String           // teacher's reason — NOT counselor-sensitive context
  urgency       ReferralUrgency  @default(MEDIUM)

  status        ReferralStatus   @default(PENDING)
  declineReason String?
  reviewedById  String?          // counselor who accepted/declined
  reviewedAt    DateTime?

  resultingInterventionId String? // set on accept
  resultingIntervention   Intervention? @relation("ReferralResult", fields: [resultingInterventionId], references: [id], onDelete: SetNull)

  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([schoolYearId, status])
  @@index([referredById])
  @@index([studentId])
}
```

Plus a mirror of the existing recommendation linkage on `Intervention`:

```prisma
// On model Intervention:
triggeringReferralId String?
triggeringReferral   InterventionReferral? @relation("ReferralResult-back" ...)
```

Note: `Intervention` already has `triggeringRecommendationId`. The referral link
can be modeled either as the back-relation of `resultingInterventionId` above
(preferred — one FK, no duplication) or as a separate `triggeringReferralId`
column mirroring the recommendation pattern. **Implementation decision:** use a
single FK `InterventionReferral.resultingInterventionId` and read the inverse
relation from `Intervention` when needed, to avoid two columns expressing the
same link. The create action sets `resultingInterventionId` on accept.

New `AuditAction` enum values: `REFERRAL_CREATED`, `REFERRAL_ACCEPTED`,
`REFERRAL_DECLINED`.

One Prisma migration introduces all of the above.

### 2. Teacher side

- **Nav:** new item "Refer a Student" → `/teacher/refer` (added to
  `components/roles/teacher/teacher-config.ts` `TEACHER_NAV`).
- **Page `/teacher/refer`:**
  - **Form:** student picker (reuse the existing searchable-select component),
    suggested type dropdown (`InterventionType`), rationale textarea, urgency
    select. Student options limited to the teacher's roster (sections they teach
    or, as adviser, their advisory section).
  - **Status list:** the teacher's own referrals with status badges —
    Pending / Accepted (link to created intervention's public view) /
    Declined (shows counselor's `declineReason`).
- **Server action `createReferralAction`** (`app/actions/teacher/referrals.ts`):
  - `"use server"`, `requireRole("TEACHER")`.
  - Zod-validate input (studentId, suggestedType, rationale non-empty/maxlen,
    urgency).
  - **Scope check:** verify the student is enrolled in a section the teacher
    teaches or advises in the active year (reuse existing teacher-reach logic).
    Reject otherwise.
  - Create `InterventionReferral` (status PENDING) in the active school year.
  - `logAudit({ action: "REFERRAL_CREATED", ... })`.
  - `revalidatePath("/teacher/refer")` and `/counselor/referrals`.

### 3. Counselor side

- **Nav:** new item "Referrals" → `/counselor/referrals` (added to
  `components/roles/counselor/counselor-config.ts`).
- **Page `/counselor/referrals`:** queue of PENDING referrals (teacher name,
  student, suggested type, urgency, rationale, submitted date) + history of
  reviewed referrals.
  - **Accept** → links to existing
    `/counselor/interventions/new?fromReferral=<id>`. The create form pre-fills
    from the referral (student/scope target = referral.studentId, type =
    suggestedType, rationale = referral.rationale as a starting point).
  - **Decline** → `declineReferralAction` (requires a reason) →
    status DECLINED, `declineReason`, `reviewedById`, `reviewedAt`.
- **Extend `createInterventionAction`** (`app/actions/counselor/interventions.ts`):
  - Add optional `triggeringReferralId` to the input schema.
  - Branch mirrors the existing `triggeringRecommendationId` branch: validate the
    referral exists and is PENDING in the active year; on success, inside the
    same transaction flip the referral to ACCEPTED and set its
    `resultingInterventionId` (the single FK linking the two), `reviewedById`,
    and `reviewedAt`.
  - `logAudit({ action: "REFERRAL_ACCEPTED", ... })` alongside the existing
    `INTERVENTION_CREATED` audit.
- **New page route `/counselor/interventions/new` already exists** for the
  recommendation prefill; extend its loader to also accept `fromReferral`.

### 4. RBAC / audit / governance

- Teacher scope enforced **at the action layer** (defense-in-depth), not only in
  the UI student picker.
- Referral `rationale` is the teacher's own text and is **not** counselor-
  sensitive context. Visible to: the authoring teacher, all counselors, and the
  principal. Not exposed to other teachers.
- The resulting intervention follows **normal governance** unchanged — counselor
  owns it; STUDENT scope auto-activates (existing behavior).
- Audit on all three transitions: created / accepted / declined.

## Data flow

```
Teacher (/teacher/refer)
  └─ createReferralAction  →  InterventionReferral { status: PENDING }
                                          │
Counselor (/counselor/referrals)          │
  ├─ Decline → declineReferralAction → status: DECLINED + declineReason
  │              (teacher sees reason on /teacher/refer)
  └─ Accept  → /counselor/interventions/new?fromReferral=<id>
                 └─ createInterventionAction(triggeringReferralId)
                       ├─ Intervention created (counselor-owned, ACTIVE)
                       └─ Referral → ACCEPTED + resultingInterventionId
                             (teacher sees link on /teacher/refer)
```

## Out of scope (YAGNI)

- Section / grade / school-level referrals (individual students only).
- Editing or withdrawing a submitted referral.
- In-app discussion threads on referrals (the existing `InterventionNote`
  channel covers post-creation collaboration).

## Testing / regression checklist

1. Teacher refers a student in their section → referral appears in counselor's
   `/counselor/referrals` queue as PENDING.
2. Counselor **accepts** → create form pre-filled → intervention created,
   counselor-owned, STUDENT scope auto-active; referral flips to ACCEPTED and
   links to the intervention; teacher sees Accepted + link.
3. Counselor **declines** another referral with a reason → referral DECLINED;
   teacher sees Declined + the reason.
4. **Negative scope test:** `createReferralAction` rejects a student outside the
   referring teacher's sections.
5. Audit log contains `REFERRAL_CREATED`, `REFERRAL_ACCEPTED`,
   `REFERRAL_DECLINED` rows for the above.
6. Governance unchanged: no path lets a teacher create or own an intervention
   directly.

## Files touched (anticipated)

- `prisma/schema.prisma` + one migration
- `app/actions/teacher/referrals.ts` (new)
- `app/actions/counselor/referrals.ts` (new — decline) + edit
  `app/actions/counselor/interventions.ts` (accept branch)
- `app/teacher/refer/page.tsx` (new) + form component
- `app/counselor/referrals/page.tsx` (new) + components
- `app/counselor/interventions/new` loader (extend for `fromReferral`)
- `components/roles/teacher/teacher-config.ts`,
  `components/roles/counselor/counselor-config.ts` (nav)
- `lib/audit.ts` / enum usage as needed
- Update `docs/AEM_Development_Phases.md` with this work
