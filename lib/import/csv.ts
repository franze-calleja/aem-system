import { parse } from "csv-parse/sync";

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Parse CSV text into normalized rows.
 * - Strips BOM.
 * - Trims header names (case-insensitive matching is the caller's job).
 * - Trims every cell.
 * - Empty rows are dropped.
 */
export function parseCsv(text: string): ParsedCsv {
  const cleaned = text.replace(/^﻿/, "");
  const records = parse(cleaned, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records };
}

export type ValidatedRow<T> =
  | { ok: true; row: number; data: T }
  | { ok: false; row: number; errors: string[]; raw: Record<string, string> };

export type ValidationResult<T> = {
  valid: Extract<ValidatedRow<T>, { ok: true }>[];
  invalid: Extract<ValidatedRow<T>, { ok: false }>[];
  total: number;
};

export function summarize<T>(rows: ValidatedRow<T>[]): ValidationResult<T> {
  const valid: Extract<ValidatedRow<T>, { ok: true }>[] = [];
  const invalid: Extract<ValidatedRow<T>, { ok: false }>[] = [];
  for (const r of rows) {
    if (r.ok) valid.push(r);
    else invalid.push(r);
  }
  return { valid, invalid, total: rows.length };
}
