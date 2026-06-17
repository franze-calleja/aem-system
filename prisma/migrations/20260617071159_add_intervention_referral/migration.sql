-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReferralUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_DECLINED';

-- CreateTable
CREATE TABLE "InterventionReferral" (
    "id" TEXT NOT NULL,
    "referredById" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "suggestedType" "InterventionType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "urgency" "ReferralUrgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resultingInterventionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterventionReferral_resultingInterventionId_key" ON "InterventionReferral"("resultingInterventionId");

-- CreateIndex
CREATE INDEX "InterventionReferral_schoolYearId_status_idx" ON "InterventionReferral"("schoolYearId", "status");

-- CreateIndex
CREATE INDEX "InterventionReferral_referredById_idx" ON "InterventionReferral"("referredById");

-- CreateIndex
CREATE INDEX "InterventionReferral_studentId_idx" ON "InterventionReferral"("studentId");

-- AddForeignKey
ALTER TABLE "InterventionReferral" ADD CONSTRAINT "InterventionReferral_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionReferral" ADD CONSTRAINT "InterventionReferral_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionReferral" ADD CONSTRAINT "InterventionReferral_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionReferral" ADD CONSTRAINT "InterventionReferral_resultingInterventionId_fkey" FOREIGN KEY ("resultingInterventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;
