-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('ACADEMIC_SUPPORT', 'COUNSELING_SESSION', 'IMMEDIATE_COUNSELING', 'POSITIVE_REINFORCEMENT', 'CASE_REVIEW', 'SECTION_INTERVENTION', 'SUBJECT_REMEDIATION', 'ATTENDANCE_PROGRAM');

-- CreateEnum
CREATE TYPE "InterventionNoteType" AS ENUM ('OBSERVATION', 'REVISION_REQUEST', 'OUTCOME_OBSERVATION');

-- CreateEnum
CREATE TYPE "InterventionNoteStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'INCORPORATED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ParticipationOutcome" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COUNSELING_NOTE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COUNSELING_NOTE_READ';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVENTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVENTION_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVENTION_CANCELLED';

-- CreateTable
CREATE TABLE "CounselingNote" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "scope" "PatternScope" NOT NULL,
    "scopeTargetId" TEXT NOT NULL,
    "type" "InterventionType" NOT NULL,
    "status" "InterventionStatus" NOT NULL DEFAULT 'DRAFT',
    "schoolYearId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "schedule" TEXT,
    "accommodations" TEXT,
    "staffActions" TEXT,
    "targetOutcomes" TEXT,
    "triggeringRecommendationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionSensitive" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "counselingContext" TEXT,

    CONSTRAINT "InterventionSensitive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionParticipation" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "outcome" "ParticipationOutcome",

    CONSTRAINT "InterventionParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionNote" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "noteType" "InterventionNoteType" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "InterventionNoteStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionRevision" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "diff" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "triggeringNoteId" TEXT,
    "isSignificant" BOOLEAN NOT NULL DEFAULT false,
    "isInterim" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CounselingNote_enrollmentId_idx" ON "CounselingNote"("enrollmentId");

-- CreateIndex
CREATE INDEX "CounselingNote_authorId_idx" ON "CounselingNote"("authorId");

-- CreateIndex
CREATE INDEX "Intervention_scope_scopeTargetId_idx" ON "Intervention"("scope", "scopeTargetId");

-- CreateIndex
CREATE INDEX "Intervention_schoolYearId_status_idx" ON "Intervention"("schoolYearId", "status");

-- CreateIndex
CREATE INDEX "Intervention_ownerId_idx" ON "Intervention"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionSensitive_interventionId_key" ON "InterventionSensitive"("interventionId");

-- CreateIndex
CREATE INDEX "InterventionParticipation_enrollmentId_idx" ON "InterventionParticipation"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionParticipation_interventionId_enrollmentId_key" ON "InterventionParticipation"("interventionId", "enrollmentId");

-- CreateIndex
CREATE INDEX "InterventionNote_interventionId_status_idx" ON "InterventionNote"("interventionId", "status");

-- CreateIndex
CREATE INDEX "InterventionNote_authorId_idx" ON "InterventionNote"("authorId");

-- CreateIndex
CREATE INDEX "InterventionRevision_interventionId_createdAt_idx" ON "InterventionRevision"("interventionId", "createdAt");

-- AddForeignKey
ALTER TABLE "CounselingNote" ADD CONSTRAINT "CounselingNote_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselingNote" ADD CONSTRAINT "CounselingNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_triggeringRecommendationId_fkey" FOREIGN KEY ("triggeringRecommendationId") REFERENCES "RecommendationDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionSensitive" ADD CONSTRAINT "InterventionSensitive_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionParticipation" ADD CONSTRAINT "InterventionParticipation_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionParticipation" ADD CONSTRAINT "InterventionParticipation_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionNote" ADD CONSTRAINT "InterventionNote_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionNote" ADD CONSTRAINT "InterventionNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionRevision" ADD CONSTRAINT "InterventionRevision_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionRevision" ADD CONSTRAINT "InterventionRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionRevision" ADD CONSTRAINT "InterventionRevision_triggeringNoteId_fkey" FOREIGN KEY ("triggeringNoteId") REFERENCES "InterventionNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
