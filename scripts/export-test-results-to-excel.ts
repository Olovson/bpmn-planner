/**
 * Script för att exportera testresultat till Excel
 * Kör testet och exporterar strukturerad data om processer, Feature Goals och Epics
 */

import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { loadBpmnMapFromStorage } from '@/lib/bpmn/bpmnMapStorage';
import { loadAndParseBpmnFromFixtures } from '../tests/helpers/bpmnTestHelpers';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock LLM calls
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
    isLlmEnabled: vi.fn(() => true),
  };
});

// Mock Supabase
const mockStorageFiles = new Map<string, { content: string; contentType: string }>();
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
        list: vi.fn(async () => ({ data: [], error: null })),
        upload: vi.fn(async (path: string, blob: Blob | any) => {
          let content: string = '';
          if (typeof blob === 'string') {
            content = blob;
          } else if (blob.text && typeof blob.text === 'function') {
            content = await blob.text();
          }
          if (content) {
            mockStorageFiles.set(path, { content, contentType: 'text/html' });
          }
          return { data: { path }, error: null };
        }),
        download: vi.fn(async (path: string) => {
          const file = mockStorageFiles.get(path);
          if (file) {
            const blob = {
              text: async () => file.content,
              arrayBuffer: async () => new TextEncoder().encode(file.content),
              size: file.content.length,
              type: file.contentType,
            };
            return { data: blob as any, error: null };
          }
          return { data: null, error: { message: 'File not found' } };
        }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://mocked-url.com/file' }, error: null })),
      }),
    },
  },
}));

// Mock buildBpmnProcessGraph
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
      const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const mapResult = await loadBpmnMapFromStorage();
      return actual.buildBpmnProcessGraphFromParseResults(rootFile, parseResults, mapResult.map);
    },
  };
});

// Mock bpmnMapStorage
let bpmnMapContent: string | null = null;
try {
  const bpmnMapPath = resolve(__dirname, '../bpmn-map.json');
  bpmnMapContent = readFileSync(bpmnMapPath, 'utf-8');
} catch (error) {
  console.warn('Could not load bpmn-map.json:', error);
}

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
            issues: [],
            totalIssues: 0,
          };
        } catch (error) {
          return { valid: false, map: undefined, issues: [{ message: 'Parse error' }], totalIssues: 1 };
        }
      }
      return { valid: false, map: undefined, issues: [{ message: 'File not found' }], totalIssues: 1 };
    },
  };
});

// Mock artifactUrls
vi.mock('@/lib/artifactUrls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/artifactUrls')>();
  return {
    ...actual,
    storageFileExists: vi.fn(async () => false),
  };
});

interface ProcessInfo {
  file: string;
  processId?: string;
  alias?: string;
  description?: string;
  parentFile?: string;
  callActivityId?: string;
  depth: number;
  order: number;
}

interface FeatureGoalInfo {
  fileKey: string;
  bpmnFile: string;
  elementId: string;
  name: string;
  parentFile?: string;
  subprocessFile?: string;
  type: 'root' | 'callActivity';
}

interface EpicInfo {
  fileKey: string;
  bpmnFile: string;
  elementId: string;
  name: string;
  nodeType: string;
  featureGoalFile?: string;
  featureGoalElementId?: string;
}

async function exportTestResultsToExcel() {
  console.log('🚀 Starting test generation and Excel export...\n');

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

  // Spåra data
  const fileOrder: string[] = [];
  const nodeOrder: Array<{ file: string; node: string; type: string }> = [];
  const processInfoMap = new Map<string, ProcessInfo>();
  const featureGoalInfoList: FeatureGoalInfo[] = [];
  const epicInfoList: EpicInfo[] = [];

  const progressCallback = (phase: string, label: string, detail?: string) => {
    if (phase === 'docgen:file' && detail) {
      fileOrder.push(detail);
    } else if (phase === 'docgen:node' && detail) {
      const file = fileOrder[fileOrder.length - 1] || 'unknown';
      nodeOrder.push({ file, node: detail, type: 'node' });
    }
  };

  // Kör generering
  const result = await generateAllFromBpmnWithGraph(
    'mortgage.bpmn',
    allFiles,
    [],
    true,
    true,
    progressCallback,
    'test',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    true,
    true
  );

  // Bygg process graph för att få hierarki
  const graph = await buildBpmnProcessGraph('mortgage.bpmn', allFiles);
  
  // Ladda bpmn-map för att få process information
  const mapResult = await loadBpmnMapFromStorage();
  const bpmnMap = mapResult.map || [];

  // Samla process information
  const processMap = new Map<string, any>();
  bpmnMap.forEach((proc: any) => {
    processMap.set(proc.bpmn_file, proc);
  });

  // Bygg hierarki
  const fileToProcessInfo = new Map<string, ProcessInfo>();
  let orderCounter = 0;

  function getProcessDepth(file: string, visited = new Set<string>()): number {
    if (visited.has(file)) return 0; // Cycle detection
    visited.add(file);
    
    const proc = processMap.get(file);
    if (!proc) return 0;
    
    let maxDepth = 0;
    if (proc.call_activities) {
      for (const ca of proc.call_activities) {
        if (ca.subprocess_bpmn_file && allFiles.includes(ca.subprocess_bpmn_file)) {
          const depth = getProcessDepth(ca.subprocess_bpmn_file, new Set(visited));
          maxDepth = Math.max(maxDepth, depth + 1);
        }
      }
    }
    return maxDepth;
  }

  // Samla process information
  for (const file of fileOrder) {
    if (!file.endsWith('.bpmn')) continue;
    
    const proc = processMap.get(file);
    const depth = getProcessDepth(file);
    
    if (!fileToProcessInfo.has(file)) {
      fileToProcessInfo.set(file, {
        file,
        processId: proc?.process_id,
        alias: proc?.alias,
        description: proc?.description,
        depth,
        order: orderCounter++,
      });
    }
  }

  // Hitta parent-filer
  for (const proc of bpmnMap) {
    if (proc.call_activities) {
      for (const ca of proc.call_activities) {
        if (ca.subprocess_bpmn_file && fileToProcessInfo.has(ca.subprocess_bpmn_file)) {
          const childInfo = fileToProcessInfo.get(ca.subprocess_bpmn_file)!;
          childInfo.parentFile = proc.bpmn_file;
          childInfo.callActivityId = ca.bpmn_id;
        }
      }
    }
  }

  // Analysera Feature Goals
  const featureGoalKeys = Array.from(result.docs.keys()).filter(k => 
    k.includes('feature-goal') || k.includes('feature-goals')
  );

  for (const key of featureGoalKeys) {
    // Parse key format: feature-goals/{parent}-{elementId}.html eller feature-goals/{file}.html
    const match = key.match(/feature-goals\/(.+)\.html/);
    if (!match) continue;
    
    const pathPart = match[1];
    
    // Check if it's root Feature Goal (mortgage.html)
    if (pathPart === 'mortgage') {
      featureGoalInfoList.push({
        fileKey: key,
        bpmnFile: 'mortgage.bpmn',
        elementId: 'mortgage',
        name: 'Mortgage (Root Process)',
        type: 'root',
      });
      continue;
    }
    
    // Hierarchical format: {parent}-{elementId}
    const parts = pathPart.split('-');
    if (parts.length >= 2) {
      // Find the elementId (usually the last part or last two parts)
      // Try to match against known files
      let found = false;
      for (const file of allFiles) {
        const baseName = file.replace('.bpmn', '');
        if (pathPart.startsWith(baseName + '-')) {
          const elementId = pathPart.substring(baseName.length + 1);
          const proc = processMap.get(file);
          const ca = proc?.call_activities?.find((ca: any) => ca.bpmn_id === elementId);
          
          featureGoalInfoList.push({
            fileKey: key,
            bpmnFile: file,
            elementId: elementId,
            name: ca?.name || elementId,
            parentFile: file,
            subprocessFile: ca?.subprocess_bpmn_file,
            type: 'callActivity',
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Fallback: try to extract from path
        const lastPart = parts[parts.length - 1];
        featureGoalInfoList.push({
          fileKey: key,
          bpmnFile: 'unknown',
          elementId: lastPart,
          name: lastPart,
          type: 'callActivity',
        });
      }
    }
  }

  // Analysera Epics
  const epicKeys = Array.from(result.docs.keys()).filter(k => 
    k.includes('nodes') && !k.includes('feature-goal')
  );

  for (const key of epicKeys) {
    // Format: nodes/{bpmnFile}/{elementId}.html
    const match = key.match(/nodes\/(.+?)\/(.+?)\.html/);
    if (!match) continue;
    
    const bpmnFile = match[1];
    const elementId = match[2];
    
    // Find node in graph
    const node = Array.from(graph.allNodes.values()).find(
      n => n.bpmnFile === bpmnFile && n.bpmnElementId === elementId
    );
    
    // Find which Feature Goal this epic belongs to
    let featureGoalFile: string | undefined;
    let featureGoalElementId: string | undefined;
    
    if (node) {
      // If it's in a subprocess file, find the callActivity that calls it
      const parentNode = Array.from(graph.allNodes.values()).find(
        n => n.type === 'callActivity' && n.subprocessFile === bpmnFile
      );
      
      if (parentNode) {
        featureGoalFile = parentNode.bpmnFile;
        featureGoalElementId = parentNode.bpmnElementId;
      } else if (bpmnFile === 'mortgage.bpmn') {
        // Root file epics belong to root Feature Goal
        featureGoalFile = 'mortgage.bpmn';
        featureGoalElementId = 'mortgage';
      }
    }
    
    epicInfoList.push({
      fileKey: key,
      bpmnFile,
      elementId,
      name: node?.name || elementId,
      nodeType: node?.type || 'unknown',
      featureGoalFile,
      featureGoalElementId,
    });
  }

  // Skapa Excel workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Processer och hierarki
  const processData = Array.from(fileToProcessInfo.values())
    .sort((a, b) => a.order - b.order)
    .map(p => ({
      'Ordning': p.order + 1,
      'Fil': p.file,
      'Process ID': p.processId || '',
      'Alias': p.alias || '',
      'Beskrivning': p.description || '',
      'Djup': p.depth,
      'Parent Fil': p.parentFile || '',
      'Call Activity ID': p.callActivityId || '',
    }));

  const processSheet = XLSX.utils.json_to_sheet(processData);
  XLSX.utils.book_append_sheet(workbook, processSheet, 'Processer och Hierarki');

  // Sheet 2: Feature Goals
  const featureGoalData = featureGoalInfoList.map(fg => ({
    'File Key': fg.fileKey,
    'BPMN Fil': fg.bpmnFile,
    'Element ID': fg.elementId,
    'Namn': fg.name,
    'Typ': fg.type,
    'Parent Fil': fg.parentFile || '',
    'Subprocess Fil': fg.subprocessFile || '',
  }));

  const featureGoalSheet = XLSX.utils.json_to_sheet(featureGoalData);
  XLSX.utils.book_append_sheet(workbook, featureGoalSheet, 'Feature Goals');

  // Sheet 3: Epics och Feature Goals
  const epicData = epicInfoList.map(epic => ({
    'File Key': epic.fileKey,
    'BPMN Fil': epic.bpmnFile,
    'Element ID': epic.elementId,
    'Namn': epic.name,
    'Nod Typ': epic.nodeType,
    'Feature Goal Fil': epic.featureGoalFile || '',
    'Feature Goal Element ID': epic.featureGoalElementId || '',
  }));

  const epicSheet = XLSX.utils.json_to_sheet(epicData);
  XLSX.utils.book_append_sheet(workbook, epicSheet, 'Epics och Feature Goals');

  // Sheet 4: Filordning (topologisk sortering)
  const fileOrderData = fileOrder.map((file, idx) => ({
    'Ordning': idx + 1,
    'Fil/Nod': file,
    'Typ': file.endsWith('.bpmn') ? 'Fil' : 'Nod',
  }));

  const fileOrderSheet = XLSX.utils.json_to_sheet(fileOrderData);
  XLSX.utils.book_append_sheet(workbook, fileOrderSheet, 'Filordning');

  // Sheet 5: Sammanfattning
  const summaryData = [
    { 'Mått': 'Totala filer', 'Värde': allFiles.length },
    { 'Mått': 'Processerade filer', 'Värde': fileOrder.filter(f => f.endsWith('.bpmn')).length },
    { 'Mått': 'Totala noder', 'Värde': nodeOrder.length },
    { 'Mått': 'Feature Goals', 'Värde': featureGoalInfoList.length },
    { 'Mått': 'Epics', 'Värde': epicInfoList.length },
    { 'Mått': 'Totala dokument', 'Värde': result.docs.size },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sammanfattning');

  // Spara Excel-fil
  const outputPath = resolve(__dirname, '../test-results-export.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log(`\n✅ Excel-fil exporterad till: ${outputPath}`);
  console.log(`\n📊 Sammanfattning:`);
  console.log(`   - Processer: ${fileToProcessInfo.size}`);
  console.log(`   - Feature Goals: ${featureGoalInfoList.length}`);
  console.log(`   - Epics: ${epicInfoList.length}`);
  console.log(`   - Totala dokument: ${result.docs.size}`);
}

// Kör scriptet
exportTestResultsToExcel().catch(console.error);

