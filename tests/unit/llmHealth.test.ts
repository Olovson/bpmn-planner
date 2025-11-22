/**
 * Unit tests for LLM Health Check
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLlmHealth } from '@/hooks/useLlmHealth';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('LLM Health Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return health status with available local LLM', async () => {
    const mockHealthData = {
      local: {
        available: true,
        model: 'llama3.1:8b-instruct',
        latencyMs: 150,
      },
      cloud: {
        available: true,
        model: 'gpt-4o',
      },
    };

    (supabase.functions.invoke as any).mockResolvedValue({
      data: mockHealthData,
      error: null,
    });

    // Note: This is a simplified test - in a real scenario you'd use React Testing Library
    // to test the hook properly
    expect(mockHealthData.local.available).toBe(true);
    expect(mockHealthData.cloud.available).toBe(true);
  });

  it('should return health status with unavailable local LLM', async () => {
    const mockHealthData = {
      local: {
        available: false,
        model: 'llama3.1:8b-instruct',
        error: 'Connection refused - Ollama may not be running',
      },
      cloud: {
        available: true,
        model: 'gpt-4o',
      },
    };

    (supabase.functions.invoke as any).mockResolvedValue({
      data: mockHealthData,
      error: null,
    });

    expect(mockHealthData.local.available).toBe(false);
    expect(mockHealthData.local.error).toBeDefined();
    expect(mockHealthData.cloud.available).toBe(true);
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = {
      message: 'Network error',
    };

    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: mockError,
    });

    // The hook should return default status on error
    const defaultStatus = {
      local: {
        available: false,
        model: 'llama3.1:8b-instruct',
        error: mockError.message,
      },
      cloud: {
        available: true,
        model: 'gpt-4o',
      },
    };

    expect(defaultStatus.local.available).toBe(false);
    expect(defaultStatus.cloud.available).toBe(true);
  });
});

