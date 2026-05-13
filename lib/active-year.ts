import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { SchoolYear } from "@prisma/client";

const COOKIE = "aem_active_year";

export async function getAllSchoolYears(): Promise<SchoolYear[]> {
  return prisma.schoolYear.findMany({
    orderBy: { startDate: "desc" },
  });
}

/**
 * Returns the school year currently in view for this user.
 * Resolution order:
 *  1. Cookie-selected year (if it still exists)
 *  2. The row flagged `isActive`
 *  3. Most recent by startDate
 * Returns `null` if no school years exist yet.
 */
export async function getActiveSchoolYear(): Promise<SchoolYear | null> {
  const jar = await cookies();
  const cookieValue = jar.get(COOKIE)?.value;

  if (cookieValue) {
    const fromCookie = await prisma.schoolYear.findUnique({
      where: { id: cookieValue },
    });
    if (fromCookie) return fromCookie;
  }

  const flagged = await prisma.schoolYear.findFirst({
    where: { isActive: true },
  });
  if (flagged) return flagged;

  return prisma.schoolYear.findFirst({
    orderBy: { startDate: "desc" },
  });
}

export async function setActiveSchoolYearCookie(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function isCurrentYear(year: SchoolYear): boolean {
  return year.isActive;
}
