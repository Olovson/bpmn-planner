/**
 * Schema verification utilities for PostgREST cache validation.
 * 
 * This module provides functions to verify that PostgREST's schema cache
 * is in sync with the actual database schema, particularly for the `mode`
 * column in `node_test_links` and `generation_jobs` tables.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SchemaCheckResult {
  table: string;
  column: string;
  exists: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface SchemaVerificationResult {
  allPassed: boolean;
  checks: SchemaCheckResult[];
}

/**
 * Required columns that must exist in the schema for the app to function correctly.
 */
export const REQUIRED_SCHEMA_COLUMNS = [
  { table: 'generation_jobs', column: 'mode' },
  { table: 'node_test_links', column: 'mode' },
] as const;

/**
 * Checks if a specific column exists in a table by attempting to select it.
 * Returns true if the column exists and can be queried, false otherwise.
 */
export async function checkColumnExists(
  supabase: SupabaseClient,
  table: string,
  column: string
): Promise<SchemaCheckResult> {
  try {
    const { error } = await supabase
      .from(table)
      .select(column)
      .limit(1);

    if (error) {
      const isSchemaCacheError =
        typeof error.code === 'string' &&
        error.code === 'PGRST204' &&
        typeof error.message === 'string' &&
        error.message.includes(`'${column}' column of '${table}'`);

      return {
        table,
        column,
        exists: false,
        error: isSchemaCacheError
          ? {
              code: 'PGRST204',
              message: `PostgREST schema cache is outdated: ${error.message}`,
            }
          : {
              code: error.code || 'UNKNOWN',
              message: error.message || 'Unknown error',
            },
      };
    }

    return {
      table,
      column,
      exists: true,
    };
  } catch (err) {
    return {
      table,
      column,
      exists: false,
      error: {
        code: 'EXCEPTION',
        message: err instanceof Error ? err.message : 'Unknown exception',
      },
    };
  }
}

/**
 * Verifies that all required schema columns exist and are accessible.
 * Returns a result object with details about each check.
 */
export async function verifySchema(
  supabase: SupabaseClient,
  requiredColumns: readonly { table: string; column: string }[] = REQUIRED_SCHEMA_COLUMNS
): Promise<SchemaVerificationResult> {
  const checks = await Promise.all(
    requiredColumns.map(({ table, column }) => checkColumnExists(supabase, table, column))
  );

  const allPassed = checks.every((check) => check.exists);

  return {
    allPassed,
    checks,
  };
}

/**
 * Checks if an error is a PGRST204 schema cache error.
 */
export function isPGRST204Error(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { code?: string; message?: string };
  return (
    typeof err.code === 'string' &&
    err.code === 'PGRST204' &&
    typeof err.message === 'string' &&
    err.message.includes("'mode' column")
  );
}

/**
 * Extracts a user-friendly error message from a schema error.
 */
export function getSchemaErrorMessage(error: unknown): string {
  if (isPGRST204Error(error)) {
    return 'PostgREST schema-cache är utdaterad. Kör "npm run supabase:reset" för att fixa detta.';
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'Okänt schema-fel';
}

