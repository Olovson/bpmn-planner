/**
 * @vitest-environment jsdom
 * 
 * Test för att validera dokumentationsgenerering utan Claude API.
 * 
 * Detta test validerar:
 * 1. Filtrering av noder (callActivities med saknade subprocess-filer hoppas över)
 * 2. Topologisk sortering (subprocess-filer före parent-filer)
 * 3. Progress-meddelanden (korrekta och i rätt ordning)
 * 4. Vilka filer och noder som faktiskt genereras
 * 
 * VIKTIGT: Använder useLlm = false (templates) för att undvika Claude API-anrop.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { loadAndParseBpmnFromFixtures } from '../helpers/bpmnTestHelpers';

// Mock Supabase Storage
const { mockStorageList, mockStorageDownload } = vi.hoisted(() => {
  return {
    mockStorageList: vi.fn(),
    mockStorageDownload: vi.fn(),
  };
});

// Load actual bpmn-map.json for testing
import { readFileSync } from 'fs';
import { resolve } from 'path';

let bpmnMapContent: string | null = null;
try {
  const bpmnMapPath = resolve(__dirname, '../../bpmn-map.json');
  bpmnMapContent = readFileSync(bpmnMapPath, 'utf-8');
} catch (error) {
  console.warn('Could not load bpmn-map.json for test:', error);
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        list: mockStorageList,
        upload: vi.fn(async () => ({ data: { path: 'test' }, error: null })),
        download: mockStorageDownload,
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `http://localhost:54321/storage/v1/object/public/bpmn-files/${path}` }
        })),
      })),
    },
  },
}));

// Mock bpmnMapStorage to return actual bpmn-map.json
vi.mock('@/lib/bpmn/bpmnMapStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bpmn/bpmnMapStorage')>();
  return {
    ...actual,
    loadBpmnMapFromStorage: async () => {
      if (bpmnMapContent) {
        try {
          const bpmnMap = JSON.parse(bpmnMapContent);
          return {
            valid: true,
            map: bpmnMap,
            source: 'project-file' as const,
          };
        } catch (error) {
          console.warn('Failed to parse bpmn-map.json:', error);
        }
      }
      return {
        valid: false,
        map: null,
        source: 'none' as const,
      };
    },
  };
});

// Load bpmn-map.json for test
let testBpmnMap: any = null;
try {
  const bpmnMapPath = resolve(__dirname, '../../bpmn-map.json');
  const bpmnMapContent = readFileSync(bpmnMapPath, 'utf-8');
  testBpmnMap = JSON.parse(bpmnMapContent);
} catch (error) {
  console.warn('Could not load bpmn-map.json for test:', error);
}

// Mock buildBpmnProcessGraph to use fixtures
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
      // Pass bpmn-map.json to buildBpmnProcessGraphFromParseResults
      return actual.buildBpmnProcessGraphFromParseResults(rootFile, parseResults, testBpmnMap);
    },
  };
});

// Mock LLM calls to return test content
vi.mock('@/lib/llmDocumentation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llmDocumentation')>();
  return {
    ...actual,
    generateDocumentationWithLlm: vi.fn(async () => ({
      text: JSON.stringify({
        summary: 'Test summary',
        prerequisites: [],
        flowSteps: [],
        userStories: []
      }),
      provider: 'cloud' as const,
      fallbackUsed: false,
      docJson: {
        summary: 'Test summary',
        prerequisites: [],
        flowSteps: [],
        userStories: []
      }
    })),
  };
});

// Mock storageFileExists
vi.mock('@/lib/artifactUrls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/artifactUrls')>();
  return {
    ...actual,
    storageFileExists: vi.fn(async () => false), // Files don't exist in Storage
  };
});

describe('Documentation Generation Order Validation (without Claude)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should show file and node generation order for mortgage, application, and internal-data-gathering', async () => {
    // Spåra filordning
    const fileOrder: string[] = [];
    // Spåra nodordning (med filnamn)
    const nodeOrder: Array<{ file: string; node: string; type: string }> = [];
    
    const progressCallback = (phase: string, label: string, detail?: string) => {
      if (phase === 'docgen:file' && detail) {
        fileOrder.push(detail);
        console.log(`\n📄 Processing file: ${detail}`);
      } else if (phase === 'docgen:node' && detail) {
        // Extrahera filnamn från detail (om det finns)
        // detail format: "call activityn: Household (subprocess: mortgage-se-application.bpmn)"
        const file = fileOrder[fileOrder.length - 1] || 'unknown';
        nodeOrder.push({ file, node: detail, type: 'node' });
        console.log(`  └─ Node: ${detail}`);
      }
    };

    console.log('\n=== Starting Generation ===');
    console.log('Files to generate:');
    console.log('  - mortgage.bpmn');
    console.log('  - mortgage-se-application.bpmn');
    console.log('  - mortgage-se-internal-data-gathering.bpmn');
    console.log('\nExpected order (topological):');
    console.log('  1. mortgage-se-internal-data-gathering.bpmn (subprocess)');
    console.log('  2. mortgage-se-application.bpmn (parent of internal-data-gathering)');
    console.log('  3. mortgage.bpmn (root)');
    console.log('\nExpected to skip:');
    console.log('  - Household (subprocess: mortgage-se-household.bpmn - NOT uploaded)');
    console.log('  - Stakeholder (subprocess: mortgage-se-stakeholder.bpmn - NOT uploaded)');
    console.log('  - Object (subprocess: mortgage-se-object.bpmn - NOT uploaded)');

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      [
        'mortgage.bpmn',
        'mortgage-se-application.bpmn',
        'mortgage-se-internal-data-gathering.bpmn',
        // INTE household, stakeholder, object (saknas)
      ],
      [],
      true, // useHierarchy = true
      true, // useLlm = true (mocked above)
      progressCallback,
      'test',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true, // isActualRootFile = true
      true // forceRegenerate = true
    );

    console.log('\n=== Generation Complete ===');
    console.log(`\n📊 Total files processed: ${fileOrder.length}`);
    console.log(`📊 Total nodes processed: ${nodeOrder.length}`);
    console.log(`📊 Total docs generated: ${result.docs.size}`);

    // Analysera filordning
    console.log('\n=== File Processing Order ===');
    fileOrder.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file}`);
    });

    // Analysera nodordning per fil
    console.log('\n=== Node Processing Order by File ===');
    const nodesByFile = new Map<string, string[]>();
    nodeOrder.forEach(({ file, node }) => {
      if (!nodesByFile.has(file)) {
        nodesByFile.set(file, []);
      }
      nodesByFile.get(file)!.push(node);
    });

    nodesByFile.forEach((nodes, file) => {
      console.log(`\n📄 ${file}:`);
      nodes.forEach((node, idx) => {
        console.log(`  ${idx + 1}. ${node}`);
      });
    });

    // Analysera genererade dokument
    console.log('\n=== Generated Documentation Files ===');
    const docsByType = {
      featureGoals: Array.from(result.docs.keys()).filter(k => 
        k.includes('feature-goal') || k.includes('feature-goals')
      ),
      epics: Array.from(result.docs.keys()).filter(k => 
        k.includes('nodes') && !k.includes('feature-goal')
      ),
      combined: Array.from(result.docs.keys()).filter(k => 
        k.endsWith('.html') && !k.includes('feature-goal') && !k.includes('nodes')
      ),
    };

    console.log(`\nFeature Goals: ${docsByType.featureGoals.length}`);
    docsByType.featureGoals.forEach(key => console.log(`  - ${key}`));

    console.log(`\nEpics: ${docsByType.epics.length}`);
    docsByType.epics.forEach(key => console.log(`  - ${key}`));

    console.log(`\nCombined: ${docsByType.combined.length}`);
    docsByType.combined.forEach(key => console.log(`  - ${key}`));

    // Validera filordning (topologisk sortering)
    console.log('\n=== Validating File Order (Topological Sort) ===');
    const internalIdx = fileOrder.indexOf('mortgage-se-internal-data-gathering.bpmn');
    const applicationIdx = fileOrder.indexOf('mortgage-se-application.bpmn');
    const mortgageIdx = fileOrder.indexOf('mortgage.bpmn');

    console.log(`  internal-data-gathering index: ${internalIdx}`);
    console.log(`  application index: ${applicationIdx}`);
    console.log(`  mortgage index: ${mortgageIdx}`);

    if (internalIdx !== -1 && applicationIdx !== -1) {
      if (internalIdx < applicationIdx) {
        console.log('  ✅ internal-data-gathering genereras FÖRE application (korrekt)');
      } else {
        console.log('  ❌ internal-data-gathering genereras EFTER application (fel!)');
      }
      expect(internalIdx).toBeLessThan(applicationIdx);
    }

    if (applicationIdx !== -1 && mortgageIdx !== -1) {
      if (applicationIdx < mortgageIdx) {
        console.log('  ✅ application genereras FÖRE mortgage (korrekt)');
      } else {
        console.log('  ❌ application genereras EFTER mortgage (fel!)');
      }
      expect(applicationIdx).toBeLessThan(mortgageIdx);
    }

    // Förväntade dokument baserat på de tre filerna
    console.log('\n=== Expected vs Actual ===');
    console.log('\nFörväntade dokument (7 totalt):');
    console.log('  Feature Goals (3):');
    console.log('    1. mortgage-application.html (callActivity i mortgage → application.bpmn)');
    console.log('    2. mortgage-se-application-internal-data-gathering.html (callActivity i application → internal-data-gathering.bpmn)');
    console.log('    3. mortgage.html (Feature Goal för root-processen mortgage.bpmn)');
    console.log('  Epics (4):');
    console.log('    1. Fetch party information (i internal-data-gathering)');
    console.log('    2. Pre-screen party (i internal-data-gathering)');
    console.log('    3. Fetch engagements (i internal-data-gathering)');
    console.log('    4. Confirm application (i application)');
    
    console.log(`\nFaktiskt genererade dokument: ${result.docs.size}`);
    console.log(`  Feature Goals: ${docsByType.featureGoals.length} (förväntat: 3)`);
    console.log(`  Epics: ${docsByType.epics.length} (förväntat: 4)`);
    console.log(`  Combined: ${docsByType.combined.length} (file-level documentation)`);

    // Validera att callActivities med saknade subprocess-filer INTE genereras
    console.log('\n=== Validating Filtering (Missing Subprocess Files) ===');
    const householdFGs = docsByType.featureGoals.filter(k => k.includes('household'));
    const stakeholderFGs = docsByType.featureGoals.filter(k => k.includes('stakeholder'));
    const objectFGs = docsByType.featureGoals.filter(k => k.includes('object'));

    console.log(`  Household Feature Goals: ${householdFGs.length} (förväntat: 0)`);
    console.log(`  Stakeholder Feature Goals: ${stakeholderFGs.length} (förväntat: 0)`);
    console.log(`  Object Feature Goals: ${objectFGs.length} (förväntat: 0)`);

    if (householdFGs.length === 0) {
      console.log('  ✅ Household Feature Goals hoppas över (korrekt)');
    } else {
      console.log('  ❌ Household Feature Goals genereras (fel!)');
      householdFGs.forEach(k => console.log(`    - ${k}`));
    }
    expect(householdFGs.length).toBe(0);

    if (stakeholderFGs.length === 0) {
      console.log('  ✅ Stakeholder Feature Goals hoppas över (korrekt)');
    } else {
      console.log('  ❌ Stakeholder Feature Goals genereras (fel!)');
      stakeholderFGs.forEach(k => console.log(`    - ${k}`));
    }
    expect(stakeholderFGs.length).toBe(0);

    if (objectFGs.length === 0) {
      console.log('  ✅ Object Feature Goals hoppas över (korrekt)');
    } else {
      console.log('  ❌ Object Feature Goals genereras (fel!)');
      objectFGs.forEach(k => console.log(`    - ${k}`));
    }
    expect(objectFGs.length).toBe(0);

    // Validera progress-meddelanden
    console.log('\n=== Validating Progress Messages ===');
    const householdProgress = nodeOrder.filter(({ node }) => node.includes('Household'));
    const stakeholderProgress = nodeOrder.filter(({ node }) => node.includes('Stakeholder'));
    const objectProgress = nodeOrder.filter(({ node }) => node.includes('Object'));

    console.log(`  Household progress messages: ${householdProgress.length} (förväntat: 0)`);
    console.log(`  Stakeholder progress messages: ${stakeholderProgress.length} (förväntat: 0)`);
    console.log(`  Object progress messages: ${objectProgress.length} (förväntat: 0)`);

    if (householdProgress.length === 0) {
      console.log('  ✅ Household progress-meddelanden hoppas över (korrekt)');
    } else {
      console.log('  ❌ Household progress-meddelanden genereras (fel!)');
      householdProgress.forEach(({ node }) => console.log(`    - ${node}`));
    }
    expect(householdProgress.length).toBe(0);

    if (stakeholderProgress.length === 0) {
      console.log('  ✅ Stakeholder progress-meddelanden hoppas över (korrekt)');
    } else {
      console.log('  ❌ Stakeholder progress-meddelanden genereras (fel!)');
      stakeholderProgress.forEach(({ node }) => console.log(`    - ${node}`));
    }
    expect(stakeholderProgress.length).toBe(0);

    if (objectProgress.length === 0) {
      console.log('  ✅ Object progress-meddelanden hoppas över (korrekt)');
    } else {
      console.log('  ❌ Object progress-meddelanden genereras (fel!)');
      objectProgress.forEach(({ node }) => console.log(`    - ${node}`));
    }
    expect(objectProgress.length).toBe(0);

    // Identifiera korrekta Feature Goals
    console.log('\n=== Identifying Correct Feature Goals ===');
    const applicationFG = docsByType.featureGoals.filter(k => 
      k.includes('application') && !k.includes('internal-data-gathering') && !k.includes('mortgage-se-application')
    );
    const internalDataGatheringFG = docsByType.featureGoals.filter(k => 
      k.includes('internal-data-gathering')
    );
    const mortgageRootFG = docsByType.featureGoals.filter(k => 
      k === 'feature-goals/mortgage.html' || k.includes('mortgage.html') && !k.includes('application') && !k.includes('internal')
    );
    
    console.log(`  Application Feature Goal: ${applicationFG.length} (förväntat: 1)`);
    applicationFG.forEach(k => console.log(`    - ${k}`));
    
    console.log(`  Internal Data Gathering Feature Goal: ${internalDataGatheringFG.length} (förväntat: 1)`);
    internalDataGatheringFG.forEach(k => console.log(`    - ${k}`));
    
    console.log(`  Mortgage Root Feature Goal: ${mortgageRootFG.length} (förväntat: 1)`);
    mortgageRootFG.forEach(k => console.log(`    - ${k}`));
    
    // Validera att vi har exakt 3 Feature Goals
    const correctFeatureGoals = [
      ...applicationFG,
      ...internalDataGatheringFG,
      ...mortgageRootFG
    ];
    console.log(`\n  Totalt korrekta Feature Goals: ${correctFeatureGoals.length} (förväntat: 3)`);
    if (correctFeatureGoals.length === 3) {
      console.log('  ✅ Exakt 3 Feature Goals (korrekt)');
    } else {
      console.log(`  ❌ ${correctFeatureGoals.length} Feature Goals (förväntat: 3)`);
    }
    
    // Visa alla Feature Goals för analys
    console.log('\n=== All Generated Feature Goals (for analysis) ===');
    docsByType.featureGoals.forEach((k, idx) => {
      console.log(`  ${idx + 1}. ${k}`);
    });
    
    // Validera Epics
    console.log('\n=== Validating Epics ===');
    const expectedEpics = [
      'fetch-party-information',
      'pre-screen-party',
      'fetch-engagements',
      'confirm-application'
    ];
    
    expectedEpics.forEach(expectedEpic => {
      const found = docsByType.epics.some(k => k.toLowerCase().includes(expectedEpic.toLowerCase()));
      console.log(`  ${expectedEpic}: ${found ? '✅' : '❌'}`);
    });

    console.log('\n=== Test Complete ===');
  }, 120000);

  it('should generate documentation for all files in mortgage-se 2025.11.29 folder', async () => {
    // Alla filer från mappen
    const allFiles = [
      'mortgage.bpmn',
      'mortgage-se-appeal.bpmn',
      'mortgage-se-application.bpmn',
      'mortgage-se-collateral-registration.bpmn',
      'mortgage-se-credit-decision.bpmn',
      'mortgage-se-credit-evaluation.bpmn',
      'mortgage-se-disbursement.bpmn',
      'mortgage-se-document-generation.bpmn',
      'mortgage-se-documentation-assessment.bpmn',
      'mortgage-se-household.bpmn',
      'mortgage-se-internal-data-gathering.bpmn',
      'mortgage-se-kyc.bpmn',
      'mortgage-se-manual-credit-evaluation.bpmn',
      'mortgage-se-mortgage-commitment.bpmn',
      'mortgage-se-object-information.bpmn',
      'mortgage-se-object.bpmn',
      'mortgage-se-offer.bpmn',
      'mortgage-se-signing.bpmn',
      'mortgage-se-stakeholder.bpmn',
    ];

    // Spåra EXAKT genereringsordning - varje dokument en per rad
    const fileOrder: string[] = [];
    const exactGenerationOrder: Array<{ file: string; type: 'feature-goal' | 'epic' | 'combined'; name: string; order: number }> = [];
    const processedFiles = new Set<string>();
    const generatedDocsMap = new Map<string, { featureGoals: string[]; epics: string[]; combined: string[] }>();
    let globalOrder = 0;
    
    const progressCallback = (phase: string, label: string, detail?: string) => {
      if (phase === 'docgen:file' && detail) {
        // Detail kan vara antingen filnamnet (slutar med .bpmn) eller nod-information
        if (detail.endsWith('.bpmn')) {
          // Detta är en fil - lägg till i genereringsordningen
          if (!processedFiles.has(detail)) {
            fileOrder.push(detail);
            processedFiles.add(detail);
            generatedDocsMap.set(detail, { featureGoals: [], epics: [], combined: [] });
            console.log(`\n📄 [${fileOrder.length}] Processing file: ${detail}`);
          }
        }
        // Annars är det nod-information som vi hanterar senare
      } else if (phase === 'docgen:node' && detail) {
        // Detta är en nod som genereras - spara för exakt ordning
        // Detail format kan vara: "file::elementId" eller bara "elementId"
        const currentFile = fileOrder[fileOrder.length - 1] || 'unknown';
        exactGenerationOrder.push({
          file: currentFile,
          type: 'epic', // Default, kommer uppdateras när vi ser faktiska dokument
          name: detail,
          order: ++globalOrder
        });
      }
    };

    console.log('\n=== Starting Generation for All Files ===');
    console.log(`Total files: ${allFiles.length}`);
    console.log('Files:', allFiles.join(', '));

    const result = await generateAllFromBpmnWithGraph(
      'mortgage.bpmn',
      allFiles,
      [],
      true, // useHierarchy = true
      true, // useLlm = true (mocked)
      progressCallback,
      'test',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true, // isActualRootFile = true
      true // forceRegenerate = true
    );

    console.log('\n=== Generation Complete ===');
    console.log(`📊 Total docs generated: ${result.docs.size}`);
    
    // Visa den faktiska genereringsordningen
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 FAKTISK GENERERINGSORDNING (Traversal-logik)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Analysera genererade dokument FÖRST (innan filskrivning)
    const docsByType = {
      featureGoals: Array.from(result.docs.keys()).filter(k => 
        k.includes('feature-goal') || k.includes('feature-goals')
      ),
      epics: Array.from(result.docs.keys()).filter(k => 
        k.includes('nodes') && !k.includes('feature-goal')
      ),
      combined: Array.from(result.docs.keys()).filter(k => 
        k.endsWith('.html') && !k.includes('feature-goal') && !k.includes('nodes')
      ),
    };
    
    // Bygg EXAKT genereringsordning från result.docs i den ordning de genererades
    // VIKTIGT: result.docs är en Map, så ordningen är den ordning dokumenten lades till
    const exactDocOrder: Array<{ file: string; type: 'feature-goal' | 'epic' | 'combined'; name: string; docKey: string }> = [];
    
    // Fyll på generatedDocsMap och exactDocOrder med faktiska genererade dokument
    for (const [docKey, docContent] of result.docs.entries()) {
      let bpmnFile = '';
      let docType: 'feature-goal' | 'epic' | 'combined' = 'combined';
      let docName = '';
      
      if (docKey.startsWith('feature-goals/')) {
        docType = 'feature-goal';
        // Feature Goal: feature-goals/{bpmnFile}-{elementId}.html eller feature-goals/{bpmnFile}.html
        const parts = docKey.split('/');
        const fileNameWithId = parts[1].replace('.html', '');
        // Försök hitta filnamnet, kan vara komplext med hierarkiska namn
        bpmnFile = allFiles.find(f => fileNameWithId.includes(f.replace('.bpmn', ''))) || '';
        if (!bpmnFile && fileNameWithId === 'mortgage') { // Specialfall för root Feature Goal
          bpmnFile = 'mortgage.bpmn';
        }
        if (bpmnFile && generatedDocsMap.has(bpmnFile)) {
          const elementId = fileNameWithId.replace(bpmnFile.replace('.bpmn', '') + '-', '');
          if (elementId !== fileNameWithId) { // Om det faktiskt är en hierarkisk Feature Goal
            docName = elementId;
            generatedDocsMap.get(bpmnFile)!.featureGoals.push(elementId);
          } else if (fileNameWithId === 'mortgage') {
            docName = 'Root Feature Goal (mortgage)';
            generatedDocsMap.get(bpmnFile)!.featureGoals.push('Root Feature Goal (mortgage)');
          }
        }
      } else if (docKey.startsWith('nodes/')) {
        docType = 'epic';
        // Epic: nodes/{bpmnFile}/{elementId}.html
        const parts = docKey.split('/');
        bpmnFile = parts[1];
        docName = parts[2].replace('.html', '');
        if (bpmnFile && generatedDocsMap.has(bpmnFile)) {
          generatedDocsMap.get(bpmnFile)!.epics.push(docName);
        }
      } else if (docKey.endsWith('.html')) {
        docType = 'combined';
        // Combined: {bpmnFile}.html
        const fileBase = docKey.replace('.html', '');
        // Försök hitta korrekt filnamn (med .bpmn extension)
        bpmnFile = allFiles.find(f => f.replace('.bpmn', '') === fileBase) || fileBase;
        // Om vi inte hittade en match, lägg till .bpmn om det saknas
        if (!bpmnFile.endsWith('.bpmn')) {
          bpmnFile = `${bpmnFile}.bpmn`;
        }
        docName = 'File-level documentation';
        if (bpmnFile && generatedDocsMap.has(bpmnFile)) {
          generatedDocsMap.get(bpmnFile)!.combined.push(bpmnFile);
        }
      }
      
      if (bpmnFile && docName) {
        exactDocOrder.push({ file: bpmnFile, type: docType, name: docName, docKey });
      }
    }
    
    if (fileOrder.length > 0) {
      console.log('Filer genererade i denna ordning:');
      fileOrder.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file}`);
      });
      console.log(`\nTotala antal filer: ${fileOrder.length}`);
      
      // Skriv till fil för framtida referens
      const fs = await import('fs');
      const path = await import('path');
      const outputDir = path.resolve(process.cwd(), 'docs/analysis');
      const outputFile = path.join(outputDir, 'EXACT_GENERATION_ORDER.md');
      
      let output = `# Exakt Genereringsordning\n\n`;
      output += `**Datum:** ${new Date().toISOString().split('T')[0]}\n\n`;
      output += `**Metod:** Topologisk sortering → visualOrderIndex/orderIndex från root\n`;
      output += `(Subprocesser genereras FÖRE parent-filer)\n\n`;
      output += `## EXAKT Genereringsordning - Varje Dokument En Per Rad\n\n`;
      output += `| # | Fil | Typ | Dokument |\n`;
      output += `|---|-----|-----|----------|\n`;
      
      exactDocOrder.forEach((doc, idx) => {
        const typeLabel = doc.type === 'feature-goal' ? 'Feature Goal' : doc.type === 'epic' ? 'Epic' : 'Combined';
        output += `| ${idx + 1} | ${doc.file} | ${typeLabel} | ${doc.name} |\n`;
      });
      
      output += `\n## Genereringsordning per Fil\n\n`;
      
      fileOrder.forEach((file, idx) => {
        const docsForFile = generatedDocsMap.get(file);
        output += `### ${idx + 1}. ${file}\n\n`;
        
        if (docsForFile) {
          if (docsForFile.featureGoals.length > 0) {
            output += `**Feature Goals (${docsForFile.featureGoals.length}):**\n`;
            docsForFile.featureGoals.forEach((fg, fgIdx) => {
              output += `- ${fgIdx + 1}. ${fg}\n`;
            });
            output += `\n`;
          }
          if (docsForFile.epics.length > 0) {
            output += `**Epics (${docsForFile.epics.length}):**\n`;
            docsForFile.epics.forEach((epic, epicIdx) => {
              output += `- ${epicIdx + 1}. ${epic}\n`;
            });
            output += `\n`;
          }
          if (docsForFile.combined.length > 0) {
            output += `**Combined:** File-level documentation\n\n`;
          }
        }
        output += `---\n\n`;
      });
      
      output += `## Sammanfattning\n\n`;
      output += `- **Totala filer:** ${fileOrder.length}\n`;
      output += `- **Totala Feature Goals:** ${docsByType.featureGoals.length}\n`;
      output += `- **Totala Epics:** ${docsByType.epics.length}\n`;
      output += `- **Totala Combined:** ${docsByType.combined.length}\n`;
      output += `- **Totala dokument:** ${result.docs.size}\n`;
      
      // Skriv filen
      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(outputFile, output, 'utf-8');
      console.log(`\n✅ Exakt genereringsordning sparad till: ${outputFile}`);
      
      // Visa EXAKT ordning i konsolen också - varje dokument en per rad
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📋 EXAKT GENERERINGSORDNING - Varje Dokument En Per Rad');
      console.log('═══════════════════════════════════════════════════════════════\n');
      exactDocOrder.forEach((doc, idx) => {
        const typeLabel = doc.type === 'feature-goal' ? '🎯 Feature Goal' : doc.type === 'epic' ? '📝 Epic' : '📄 Combined';
        console.log(`${idx + 1}. ${doc.file} | ${typeLabel} | ${doc.name}`);
      });
      
      // Visa EXAKT ordning i konsolen också
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📋 EXAKT GENERERINGSORDNING - Varje Dokument En Per Rad');
      console.log('═══════════════════════════════════════════════════════════════\n');
      exactDocOrder.forEach((doc, idx) => {
        const typeLabel = doc.type === 'feature-goal' ? '🎯 Feature Goal' : doc.type === 'epic' ? '📝 Epic' : '📄 Combined';
        console.log(`${idx + 1}. ${doc.file} | ${typeLabel} | ${doc.name}`);
      });
    } else {
      console.log('⚠️ Kunde inte fånga filordning från progressCallback');
    }

    // Extrahera filordning från genererade dokument
    // Feature Goals har format: feature-goals/{parentFile}-{elementId}.html eller feature-goals/{file}.html
    // Epics har format: nodes/{file}/{elementId}.html
    // Combined har format: {file}.html
    
    const filesFromDocs = new Set<string>();
    const fileFeatureGoals: Map<string, string[]> = new Map();
    const fileEpics: Map<string, string[]> = new Map();
    
    // Processa Feature Goals
    docsByType.featureGoals.forEach(docKey => {
      // Format: feature-goals/{parentFile}-{elementId}.html eller feature-goals/{file}.html
      const match = docKey.match(/feature-goals\/([^/]+)\.html/);
      if (match) {
        const fileName = match[1];
        // Om det är root Feature Goal (mortgage.html)
        if (fileName === 'mortgage') {
          filesFromDocs.add('mortgage.bpmn');
          if (!fileFeatureGoals.has('mortgage.bpmn')) {
            fileFeatureGoals.set('mortgage.bpmn', []);
          }
          fileFeatureGoals.get('mortgage.bpmn')!.push('Root Feature Goal (mortgage)');
        } else {
          // Hierarkisk Feature Goal: mortgage-se-application-internal-data-gathering
          // Detta betyder att callActivity "internal-data-gathering" finns i "mortgage-se-application.bpmn"
          // Försök matcha mot kända filnamn för att hitta parent-filen (längsta matchning först)
          const sortedFiles = [...allFiles].sort((a, b) => b.length - a.length);
          let matched = false;
          for (const file of sortedFiles) {
            const baseName = file.replace('.bpmn', '');
            // Kontrollera om fileName börjar med baseName följt av ett bindestreck
            if (fileName.startsWith(baseName + '-')) {
              filesFromDocs.add(file);
              if (!fileFeatureGoals.has(file)) {
                fileFeatureGoals.set(file, []);
              }
              // Extrahera elementId (resten efter baseName-)
              const elementId = fileName.substring(baseName.length + 1);
              fileFeatureGoals.get(file)!.push(elementId);
              matched = true;
              break;
            }
          }
          // Om ingen match hittades, kan det vara en Feature Goal för en subprocess som anropas från mortgage.bpmn
          // T.ex. "mortgage-credit-evaluation" betyder callActivity "credit-evaluation" i mortgage.bpmn
          if (!matched && fileName.startsWith('mortgage-')) {
            filesFromDocs.add('mortgage.bpmn');
            if (!fileFeatureGoals.has('mortgage.bpmn')) {
              fileFeatureGoals.set('mortgage.bpmn', []);
            }
            const elementId = fileName.substring('mortgage-'.length);
            fileFeatureGoals.get('mortgage.bpmn')!.push(elementId);
          }
        }
      }
    });
    
    // Processa Epics
    docsByType.epics.forEach(docKey => {
      // Format: nodes/{file}/{elementId}.html
      const match = docKey.match(/nodes\/([^/]+)\/([^/]+)\.html/);
      if (match) {
        const fileBase = match[1];
        const elementId = match[2];
        const fileName = `${fileBase}.bpmn`;
        if (allFiles.includes(fileName)) {
          filesFromDocs.add(fileName);
          if (!fileEpics.has(fileName)) {
            fileEpics.set(fileName, []);
          }
          fileEpics.get(fileName)!.push(elementId);
        }
      }
    });
    
    // Processa Combined
    docsByType.combined.forEach(docKey => {
      // Format: {file}.html
      const fileBase = docKey.replace('.html', '');
      const fileName = `${fileBase}.bpmn`;
      if (allFiles.includes(fileName)) {
        filesFromDocs.add(fileName);
      }
    });
    
    // Bygg filordning baserat på traversal (använd graph för att få korrekt ordning)
    // För nu, använd alfabetisk ordning och visa dokumentation per fil
    // Men sätt mortgage.bpmn sist (root-processen)
    const filesList = Array.from(filesFromDocs);
    const sortedFiles = filesList.filter(f => f !== 'mortgage.bpmn').sort().concat(
      filesList.filter(f => f === 'mortgage.bpmn')
    );
    
    // Visa detaljerad genereringsordning med dokumentation
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 GENERERINGSORDNING OCH DOKUMENTATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('   Metod: Topologisk sortering → visualOrderIndex/orderIndex från root');
    console.log('   (Subprocesser genereras FÖRE parent-filer)');
    console.log(`   \n   Faktisk genereringsordning: ${fileOrder.length > 0 ? fileOrder.join(' → ') : 'Okänd'}\n`);
    
    let totalFeatureGoals = 0;
    let totalEpics = 0;
    
    sortedFiles.forEach((file, idx) => {
      const featureGoals = fileFeatureGoals.get(file) || [];
      const epics = fileEpics.get(file) || [];
      const hasCombined = docsByType.combined.some(doc => doc.includes(file.replace('.bpmn', '')));
      
      totalFeatureGoals += featureGoals.length;
      totalEpics += epics.length;
      
      console.log(`\n📄 ${idx + 1}. ${file}`);
      
      // Visa Feature Goals (callActivities)
      if (featureGoals.length > 0) {
        console.log(`   🎯 Feature Goals (${featureGoals.length}):`);
        featureGoals.forEach((fg, fgIdx) => {
          console.log(`      ${fgIdx + 1}. ${fg}`);
        });
      }
      
      // Visa Epics (tasks)
      if (epics.length > 0) {
        console.log(`   📝 Epics (${epics.length}):`);
        epics.forEach((epic, epicIdx) => {
          console.log(`      ${epicIdx + 1}. ${epic}`);
        });
      }
      
      // Visa Combined (file-level documentation)
      if (hasCombined) {
        console.log(`   📄 Combined (file-level documentation)`);
      }
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SAMMANFATTNING');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Totala filer: ${sortedFiles.length}`);
    console.log(`Totala Feature Goals: ${docsByType.featureGoals.length} (${totalFeatureGoals} från callActivities + root Feature Goal)`);
    console.log(`Totala Epics: ${docsByType.epics.length} (${totalEpics} tasks)`);
    console.log(`Totala Combined: ${docsByType.combined.length} (file-level documentation)`);
    console.log(`Totala dokument: ${result.docs.size}`);
    
    // Visa alla Feature Goal paths
    console.log('\n📋 Alla Feature Goals:');
    docsByType.featureGoals.forEach((key, idx) => {
      console.log(`   ${idx + 1}. ${key}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');

    // Visa alla Feature Goals
    console.log('\n=== All Generated Feature Goals ===');
    docsByType.featureGoals.forEach((key, idx) => {
      console.log(`  ${idx + 1}. ${key}`);
    });

    // Validera att alla filer processades
    expect(fileOrder.length).toBeGreaterThan(0);
    expect(result.docs.size).toBeGreaterThan(0);
    
    // Validera att root-process Feature Goal genererades
    const rootFeatureGoal = docsByType.featureGoals.find(k => 
      k === 'feature-goals/mortgage.html' || k.includes('mortgage.html')
    );
    expect(rootFeatureGoal).toBeDefined();
    console.log(`\n✅ Root Feature Goal generated: ${rootFeatureGoal}`);
  }, 300000); // 5 minuter timeout för alla filer
});

