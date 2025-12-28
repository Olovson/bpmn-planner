/**
 * @vitest-environment jsdom
 * 
 * Test för att validera batch-generering med alla filer från mortgage-se 2025.11.29.
 * 
 * Detta test validerar:
 * 1. Progress-räkning inkluderar file-level docs
 * 2. Root Process Feature Goal genereras korrekt
 * 3. isRootFileGeneration = true när alla filer genereras
 * 4. analyzedFiles innehåller alla filer (inte bara root-filen)
 * 5. File-level docs genereras för alla filer
 * 6. Ingen dubbel generering (bara en Root Process Feature Goal)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { loadAndParseBpmnFromFixtures } from '../helpers/bpmnTestHelpers';

const FIXTURE_DIR = resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.11.29');

// Mock Storage
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

// Mock bpmn-map.json loader - will be set per test
const { mockBpmnMapResult } = vi.hoisted(() => {
  return {
    mockBpmnMapResult: {
      valid: true,
      map: {
        orchestration: {
          root_process: 'mortgage',
        },
        processes: [],
      },
      source: 'storage' as const,
    },
  };
});

vi.mock('@/lib/bpmn/bpmnMapStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bpmn/bpmnMapStorage')>();
  return {
    ...actual,
    loadBpmnMapFromStorage: async () => {
      return mockBpmnMapResult;
    },
  };
});

// Mock buildBpmnProcessGraph to use our test helper
vi.mock('@/lib/bpmnProcessGraph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bpmnProcessGraph')>();
  return {
    ...actual,
    buildBpmnProcessGraph: async (
      rootFile: string,
      existingBpmnFiles: string[],
      versionHashes?: Map<string, string | null>
    ) => {
      const parseResults = new Map();
      for (const fileName of existingBpmnFiles) {
        try {
          const parseResult = await loadAndParseBpmnFromFixtures(fileName);
          parseResults.set(fileName, parseResult);
        } catch (error) {
          console.error(`Failed to load ${fileName} from fixtures:`, error);
        }
      }
      return actual.buildBpmnProcessGraphFromParseResults(rootFile, parseResults);
    },
  };
});

describe('Batch Generation Validation (mortgage-se 2025.11.29)', () => {
  let bpmnFiles: string[];
  let rootFile: string;

  beforeEach(async () => {
    // Reset mock bpmn-map result to valid
    mockBpmnMapResult.valid = true;
    mockBpmnMapResult.map = {
      orchestration: {
        root_process: 'mortgage',
      },
      processes: [],
    };
    mockBpmnMapResult.source = 'storage';

    // Load all BPMN files from fixture directory
    try {
      const files = await readdir(FIXTURE_DIR);
      bpmnFiles = files
        .filter(f => f.endsWith('.bpmn'))
        .sort();
    } catch (error) {
      // If fixture directory doesn't exist, skip test
      console.warn(`Fixture directory ${FIXTURE_DIR} not found, skipping test`);
      bpmnFiles = [];
    }
    
    rootFile = 'mortgage.bpmn';
    
    if (bpmnFiles.length === 0 || !bpmnFiles.includes(rootFile)) {
      // Skip test if fixtures not available
      return;
    }
    
    // Mock storage to return empty (no existing docs)
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should generate for all files when isRootFileGeneration = true', async () => {
    // Skip if fixtures not available
    if (bpmnFiles.length === 0 || !bpmnFiles.includes(rootFile)) {
      console.log('Skipping test: fixtures not available');
      return;
    }
    // Track progress to verify file-level docs are counted
    const progressCalls: Array<{ phase: string; detail?: string }> = [];
    const progressCallback = async (phase: string, label: string, detail?: string) => {
      if (phase === 'total:init' && detail) {
        progressCalls.push({ phase, detail });
      }
    };

    const result = await generateAllFromBpmnWithGraph(
      rootFile,
      bpmnFiles, // All 19 files
      [],
      true, // useHierarchy = true
      false, // useLlm = false (templates)
      progressCallback,
      'test',
      undefined,
      undefined, // nodeFilter
      undefined, // getVersionHashForFile
      undefined, // checkCancellation
      undefined, // abortSignal
      true, // isActualRootFile = true
      true, // forceRegenerate = true
    );

    // Verify total:init was called with correct counts
    expect(progressCalls.length).toBeGreaterThan(0);
    const totalInit = progressCalls.find(c => c.phase === 'total:init');
    expect(totalInit).toBeDefined();
    
    if (totalInit?.detail) {
      const parsed = JSON.parse(totalInit.detail);
      expect(parsed.files).toBe(bpmnFiles.length); // 19 files
      expect(parsed.nodes).toBeGreaterThan(0);
      
      // Verify that file-level docs are included in node count
      // nodes = epics + callActivities + fileLevelDocsCount
      // fileLevelDocsCount should be analyzedFiles.length
      console.log(`\n📊 Progress counts:`, {
        files: parsed.files,
        nodes: parsed.nodes,
        expectedFileLevelDocs: bpmnFiles.length,
      });
    }

    // Verify documentation was generated
    expect(result.docs.size).toBeGreaterThan(0);
    console.log(`\n✓ Generated ${result.docs.size} docs`);

    // Count different types of docs
    const epics = Array.from(result.docs.keys()).filter(key =>
      key.includes('nodes/') && !key.includes('feature-goal')
    );
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goals/')
    );
    const fileLevelDocs = Array.from(result.docs.keys()).filter(key =>
      key.endsWith('.html') && !key.includes('nodes/') && !key.includes('feature-goals/')
    );

    console.log(`  Epics: ${epics.length}`);
    console.log(`  Feature Goals: ${featureGoals.length}`);
    console.log(`  File-level docs: ${fileLevelDocs.length}`);

    // Verify file-level docs were generated for all files
    expect(fileLevelDocs.length).toBeGreaterThanOrEqual(bpmnFiles.length);
    
    // Verify Root Process Feature Goal was generated
    const rootFeatureGoal = featureGoals.find(key => 
      key === 'feature-goals/mortgage.html' || 
      key.includes('feature-goals/mortgage')
    );
    expect(rootFeatureGoal).toBeDefined();
    console.log(`  Root Process Feature Goal: ${rootFeatureGoal}`);

    // Verify no duplicate Root Process Feature Goals
    const rootFeatureGoals = featureGoals.filter(key => 
      key === 'feature-goals/mortgage.html' || 
      key.includes('feature-goals/mortgage') && !key.includes('-')
    );
    expect(rootFeatureGoals.length).toBe(1); // Should be exactly 1

    // Verify that subprocess files do NOT have Root Process Feature Goals
    const subprocessFeatureGoals = featureGoals.filter(key => {
      // Check if this is a Root Process Feature Goal (not hierarchical)
      const isRootProcessFG = !key.includes('-') && key !== 'feature-goals/mortgage.html';
      if (!isRootProcessFG) return false;
      
      // Check if it matches any subprocess file
      return bpmnFiles.some(file => {
        const baseName = file.replace('.bpmn', '');
        return key.includes(baseName) && file !== rootFile;
      });
    });
    expect(subprocessFeatureGoals.length).toBe(0); // Should be 0 (no Root Process Feature Goals for subprocesses)
    console.log(`  Subprocess Root Process Feature Goals (should be 0): ${subprocessFeatureGoals.length}`);

    // Verify that file-level docs exist for multiple files
    const filesWithFileLevelDocs = new Set<string>();
    for (const docKey of fileLevelDocs) {
      const match = docKey.match(/^([^/]+\.bpmn)\.html$/);
      if (match) {
        filesWithFileLevelDocs.add(match[1]);
      }
    }
    expect(filesWithFileLevelDocs.size).toBeGreaterThan(1); // Should have file-level docs for multiple files
    console.log(`  Files with file-level docs: ${filesWithFileLevelDocs.size}`);
    console.log(`  Files: ${Array.from(filesWithFileLevelDocs).sort().join(', ')}`);

    console.log('\n✅ Batch generation validation test completed!');
  }, 300000); // 5 minutes timeout

  it('should handle case when bpmn-map.json cannot be loaded (fallback logic)', async () => {
    // Skip if fixtures not available
    if (bpmnFiles.length === 0 || !bpmnFiles.includes(rootFile)) {
      console.log('Skipping test: fixtures not available');
      return;
    }

    // Mock bpmn-map loader to return invalid result
    mockBpmnMapResult.valid = false;
    mockBpmnMapResult.map = null;
    mockBpmnMapResult.source = 'storage';

    const progressCalls: Array<{ phase: string; detail?: string }> = [];
    const progressCallback = async (phase: string, label: string, detail?: string) => {
      if (phase === 'total:init' && detail) {
        progressCalls.push({ phase, detail });
      }
    };

    const result = await generateAllFromBpmnWithGraph(
      rootFile,
      bpmnFiles,
      [],
      true, // useHierarchy = true
      false, // useLlm = false
      progressCallback,
      'test',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true, // isActualRootFile = true
      true, // forceRegenerate = true
    );

    // Verify that generation still works even if bpmn-map cannot be loaded
    expect(result.docs.size).toBeGreaterThan(0);

    // Verify that Root Process Feature Goal is still generated (fallback logic)
    const featureGoals = Array.from(result.docs.keys()).filter(key =>
      key.includes('feature-goals/')
    );
    const rootFeatureGoal = featureGoals.find(key => 
      key === 'feature-goals/mortgage.html' || 
      (key.includes('feature-goals/mortgage') && !key.includes('-'))
    );
    
    // With fallback logic, Root Process Feature Goal should still be generated
    // even if bpmn-map cannot be loaded (when isRootFileGeneration = true)
    expect(rootFeatureGoal).toBeDefined();
    console.log(`\n✓ Root Process Feature Goal generated with fallback: ${rootFeatureGoal}`);

    console.log('\n✅ Fallback logic test completed!');
  }, 300000);
});

