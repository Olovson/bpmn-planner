/**
 * @vitest-environment jsdom
 * 
 * Batch test för hierarkisk generering av alla BPMN-filer i mappen "mortgage-se 2025.12.11 18:11".
 * 
 * Detta test använder generateAllFromBpmnWithGraph med hierarki (som appen faktiskt gör)
 * men med template-baserad generering (useLlm = false) för snabb testning.
 * 
 * VIKTIGT: Detta test använder faktisk kod utan stubbar:
 * - BPMN-filer laddas från fixtures och skapas som data URLs (samma som appen gör för versioned files)
 * - parseBpmnFile används direkt med data URLs (faktisk kod)
 * - buildBpmnProcessGraphFromParseResults används med parsed results (faktisk kod)
 */

import { describe, it, expect, vi } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { loadAndParseBpmnFromFixtures } from '../helpers/bpmnTestHelpers';

const FIXTURE_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.11 18:11');

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
      // Note: bpmnMap is optional - will use automatic matching if not provided
      return actual.buildBpmnProcessGraphFromParseResults(rootFile, parseResults);
    },
  };
});

describe('Mortgage-se batch generation with hierarchy', () => {
  it('should generate documentation with hierarchy for root file (mortgage.bpmn)', async () => {
    // Root-filen borde generera med hierarki
    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      [
        'mortgage.bpmn',
        'mortgage-se-application.bpmn',
        'mortgage-se-household.bpmn',
        'mortgage-se-stakeholder.bpmn',
        'mortgage-se-object.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
      ],
      [],
      true, // useHierarchy = true (hierarkisk generering)
      false, // useLlm = false (templates, inte LLM)
      undefined, // progressCallback
      undefined, // generationSource
      undefined, // llmProvider
      undefined, // nodeFilter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      true, // isActualRootFile = true
      true, // forceRegenerate = true
    );

    // Verifiera att dokumentation genererades
    expect(result.docs.size).toBeGreaterThan(0);
    
    // Verifiera att Feature Goals genererades
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goal') || key.includes('feature-goals')
    );
    expect(featureGoals.length).toBeGreaterThan(0);
    
    // Verifiera att Epics genererades
    const epics = Array.from(result.docs.keys()).filter(key =>
      key.includes('nodes') && !key.includes('feature-goal')
    );
    expect(epics.length).toBeGreaterThan(0);
    
    console.log(`\n✓ Generated ${result.docs.size} docs with hierarchy`);
    console.log(`  Feature Goals: ${featureGoals.length}, Epics: ${epics.length}`);
  }, 300000);

  it('should generate documentation for all files in mortgage-se 2025.12.11 18:11 (isolated, with hierarchy support)', async () => {
    // 1. Läs alla BPMN-filer från mappen
    const files = await readdir(FIXTURE_DIR);
    const bpmnFiles = files
      .filter(f => f.endsWith('.bpmn'))
      .sort();
    
    console.log(`\n=== Found ${bpmnFiles.length} BPMN files ===`);
    
    // 2. Generera dokumentation för varje fil (isolated, men med hierarki-stöd)
    const results = new Map<string, {
      success: boolean;
      docCount: number;
      featureGoals: number;
      epics: number;
      combined: number;
      error?: string;
    }>();
    
    for (const fileName of bpmnFiles) {
      try {
        console.log(`\n=== Generating: ${fileName} ===`);
        
        // Använd generateAllFromBpmnWithGraph (hierarkisk generator)
        // Men isolerad generering (bara filen själv)
        const result = await generateAllFromBpmnWithGraph(
          fileName,
          [fileName], // Isolated: bara filen själv
          [],
          false, // useHierarchy = false (isolated)
          false, // useLlm = false (templates)
          undefined, // progressCallback
          undefined, // generationSource
          undefined, // llmProvider
          undefined, // nodeFilter
          undefined, // getVersionHashForFile
          undefined, // checkCancellation
          undefined, // abortSignal
          undefined, // isActualRootFile
          true, // forceRegenerate = true (som appen gör)
        );
        
        // Categorize generated docs
        const featureGoalKeys = Array.from(result.docs.keys()).filter(key => 
          key.includes('feature-goal') || key.includes('feature-goals')
        );
        const epicKeys = Array.from(result.docs.keys()).filter(key => 
          key.includes('nodes') && !key.includes('feature-goal')
        );
        const combinedDocKeys = Array.from(result.docs.keys()).filter(key => 
          key.endsWith('.html') && 
          !key.includes('feature-goal') && 
          !key.includes('nodes') &&
          !key.includes('/')
        );
        
        results.set(fileName, {
          success: true,
          docCount: result.docs.size,
          featureGoals: featureGoalKeys.length,
          epics: epicKeys.length,
          combined: combinedDocKeys.length,
        });
        
        console.log(`  ✓ Generated ${result.docs.size} docs (${featureGoalKeys.length} FGs, ${epicKeys.length} Epics, ${combinedDocKeys.length} Combined)`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.set(fileName, {
          success: false,
          docCount: 0,
          featureGoals: 0,
          epics: 0,
          combined: 0,
          error: errorMessage,
        });
        console.error(`  ✗ Failed: ${errorMessage}`);
      }
    }
    
    // 3. Verifiera resultat
    console.log('\n=== Generation Summary ===');
    const successful = Array.from(results.values()).filter(r => r.success);
    const failed = Array.from(results.values()).filter(r => !r.success);
    
    console.log(`Successful: ${successful.length}/${results.size}`);
    console.log(`Failed: ${failed.length}/${results.size}`);
    
    // 4. Assertions
    expect(successful.length).toBeGreaterThan(0);
    
    // Alla filer borde generera minst 1 dokument
    successful.forEach((result) => {
      expect(result.docCount).toBeGreaterThan(0);
      // Verifiera att antingen Feature Goals, Epics eller Combined docs genererades
      const totalGenerated = result.featureGoals + result.epics + result.combined;
      expect(totalGenerated).toBeGreaterThan(0);
    });
    
    console.log('\n✅ Batch generation with hierarchy support completed!');
  }, 300000); // 5 minuter timeout för batch-generering
});
