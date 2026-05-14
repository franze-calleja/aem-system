"use server";

import { z } from "zod";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const ConfigSchema = z.object({
  justification: z.string().min(10, "Justification must be at least 10 characters."),
  weightAcademic: z.coerce.number().min(0).max(100),
  weightAttendance: z.coerce.number().min(0).max(100),
  weightBehavioral: z.coerce.number().min(0).max(100),
  weightInterventionHistory: z.coerce.number().min(0).max(100),
  weightProfile: z.coerce.number().min(0).max(100),
  thresholdModerate: z.coerce.number().min(1).max(99),
  thresholdHigh: z.coerce.number().min(1).max(99),
  // Rule toggles — presence = enabled
  ruleAcademicDeclineCluster: z.coerce.boolean().optional(),
  ruleDisengagementSignal: z.coerce.boolean().optional(),
  ruleCrisisWarning: z.coerce.boolean().optional(),
  ruleRecoveryTracking: z.coerce.boolean().optional(),
  ruleChronicConcern: z.coerce.boolean().optional(),
  ruleConcentratedRisk: z.coerce.boolean().optional(),
  ruleSubjectStruggle: z.coerce.boolean().optional(),
  ruleAttendanceErosion: z.coerce.boolean().optional(),
});

export type SaveConfigResult = { ok: true; version: number } | { ok: false; error: string };

export async function saveAlgorithmConfigAction(formData: FormData): Promise<SaveConfigResult> {
  const session = await requireRole(["ADMIN"]);

  const raw = {
    justification: formData.get("justification"),
    weightAcademic: formData.get("weightAcademic"),
    weightAttendance: formData.get("weightAttendance"),
    weightBehavioral: formData.get("weightBehavioral"),
    weightInterventionHistory: formData.get("weightInterventionHistory"),
    weightProfile: formData.get("weightProfile"),
    thresholdModerate: formData.get("thresholdModerate"),
    thresholdHigh: formData.get("thresholdHigh"),
    ruleAcademicDeclineCluster: formData.get("ruleAcademicDeclineCluster") === "on",
    ruleDisengagementSignal: formData.get("ruleDisengagementSignal") === "on",
    ruleCrisisWarning: formData.get("ruleCrisisWarning") === "on",
    ruleRecoveryTracking: formData.get("ruleRecoveryTracking") === "on",
    ruleChronicConcern: formData.get("ruleChronicConcern") === "on",
    ruleConcentratedRisk: formData.get("ruleConcentratedRisk") === "on",
    ruleSubjectStruggle: formData.get("ruleSubjectStruggle") === "on",
    ruleAttendanceErosion: formData.get("ruleAttendanceErosion") === "on",
  };

  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const d = parsed.data;

  // Validate thresholds are ordered correctly.
  if (d.thresholdModerate >= d.thresholdHigh) {
    return { ok: false, error: "Moderate threshold must be lower than High threshold." };
  }

  // Get the current max version.
  const latest = await prisma.algorithmConfig.findFirst({ orderBy: { version: "desc" } });
  const nextVersion = (latest?.version ?? 0) + 1;

  const weights = {
    academic: d.weightAcademic / 100,
    attendance: d.weightAttendance / 100,
    behavioral: d.weightBehavioral / 100,
    interventionHistory: d.weightInterventionHistory / 100,
    profile: d.weightProfile / 100,
  };

  const thresholds = {
    moderateMin: d.thresholdModerate,
    highMin: d.thresholdHigh,
  };

  const ruleConfig = {
    ACADEMIC_DECLINE_CLUSTER: d.ruleAcademicDeclineCluster ?? false,
    DISENGAGEMENT_SIGNAL: d.ruleDisengagementSignal ?? false,
    CRISIS_WARNING: d.ruleCrisisWarning ?? false,
    RECOVERY_TRACKING: d.ruleRecoveryTracking ?? false,
    CHRONIC_CONCERN: d.ruleChronicConcern ?? false,
    CONCENTRATED_RISK: d.ruleConcentratedRisk ?? false,
    SUBJECT_STRUGGLE: d.ruleSubjectStruggle ?? false,
    ATTENDANCE_EROSION: d.ruleAttendanceErosion ?? false,
  };

  // Transaction: deactivate all, create new active version.
  const [, newConfig] = await prisma.$transaction([
    prisma.algorithmConfig.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.algorithmConfig.create({
      data: {
        version: nextVersion,
        weights,
        thresholds,
        ruleConfig,
        isActive: true,
        changedById: session.user.id,
        changedAt: new Date(),
        justification: d.justification,
      },
    }),
  ]);

  await logAudit({
    action: "ALGORITHM_CONFIG_CHANGED",
    userId: session.user.id,
    resourceType: "AlgorithmConfig",
    resourceId: newConfig.id,
    metadata: { version: nextVersion, justification: d.justification },
  });

  return { ok: true, version: nextVersion };
}
