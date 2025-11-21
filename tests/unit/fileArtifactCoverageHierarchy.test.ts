import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasHierarchicalTestsForFile, getHierarchicalTestFileName } from '@/hooks/useFileArtifactCoverage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => {
  const listMock = vi.fn();
  const fromMock = vi.fn(() => ({ list: listMock }));

  return {
    supabase: {
      storage: {
        from: fromMock,
      },
      __mocks: {
        listMock,
        fromMock,
      },
    },
  };
});

type SupabaseMock = typeof supabase & {
  __mocks: {
    listMock: ReturnType<typeof vi.fn>;
    fromMock: ReturnType<typeof vi.fn>;
  };
};

const getSupabaseMock = () => supabase as unknown as SupabaseMock;

describe('hierarchical test coverage helpers', () => {

  beforeEach(() => {
    const supabaseMock = getSupabaseMock();
    supabaseMock.__mocks.listMock.mockReset();
    supabaseMock.__mocks.fromMock.mockReset();
    supabaseMock.__mocks.fromMock.mockReturnValue({
      list: supabaseMock.__mocks.listMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds hierarchical test file name from BPMN file', () => {
    expect(getHierarchicalTestFileName('mortgage.bpmn')).toBe('mortgage.hierarchical.spec.ts');
    expect(getHierarchicalTestFileName('subprocessC.bpmn')).toBe('subprocessC.hierarchical.spec.ts');
  });

  it('returns true when hierarchical test file exists in storage', async () => {
    const supabaseMock = getSupabaseMock();
    supabaseMock.__mocks.listMock.mockResolvedValue({
      data: [{ name: 'mortgage.hierarchical.spec.ts' }],
      error: null,
    });

    const hasHierarchy = await hasHierarchicalTestsForFile('mortgage.bpmn');

    expect(supabaseMock.__mocks.fromMock).toHaveBeenCalledWith('bpmn-files');
    expect(supabaseMock.__mocks.listMock).toHaveBeenCalledWith('tests', expect.objectContaining({
      search: 'mortgage.hierarchical.spec.ts',
    }));
    expect(hasHierarchy).toBe(true);
  });

  it('returns false when no hierarchical test file exists', async () => {
    const supabaseMock = getSupabaseMock();
    supabaseMock.__mocks.listMock.mockResolvedValue({
      data: [],
      error: null,
    });

    const hasHierarchy = await hasHierarchicalTestsForFile('mortgage.bpmn');

    expect(hasHierarchy).toBe(false);
  });

  it('returns false and logs when storage errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabaseMock = getSupabaseMock();
    supabaseMock.__mocks.listMock.mockResolvedValue({
      data: null,
      error: new Error('storage error'),
    });

    const hasHierarchy = await hasHierarchicalTestsForFile('mortgage.bpmn');

    expect(hasHierarchy).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
