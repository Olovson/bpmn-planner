/**
 * Codex Batch Override Generation Helper
 * 
 * This module provides utilities for Codex to batch-generate override content
 * for multiple nodes, reusing the exact same prompts and logic as the ChatGPT API path.
 * 
 * Usage from Codex:
 * 1. Call `findOverrideFiles()` to get a list of override files in a scope
 * 2. For each file, call `parseOverrideFileContext()` to extract node metadata
 * 3. Call `buildLlmRequestForOverride()` to get the same prompt/context that ChatGPT would use
 * 4. Generate content using Codex (you, the AI assistant)
 * 5. Call `mapLlmResponseToOverrides()` to convert the response to override format
 * 6. Use `updateOverrideFile()` to write the content back to the file
 * 
 * This ensures that Codex-generated content uses the same prompts and follows the same
 * structure as ChatGPT-generated content, maintaining consistency across the pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DocumentationDocType } from './llmDocumentation';
import {
  getPromptForDocType,
  buildLlmRequestStructure,
  mapLlmResponseToModel,
  normalizeDocType,
  inferDocTypeFromNodeType,
} from './llmDocumentationShared';
import type { NodeDocumentationContext } from './documentationContext';
import type { BpmnProcessNode } from './bpmnProcessGraph';
import type { TemplateLinks } from './documentationTemplates';
import { getOverridePromptVersion } from './promptVersioning';
import type {
  FeatureGoalDocOverrides,
  EpicDocOverrides,
  BusinessRuleDocOverrides,
} from './nodeDocOverrides';
import type {
  FeatureGoalDocModel,
  FeatureGoalLlmSections,
} from './featureGoalLlmTypes';
import type { EpicDocModel } from './epicDocTypes';
import type { BusinessRuleDocModel } from './businessRuleDocTypes';

// ============================================================================
// Override File Discovery
// ============================================================================

export interface OverrideFileInfo {
  filePath: string;
  docType: DocumentationDocType;
  bpmnFile: string;
  elementId: string;
  nodeType: string;
}

/**
 * Finds all override files in a given scope.
 * 
 * @param scope - Either a directory path (e.g., 'src/data/node-docs/epic') or a BPMN file name (e.g., 'mortgage-se-application.bpmn')
 * @param projectRoot - Root directory of the project (defaults to process.cwd())
 * @returns Array of override file information
 */
export function findOverrideFiles(
  scope: string,
  projectRoot: string = process.cwd()
): OverrideFileInfo[] {
  const results: OverrideFileInfo[] = [];
  const nodeDocsRoot = path.join(projectRoot, 'src', 'data', 'node-docs');

  // If scope is a BPMN file name, search all docType folders for matching files
  if (scope.endsWith('.bpmn')) {
    const bpmnBaseName = scope.replace('.bpmn', '');
    const docTypes = ['feature-goal', 'epic', 'business-rule'];

    for (const docType of docTypes) {
      const docTypeDir = path.join(nodeDocsRoot, docType);
      if (!fs.existsSync(docTypeDir)) continue;

      const files = fs.readdirSync(docTypeDir);
      for (const file of files) {
        if (file.endsWith('.doc.ts') && file.startsWith(`${bpmnBaseName}.`)) {
          const elementId = file
            .replace(`${bpmnBaseName}.`, '')
            .replace('.doc.ts', '');
          const normalizedDocType = normalizeDocType(docType);
          if (normalizedDocType) {
            results.push({
              filePath: path.join(docTypeDir, file),
              docType: normalizedDocType,
              bpmnFile: scope,
              elementId,
              nodeType: '', // Will be parsed from file
            });
          }
        }
      }
    }
  } else {
    // Scope is a directory path
    const targetDir = path.isAbsolute(scope)
      ? scope
      : path.join(projectRoot, scope);

    if (!fs.existsSync(targetDir)) {
      return results;
    }

    const files = fs.readdirSync(targetDir);
    for (const file of files) {
      if (file.endsWith('.doc.ts')) {
        // Extract bpmnFile and elementId from filename: <bpmnBaseName>.<elementId>.doc.ts
        const parts = file.replace('.doc.ts', '').split('.');
        if (parts.length >= 2) {
          const elementId = parts[parts.length - 1];
          const bpmnBaseName = parts.slice(0, -1).join('.');
          const bpmnFile = `${bpmnBaseName}.bpmn`;

          // Infer docType from directory name
          const dirName = path.basename(targetDir);
          const normalizedDocType = normalizeDocType(dirName);
          if (normalizedDocType) {
            results.push({
              filePath: path.join(targetDir, file),
              docType: normalizedDocType,
              bpmnFile,
              elementId,
              nodeType: '', // Will be parsed from file
            });
          }
        }
      }
    }
  }

  return results;
}

// ============================================================================
// Override File Parsing
// ============================================================================

export interface ParsedOverrideContext {
  bpmnFile: string;
  elementId: string;
  docType: DocumentationDocType;
  nodeType: string;
  existingOverrides: FeatureGoalDocOverrides | EpicDocOverrides | BusinessRuleDocOverrides | null;
}

/**
 * Parses an override file to extract node context and existing overrides.
 * Reads the NODE CONTEXT comment block and the existing overrides object.
 */
export function parseOverrideFileContext(
  filePath: string
): ParsedOverrideContext | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse NODE CONTEXT comment
  const contextMatch = content.match(
    /bpmnFile:\s*([^\n]+)\s*\n\s*elementId:\s*([^\n]+)\s*\n\s*type:\s*([^\n]+)/
  );
  if (!contextMatch) {
    return null;
  }

  const bpmnFile = contextMatch[1].trim();
  const elementId = contextMatch[2].trim();
  const nodeType = contextMatch[3].trim();
  const docType = normalizeDocType(nodeType) || inferDocTypeFromNodeType(nodeType);

  if (!docType) {
    return null;
  }

  // Try to parse existing overrides (this is best-effort, may fail on complex cases)
  // For Codex, we'll work with the file content directly rather than trying to parse TypeScript
  let existingOverrides: any = null;
  try {
    // Extract the overrides object using regex (simple approach for Codex)
    const overridesMatch = content.match(/export\s+const\s+overrides[^=]*=\s*({[\s\S]*?});/);
    if (overridesMatch) {
      // We'll let Codex handle the actual parsing/updating
      existingOverrides = {}; // Placeholder - Codex will read the file directly
    }
  } catch {
    // Ignore parsing errors - Codex will handle the file directly
  }

  return {
    bpmnFile,
    elementId,
    docType,
    nodeType,
    existingOverrides,
  };
}

// ============================================================================
// LLM Request Building (for Codex)
// ============================================================================

/**
 * Builds the LLM request structure that Codex should use to generate content.
 * This is the exact same structure that would be sent to ChatGPT.
 * 
 * Note: This requires a full NodeDocumentationContext, which typically requires
 * building a BpmnProcessGraph. For Codex batch operations, you may need to:
 * 1. Load the BPMN graph from files (if available in the environment)
 * 2. Or provide a simplified context based on the override file metadata
 * 
 * This function is provided for completeness, but in practice, Codex may need
 * to work with the prompt and context information in a different way.
 */
export interface CodexGenerationInstructions {
  systemPrompt: string;
  userPrompt: string;
  docType: DocumentationDocType;
  expectedOutputFormat: string;
  _contextType?: 'full' | 'minimal'; // Internal: indicates whether full or minimal context was used
}

/**
 * Builds a minimal NodeDocumentationContext from override file metadata.
 * This is used as a fallback when full context cannot be built.
 * 
 * Note: This creates a minimal context without full BPMN graph structure.
 * For production, we should use buildFullNodeContext() instead.
 */
function buildMinimalNodeContext(
  context: ParsedOverrideContext
): NodeDocumentationContext {
  const { bpmnFile, elementId, nodeType } = context;
  
  // Create a minimal BpmnProcessNode
  const node: BpmnProcessNode = {
    id: elementId,
    bpmnElementId: elementId,
    name: elementId, // Will be improved if we can read from BPMN file
    type: nodeType as any,
    bpmnFile,
    children: [],
    element: undefined, // Not available in batch context
  };

  return {
    node,
    parentChain: [],
    childNodes: [],
    siblingNodes: [],
    descendantNodes: [],
  };
}

/**
 * Builds a full NodeDocumentationContext by loading BPMN files and building the graph.
 * This provides the same rich context that ChatGPT/Ollama uses.
 * 
 * ⚠️ BEGRÄNSNING: Denna funktion fungerar INTE i Node.js batch-kontexten eftersom
 * `parseBpmnFile` använder `fetch()` för web-URLs. Den kommer alltid returnera null
 * i batch-kontexten och fallback till minimal kontext.
 * 
 * För att få full kontext i batch-kontexten behöver vi:
 * 1. En Node.js-variant av `parseBpmnFile` som läser från filsystemet
 * 2. Eller en adapter som konverterar filsystem-paths till web-URLs
 * 
 * @param context - Parsed override context with bpmnFile and elementId
 * @param projectRoot - Root directory of the project
 * @returns Full NodeDocumentationContext, or null if building fails
 */
async function buildFullNodeContext(
  context: ParsedOverrideContext,
  projectRoot: string
): Promise<NodeDocumentationContext | null> {
  // ⚠️ KRITISKT: Denna funktion fungerar INTE i Node.js batch-kontexten
  // eftersom parseBpmnFile använder fetch() för web-URLs.
  // Vi returnerar null direkt så att vi fallback till minimal kontext.
  // Detta är en känd begränsning som behöver fixas för full kontext i batch.
  
  // TODO: Implementera Node.js-variant av parseBpmnFile som läser från filsystemet
  // eller skapa en adapter som konverterar filsystem-paths till web-URLs
  
  return null;
  
  /* ORIGINAL IMPLEMENTATION (kommer inte köras i batch-kontexten):
  try {
    // Check if we're in a Node.js environment with file system access
    if (typeof require === 'undefined' || !fs.existsSync) {
      console.warn(`[Codex] Not in Node.js environment, using minimal context`);
      return null;
    }

    // Import dynamically to avoid issues in non-Node environments
    const { buildBpmnProcessGraph } = await import('./bpmnProcessGraph');
    const { buildNodeDocumentationContext } = await import('./documentationContext');
    
    // Find all BPMN files in the project
    const bpmnFiles = findBpmnFiles(projectRoot);
    if (bpmnFiles.length === 0) {
      console.warn(`[Codex] No BPMN files found, using minimal context`);
      return null;
    }

    // NOTE: buildBpmnProcessGraph uses parseBpmnFile which expects web URLs (/bpmn/...)
    // In Node.js batch context, this will FAIL because parseBpmnFile uses fetch()
    // which doesn't work with file system paths.
    
    try {
      // Build the graph using the node's BPMN file as root
      const graph = await buildBpmnProcessGraph(context.bpmnFile, bpmnFiles);
      
      // Find the node in the graph
      const nodeId = context.elementId;
      let nodeContext = buildNodeDocumentationContext(graph, nodeId);
      
      if (!nodeContext) {
        // Try alternative ID formats
        const alternativeIds = [
          `${context.bpmnFile}::${context.elementId}`,
          `root:${context.bpmnFile}::${context.elementId}`,
        ];
        
        for (const altId of alternativeIds) {
          nodeContext = buildNodeDocumentationContext(graph, altId);
          if (nodeContext) {
            break;
          }
        }
      }
      
      if (!nodeContext) {
        // Search all nodes for matching elementId
        for (const [id, node] of graph.allNodes.entries()) {
          if (node.bpmnElementId === context.elementId && node.bpmnFile === context.bpmnFile) {
            nodeContext = buildNodeDocumentationContext(graph, id);
            if (nodeContext) {
              break;
            }
          }
        }
      }
      
      if (!nodeContext) {
        console.warn(`[Codex] Node ${context.elementId} not found in graph, using minimal context`);
        return null;
      }
      
      console.log(`[Codex] Successfully built full context for ${context.bpmnFile}::${context.elementId}`);
      return nodeContext;
    } catch (graphError) {
      // buildBpmnProcessGraph will fail in Node.js batch context because parseBpmnFile uses fetch()
      console.warn(`[Codex] Failed to build graph (parseBpmnFile uses fetch() which doesn't work in Node.js batch context): ${graphError instanceof Error ? graphError.message : String(graphError)}`);
      return null;
    }
  } catch (error) {
    console.warn(`[Codex] Failed to build full context: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  */
}

/**
 * Finds all BPMN files in the project.
 */
function findBpmnFiles(projectRoot: string): string[] {
  const fs = require('fs');
  const path = require('path');
  
  const candidateDirs = [
    path.join(projectRoot, 'public', 'bpmn'),
    path.join(projectRoot, 'tests', 'fixtures', 'bpmn'),
  ];
  
  const bpmnFiles: string[] = [];
  
  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.bpmn')) {
          bpmnFiles.push(file);
        }
      }
    } catch (error) {
      // Ignore errors reading directory
    }
  }
  
  return bpmnFiles;
}

/**
 * Provides generation instructions for Codex based on an override file context.
 * 
 * ⚠️ VIKTIGT: Denna funktion använder SAMMA pipeline som ChatGPT/Ollama:
 * - Samma prompt (via getPromptForDocType())
 * - Samma kontext-struktur (via buildLlmRequestStructure())
 * - Samma response-mapping (via mapLlmResponseToModel())
 * 
 * BEGRÄNSNING: Full kontext fungerar INTE i Node.js batch-kontexten eftersom
 * `parseBpmnFile` använder `fetch()` för web-URLs. Den kommer alltid använda
 * minimal kontext i batch-kontexten.
 * 
 * För att få full kontext i batch-kontexten behöver vi:
 * 1. En Node.js-variant av `parseBpmnFile` som läser från filsystemet
 * 2. Eller en adapter som konverterar filsystem-paths till web-URLs
 * 
 * @param context - Parsed override context
 * @param options - Options for context building
 * @param options.useFullContext - If true, attempt to build full context (default: true, men kommer inte fungera i batch)
 * @param options.projectRoot - Root directory of the project (default: process.cwd())
 * @returns Generation instructions with prompt and context
 */
export async function getCodexGenerationInstructions(
  context: ParsedOverrideContext,
  options: {
    useFullContext?: boolean;
    projectRoot?: string;
  } = {}
): Promise<CodexGenerationInstructions> {
  const { docType } = context;
  const { useFullContext = true, projectRoot = typeof process !== 'undefined' ? process.cwd() : '' } = options;

  // Try to build full context first (production mode)
  // This gives Codex the same rich context as ChatGPT/Ollama
  let nodeContext: NodeDocumentationContext | null = null;
  let contextType: 'full' | 'minimal' = 'minimal';
  
  if (useFullContext) {
    nodeContext = await buildFullNodeContext(context, projectRoot);
    if (nodeContext) {
      contextType = 'full';
    }
  }
  
  // Fall back to minimal context if full context is not available
  // This is acceptable for tests but not ideal for production
  if (!nodeContext) {
    nodeContext = buildMinimalNodeContext(context);
    if (useFullContext) {
      console.warn(`[Codex] Using minimal context for ${context.bpmnFile}::${context.elementId}. Full context preferred for production.`);
    }
  }

  const links: TemplateLinks = {
    bpmnViewerLink: `#/bpmn/${context.bpmnFile}`,
    dorLink: undefined,
    testLink: undefined,
  };

  // Use the SAME function that ChatGPT/Ollama uses!
  const requestStructure = buildLlmRequestStructure(docType, nodeContext, links);

  // If using minimal context, add a warning to the user prompt so it's visible in the generated content
  let userPrompt = requestStructure.userPrompt;
  if (contextType === 'minimal' && useFullContext) {
    // Parse the JSON to add a warning field that will be visible in the generated content
    try {
      const promptJson = JSON.parse(userPrompt);
      // Add warning to processContext so it appears in the generated documentation
      if (!promptJson.processContext) {
        promptJson.processContext = {};
      }
      promptJson.processContext._contextWarning = '⚠️ OBS: Denna dokumentation genererades med minimal kontext (endast nod-metadata). Full kontext med hierarki, flows och relaterade noder kunde inte byggas i batch-kontexten. För bästa kvalitet, generera via ChatGPT/Ollama-pipelinen i appen där full kontext är tillgänglig.';
      userPrompt = JSON.stringify(promptJson, null, 2);
    } catch {
      // If parsing fails, prepend warning as comment
      userPrompt = `// ⚠️ OBS: Minimal kontext används - full kontext kunde inte byggas\n${userPrompt}`;
    }
  }

  return {
    systemPrompt: requestStructure.systemPrompt,
    userPrompt,
    docType,
    expectedOutputFormat: 'JSON object matching the model structure (FeatureGoalDocModel, EpicDocModel, or BusinessRuleDocModel)',
    // Include context type for debugging
    _contextType: contextType,
  };
}

// ============================================================================
// Response Mapping to Overrides
// ============================================================================

/**
 * Converts an LLM-generated model into override format.
 * Only includes fields that have content (non-empty, non-placeholder).
 */
export function mapLlmResponseToOverrides(
  docType: DocumentationDocType,
  llmModel: FeatureGoalLlmSections | EpicDocModel | BusinessRuleDocModel
): FeatureGoalDocOverrides | EpicDocOverrides | BusinessRuleDocOverrides {
  if (docType === 'feature') {
    const model = llmModel as FeatureGoalDocModel;
    const overrides: FeatureGoalDocOverrides = {};

    if (model.summary && model.summary !== 'TODO' && model.summary.trim()) {
      overrides.summary = model.summary;
    }
    if (model.effectGoals && model.effectGoals.length > 0) {
      overrides.effectGoals = model.effectGoals;
    }
    if (model.scopeIncluded && model.scopeIncluded.length > 0) {
      overrides.scopeIncluded = model.scopeIncluded;
    }
    if (model.scopeExcluded && model.scopeExcluded.length > 0) {
      overrides.scopeExcluded = model.scopeExcluded;
    }
    if (model.epics && model.epics.length > 0) {
      overrides.epics = model.epics;
    }
    if (model.flowSteps && model.flowSteps.length > 0) {
      overrides.flowSteps = model.flowSteps;
    }
    if (model.dependencies && model.dependencies.length > 0) {
      overrides.dependencies = model.dependencies;
    }
    if (model.scenarios && model.scenarios.length > 0) {
      overrides.scenarios = model.scenarios;
    }
    if (model.testDescription && model.testDescription !== 'TODO' && model.testDescription.trim()) {
      overrides.testDescription = model.testDescription;
    }
    if (model.implementationNotes && model.implementationNotes.length > 0) {
      overrides.implementationNotes = model.implementationNotes;
    }
    if (model.relatedItems && model.relatedItems.length > 0) {
      overrides.relatedItems = model.relatedItems;
    }

    return overrides;
  }

  if (docType === 'epic') {
    const model = llmModel as EpicDocModel;
    const overrides: EpicDocOverrides = {};

    if (model.summary && model.summary !== 'TODO' && model.summary.trim()) {
      overrides.summary = model.summary;
    }
    if (model.prerequisites && model.prerequisites.length > 0) {
      overrides.prerequisites = model.prerequisites;
    }
    if (model.inputs && model.inputs.length > 0) {
      overrides.inputs = model.inputs;
    }
    if (model.flowSteps && model.flowSteps.length > 0) {
      overrides.flowSteps = model.flowSteps;
    }
    if (model.interactions && model.interactions.length > 0) {
      overrides.interactions = model.interactions;
    }
    if (model.dataContracts && model.dataContracts.length > 0) {
      overrides.dataContracts = model.dataContracts;
    }
    if (model.businessRulesPolicy && model.businessRulesPolicy.length > 0) {
      overrides.businessRulesPolicy = model.businessRulesPolicy;
    }
    if (model.scenarios && model.scenarios.length > 0) {
      overrides.scenarios = model.scenarios;
    }
    if (model.testDescription && model.testDescription !== 'TODO' && model.testDescription.trim()) {
      overrides.testDescription = model.testDescription;
    }
    if (model.implementationNotes && model.implementationNotes.length > 0) {
      overrides.implementationNotes = model.implementationNotes;
    }
    if (model.relatedItems && model.relatedItems.length > 0) {
      overrides.relatedItems = model.relatedItems;
    }

    return overrides;
  }

  // businessRule
  const model = llmModel as BusinessRuleDocModel;
  const overrides: BusinessRuleDocOverrides = {};

  if (model.summary && model.summary !== 'TODO' && model.summary.trim()) {
    overrides.summary = model.summary;
  }
  if (model.inputs && model.inputs.length > 0) {
    overrides.inputs = model.inputs;
  }
  if (model.decisionLogic && model.decisionLogic.length > 0) {
    overrides.decisionLogic = model.decisionLogic;
  }
  if (model.outputs && model.outputs.length > 0) {
    overrides.outputs = model.outputs;
  }
  if (model.businessRulesPolicy && model.businessRulesPolicy.length > 0) {
    overrides.businessRulesPolicy = model.businessRulesPolicy;
  }
  if (model.scenarios && model.scenarios.length > 0) {
    overrides.scenarios = model.scenarios;
  }
  if (model.testDescription && model.testDescription !== 'TODO' && model.testDescription.trim()) {
    overrides.testDescription = model.testDescription;
  }
  if (model.implementationNotes && model.implementationNotes.length > 0) {
    overrides.implementationNotes = model.implementationNotes;
  }
  if (model.relatedItems && model.relatedItems.length > 0) {
    overrides.relatedItems = model.relatedItems;
  }

  return overrides;
}

// ============================================================================
// File Analysis Utilities
// ============================================================================

export interface FileAnalysis {
  context: {
    bpmnFile: string;
    elementId: string;
    type: string;
  } | null;
  needsUpdate: Array<{ field: string; type: string }>;
}

/**
 * Analyzes an override file to determine what needs to be updated.
 * 
 * @param filePath - Path to the override file
 * @returns Analysis with context and fields needing update
 */
export function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const needsUpdate: Array<{ field: string; type: string }> = [];
  
  // Extract NODE CONTEXT (can be on multiple lines with comments)
  // Match across multiple lines, allowing for whitespace and comments
  const contextMatch = content.match(
    /bpmnFile:\s*([^\n\r]+)[\s\S]*?elementId:\s*([^\n\r]+)[\s\S]*?type:\s*([^\n\r]+)/
  );
  
  const context = contextMatch ? {
    bpmnFile: contextMatch[1].trim(),
    elementId: contextMatch[2].trim(),
    type: contextMatch[3].trim(),
  } : null;
  
  // Find TODO placeholders (can be 'TODO' or "TODO")
  const todoMatches = [...content.matchAll(/(\w+):\s*['"]TODO['"]/g)];
  for (const match of todoMatches) {
    needsUpdate.push({ field: match[1], type: 'TODO' });
  }
  
  // Find empty arrays
  const emptyArrayMatches = [...content.matchAll(/(\w+):\s*\[\]\s*,/g)];
  for (const match of emptyArrayMatches) {
    needsUpdate.push({ field: match[1], type: 'empty array' });
  }
  
  // Find empty strings
  const emptyStringMatches = [...content.matchAll(/(\w+):\s*''\s*,/g)];
  for (const match of emptyStringMatches) {
    needsUpdate.push({ field: match[1], type: 'empty string' });
  }
  
  return { context, needsUpdate };
}

/**
 * Checks if an override file needs to be updated.
 * 
 * @param filePath - Path to the override file
 * @param docType - Document type (e.g., 'feature-goal', 'epic', 'business-rule')
 * @param promptVersions - Current prompt versions
 * @returns true if file needs update
 */
export function needsUpdate(
  filePath: string,
  docType: string,
  promptVersions: { featureEpic: string; businessRule: string }
): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for TODO placeholders
  const hasTodo = (
    content.includes("'TODO'") ||
    content.includes('"TODO"') ||
    content.includes('TODO,') ||
    /:\s*\[\]\s*,/.test(content) ||
    /:\s*''\s*,/.test(content)
  );
  
  // Check for old prompt version
  const currentVersion = getOverridePromptVersion(filePath);
  const expectedVersion = docType === 'business-rule' 
    ? promptVersions.businessRule 
    : promptVersions.featureEpic;
  
  const hasOldVersion = currentVersion && currentVersion !== expectedVersion;
  
  return hasTodo || hasOldVersion;
}

// ============================================================================
// Documentation
// ============================================================================

/**
 * This module is designed to be used by Codex (AI assistant) for batch generation.
 * 
 * **IMPORTANT: This module uses the SAME pipeline as ChatGPT/Ollama!**
 * 
 * All pipelines (ChatGPT, Ollama, Codex) now use:
 * - Same prompts (via `getPromptForDocType()`)
 * - Same context structure (via `buildLlmRequestStructure()`)
 * - Same response mapping (via `mapLlmResponseToModel()`)
 * 
 * This ensures consistency across all LLM integrations.
 * 
 * Typical workflow:
 * 
 * 1. Find override files:
 *    const files = findOverrideFiles('src/data/node-docs/epic');
 *    // or: findOverrideFiles('mortgage-se-application.bpmn');
 * 
 * 2. For each file:
 *    const context = parseOverrideFileContext(file.filePath);
 *    const instructions = getCodexGenerationInstructions(context);
 *    // This uses buildLlmRequestStructure() - SAME as ChatGPT/Ollama!
 * 
 * 3. Generate content using Codex:
 *    - Use instructions.systemPrompt and instructions.userPrompt
 *    - These are the EXACT same prompts/context that ChatGPT would use
 *    - Generate JSON matching the model structure
 *    - Parse the response: const model = mapLlmResponseToModel(docType, rawResponse);
 *    - Convert to overrides: const overrides = mapLlmResponseToOverrides(docType, model);
 * 
 * 4. Update the override file:
 *    - Read the existing file
 *    - Replace TODO placeholders with generated content
 *    - Preserve non-TODO content
 *    - Write back to file
 * 
 * Note: Codex should work directly with the file content rather than trying to parse
 * TypeScript programmatically. The helper functions here provide guidance on what
 * to generate, but Codex should use its file editing capabilities to update the files.
 */

