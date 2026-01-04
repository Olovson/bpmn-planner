#!/usr/bin/env vitest
/**
 * Batch improve Feature Goal HTML files using LLM
 * 
 * Usage:
 *   npm run improve:feature-goals:batch [--dry-run] [--resume] [--file <filename>]
 * 
 * This test file can be run as a script to improve Feature Goal HTML files.
 * It's structured as a test to avoid path-intersection module resolution issues.
 * 
 * @vitest-environment jsdom
 */

import { describe, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, join, dirname, basename } from 'path';
import { readFile, readdir, writeFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { BpmnProcessGraph } from '../../src/lib/bpmnProcessGraph';
import { buildBpmnProcessGraph } from '../../src/lib/bpmnProcessGraph';
import { buildNodeDocumentationContext, type NodeDocumentationContext } from '../../src/lib/documentationContext';
import { renderFeatureGoalDoc } from '../../src/lib/documentationTemplates';
import type { TemplateLinks } from '../../src/lib/documentationTemplates';
import { getLlmClient, getDefaultLlmProvider, type LlmProvider } from '../../src/lib/llmClients';
import { resolveLlmProvider } from '../../src/lib/llmProviderResolver';
import { getLlmProfile, type DocType } from '../../src/lib/llmProfiles';
import type { BpmnProcessNode } from '../../src/lib/bpmnProcessGraph';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appEnv = process.env.VITE_APP_ENV || 'production';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

// SAFETY CHECK: Ensure tests use the test Supabase project when in test mode
const KNOWN_TEST_SUPABASE_URL = 'https://jxtlfdanzclcmtsgsrdd.supabase.co';
if (appEnv === 'test' && !supabaseUrl.includes('jxtlfdanzclcmtsgsrdd')) {
  throw new Error(
    `SAFETY CHECK FAILED: VITE_APP_ENV=test but VITE_SUPABASE_URL does not point to test project!\n` +
    `  Expected: ${KNOWN_TEST_SUPABASE_URL}\n` +
    `  Got: ${supabaseUrl}\n` +
    `  Check your .env.test file.`
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const EXPORT_DIR = resolve(__dirname, '../../exports/feature-goals');
const IMPROVED_DIR = resolve(__dirname, '../../local-html-improvements/feature-goals');
const METADATA_FILE = join(IMPROVED_DIR, 'metadata.json');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const resume = args.includes('--resume');
const fileIndex = args.indexOf('--file');
const specificFile = fileIndex >= 0 && args[fileIndex + 1] ? args[fileIndex + 1] : null;

interface ImprovementMetadata {
  file: string;
  bpmnFile: string;
  elementId: string;
  improvedAt: string;
  improvedBy: string;
  llmPromptVersion: string;
  llmProvider?: string;
  llmModel?: string;
  originalPath: string;
  notes?: string;
}

interface MetadataStore {
  improvements: ImprovementMetadata[];
}

/**
 * Parse filename to extract BPMN file, element ID, and version
 */
function parseFilename(filename: string): {
  bpmnFile: string;
  elementId: string;
  version: 'v1' | 'v2' | undefined;
} | null {
  const cleanName = filename.replace(/^[^-]+--/, '');
  const baseName = cleanName.replace(/\.html$/, '');
  const versionMatch = baseName.match(/-v([12])$/);
  const version = versionMatch ? (versionMatch[1] === '2' ? 'v2' : 'v1') : undefined;
  const nameWithoutVersion = version ? baseName.replace(/-v[12]$/, '') : baseName;
  const parts = nameWithoutVersion.split('-');
  if (parts.length < 2) {
    console.warn(`⚠️  Could not parse filename: ${filename}`);
    return null;
  }
  
  let bpmnFile = '';
  let elementId = '';
  
  for (let i = 1; i < parts.length; i++) {
    const potentialBpmnFile = parts.slice(0, i).join('-');
    const potentialElementId = parts.slice(i).join('-');
    
    if (potentialBpmnFile && potentialElementId) {
      bpmnFile = potentialBpmnFile;
      elementId = potentialElementId;
      break;
    }
  }
  
  if (!bpmnFile || !elementId) {
    console.warn(`⚠️  Could not extract bpmnFile and elementId from: ${filename}`);
    return null;
  }
  
  return {
    bpmnFile: `${bpmnFile}.bpmn`,
    elementId,
    version,
  };
}

/**
 * Load existing metadata
 */
async function loadMetadata(): Promise<MetadataStore> {
  if (!existsSync(METADATA_FILE)) {
    return { improvements: [] };
  }
  
  try {
    const content = await readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Could not load metadata, starting fresh:', error);
    return { improvements: [] };
  }
}

/**
 * Save metadata
 */
async function saveMetadata(metadata: MetadataStore): Promise<void> {
  await writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
}

/**
 * Check if file already has improved version
 */
function isAlreadyImproved(filename: string, metadata: MetadataStore): boolean {
  return metadata.improvements.some(imp => imp.file === filename);
}

/**
 * Get BPMN files from fixtures
 * Includes the latest files in "mortgage-se 2025.11.29" folder
 */
async function getBpmnFiles(): Promise<string[]> {
  const fixturesDir = resolve(__dirname, '../fixtures/bpmn');
  const analyticsDir = resolve(__dirname, '../fixtures/bpmn/analytics');
  const latestDir = resolve(__dirname, '../fixtures/bpmn/mortgage-se 2025.11.29');
  const files: string[] = [];
  
  // Check latest directory first (most recent files)
  if (existsSync(latestDir)) {
    const latestFiles = await readdir(latestDir);
    files.push(...latestFiles.filter(f => f.endsWith('.bpmn')).map(f => join(latestDir, f)));
  }
  
  // Check main fixtures directory
  if (existsSync(fixturesDir)) {
    const mainFiles = await readdir(fixturesDir);
    // Filter out directories (like "mortgage-se 2025.11.29" and "analytics")
    for (const item of mainFiles) {
      const itemPath = join(fixturesDir, item);
      const itemStat = await stat(itemPath);
      if (itemStat.isFile() && item.endsWith('.bpmn')) {
        files.push(itemPath);
      }
    }
  }
  
  // Check analytics subdirectory
  if (existsSync(analyticsDir)) {
    const analyticsFiles = await readdir(analyticsDir);
    files.push(...analyticsFiles.filter(f => f.endsWith('.bpmn')).map(f => join(analyticsDir, f)));
  }
  
  return files;
}

/**
 * Creates a data URL from XML content for parseBpmnFile to use
 */
function createBpmnDataUrl(xml: string): string {
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

/**
 * Build BPMN graph from all BPMN files
 * Uses the same approach as print-bpmn-tree.test.ts but converts to BpmnProcessGraph format
 */
async function buildGraph(): Promise<BpmnProcessGraph> {
  console.log('📊 Building BPMN process graph (reused for all files)...');
  const bpmnFiles = await getBpmnFiles();
  
  if (bpmnFiles.length === 0) {
    throw new Error('No BPMN files found in fixtures/bpmn/');
  }
  
  const rootFile = bpmnFiles.find(f => f.includes('mortgage.bpmn')) || bpmnFiles[0];
  const rootFileName = basename(rootFile);
  
  console.log(`   Root file: ${rootFileName}`);
  console.log(`   Total files: ${bpmnFiles.length}`);
  
  // Step 1: Parse all BPMN files using data URLs (same as print-bpmn-tree.test.ts)
  const { parseBpmnFile } = await import('../../src/lib/bpmnParser');
  const parseResults = new Map();
  
  for (const filePath of bpmnFiles) {
    const fileName = basename(filePath);
    try {
      const xml = await readFile(filePath, 'utf-8');
      const dataUrl = createBpmnDataUrl(xml);
      const result = await parseBpmnFile(dataUrl);
      parseResults.set(fileName, result);
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
    }
  }
  
  if (parseResults.size === 0) {
    throw new Error('No files were successfully parsed');
  }
  
  // Step 2: Build ProcessGraph (same as print-bpmn-tree.test.ts)
  const { buildProcessGraph } = await import('../../src/lib/bpmn/processGraphBuilder');
  const { buildProcessTreeFromGraph } = await import('../../src/lib/bpmn/processTreeBuilder');
  const { loadBpmnMap } = await import('../../src/lib/bpmn/bpmnMapLoader');
  const bpmnMapJson = await import('../../bpmn-map.json');
  const bpmnMapData = loadBpmnMap(bpmnMapJson.default);
  
  const processGraph = buildProcessGraph(parseResults, {
    bpmnMap: bpmnMapData,
    preferredRootProcessId: bpmnMapData.rootProcessId || 'mortgage',
  });
  
  // Step 3: Build ProcessTree (same as print-bpmn-tree.test.ts)
  const tree = buildProcessTreeFromGraph(processGraph, {
    rootProcessId: bpmnMapData.rootProcessId || 'mortgage',
    preferredRootFile: bpmnMapData.rootFile || rootFileName,
    artifactBuilder: () => [],
  });
  
  // Step 4: Convert ProcessTree to BpmnProcessGraph format
  // This is safe because we're only converting the structure, not changing logic
  const allNodes = new Map<string, BpmnProcessNode>();
  const fileNodes = new Map<string, BpmnProcessNode[]>();
  
  // Helper to convert ProcessTreeNode to BpmnProcessNode
  function convertTreeNode(treeNode: any): BpmnProcessNode {
    const nodeId = treeNode.id || `${treeNode.bpmnFile}-${treeNode.bpmnElementId}`;
    const bpmnNode: BpmnProcessNode = {
      id: nodeId,
      name: treeNode.label || '',
      type: treeNode.type as BpmnProcessNode['type'],
      bpmnFile: treeNode.bpmnFile || rootFileName,
      bpmnElementId: treeNode.bpmnElementId || '',
      orderIndex: treeNode.orderIndex,
      visualOrderIndex: treeNode.visualOrderIndex,
      branchId: treeNode.branchId,
      scenarioPath: treeNode.scenarioPath,
      children: [],
    };
    
    allNodes.set(nodeId, bpmnNode);
    
    if (bpmnNode.bpmnFile) {
      if (!fileNodes.has(bpmnNode.bpmnFile)) {
        fileNodes.set(bpmnNode.bpmnFile, []);
      }
      fileNodes.get(bpmnNode.bpmnFile)!.push(bpmnNode);
    }
    
    // Convert children recursively
    if (treeNode.children && Array.isArray(treeNode.children)) {
      for (const child of treeNode.children) {
        const childBpmnNode = convertTreeNode(child);
        bpmnNode.children.push(childBpmnNode);
      }
    }
    
    return bpmnNode;
  }
  
  const root = convertTreeNode(tree);
  
  const bpmnGraph: BpmnProcessGraph = {
    rootFile: rootFileName,
    root,
    allNodes,
    fileNodes,
    missingDependencies: [],
  };
  
  console.log(`✅ Graph built: ${bpmnGraph.allNodes.size} nodes (will be reused for all files)\n`);
  return bpmnGraph;
}

/**
 * Find node in graph by bpmnFile and elementId
 */
function findNodeInGraph(
  graph: BpmnProcessGraph,
  bpmnFile: string,
  elementId: string
): string | null {
  for (const [nodeId, node] of graph.allNodes.entries()) {
    if (node.bpmnFile === bpmnFile && node.bpmnElementId === elementId) {
      return nodeId;
    }
  }
  return null;
}

// Helper functions for buildContextPayload
function formatNodeName(node: BpmnProcessNode) {
  return node.name || node.bpmnElementId || node.id;
}

function findAncestorOfType(trail: BpmnProcessNode[], type: string): BpmnProcessNode | undefined {
  return trail.find((node) => node.type === type);
}

function buildDescendantPathSummaries(node: BpmnProcessNode): string[] {
  return [];
}

function buildJiraNameFromTrail(trail: BpmnProcessNode[]): string {
  if (trail.length === 0) return '';
  const lastNode = trail[trail.length - 1];
  return formatNodeName(lastNode);
}

function inferJiraType(nodeType: string): string {
  if (nodeType === 'callActivity') return 'feature goal';
  if (nodeType === 'businessRuleTask') return 'epic (business rule)';
  return 'epic';
}

function inferPhase(node: BpmnProcessNode): string {
  return '';
}

function inferLane(node: BpmnProcessNode): string {
  return '';
}

function extractFlowRefs(flows: any, direction: string): string[] {
  if (!flows || !Array.isArray(flows)) return [];
  return flows.map((flow: any) => flow?.id || '').filter(Boolean);
}

function extractDocumentationSnippets(element: any): string[] {
  if (!element?.businessObject?.documentation) return [];
  const docs = Array.isArray(element.businessObject.documentation)
    ? element.businessObject.documentation
    : [element.businessObject.documentation];
  return docs.map((doc: any) => doc?.text || '').filter(Boolean);
}

function buildContextPayload(context: NodeDocumentationContext, links: TemplateLinks) {
  const parentChain = context.parentChain || [];
  const trail = [...parentChain, context.node];
  const hierarchyTrail = trail.map((node) => ({
    id: node.bpmnElementId,
    name: formatNodeName(node),
    type: node.type,
    file: node.bpmnFile,
  }));
  const hierarchyPath = hierarchyTrail.map((node) => `${node.name} (${node.type})`).join(' → ');
  const featureGoalAncestor = findAncestorOfType(trail, 'callActivity');
  const descendantTypeCounts = context.descendantNodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});
  const descendantPaths = buildDescendantPathSummaries(context.node);
  const derivedJiraName = buildJiraNameFromTrail(trail);
  const nodeJiraType = inferJiraType(context.node.type);

  const incomingFlows = extractFlowRefs(context.node.element?.businessObject?.incoming, 'incoming');
  const outgoingFlows = extractFlowRefs(context.node.element?.businessObject?.outgoing, 'outgoing');
  const documentationSnippets = extractDocumentationSnippets(context.node.element);

  const mapPhaseAndLane = (node: BpmnProcessNode) => ({
    phase: inferPhase(node),
    lane: inferLane(node),
  });

  const processContext = {
    processName: hierarchyTrail[0]?.name || context.node.bpmnFile || 'Okänd process',
    fileName: context.node.bpmnFile,
    entryPoints: hierarchyTrail.length
      ? [
          {
            ...hierarchyTrail[0],
            ...mapPhaseAndLane(context.parentChain[0] || context.node),
          },
        ]
      : [],
    endPoints: [],
    keyNodes: [
      ...hierarchyTrail,
      ...context.childNodes.map((node) => ({
        id: node.bpmnElementId,
        name: formatNodeName(node),
        type: node.type,
        file: node.bpmnFile,
      })),
    ]
      .filter((n, index, arr) => n && n.id && arr.findIndex((m) => m.id === n.id) === index)
      .map((n) => ({
        ...n,
        ...mapPhaseAndLane(
          n.id === context.node.bpmnElementId
            ? context.node
            : context.childNodes.find((c) => c.bpmnElementId === n.id) ||
              context.parentChain.find((p) => p.bpmnElementId === n.id) ||
              context.node,
        ),
      }))
      .slice(0, 12),
  };

  const currentNodeContext = {
    node: {
      id: context.node.bpmnElementId,
      name: context.node.name,
      type: context.node.type,
      file: context.node.bpmnFile,
      jiraType: nodeJiraType,
      derivedJiraName,
    },
    hierarchy: {
      trail: hierarchyTrail,
      pathLabel: hierarchyPath,
      depthFromRoot: hierarchyTrail.length - 1,
      featureGoalAncestor,
      parentProcess: hierarchyTrail[0],
    },
    parents: context.parentChain.map((node) => ({
      id: node.bpmnElementId,
      name: node.name,
      type: node.type,
    })),
    siblings: context.siblingNodes.map((node) => ({
      id: node.bpmnElementId,
      name: node.name,
      type: node.type,
    })),
    children: context.childNodes.map((node) => ({
      id: node.bpmnElementId,
      name: node.name,
      type: node.type,
    })),
    descendantHighlights: descendantPaths.slice(0, 10),
    descendantTypeCounts,
    flows: {
      incoming: incomingFlows,
      outgoing: outgoingFlows,
    },
    documentation: documentationSnippets,
    jiraGuidance: {
      hierarchy: 'Projekt → Initiativ → Feature Goal → Epic → Stories',
      nodeJiraType,
      derivedJiraName,
      notes:
        nodeJiraType === 'feature goal'
          ? 'Feature Goals är multi-team leveranser och bör beskriva flera epics.'
          : 'Epics ägs av ett team och ska länka vidare till stories/tester.',
    },
    links,
  };

  return { processContext, currentNodeContext };
}

function buildSystemPrompt(basePrompt: string, extraPrefix?: string): string {
  if (extraPrefix) {
    return `${extraPrefix}\n\n${basePrompt}`;
  }
  return basePrompt;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateFeatureGoalJson(json: unknown, provider: LlmProvider): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json || typeof json !== 'object') {
    return {
      valid: false,
      errors: ['Response is not a JSON object'],
      warnings: [],
    };
  }

  const obj = json as Record<string, unknown>;

  const requiredFields = [
    'summary',
    'effectGoals',
    'scopeIncluded',
    'scopeExcluded',
    'epics',
    'flowSteps',
    'dependencies',
    'scenarios',
    'testDescription',
    'implementationNotes',
    'relatedItems',
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if ('epics' in obj && !Array.isArray(obj.epics)) {
    errors.push('Field "epics" must be an array');
  }

  if ('scenarios' in obj && !Array.isArray(obj.scenarios)) {
    errors.push('Field "scenarios" must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Read prompt file directly (since ?raw import doesn't work in tsx)
const PROMPT_FILE = resolve(__dirname, '../../prompts/llm/feature_epic_prompt.md');
let cachedPrompt: string | null = null;

async function getFeaturePrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  cachedPrompt = await readFile(PROMPT_FILE, 'utf-8');
  return cachedPrompt;
}

/**
 * Improve a single Feature Goal HTML file
 */
async function improveFile(
  filename: string,
  graph: BpmnProcessGraph,
  metadata: MetadataStore
): Promise<boolean> {
  const parsed = parseFilename(filename);
  if (!parsed) {
    return false;
  }
  
  const { bpmnFile, elementId } = parsed;
  
  if (resume && isAlreadyImproved(filename, metadata)) {
    console.log(`⏭️  Skipping ${filename} (already improved)`);
    return true;
  }
  
  console.log(`\n📝 Processing: ${filename}`);
  console.log(`   BPMN: ${bpmnFile}, Element: ${elementId}`);
  
  const nodeId = findNodeInGraph(graph, bpmnFile, elementId);
  if (!nodeId) {
    console.warn(`   ⚠️  Node not found in graph: ${bpmnFile}::${elementId}`);
    return false;
  }
  
  const context = buildNodeDocumentationContext(graph, nodeId);
  if (!context) {
    console.warn(`   ⚠️  Could not build context for node: ${nodeId}`);
    return false;
  }
  
  const links: TemplateLinks = {
    bpmnViewerLink: `#/bpmn/${bpmnFile}`,
    dorLink: undefined,
    testLink: undefined,
    dmnLink: undefined,
  };
  
  if (dryRun) {
    console.log(`   ✅ Would improve with LLM (dry-run mode)`);
    return true;
  }
  
  console.log(`   🤖 Generating improved content with LLM...`);
  
  const basePrompt = await getFeaturePrompt();
  const { processContext, currentNodeContext } = buildContextPayload(context, links);
  const llmInput = {
    type: 'Feature',
    processContext,
    currentNodeContext,
  };
  const userPrompt = JSON.stringify(llmInput, null, 2);
  
  const globalDefault = getDefaultLlmProvider();
  const resolution = resolveLlmProvider({
    userChoice: 'cloud' as LlmProvider,
    globalDefault,
    localAvailable: false,
    allowFallback: true,
  });
  
  const profile = getLlmProfile('feature' as DocType, resolution.chosen);
  const llmClient = getLlmClient(resolution.chosen);
  const fullSystemPrompt = buildSystemPrompt(basePrompt, profile.extraSystemPrefix);
  
  const response = await llmClient.generateText({
    systemPrompt: fullSystemPrompt,
    userPrompt,
    maxTokens: profile.maxTokens,
    temperature: profile.temperature,
  });
  
  if (!response) {
    console.warn(`   ⚠️  LLM generation failed or returned no content`);
    return false;
  }
  
  let docJson: unknown;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const validation = validateFeatureGoalJson(parsed, resolution.chosen);
    if (!validation.valid) {
      console.warn(`   ⚠️  LLM response validation failed: ${validation.errors.join(', ')}`);
      return false;
    }
    docJson = parsed;
  } catch (error) {
    console.warn(`   ⚠️  Failed to parse LLM response:`, error);
    return false;
  }
  
  console.log(`   🎨 Rendering to HTML...`);
  const llmMetadata = {
    llmMetadata: {
      provider: llmClient.provider,
      model: llmClient.modelName,
    },
    fallbackUsed: false,
    finalProvider: resolution.chosen,
  };
  
  const improvedHtml = await renderFeatureGoalDoc(
    context,
    links,
    JSON.stringify(docJson),
    llmMetadata
  );
  
  const improvedFilename = filename;
  const improvedPath = join(IMPROVED_DIR, improvedFilename);
  const originalPath = join(EXPORT_DIR, filename);
  
  const originalBackupPath = join(IMPROVED_DIR, `${basename(filename, '.html')}.original.html`);
  if (existsSync(originalPath)) {
    const originalContent = await readFile(originalPath, 'utf-8');
    await writeFile(originalBackupPath, originalContent, 'utf-8');
  }
  
  await writeFile(improvedPath, improvedHtml, 'utf-8');
  
  const improvement: ImprovementMetadata = {
    file: improvedFilename,
    bpmnFile,
    elementId,
    improvedAt: new Date().toISOString(),
    improvedBy: 'AI Assistant (Batch)',
    llmPromptVersion: '1.0.0',
    llmProvider: llmClient.provider,
    llmModel: llmClient.modelName,
    originalPath: `exports/feature-goals/${filename}`,
    notes: 'Batch improved using LLM prompt',
  };
  
  metadata.improvements.push(improvement);
  await saveMetadata(metadata);
  
  console.log(`   ✅ Saved improved version: ${improvedFilename}`);
  return true;
}

describe('Improve Feature Goals Batch', () => {
  it('should improve Feature Goal HTML files', async () => {
    console.log('🚀 Starting batch Feature Goal improvement...\n');
    
    if (specificFile) {
      console.log(`📌 SINGLE FILE MODE: Processing only "${specificFile}"\n`);
    }
    
    if (dryRun) {
      console.log('🔍 DRY-RUN MODE: No files will be modified\n');
    }
    
    if (resume) {
      console.log('▶️  RESUME MODE: Skipping already improved files\n');
    }
    
    if (!existsSync(EXPORT_DIR)) {
      throw new Error(`Export directory not found: ${EXPORT_DIR}\nRun "npm run export:feature-goals" first`);
    }
    
    if (!existsSync(IMPROVED_DIR)) {
      await mkdir(IMPROVED_DIR, { recursive: true });
      console.log(`📁 Created improved directory: ${IMPROVED_DIR}`);
    }
    
    const metadata = await loadMetadata();
    const graph = await buildGraph();
    
    const allFiles = await readdir(EXPORT_DIR);
    const htmlFiles = allFiles.filter(f => f.endsWith('.html') && !f.includes('README'));
    
    let filesToProcess = htmlFiles;
    
    if (specificFile) {
      const matchingFile = filesToProcess.find(f => f === specificFile || f.endsWith(specificFile));
      if (!matchingFile) {
        console.error(`❌ File not found: ${specificFile}`);
        console.error(`   Available files (${filesToProcess.length}):`);
        filesToProcess.slice(0, 10).forEach(f => console.error(`   - ${f}`));
        if (filesToProcess.length > 10) {
          console.error(`   ... and ${filesToProcess.length - 10} more`);
        }
        throw new Error(`File not found: ${specificFile}`);
      }
      filesToProcess = [matchingFile];
      console.log(`✅ Found file: ${matchingFile}\n`);
    }
    
    console.log(`📋 Found ${filesToProcess.length} file(s) to process\n`);
    
    if (filesToProcess.length === 0) {
      console.log('⚠️  No files to process');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const filename of filesToProcess) {
      try {
        const success = await improveFile(filename, graph, metadata);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${filename}:`, error);
        errorCount++;
      }
      
      if (!dryRun) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Batch Improvement Summary:');
    console.log(`   ✅ Successfully improved: ${successCount} file(s)`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} file(s)`);
    }
    console.log(`   📁 Improved files: ${IMPROVED_DIR}`);
    console.log(`   📄 Metadata: ${METADATA_FILE}`);
    console.log('='.repeat(60));
  }, { timeout: 600000 }); // 10 minute timeout
});

