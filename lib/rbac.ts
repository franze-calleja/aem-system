import type { Prisma, Role } from "@prisma/client";

type Caller = { userId: string; role: Role };

/**
 * Returns a Prisma `where` fragment that restricts Student rows to those a
 * caller is allowed to see, *for the given school year*.
 *
 * - ADMIN / COUNSELOR / PRINCIPAL: unrestricted (returns empty fragment).
 * - TEACHER: only students enrolled in a section the teacher is assigned to
 *   (either as a subject teacher OR as the section adviser) in `schoolYearId`.
 *
 * Compose into queries:
 *   await prisma.student.findMany({
 *     where: { ...studentVisibilityFilter(caller, sy.id), AND: [...] }
 *   });
 */
export function studentVisibilityFilter(
  caller: Caller,
  schoolYearId: string,
): Prisma.StudentWhereInput {
  if (caller.role !== "TEACHER") return {};

  return {
    enrollments: {
      some: {
        schoolYearId,
        section: {
          teacherAssignments: {
            some: {
              userId: caller.userId,
              schoolYearId,
            },
          },
        },
      },
    },
  };
}

/**
 * Same idea for Enrollment-scoped tables (Grade, Attendance, BehavioralRecord).
 * Returns a fragment that restricts the `enrollment` relation.
 */
export function enrollmentVisibilityFilter(
  caller: Caller,
  schoolYearId: string,
): Prisma.StudentEnrollmentWhereInput {
  if (caller.role !== "TEACHER") return { schoolYearId };

  return {
    schoolYearId,
    section: {
      teacherAssignments: {
        some: {
          userId: caller.userId,
          schoolYearId,
        },
      },
    },
  };
}

/**
 * Whether the caller may read counseling notes / sensitive intervention fields.
 * Currently the same set across the system; centralized here so future tweaks
 * (e.g. principal one-off override) have a single place to change.
 */
export function canReadCounselingContent(role: Role): boolean {
  return role === "COUNSELOR" || role === "PRINCIPAL";
}
