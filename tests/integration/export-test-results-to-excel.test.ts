/**
 * @vitest-environment jsdom
 * 
 * Test för att exportera testresultat till Excel
 * Kör dokumentationsgenerering och exporterar strukturerad data
 * 
 * Använder samma approach som documentation-generation-order-validation.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { loadBpmnMapFromStorage } from '@/lib/bpmn/bpmnMapStorage';
import { loadAndParseBpmnFromFixtures } from '../helpers/bpmnTestHelpers';
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
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
const { mockStorageList, mockStorageUpload, mockStorageDownload } = vi.hoisted(() => {
  return {
    mockStorageList: vi.fn(),
    mockStorageUpload: vi.fn(async (path: string, blob: Blob | any, options?: any) => {
      let content: string = '';
      if (typeof blob === 'string') {
        content = blob;
      } else if (blob.text && typeof blob.text === 'function') {
        content = await blob.text();
      } else if (blob instanceof Blob) {
        const blobAny = blob as any;
        if (blobAny._parts && Array.isArray(blobAny._parts) && blobAny._parts.length > 0) {
          const parts = blobAny._parts;
          content = parts.map((part: any) => {
            if (Array.isArray(part) && part.length > 0) {
              const partContent = part[0];
              if (typeof partContent === 'string') return partContent;
              if (partContent instanceof Uint8Array) return new TextDecoder().decode(partContent);
              if (Buffer.isBuffer(partContent)) return partContent.toString('utf-8');
              return String(partContent);
            }
            if (typeof part === 'string') return part;
            if (part instanceof Uint8Array) return new TextDecoder().decode(part);
            if (Buffer.isBuffer(part)) return part.toString('utf-8');
            return String(part);
          }).join('');
        }
      }
      if (content) {
        mockStorageFiles.set(path, { content, contentType: options?.contentType || 'text/html' });
      }
      return { data: { path }, error: null };
    }),
    mockStorageDownload: vi.fn(async (path: string) => {
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
  };
});

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
        upload: mockStorageUpload,
        download: mockStorageDownload,
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `http://localhost:54321/storage/v1/object/public/bpmn-files/${path}` }
        })),
      })),
    },
  },
}));

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

// Load actual bpmn-map.json for testing
let bpmnMapContent: string | null = null;
try {
  const bpmnMapPath = resolve(__dirname, '../../bpmn-map.json');
  bpmnMapContent = readFileSync(bpmnMapPath, 'utf-8');
} catch (error) {
  console.warn('Could not load bpmn-map.json for test:', error);
}

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
  featureGoalName?: string;
}

describe('Export Test Results to Excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageList.mockResolvedValue({ data: [], error: null });
  });

  it('should generate documentation and export to Excel', async () => {
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
    
    // Ensure bpmnMap is an array
    const bpmnMapArray = Array.isArray(bpmnMap) ? bpmnMap : [];

    // Samla process information
    const processMap = new Map<string, any>();
    bpmnMapArray.forEach((proc: any) => {
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
    for (const proc of bpmnMapArray) {
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

    const featureGoalInfoList: FeatureGoalInfo[] = [];

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
        const parts = pathPart.split('-');
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

    // Analysera Epics
    const epicKeys = Array.from(result.docs.keys()).filter(k => 
      k.includes('nodes') && !k.includes('feature-goal')
    );

    const epicInfoList: EpicInfo[] = [];

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
      let featureGoalName: string | undefined;
      
      if (node) {
        // If it's in a subprocess file, find the callActivity that calls it
        const parentNode = Array.from(graph.allNodes.values()).find(
          n => n.type === 'callActivity' && n.subprocessFile === bpmnFile
        );
        
        if (parentNode) {
          featureGoalFile = parentNode.bpmnFile;
          featureGoalElementId = parentNode.bpmnElementId;
          const fg = featureGoalInfoList.find(
            fg => fg.bpmnFile === parentNode.bpmnFile && fg.elementId === parentNode.bpmnElementId
          );
          featureGoalName = fg?.name;
        } else if (bpmnFile === 'mortgage.bpmn') {
          // Root file epics belong to root Feature Goal
          featureGoalFile = 'mortgage.bpmn';
          featureGoalElementId = 'mortgage';
          featureGoalName = 'Mortgage (Root Process)';
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
        featureGoalName,
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
      'Feature Goal Namn': epic.featureGoalName || '',
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
    const outputPath = resolve(__dirname, '../../test-results-export.xlsx');
    XLSX.writeFile(workbook, outputPath);

    console.log(`\n✅ Excel-fil exporterad till: ${outputPath}`);
    console.log(`\n📊 Sammanfattning:`);
    console.log(`   - Processer: ${fileToProcessInfo.size}`);
    console.log(`   - Feature Goals: ${featureGoalInfoList.length}`);
    console.log(`   - Epics: ${epicInfoList.length}`);
    console.log(`   - Totala dokument: ${result.docs.size}`);

    // Validera att något genererades
    expect(result.docs.size).toBeGreaterThan(0);
    expect(featureGoalInfoList.length).toBeGreaterThan(0);
  }, 300000); // 5 minuter timeout
});

