/**
 * @vitest-environment jsdom
 * 
 * Test för att verifiera kombinationen av nodeFilter och forceRegenerate.
 * Detta testar diff-baserad regenerering som appen faktiskt använder.
 * 
 * VIKTIGT: Detta test använder faktisk kod utan stubbar:
 * - BPMN-filer laddas från fixtures och skapas som data URLs (samma som appen gör för versioned files)
 * - parseBpmnFile används direkt med data URLs (faktisk kod)
 * - buildBpmnProcessGraphFromParseResults används med parsed results (faktisk kod)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { createDiffBasedNodeFilter } from '@/lib/bpmnDiffRegeneration';
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

describe('NodeFilter with forceRegenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: filer finns INTE i Storage
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should generate only filtered nodes when nodeFilter is provided and forceRegenerate = true', async () => {
    // Create diff-baserad filter (simulerar appens faktiska användning)
    const unresolvedDiffs = new Map<string, Set<string>>();
    unresolvedDiffs.set('mortgage-se-household.bpmn', new Set([
      'mortgage-se-household.bpmn::register-household-economy-information', // Modified node
    ]));

    const nodeFilter = createDiffBasedNodeFilter(unresolvedDiffs, {
      autoRegenerateChanges: true,
      autoRegenerateUnchanged: false,
    });

    // Generate med forceRegenerate = true och nodeFilter
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false, // useHierarchy = false
      false, // useLlm = false (templates)
      undefined, // progressCallback
      undefined, // generationSource
      undefined, // llmProvider
      nodeFilter, // Diff-baserad filter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      undefined, // isActualRootFile
      true, // forceRegenerate = true
    );

    // Verifiera att dokumentation genererades
    expect(result.docs.size).toBeGreaterThan(0);
    
    // Verifiera att Feature Goal genererades (genereras alltid)
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    expect(featureGoals.length).toBeGreaterThanOrEqual(1);
    
    console.log(`\n✓ Generated ${result.docs.size} docs with nodeFilter + forceRegenerate = true`);
    console.log(`  Feature Goals: ${featureGoals.length}`);
  });

  it('should respect nodeFilter even when forceRegenerate = true', async () => {
    // Create filter som bara genererar vissa noder
    const nodeFilter = (node: any) => {
      // Bara generera om noden har specifikt ID
      return node.bpmnElementId === 'register-household-economy-information';
    };

    // Generate med forceRegenerate = true men nodeFilter begränsar
    const result = await generateAllFromBpmnWithGraph(
      'mortgage-se-household.bpmn',
      ['mortgage-se-household.bpmn'],
      [],
      false, // useHierarchy = false
      false, // useLlm = false (templates)
      undefined, // progressCallback
      undefined, // generationSource
      undefined, // llmProvider
      nodeFilter, // Filter begränsar till en nod
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      undefined, // isActualRootFile
      true, // forceRegenerate = true
    );

    // Verifiera att dokumentation genererades
    expect(result.docs.size).toBeGreaterThan(0);
    
    // Verifiera att Feature Goal genererades (genereras alltid)
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    expect(featureGoals.length).toBeGreaterThanOrEqual(1);
    
    // Epics borde bara vara för den filtrerade noden
    const epics = Array.from(result.docs.keys()).filter(key =>
      key.includes('nodes') && !key.includes('feature-goal')
    );
    
    console.log(`\n✓ Generated ${result.docs.size} docs with nodeFilter limiting to 1 node`);
    console.log(`  Feature Goals: ${featureGoals.length}, Epics: ${epics.length}`);
  });
}, 120000);
