import { describe, it, expect, vi } from 'vitest';
import {
  checkColumnExists,
  verifySchema,
  isPGRST204Error,
  getSchemaErrorMessage,
  REQUIRED_SCHEMA_COLUMNS,
} from '@/lib/schemaVerification';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('schemaVerification', () => {
  describe('checkColumnExists', () => {
    it('should return exists: true when column exists', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({ error: null })),
          })),
        })),
      } as unknown as SupabaseClient;

      const result = await checkColumnExists(mockSupabase, 'test_table', 'test_column');

      expect(result.exists).toBe(true);
      expect(result.table).toBe('test_table');
      expect(result.column).toBe('test_column');
      expect(result.error).toBeUndefined();
    });

    it('should return exists: false with PGRST204 error when column is missing from cache', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({
              error: {
                code: 'PGRST204',
                message: "Could not find the 'mode' column of 'node_test_links' in the schema cache",
              },
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const result = await checkColumnExists(mockSupabase, 'node_test_links', 'mode');

      expect(result.exists).toBe(false);
      expect(result.error?.code).toBe('PGRST204');
      expect(result.error?.message).toContain('PostgREST schema cache is outdated');
    });

    it('should return exists: false with generic error for other errors', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({
              error: {
                code: '42P01',
                message: 'relation "nonexistent" does not exist',
              },
            })),
          })),
        })),
      } as unknown as SupabaseClient;

      const result = await checkColumnExists(mockSupabase, 'nonexistent', 'column');

      expect(result.exists).toBe(false);
      expect(result.error?.code).toBe('42P01');
    });

    it('should handle exceptions gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => {
          throw new Error('Network error');
        }),
      } as unknown as SupabaseClient;

      const result = await checkColumnExists(mockSupabase, 'test_table', 'test_column');

      expect(result.exists).toBe(false);
      expect(result.error?.code).toBe('EXCEPTION');
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('verifySchema', () => {
    it('should return allPassed: true when all columns exist', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({ error: null })),
          })),
        })),
      } as unknown as SupabaseClient;

      const result = await verifySchema(mockSupabase);

      expect(result.allPassed).toBe(true);
      expect(result.checks).toHaveLength(REQUIRED_SCHEMA_COLUMNS.length);
      expect(result.checks.every((check) => check.exists)).toBe(true);
    });

    it('should return allPassed: false when any column is missing', async () => {
      let callCount = 0;
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => {
              callCount++;
              // First check passes, second fails
              if (callCount === 1) {
                return { error: null };
              }
              return {
                error: {
                  code: 'PGRST204',
                  message: "Could not find the 'mode' column of 'node_test_links' in the schema cache",
                },
              };
            }),
          })),
        })),
      } as unknown as SupabaseClient;

      const result = await verifySchema(mockSupabase);

      expect(result.allPassed).toBe(false);
      expect(result.checks.some((check) => !check.exists)).toBe(true);
    });

    it('should check custom required columns when provided', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({ error: null })),
          })),
        })),
      } as unknown as SupabaseClient;

      const customColumns = [
        { table: 'custom_table', column: 'custom_column' },
      ];

      const result = await verifySchema(mockSupabase, customColumns);

      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].table).toBe('custom_table');
      expect(result.checks[0].column).toBe('custom_column');
    });
  });

  describe('isPGRST204Error', () => {
    it('should return true for PGRST204 errors with mode column message', () => {
      const error = {
        code: 'PGRST204',
        message: "Could not find the 'mode' column of 'node_test_links' in the schema cache",
      };

      expect(isPGRST204Error(error)).toBe(true);
    });

    it('should return false for other error codes', () => {
      const error = {
        code: '42P01',
        message: 'relation does not exist',
      };

      expect(isPGRST204Error(error)).toBe(false);
    });

    it('should return false for PGRST204 without mode column message', () => {
      const error = {
        code: 'PGRST204',
        message: "Could not find the 'other_column' column",
      };

      expect(isPGRST204Error(error)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isPGRST204Error(null)).toBe(false);
      expect(isPGRST204Error(undefined)).toBe(false);
      expect(isPGRST204Error('string')).toBe(false);
      expect(isPGRST204Error(123)).toBe(false);
    });
  });

  describe('getSchemaErrorMessage', () => {
    it('should return user-friendly message for PGRST204 errors', () => {
      const error = {
        code: 'PGRST204',
        message: "Could not find the 'mode' column",
      };

      const message = getSchemaErrorMessage(error);
      expect(message).toContain('PostgREST schema-cache är utdaterad');
      expect(message).toContain('npm run supabase:reset');
    });

    it('should return error message for other errors', () => {
      const error = {
        code: '42P01',
        message: 'Custom error message',
      };

      const message = getSchemaErrorMessage(error);
      expect(message).toBe('Custom error message');
    });

    it('should return fallback message for unknown errors', () => {
      const message = getSchemaErrorMessage({});
      expect(message).toBe('Okänt schema-fel');
    });
  });
});

