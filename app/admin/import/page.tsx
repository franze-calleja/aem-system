import { prisma } from "@/lib/prisma";
import ImportWizard from "@/components/roles/admin/import-wizard";
import { getActiveSchoolYear } from "@/lib/active-year";

export default async function ImportPage() {
  const [years, activeYear] = await Promise.all([
    prisma.schoolYear.findMany({ orderBy: { startDate: "desc" } }),
    getActiveSchoolYear(),
  ]);

  return (
    <ImportWizard
      years={years.map((y) => ({ id: y.id, label: y.label, isActive: y.isActive }))}
      defaultYearId={activeYear?.id ?? years[0]?.id ?? null}
    />
  );
}
