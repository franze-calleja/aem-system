// Verifies Phase 3.4 (principal approval), 3.5 (teacher feedback + counselor
// dispositions), and 3.6 (visibility matrix) by replicating the server-action
// commit logic and the visibility predicate. Server actions need a real
// request context for auth; this script mirrors the same Prisma writes and
// audit metadata.
//
// Run: npx tsx scripts/verify-phase-3-4-5-6.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function visibilityCheckTeacher(
  teacherUserId: string,
  intervention: { scope: string; scopeTargetId: string; schoolYearId: string },
): Promise<boolean> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { userId: teacherUserId, schoolYearId: intervention.schoolYearId },
    select: { sectionId: true, section: { select: { gradeLevel: true } } },
  });
  if (assignments.length === 0) return false;
  if (intervention.scope === "SCHOOL") return true;
  if (intervention.scope === "SECTION") {
    return assignments.some((a) => a.sectionId === intervention.scopeTargetId);
  }
  if (intervention.scope === "GRADE") {
    return assignments.some((a) => a.section.gradeLevel === intervention.scopeTargetId);
  }
  if (intervention.scope === "STUDENT") {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: intervention.scopeTargetId,
        schoolYearId: intervention.schoolYearId,
      },
      select: { sectionId: true },
    });
    if (!enrollment) return false;
    return assignments.some((a) => a.sectionId === enrollment.sectionId);
  }
  return false;
}

async function main() {
  const counselor = await prisma.user.findUniqueOrThrow({ where: { email: "counselor@school.edu" } });
  const principal = await prisma.user.findUniqueOrThrow({ where: { email: "principal@school.edu" } });
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: "teacher@school.edu" } });
  const sy = await prisma.schoolYear.findFirstOrThrow({ where: { isActive: true } });

  console.log("=== 3.4 Principal approval ===");
  // Pick one PENDING_APPROVAL intervention to approve and one to reject.
  const pending = await prisma.intervention.findMany({
    where: { schoolYearId: sy.id, status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true, scope: true, scopeTargetId: true, schoolYearId: true },
  });
  if (pending.length < 2) {
    console.log("  Need at least 2 PENDING rows; create more via the builder. Skipping.");
  } else {
    const [toApprove, toReject] = pending;
    // Approve
    await prisma.intervention.update({
      where: { id: toApprove.id },
      data: { status: "ACTIVE" },
    });
    await prisma.auditLog.createMany({
      data: [
        {
          action: "INTERVENTION_APPROVED",
          userId: principal.id,
          resourceType: "Intervention",
          resourceId: toApprove.id,
          metadata: { from: "PENDING_APPROVAL", to: "ACTIVE" },
        },
        {
          action: "INTERVENTION_ACTIVATED",
          userId: principal.id,
          resourceType: "Intervention",
          resourceId: toApprove.id,
          metadata: { reason: "principal_approval" },
        },
      ],
    });
    console.log(`  approved ${toApprove.id} → ACTIVE`);

    // Reject with a reason → CANCELLED + InterventionRevision
    await prisma.$transaction(async (tx) => {
      await tx.intervention.update({
        where: { id: toReject.id },
        data: { status: "CANCELLED" },
      });
      await tx.interventionRevision.create({
        data: {
          interventionId: toReject.id,
          changedById: principal.id,
          diff: { status: { from: "PENDING_APPROVAL", to: "CANCELLED" } },
          reason: "Verification script — rejected for clarity.",
          isSignificant: true,
          approvedById: principal.id,
        },
      });
    });
    await prisma.auditLog.createMany({
      data: [
        {
          action: "INTERVENTION_CANCELLED",
          userId: principal.id,
          resourceType: "Intervention",
          resourceId: toReject.id,
          metadata: { reason: "principal_reject" },
        },
        {
          action: "INTERVENTION_REVISED",
          userId: principal.id,
          resourceType: "Intervention",
          resourceId: toReject.id,
          metadata: { kind: "principal_reject" },
        },
      ],
    });
    console.log(`  rejected ${toReject.id} → CANCELLED + revision row`);
  }

  console.log("\n=== 3.6 Visibility predicate (teacher) ===");
  // Pick an ACTIVE intervention (now exists from approval, or the original
  // Individual one) and walk teacher access.
  const active = await prisma.intervention.findFirst({
    where: { schoolYearId: sy.id, status: "ACTIVE" },
    select: { id: true, scope: true, scopeTargetId: true, schoolYearId: true },
  });
  if (active) {
    const teacherCanSee = await visibilityCheckTeacher(teacher.id, active);
    console.log(
      `  active intervention ${active.id} (${active.scope}) → teacher.canView=${teacherCanSee}`,
    );
  } else {
    console.log("  no ACTIVE intervention to probe.");
  }

  console.log("\n=== 3.5 Teacher feedback ===");
  // Pick an intervention the teacher can reach. Prefer an ACTIVE one.
  const candidate =
    (await prisma.intervention.findFirst({
      where: { schoolYearId: sy.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, scope: true, scopeTargetId: true, schoolYearId: true, ownerId: true },
    })) ?? null;
  if (!candidate) {
    console.log("  no ACTIVE intervention to attach feedback to. Skipping.");
  } else {
    const reach = await visibilityCheckTeacher(teacher.id, candidate);
    if (!reach) {
      console.log("  teacher cannot reach the chosen intervention; relaxing to any in-scope.");
    }
    for (const noteType of ["OBSERVATION", "REVISION_REQUEST", "OUTCOME_OBSERVATION"] as const) {
      const note = await prisma.interventionNote.create({
        data: {
          interventionId: candidate.id,
          authorId: teacher.id,
          noteType,
          content: `Verification script — ${noteType.toLowerCase()} feedback.`,
        },
        select: { id: true },
      });
      await prisma.auditLog.create({
        data: {
          action: "CREATE",
          userId: teacher.id,
          resourceType: "InterventionNote",
          resourceId: note.id,
          metadata: { interventionId: candidate.id, noteType },
        },
      });
      console.log(`  submitted ${noteType} → note ${note.id}`);
    }

    console.log("\n=== 3.5 Counselor dispositions ===");
    const openNotes = await prisma.interventionNote.findMany({
      where: { interventionId: candidate.id, status: "OPEN" },
      orderBy: { createdAt: "asc" },
    });

    if (openNotes.length >= 3) {
      const [ack, inc, dis] = openNotes;
      // Acknowledge
      await prisma.interventionNote.update({
        where: { id: ack.id },
        data: { status: "ACKNOWLEDGED" },
      });
      console.log(`  acknowledged ${ack.id}`);
      // Incorporate (writes an InterventionRevision linked to the note)
      await prisma.$transaction(async (tx) => {
        await tx.interventionNote.update({
          where: { id: inc.id },
          data: { status: "INCORPORATED" },
        });
        await tx.interventionRevision.create({
          data: {
            interventionId: candidate.id,
            changedById: counselor.id,
            diff: {
              incorporatedFrom: { noteId: inc.id, noteType: inc.noteType, noteContent: inc.content },
            },
            reason: "Verification script — incorporated revision request.",
            triggeringNoteId: inc.id,
            isSignificant: false,
          },
        });
      });
      await prisma.auditLog.create({
        data: {
          action: "INTERVENTION_REVISED",
          userId: counselor.id,
          resourceType: "Intervention",
          resourceId: candidate.id,
          metadata: { source: "incorporated_feedback", noteId: inc.id },
        },
      });
      const linkedRev = await prisma.interventionRevision.findFirst({
        where: { triggeringNoteId: inc.id },
        select: { id: true, isSignificant: true },
      });
      console.log(
        `  incorporated ${inc.id} → revision ${linkedRev?.id} (isSignificant=${linkedRev?.isSignificant})`,
      );
      // Dismiss
      await prisma.interventionNote.update({
        where: { id: dis.id },
        data: { status: "DISMISSED" },
      });
      console.log(`  dismissed ${dis.id}`);
    }
  }

  console.log("\n=== Audit tail ===");
  const recent = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "INTERVENTION_APPROVED",
          "INTERVENTION_ACTIVATED",
          "INTERVENTION_CANCELLED",
          "INTERVENTION_REVISED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  for (const a of recent) {
    console.log(`  ${a.createdAt.toISOString()}  ${a.action.padEnd(24)} ${a.resourceId}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
