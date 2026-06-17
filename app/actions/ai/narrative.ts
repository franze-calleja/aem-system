"use server";

// AI narrative regenerate + batch pre-warm server actions.
//
// Lazy on-demand generation (the default) lives inside page renders. These
// actions exist for explicit, user-triggered runs:
//   - regenerateRiskNarrativeAction: force a fresh Gemini call for one
//     student's risk narrative. Used by the "Regenerate" button on a
//     student profile when context has changed in ways the prompt template
//     can't see (e.g., counselor just made a manual override).
//   - prewarmCaseloadPageNarrativesAction: ensure narratives exist for the
//     students on a given caseload page. No-op for already-cached rows;
//     calls Gemini for the rest. Used by the "Pre-generate AI for this
//     page" button before a counselor meeting.
//
// Both audit each generated narrative as AI_NARRATIVE_GENERATED.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { generateRiskNarrative } from "@/lib/ai/narrative";
import { getCaseloadWithRiskPaged } from "@/lib/risk/queries";
import { getStudentProfile, getLatestRiskForStudent } from "@/lib/student/queries";
import { PAGE_SIZE } from "@/lib/pagination";

const RegenInput = z.object({
  studentId: z.string().min(1),
  schoolYearId: z.string().min(1),
});

export async function regenerateRiskNarrativeAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole(["COUNSELOR", "PRINCIPAL"]);
  const parsed = RegenInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { studentId, schoolYearId } = parsed.data;

  const [profile, latestRisk] = await Promise.all([
    getStudentProfile(studentId, schoolYearId),
    getLatestRiskForStudent(studentId, schoolYearId),
  ]);
  if (!profile) return { ok: false, error: "Student not found in this year." };
  if (!latestRisk) {
    return {
      ok: false,
      error: "No risk assessment yet for this student. Run the risk engine first.",
    };
  }

  const aiConsentRevoked = profile.consents.some(
    (c) => c.scope === "AI_ANALYSIS" && c.status === "REVOKED",
  );

  const result = await generateRiskNarrative({
    firstName: profile.student.firstName,
    gradeLabel: profile.enrollment.gradeLevel,
    score: latestRisk.score,
    band: latestRisk.band,
    factors: latestRisk.factors,
    consentRevoked: aiConsentRevoked,
    forceRegenerate: true,
  });

  if (!result.ok) {
    // Don't audit "failed to call" — it's a fallback path, not a successful
    // narrative generation. Surface the reason to the caller.
    return { ok: false, error: `AI generation skipped: ${result.reason}` };
  }

  await logAudit({
    action: "AI_NARRATIVE_GENERATED",
    userId: session.user.id,
    resourceType: "Student",
    resourceId: studentId,
    metadata: {
      kind: "RISK_NARRATIVE",
      schoolYearId,
      mode: "regenerate",
      cached: result.cached, // forceRegenerate=true => always false on success
    },
  });

  // Bust the profile route's render cache so the new narrative shows.
  revalidatePath(`/counselor/students/${studentId}`);
  revalidatePath(`/principal/students/${studentId}`);

  return { ok: true };
}

const PrewarmInput = z.object({
  schoolYearId: z.string().min(1),
  page: z.string().optional(),
});

export type PrewarmResult =
  | {
      ok: true;
      generated: number;
      alreadyCached: number;
      skipped: number;
      pageSize: number;
    }
  | { ok: false; error: string };

/**
 * Pre-generate risk narratives for the caseload page the user is currently
 * looking at. Skips students with no risk assessment yet or with AI consent
 * revoked. Respects the cache — only calls Gemini for misses. Cheap when
 * called repeatedly because subsequent runs are all-cache-hits.
 */
export async function prewarmCaseloadPageNarrativesAction(
  formData: FormData,
): Promise<PrewarmResult> {
  const session = await requireRole(["COUNSELOR", "PRINCIPAL"]);
  const parsed = PrewarmInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const { schoolYearId } = parsed.data;
  const page = Math.max(1, Number.parseInt(parsed.data.page ?? "1", 10) || 1);

  const skip = (page - 1) * PAGE_SIZE;
  const { rows } = await getCaseloadWithRiskPaged(schoolYearId, {
    skip,
    take: PAGE_SIZE,
  });

  let generated = 0;
  let alreadyCached = 0;
  let skipped = 0;

  // Sequential to keep Gemini call rate predictable. PAGE_SIZE=15 is small
  // enough that 15 sequential calls finish in a few seconds; parallel would
  // be faster but risk tripping per-minute quotas.
  for (const row of rows) {
    if (!row.riskScore || !row.riskBand) {
      skipped++;
      continue;
    }
    const profile = await getStudentProfile(row.studentId, schoolYearId);
    if (!profile) {
      skipped++;
      continue;
    }
    const aiConsentRevoked = profile.consents.some(
      (c) => c.scope === "AI_ANALYSIS" && c.status === "REVOKED",
    );
    if (aiConsentRevoked) {
      skipped++;
      continue;
    }
    // Need the full factors blob for the prompt.
    const latestRisk = await getLatestRiskForStudent(row.studentId, schoolYearId);
    if (!latestRisk) {
      skipped++;
      continue;
    }

    const result = await generateRiskNarrative({
      firstName: profile.student.firstName,
      gradeLabel: profile.enrollment.gradeLevel,
      score: latestRisk.score,
      band: latestRisk.band,
      factors: latestRisk.factors,
      consentRevoked: false,
    });

    if (!result.ok) {
      skipped++;
      continue;
    }
    if (result.cached) {
      alreadyCached++;
    } else {
      generated++;
      await logAudit({
        action: "AI_NARRATIVE_GENERATED",
        userId: session.user.id,
        resourceType: "Student",
        resourceId: row.studentId,
        metadata: { kind: "RISK_NARRATIVE", schoolYearId, mode: "prewarm-batch", page },
      });
    }
  }

  return {
    ok: true,
    generated,
    alreadyCached,
    skipped,
    pageSize: rows.length,
  };
}
