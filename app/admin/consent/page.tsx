import { prisma } from "@/lib/prisma";
import ConsentManager from "@/components/roles/admin/consent-manager";
import { ConsentScope } from "@prisma/client";

export default async function AdminConsentPage() {
  const students = await prisma.student.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      lrn: true,
      firstName: true,
      lastName: true,
      consentRecords: {
        select: { scope: true, status: true, revokedAt: true, grantedAt: true, notes: true },
      },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          gradeLevel: true,
          section: { select: { name: true } },
          schoolYear: { select: { label: true } },
        },
      },
    },
  });

  const allScopes = Object.values(ConsentScope);

  return (
    <ConsentManager
      scopes={allScopes}
      students={students.map((s) => {
        const byScope = new Map(s.consentRecords.map((c) => [c.scope, c]));
        const enrollment = s.enrollments[0];
        return {
          id: s.id,
          lrn: s.lrn,
          name: `${s.lastName}, ${s.firstName}`,
          context: enrollment
            ? `${enrollment.gradeLevel} · ${enrollment.section.name} · ${enrollment.schoolYear.label}`
            : "No active enrollment",
          consents: allScopes.map((scope) => {
            const c = byScope.get(scope);
            return {
              scope,
              status: c?.status ?? "GRANTED",
              hasRecord: !!c,
              revokedAt: c?.revokedAt ? c.revokedAt.toISOString() : null,
              grantedAt: c?.grantedAt ? c.grantedAt.toISOString() : null,
              notes: c?.notes ?? null,
            };
          }),
        };
      })}
    />
  );
}
