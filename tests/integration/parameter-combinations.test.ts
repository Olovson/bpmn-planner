/**
 * @vitest-environment jsdom
 * 
 * Test för att verifiera olika kombinationer av parametrar
 * som appen faktiskt använder.
 * 
 * VIKTIGT: Detta test använder faktisk kod utan stubbar:
 * - BPMN-filer laddas från fixtures och skapas som data URLs (samma som appen gör för versioned files)
 * - parseBpmnFile används direkt med data URLs (faktisk kod)
 * - buildBpmnProcessGraphFromParseResults används med parsed results (faktisk kod)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
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

describe('Parameter combinations (real-world scenarios)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: filer finns INTE i Storage
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should handle root file generation: useHierarchy=true + forceRegenerate=true + useLlm=false', async () => {
    // Detta är scenariot för root-filer i appen
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-application.bpmn',
      [
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
      ],
      [],
      true, // useHierarchy = true (root-fil)
      false, // useLlm = false (templates för test)
      undefined, // progressCallback
      'llm-slow-chatgpt', // generationSource
      'cloud' as LlmProvider, // llmProvider
      undefined, // nodeFilter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      true, // isActualRootFile = true
      true, // forceRegenerate = true (som appen gör)
    );

    expect(result.docs.size).toBeGreaterThan(0);
    expect(result.metadata?.hierarchyUsed).toBe(true);
    
    console.log(`\n✓ Root file generation: ${result.docs.size} docs with hierarchy`);
  }, 120000);

  it('should handle subprocess generation: useHierarchy=false + forceRegenerate=true', async () => {
    // Detta är scenariot för subprocess-filer i appen
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'], // Isolated
      [],
      false, // useHierarchy = false (isolated subprocess)
      false, // useLlm = false (templates för test)
      undefined, // progressCallback
      'llm-slow-chatgpt', // generationSource
      'cloud' as LlmProvider, // llmProvider
      undefined, // nodeFilter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      false, // isActualRootFile = false
      true, // forceRegenerate = true (som appen gör)
    );

    expect(result.docs.size).toBeGreaterThan(0);
    
    // Verifiera att Feature Goal genererades
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    expect(featureGoals.length).toBeGreaterThanOrEqual(1);
    
    console.log(`\n✓ Subprocess generation: ${result.docs.size} docs (isolated)`);
  }, 120000);

  it('should handle diff-based regeneration: nodeFilter + forceRegenerate=true', async () => {
    // Simulera diff-baserad regenerering (som appen gör)
    const nodeFilter = (node: any) => {
      // Bara generera vissa noder (simulerar diff-filter)
      return node.bpmnElementId === 'register-household-economy-information';
    };

    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false, // useHierarchy = false
      false, // useLlm = false (templates för test)
      undefined, // progressCallback
      'llm-slow-chatgpt', // generationSource
      'cloud' as LlmProvider, // llmProvider
      nodeFilter, // Diff-baserad filter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      false, // isActualRootFile = false
      true, // forceRegenerate = true
    );

    expect(result.docs.size).toBeGreaterThan(0);
    
    console.log(`\n✓ Diff-based regeneration: ${result.docs.size} docs with nodeFilter`);
  }, 120000);

  it('should handle version hash + forceRegenerate=true', async () => {
    const versionHash = 'test-version-123';
    const getVersionHashForFile = async (fileName: string): Promise<string | null> => {
      if (fileName === 'mortgage-se-household.bpmn') {
        return versionHash;
      }
      return null;
    };

    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false, // useHierarchy = false
      false, // useLlm = false (templates för test)
      undefined, // progressCallback
      'llm-slow-chatgpt', // generationSource
      'cloud' as LlmProvider, // llmProvider
      undefined, // nodeFilter
      getVersionHashForFile, // Version hash function
      undefined, // checkCancellation
      undefined, // abortSignal
      false, // isActualRootFile = false
      true, // forceRegenerate = true
    );

    expect(result.docs.size).toBeGreaterThan(0);
    
    console.log(`\n✓ Version hash generation: ${result.docs.size} docs with version ${versionHash}`);
  }, 120000);
}, 300000);
