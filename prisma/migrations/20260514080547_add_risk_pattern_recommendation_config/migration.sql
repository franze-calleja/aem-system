-- CreateEnum
CREATE TYPE "RiskBand" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "PatternScope" AS ENUM ('STUDENT', 'SECTION', 'GRADE', 'SCHOOL');

-- CreateEnum
CREATE TYPE "PatternStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'DISMISSED', 'INSTANTIATED');

-- CreateTable
CREATE TABLE "AlgorithmConfig" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "weights" JSONB NOT NULL,
    "thresholds" JSONB NOT NULL,
    "ruleConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "justification" TEXT,

    CONSTRAINT "AlgorithmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "band" "RiskBand" NOT NULL,
    "factors" JSONB NOT NULL,
    "configId" TEXT NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternMatch" (
    "id" TEXT NOT NULL,
    "scope" "PatternScope" NOT NULL,
    "scopeTargetId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PatternStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "PatternMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDraft" (
    "id" TEXT NOT NULL,
    "scope" "PatternScope" NOT NULL,
    "scopeTargetId" TEXT NOT NULL,
    "suggestedType" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "triggeringPatternId" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "schoolYearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlgorithmConfig_version_key" ON "AlgorithmConfig"("version");

-- CreateIndex
CREATE INDEX "AlgorithmConfig_isActive_idx" ON "AlgorithmConfig"("isActive");

-- CreateIndex
CREATE INDEX "RiskAssessment_enrollmentId_computedAt_idx" ON "RiskAssessment"("enrollmentId", "computedAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_schoolYearId_band_idx" ON "RiskAssessment"("schoolYearId", "band");

-- CreateIndex
CREATE INDEX "RiskAssessment_schoolYearId_computedAt_idx" ON "RiskAssessment"("schoolYearId", "computedAt");

-- CreateIndex
CREATE INDEX "PatternMatch_scope_scopeTargetId_idx" ON "PatternMatch"("scope", "scopeTargetId");

-- CreateIndex
CREATE INDEX "PatternMatch_ruleId_idx" ON "PatternMatch"("ruleId");

-- CreateIndex
CREATE INDEX "PatternMatch_schoolYearId_status_idx" ON "PatternMatch"("schoolYearId", "status");

-- CreateIndex
CREATE INDEX "RecommendationDraft_scope_scopeTargetId_idx" ON "RecommendationDraft"("scope", "scopeTargetId");

-- CreateIndex
CREATE INDEX "RecommendationDraft_schoolYearId_status_idx" ON "RecommendationDraft"("schoolYearId", "status");

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AlgorithmConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDraft" ADD CONSTRAINT "RecommendationDraft_triggeringPatternId_fkey" FOREIGN KEY ("triggeringPatternId") REFERENCES "PatternMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
