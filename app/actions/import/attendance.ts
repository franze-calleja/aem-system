"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import { validateAttendanceCsv, type AttendanceRow } from "@/lib/import/attendance";

export type AttendancePreview =
  | {
      ok: true;
      schoolYearLabel: string;
      total: number;
      validCount: number;
      invalidCount: number;
      previewRows: Array<{ row: number; data: AttendanceRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
    }
  | { ok: false; error: string };

const input = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

async function loadEnrollmentRefs(schoolYearId: string) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { schoolYearId },
    select: { id: true, student: { select: { lrn: true } } },
  });
  const enrollmentByLrn = new Map<string, string>();
  for (const e of enrollments) enrollmentByLrn.set(e.student.lrn, e.id);
  return { enrollmentByLrn };
}

export async function previewAttendanceAction(formData: FormData): Promise<AttendancePreview> {
  await requireRole("ADMIN");
  const parsed = input.safeParse({
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

  const refs = await loadEnrollmentRefs(sy.id);
  const result = validateAttendanceCsv(parsedCsv, refs);

  return {
    ok: true,
    schoolYearLabel: sy.label,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    previewRows: result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data })),
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
  };
}

export type AttendanceCommit =
  | { ok: true; schoolYearLabel: string; upserted: number }
  | { ok: false; error: string };

export async function commitAttendanceAction(formData: FormData): Promise<AttendanceCommit> {
  const session = await requireRole("ADMIN");

  const parsed = input.safeParse({
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

  const refs = await loadEnrollmentRefs(sy.id);
  const result = validateAttendanceCsv(parsedCsv, refs);
  if (result.invalid.length > 0) {
    return { ok: false, error: `${result.invalid.length} row(s) have errors. Fix them and re-upload before committing.` };
  }
  if (result.valid.length === 0) return { ok: false, error: "No valid rows to import." };

  await prisma.$transaction(async (tx) => {
    for (const v of result.valid) {
      await tx.attendance.upsert({
        where: {
          enrollmentId_date: { enrollmentId: v.data.enrollmentId, date: v.data.date },
        },
        update: {
          status: v.data.status,
          notes: v.data.notes,
          recordedById: session.user.id,
        },
        create: {
          enrollmentId: v.data.enrollmentId,
          date: v.data.date,
          status: v.data.status,
          notes: v.data.notes,
          recordedById: session.user.id,
        },
      });
    }
  });

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "Attendance",
    resourceId: sy.id,
    metadata: { schoolYearLabel: sy.label, totalRows: result.total, attendanceUpserted: result.valid.length },
  });

  return { ok: true, schoolYearLabel: sy.label, upserted: result.valid.length };
}
