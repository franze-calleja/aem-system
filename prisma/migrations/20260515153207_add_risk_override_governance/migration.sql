-- AlterTable
ALTER TABLE "AlgorithmConfig" ADD COLUMN     "biasThresholds" JSONB NOT NULL DEFAULT '{"highRateMultiplier": 0.5}';

-- CreateTable
CREATE TABLE "RiskOverride" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "overriddenById" TEXT NOT NULL,
    "originalScore" DOUBLE PRECISION NOT NULL,
    "originalBand" "RiskBand" NOT NULL,
    "overrideBand" "RiskBand" NOT NULL,
    "justification" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedById" TEXT,

    CONSTRAINT "RiskOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskOverride_enrollmentId_clearedAt_idx" ON "RiskOverride"("enrollmentId", "clearedAt");

-- CreateIndex
CREATE INDEX "RiskOverride_overriddenById_idx" ON "RiskOverride"("overriddenById");

-- AddForeignKey
ALTER TABLE "RiskOverride" ADD CONSTRAINT "RiskOverride_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskOverride" ADD CONSTRAINT "RiskOverride_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── AuditLog append-only enforcement ───────────────────────────────────────
-- Belt-and-suspenders: even if app-layer code or a malicious script attempts
-- to UPDATE or DELETE an AuditLog row, the DB rejects it. Spec §6.10 calls
-- the audit log append-only; this trigger makes that real.
CREATE OR REPLACE FUNCTION audit_log_prevent_modification() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only — % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_modification();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_modification();
