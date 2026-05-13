"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveSchoolYearCookie } from "@/lib/active-year";
import { logAudit } from "@/lib/audit";

export async function switchSchoolYearAction(schoolYearId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const year = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
  });
  if (!year) return { ok: false, error: "School year not found" };

  await setActiveSchoolYearCookie(year.id);
  await logAudit({
    action: "YEAR_SWITCHED",
    userId: session.user.id,
    resourceType: "SchoolYear",
    resourceId: year.id,
    metadata: { label: year.label },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
