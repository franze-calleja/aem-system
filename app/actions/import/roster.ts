"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import { validateRosterCsv, type RosterRow } from "@/lib/import/roster";
import { ConsentScope } from "@prisma/client";

export type RosterPreview =
  | {
      ok: true;
      schoolYearId: string;
      schoolYearLabel: string;
      total: number;
      validCount: number;
      invalidCount: number;
      previewRows: Array<{ row: number; data: RosterRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
      validRows: Array<{ row: number; data: RosterRow }>; // full set, used by commit
    }
  | { ok: false; error: string };

const previewInput = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

export async function previewRosterAction(formData: FormData): Promise<RosterPreview> {
  await requireRole("ADMIN");

  const parsed = previewInput.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  const sy = await prisma.schoolYear.findUnique({ where: { id: parsed.data.schoolYearId } });
  if (!sy) return { ok: false, error: "School year not found." };

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const result = validateRosterCsv(parsedCsv);
  const previewRows = result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data }));

  return {
    ok: true,
    schoolYearId: sy.id,
    schoolYearLabel: sy.label,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    previewRows,
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
    validRows: result.valid.map((r) => ({ row: r.row, data: r.data })),
  };
}

export type RosterCommit =
  | { ok: true; created: { students: number; enrollments: number; consents: number; sections: number }; schoolYearLabel: string }
  | { ok: false; error: string };

const commitInput = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

export async function commitRosterAction(formData: FormData): Promise<RosterCommit> {
  const session = await requireRole("ADMIN");

  const input = commitInput.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!input.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(input.data.csv);
  if (limitErr) return limitErr;

  const sy = await prisma.schoolYear.findUnique({ where: { id: input.data.schoolYearId } });
  if (!sy) return { ok: false, error: "School year not found." };

  let parsedCsv;
  try {
    parsedCsv = parseCsv(input.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const validation = validateRosterCsv(parsedCsv);
  if (validation.invalid.length > 0) {
    return {
      ok: false,
      error: `${validation.invalid.length} row(s) have errors. Fix them and re-upload before committing.`,
    };
  }
  if (validation.valid.length === 0) {
    return { ok: false, error: "No valid rows to import." };
  }

  // Group by (gradeLevel, section) to upsert Sections in one pass.
  const sectionKey = (g: string, s: string) => `${g}::${s}`;
  const sectionsNeeded = new Map<string, { gradeLevel: string; name: string }>();
  for (const v of validation.valid) {
    sectionsNeeded.set(sectionKey(v.data.gradeLevel, v.data.section), {
      gradeLevel: v.data.gradeLevel,
      name: v.data.section,
    });
  }

  let createdStudents = 0;
  let createdEnrollments = 0;
  let createdConsents = 0;
  let createdSections = 0;

  // Full success / full rollback.
  await prisma.$transaction(async (tx) => {
    const sectionIdByKey = new Map<string, string>();

    for (const [key, s] of sectionsNeeded) {
      const before = await tx.section.findUnique({
        where: {
          schoolYearId_gradeLevel_name: {
            schoolYearId: sy.id,
            gradeLevel: s.gradeLevel,
            name: s.name,
          },
        },
        select: { id: true },
      });
      const sec = await tx.section.upsert({
        where: {
          schoolYearId_gradeLevel_name: {
            schoolYearId: sy.id,
            gradeLevel: s.gradeLevel,
            name: s.name,
          },
        },
        update: {},
        create: {
          schoolYearId: sy.id,
          gradeLevel: s.gradeLevel,
          name: s.name,
        },
        select: { id: true },
      });
      sectionIdByKey.set(key, sec.id);
      if (!before) createdSections++;
    }

    for (const v of validation.valid) {
      const sectionId = sectionIdByKey.get(sectionKey(v.data.gradeLevel, v.data.section))!;

      const beforeStudent = await tx.student.findUnique({ where: { lrn: v.data.lrn }, select: { id: true } });
      const student = await tx.student.upsert({
        where: { lrn: v.data.lrn },
        update: {
          firstName: v.data.firstName,
          lastName: v.data.lastName,
          middleName: v.data.middleName,
          sex: v.data.sex,
          birthDate: v.data.birthDate,
          spedStatus: v.data.spedStatus,
        },
        create: {
          lrn: v.data.lrn,
          firstName: v.data.firstName,
          lastName: v.data.lastName,
          middleName: v.data.middleName,
          sex: v.data.sex,
          birthDate: v.data.birthDate,
          spedStatus: v.data.spedStatus,
        },
      });
      if (!beforeStudent) createdStudents++;

      const beforeEnrollment = await tx.studentEnrollment.findUnique({
        where: { studentId_schoolYearId: { studentId: student.id, schoolYearId: sy.id } },
        select: { id: true },
      });
      await tx.studentEnrollment.upsert({
        where: { studentId_schoolYearId: { studentId: student.id, schoolYearId: sy.id } },
        update: {
          sectionId,
          gradeLevel: v.data.gradeLevel,
          learningModality: v.data.learningModality,
        },
        create: {
          studentId: student.id,
          schoolYearId: sy.id,
          sectionId,
          gradeLevel: v.data.gradeLevel,
          learningModality: v.data.learningModality,
        },
      });
      if (!beforeEnrollment) createdEnrollments++;

      // Default consents — all three scopes granted on import unless already on file.
      for (const scope of [
        ConsentScope.DATA_PROCESSING,
        ConsentScope.AI_ANALYSIS,
        ConsentScope.INTERVENTION_PLANNING,
      ]) {
        const beforeC = await tx.consentRecord.findUnique({
          where: { studentId_scope: { studentId: student.id, scope } },
          select: { id: true },
        });
        await tx.consentRecord.upsert({
          where: { studentId_scope: { studentId: student.id, scope } },
          update: {},
          create: { studentId: student.id, scope },
        });
        if (!beforeC) createdConsents++;
      }
    }
  });

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "Roster",
    resourceId: sy.id,
    metadata: {
      schoolYearLabel: sy.label,
      totalRows: validation.total,
      studentsCreated: createdStudents,
      enrollmentsCreated: createdEnrollments,
      consentsCreated: createdConsents,
      sectionsCreated: createdSections,
    },
  });

  return {
    ok: true,
    schoolYearLabel: sy.label,
    created: {
      students: createdStudents,
      enrollments: createdEnrollments,
      consents: createdConsents,
      sections: createdSections,
    },
  };
}
