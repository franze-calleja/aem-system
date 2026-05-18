// Standardised pagination helpers + URL builder for server-rendered list
// pages. Centralises PAGE_SIZE so it's tunable in one place and lets
// callers stay thin: `skip` and `take` go straight into Prisma, `buildHref`
// preserves all other filter searchParams when changing the page.

export const PAGE_SIZE = 15;

export function parsePageParam(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(v ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export type Pagination = {
  page: number;
  totalPages: number;
  total: number;
  skip: number;
  take: number;
};

export function paginate(total: number, page: number, pageSize = PAGE_SIZE): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(Math.max(1, page), totalPages);
  return {
    page: clamped,
    totalPages,
    total,
    skip: (clamped - 1) * pageSize,
    take: pageSize,
  };
}

// Build a href for the same route preserving every other query param,
// overriding only `page`. Pass the current URLSearchParams (or the keys
// you want to forward) and the target page number.
export function buildPageHref(
  basePath: string,
  currentParams: URLSearchParams | Record<string, string | string[] | undefined>,
  targetPage: number,
): string {
  const next = new URLSearchParams();
  const entries =
    currentParams instanceof URLSearchParams
      ? Array.from(currentParams.entries())
      : Object.entries(currentParams).flatMap(([k, v]) =>
          v === undefined ? [] : Array.isArray(v) ? v.map((vv): [string, string] => [k, vv]) : [[k, v] as [string, string]],
        );
  for (const [k, v] of entries) {
    if (k === "page") continue;
    if (v) next.set(k, String(v));
  }
  if (targetPage > 1) next.set("page", String(targetPage));
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
