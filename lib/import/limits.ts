// Resource caps for the CSV import pipeline. Admin-only endpoints, but
// uncapped uploads are still a DOS surface (memory, parsing time, lock
// contention on the long transactions). These are deliberately generous
// for the spec's expected volumes (~240 students × 4 quarters × 5 subjects
// = ~4,800 rows per grade import; ~240 × 180 school days = ~43k attendance
// rows per year — split monthly per the spec's "monthly chunk support").
//
// Adjust if real-world imports outgrow these — but bump intentionally
// rather than letting an unbounded upload reach Prisma.

export const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CSV_ROWS = 10_000;

export type CsvLimitFailure = {
  ok: false;
  error: string;
};

// Returns null on success; otherwise the formatted error message to surface
// to the admin UI.
export function checkCsvLimits(csv: string): CsvLimitFailure | null {
  // Byte length on the raw string; Node strings are UTF-16 internally but
  // utf-8 byte counting via Blob is simplest + accurate.
  const bytes = new Blob([csv]).size;
  if (bytes > MAX_CSV_BYTES) {
    return {
      ok: false,
      error: `CSV exceeds the ${formatBytes(MAX_CSV_BYTES)} upload cap (got ${formatBytes(bytes)}). Split the file into smaller batches and re-upload.`,
    };
  }
  // Cheap row count = newline count + 1 (header). Slightly inaccurate for
  // quoted fields with embedded newlines but fine as a guard.
  const newlines = (csv.match(/\n/g) ?? []).length;
  if (newlines > MAX_CSV_ROWS) {
    return {
      ok: false,
      error: `CSV exceeds the ${MAX_CSV_ROWS.toLocaleString()}-row cap (got ~${newlines.toLocaleString()}). Split into smaller batches per the spec's monthly-chunk guidance.`,
    };
  }
  return null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
