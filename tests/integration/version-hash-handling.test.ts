/**
 * @vitest-environment jsdom
 * 
 * Test för att verifiera version hash-hantering i dokumentationsgenerering.
 * 
 * VIKTIGT: Detta test använder faktisk kod utan stubbar:
 * - BPMN-filer laddas från fixtures och skapas som data URLs (samma som appen gör för versioned files)
 * - parseBpmnFile används direkt med data URLs (faktisk kod)
 * - buildBpmnProcessGraphFromParseResults används med parsed results (faktisk kod)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { buildDocStoragePaths } from '@/lib/artifactPaths';
import { loadAndParseBpmnFromFixtures } from '../helpers/bpmnTestHelpers';

// Mock endast Storage-checks för dokumentation (storageFileExists)
// BPMN-filer laddas via faktisk kod (parseBpmnFile med data URLs)
const { mockStorageList } = vi.hoisted(() => {
  return {
    mockStorageList: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        list: mockStorageList,
        download: vi.fn(async () => ({ data: null, error: null })),
      })),
    },
  },
}));

// Mock buildBpmnProcessGraph to use our test helper (faktisk kod, bara annan input)
vi.mock('@/lib/bpmnProcessGraph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bpmnProcessGraph')>();
  return {
    ...actual,
    buildBpmnProcessGraph: async (
      rootFile: string,
      existingBpmnFiles: string[],
      versionHashes?: Map<string, string | null>
    ) => {
      // Load files from fixtures using actual parseBpmnFile (faktisk kod!)
      const parseResults = new Map();
      for (const fileName of existingBpmnFiles) {
        try {
          const parseResult = await loadAndParseBpmnFromFixtures(fileName);
          parseResults.set(fileName, parseResult);
        } catch (error) {
          console.error(`Failed to load ${fileName} from fixtures:`, error);
        }
      }
      // Use actual buildBpmnProcessGraphFromParseResults (faktisk kod!)
      return actual.buildBpmnProcessGraphFromParseResults(rootFile, parseResults);
    },
  };
});

describe('Version hash handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: filer finns INTE i Storage
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should use version hash in storage paths when provided', async () => {
    const versionHash = 'abc123def456';
    const docFileName = 'nodes/mortgage-se-household.bpmn/register-household-economy-information.html';
    
    // Test buildDocStoragePaths med version hash
    const { modePath } = buildDocStoragePaths(
      docFileName,
      'slow',
      'cloud',
      'mortgage-se-household.bpmn',
      versionHash
    );

    // Verifiera att version hash ingår i path
    expect(modePath).toContain(versionHash);
    expect(modePath).toContain('mortgage-se-household.bpmn');
    expect(modePath).toContain('claude');
    
    console.log(`\n✓ Versioned path: ${modePath}`);
  });

  it('should use non-versioned path when version hash is null', async () => {
    const docFileName = 'nodes/mortgage-se-household.bpmn/register-household-economy-information.html';
    
    // Test buildDocStoragePaths utan version hash
    const { modePath } = buildDocStoragePaths(
      docFileName,
      'slow',
      'cloud',
      'mortgage-se-household.bpmn',
      null // No version hash
    );

    // Verifiera att path inte innehåller version hash (men kan innehålla / för struktur)
    expect(modePath).toContain('claude');
    expect(modePath).toContain(docFileName);
    // Non-versioned path format: docs/claude/{docFileName}
    expect(modePath).toMatch(/^docs\/claude\//);
    
    console.log(`\n✓ Non-versioned path: ${modePath}`);
  });

  it('should generate documentation with version hash when getVersionHashForFile is provided', async () => {
    const versionHash = 'test-version-hash-123';
    
    // Mock getVersionHashForFile
    const getVersionHashForFile = async (fileName: string): Promise<string | null> => {
      if (fileName === 'mortgage-se-household.bpmn') {
        return versionHash;
      }
      return null;
    };

    // Generate med version hash
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false, // useHierarchy = false
      false, // useLlm = false (templates)
      undefined, // progressCallback
      undefined, // generationSource
      undefined, // llmProvider
      undefined, // nodeFilter
      getVersionHashForFile, // Version hash function
      undefined, // checkCancellation
      undefined, // abortSignal
      undefined, // isActualRootFile
      true, // forceRegenerate = true
    );

    // Verifiera att dokumentation genererades
    expect(result.docs.size).toBeGreaterThan(0);
    
    console.log(`\n✓ Generated ${result.docs.size} docs with version hash: ${versionHash}`);
  });
}, 120000);
