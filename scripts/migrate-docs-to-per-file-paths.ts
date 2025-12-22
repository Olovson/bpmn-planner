#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Migration script: Re-render HTML from existing JSON in llm-debug/docs-raw
 * without calling Claude again. Uploads to new per-file versioned paths.
 * 
 * This script:
 * 1. Lists all JSON files in llm-debug/docs-raw
 * 2. Parses JSON to extract documentation models
 * 3. Re-renders HTML using existing render functions (no LLM calls)
 * 4. Uploads to new paths: docs/claude/{bpmnFile}/{versionHash}/...
 * 5. Does NOT delete old files (keeps them for safety)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Set up environment for modules that read import.meta.env
// This is needed because some modules read env vars at import time
if (typeof globalThis !== 'undefined') {
  // @ts-ignore - setting up env for module imports
  if (!globalThis.import) {
    // @ts-ignore
    globalThis.import = { meta: { env: {} } };
  }
  // @ts-ignore
  globalThis.import.meta.env = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    MODE: 'production',
    ...process.env,
  };
}

// Helper to get version hash using our supabase client
async function getCurrentVersionHash(fileName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('bpmn_files')
    .select('current_version_hash')
    .eq('file_name', fileName)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.current_version_hash || null;
}

// Dynamic imports for app code (to avoid import issues in script context)
async function getAppImports() {
  const [
    { buildBpmnProcessGraph },
    { buildNodeDocumentationContext },
    { renderEpicDoc, renderFeatureGoalDoc, renderBusinessRuleDoc },
    { buildDocStoragePaths },
    { getNodeDocFileKey, getFeatureGoalDocFileKey },
  ] = await Promise.all([
    import('../src/lib/bpmnProcessGraph'),
    import('../src/lib/documentationContext'),
    import('../src/lib/documentationTemplates'),
    import('../src/lib/artifactPaths'),
    import('../src/lib/nodeArtifactPaths'),
  ]);
  
  return {
    buildBpmnProcessGraph,
    buildNodeDocumentationContext,
    renderEpicDoc,
    renderFeatureGoalDoc,
    renderBusinessRuleDoc,
    buildDocStoragePaths,
    getNodeDocFileKey,
    getFeatureGoalDocFileKey,
  };
}

interface MigrationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ identifier: string; error: string }>;
}

/**
 * Parse JSON from raw text (same logic as in loadChildDocFromStorage)
 */
function parseJsonFromRawText(rawText: string): any {
  let jsonText = rawText.trim();
  jsonText = jsonText.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
  jsonText = jsonText.replace(/\/\/.*$/gm, '');
  jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
  
  const firstBrace = jsonText.indexOf('{');
  if (firstBrace >= 0) {
    jsonText = jsonText.slice(firstBrace);
    let braceCount = 0;
    let end = -1;
    for (let i = 0; i < jsonText.length; i++) {
      if (jsonText[i] === '{') braceCount++;
      if (jsonText[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end > 0) {
      jsonText = jsonText.slice(0, end);
    }
  }
  
  return JSON.parse(jsonText);
}

/**
 * Extract bpmnFile and elementId from identifier
 * Format from saveLlmDebugArtifact: "{bpmnFile}-{elementId}" (sanitized)
 * The identifier is created in llmDocumentation.ts: `${bpmnFile}-${elementId}`
 * Then sanitized: toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-')
 * 
 * Example: "mortgage-se-household-register-household-economy-information"
 *          -> bpmnFile: "mortgage-se-household.bpmn", elementId: "register-household-economy-information"
 */
function parseIdentifier(identifier: string, allBpmnFiles: string[]): { bpmnFile: string; elementId: string } | null {
  // Sanitize function (same as in llmDebugStorage.ts)
  const sanitizeForMatch = (s: string) => 
    s.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  // Sort files by length (longest first) to match most specific first
  const sortedFiles = [...allBpmnFiles].sort((a, b) => b.length - a.length);
  
  for (const bpmnFile of sortedFiles) {
    const fileBase = bpmnFile.replace('.bpmn', '');
    const sanitizedFile = sanitizeForMatch(fileBase);
    
    // Check if identifier starts with sanitized file name followed by a dash
    if (identifier.startsWith(sanitizedFile + '-')) {
      const elementId = identifier.slice(sanitizedFile.length + 1); // +1 for the dash
      // ElementId might have dashes - that's fine, keep them
      return {
        bpmnFile: bpmnFile,
        elementId: elementId,
      };
    }
    
    // Also try exact match (file name without extension)
    // This might be a process node where elementId equals file base name
    if (identifier === sanitizedFile) {
      return {
        bpmnFile: bpmnFile,
        elementId: fileBase,
      };
    }
  }
  
  // Fallback: try common patterns if no exact match found
  // Pattern: "mortgage-se-{subprocess}-{elementId}"
  const mortgageSeMatch = identifier.match(/^mortgage-se-([^-]+(?:-[^-]+)*?)-(.+)$/);
  if (mortgageSeMatch) {
    const [, subprocessPart, elementId] = mortgageSeMatch;
    const possibleFile = `mortgage-se-${subprocessPart}.bpmn`;
    if (allBpmnFiles.includes(possibleFile)) {
      return {
        bpmnFile: possibleFile,
        elementId: elementId,
      };
    }
  }
  
  // Pattern: "mortgage-{elementId}" (root file)
  if (identifier.startsWith('mortgage-') && allBpmnFiles.includes('mortgage.bpmn')) {
    const elementId = identifier.replace('mortgage-', '');
    return {
      bpmnFile: 'mortgage.bpmn',
      elementId: elementId,
    };
  }
  
  return null;
}

/**
 * Determine docType from JSON structure
 */
function determineDocType(docJson: any): 'epic' | 'feature' | 'businessRule' | null {
  if (!docJson || typeof docJson !== 'object') return null;
  
  // Feature Goal: has userStories but no interactions
  if (Array.isArray(docJson.userStories) && !docJson.interactions) {
    return 'feature';
  }
  
  // Epic: has userStories AND interactions
  if (Array.isArray(docJson.userStories) && Array.isArray(docJson.interactions)) {
    return 'epic';
  }
  
  // Business Rule: has inputs, decisionLogic, outputs
  if (docJson.inputs || docJson.decisionLogic || docJson.outputs) {
    return 'businessRule';
  }
  
  // Fallback: if it has flowSteps and summary, likely epic or feature
  if (docJson.flowSteps && docJson.summary) {
    // Default to epic if we can't determine
    return 'epic';
  }
  
  return null;
}

async function migrateDocs(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log('[Migration] Starting migration of docs from llm-debug/docs-raw...');
  console.log('[Migration] Loading app modules...');

  // Load app modules
  const {
    buildBpmnProcessGraph,
    buildNodeDocumentationContext,
    renderEpicDoc,
    renderFeatureGoalDoc,
    renderBusinessRuleDoc,
    buildDocStoragePaths,
    getNodeDocFileKey,
    getFeatureGoalDocFileKey,
  } = await getAppImports();

  try {
    // 1. List all files in llm-debug/docs-raw
    const { data: rawFiles, error: listError } = await supabase.storage
      .from('bpmn-files')
      .list('llm-debug/docs-raw', {
        limit: 10000, // Get all files
      });

    if (listError) {
      console.error('[Migration] Error listing files:', listError);
      throw listError;
    }

    if (!rawFiles || rawFiles.length === 0) {
      console.log('[Migration] No files found in llm-debug/docs-raw');
      return result;
    }

    console.log(`[Migration] Found ${rawFiles.length} files in llm-debug/docs-raw`);

    // 2. Get all BPMN files to build graph
    const { data: bpmnFiles } = await supabase
      .from('bpmn_files')
      .select('file_name')
      .eq('file_type', 'bpmn');
    
    const allBpmnFiles = bpmnFiles?.map(f => f.file_name) || [];
    console.log(`[Migration] Found ${allBpmnFiles.length} BPMN files in database`);

    // Build graph once for all files
    let graph: any = null;
    try {
      if (allBpmnFiles.length > 0) {
        // Find root file (mortgage.bpmn or first file)
        const rootFile = allBpmnFiles.find(f => f === 'mortgage.bpmn') || allBpmnFiles[0];
        graph = await buildBpmnProcessGraph(rootFile, allBpmnFiles);
        console.log(`[Migration] Built BPMN process graph with root: ${rootFile}`);
      }
    } catch (error) {
      console.warn('[Migration] Could not build graph, will skip context-dependent rendering:', error);
    }

    // 3. Process each file
    const versionHashCache = new Map<string, string | null>();
    const getVersionHash = async (fileName: string): Promise<string | null> => {
      if (versionHashCache.has(fileName)) {
        return versionHashCache.get(fileName) || null;
      }
      try {
        const hash = await getCurrentVersionHash(fileName);
        versionHashCache.set(fileName, hash);
        return hash;
      } catch (error) {
        console.warn(`[Migration] Failed to get version hash for ${fileName}:`, error);
        versionHashCache.set(fileName, null);
        return null;
      }
    };

    for (const rawFile of rawFiles) {
      try {
        // Extract identifier from filename
        // Format: "{identifier}-{timestamp}.txt"
        const fileName = rawFile.name;
        const identifierMatch = fileName.match(/^(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.txt$/);
        if (!identifierMatch) {
          console.warn(`[Migration] Skipping file with unexpected format: ${fileName}`);
          result.skipped++;
          continue;
        }

        const identifier = identifierMatch[1];
        const parsed = parseIdentifier(identifier, allBpmnFiles);
        
        if (!parsed) {
          console.warn(`[Migration] Could not parse identifier: ${identifier}`);
          result.skipped++;
          continue;
        }

        const { bpmnFile, elementId } = parsed;
        
        // Verify that bpmnFile exists in our list
        if (!allBpmnFiles.includes(bpmnFile)) {
          console.warn(`[Migration] BPMN file ${bpmnFile} not found in database for ${identifier}`);
          result.skipped++;
          continue;
        }

        // Download and parse JSON
        const { data: rawData, error: downloadError } = await supabase.storage
          .from('bpmn-files')
          .download(`llm-debug/docs-raw/${fileName}`);

        if (downloadError || !rawData) {
          console.warn(`[Migration] Failed to download ${fileName}:`, downloadError);
          result.failed++;
          result.errors.push({ identifier, error: `Download failed: ${downloadError?.message || 'Unknown'}` });
          continue;
        }

        const rawText = await rawData.text();
        let docJson: any;
        try {
          docJson = parseJsonFromRawText(rawText);
        } catch (parseError) {
          console.warn(`[Migration] Failed to parse JSON from ${fileName}:`, parseError);
          result.failed++;
          result.errors.push({ identifier, error: `Parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}` });
          continue;
        }

        // Determine docType
        const docType = determineDocType(docJson);
        if (!docType) {
          console.warn(`[Migration] Could not determine docType for ${identifier}`);
          result.skipped++;
          continue;
        }

        // Build context (if graph is available)
        let context: any = null;
        if (graph) {
          const nodeId = `${bpmnFile}::${elementId}`;
          context = buildNodeDocumentationContext(graph, nodeId);
          if (!context) {
            console.warn(`[Migration] Could not build context for ${nodeId}, trying without context`);
          }
        }

        // If no context, we can't render properly - skip
        if (!context) {
          console.warn(`[Migration] Skipping ${identifier} - no context available`);
          result.skipped++;
          continue;
        }

        // Convert JSON to string format that mapper functions expect
        // The mappers expect the raw LLM response string, so we stringify the JSON
        // Format it nicely to match what LLM would return
        const llmContent = JSON.stringify(docJson, null, 2);

        // Render HTML
        const links = {
          bpmnViewerLink: `#/bpmn/${bpmnFile}`,
          dorLink: undefined,
          testLink: undefined,
        };

        let htmlContent: string;
        try {
          if (docType === 'epic') {
            htmlContent = await renderEpicDoc(context, links, llmContent, {
              llmMetadata: { provider: 'claude', model: 'claude-3-5-sonnet-20241022' },
              fallbackUsed: false,
              finalProvider: 'claude',
            });
          } else if (docType === 'feature') {
            htmlContent = await renderFeatureGoalDoc(context, links, llmContent, {
              llmMetadata: { provider: 'claude', model: 'claude-3-5-sonnet-20241022' },
              fallbackUsed: false,
              finalProvider: 'claude',
            });
          } else {
            htmlContent = await renderBusinessRuleDoc(context, links, llmContent, {
              llmMetadata: { provider: 'claude', model: 'claude-3-5-sonnet-20241022' },
              fallbackUsed: false,
              finalProvider: 'claude',
            });
          }
        } catch (renderError) {
          console.warn(`[Migration] Failed to render HTML for ${identifier}:`, renderError);
          result.failed++;
          result.errors.push({ identifier, error: `Render failed: ${renderError instanceof Error ? renderError.message : String(renderError)}` });
          continue;
        }

        // Determine storage path
        const versionHash = await getVersionHash(bpmnFile);
        let docFileName: string;
        
        if (docType === 'feature') {
          // For Feature Goals, check if this is a call activity (has parent) or process node
          // If node.bpmnFile differs from bpmnFile, it's likely a call activity
          const parentFile = context.node.bpmnFile !== bpmnFile ? context.node.bpmnFile : undefined;
          docFileName = getFeatureGoalDocFileKey(
            bpmnFile,
            elementId,
            undefined, // no version suffix
            parentFile // parent file for hierarchical naming
          );
        } else {
          // For Epics and Business Rules: use node doc file key
          docFileName = getNodeDocFileKey(bpmnFile, elementId);
        }

        const { modePath } = buildDocStoragePaths(
          docFileName,
          null, // mode
          'cloud', // provider
          bpmnFile,
          versionHash
        );

        // Upload to new path
        const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
        const { error: uploadError } = await supabase.storage
          .from('bpmn-files')
          .upload(modePath, htmlBlob, {
            upsert: true,
            contentType: 'text/html; charset=utf-8',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error(`[Migration] Failed to upload ${identifier} to ${modePath}:`, uploadError);
          result.failed++;
          result.errors.push({ identifier, error: `Upload failed: ${uploadError.message}` });
          continue;
        }

        console.log(`[Migration] ✓ Migrated ${identifier} -> ${modePath}`);
        result.success++;

      } catch (error) {
        console.error(`[Migration] Unexpected error processing ${rawFile.name}:`, error);
        result.failed++;
        result.errors.push({ 
          identifier: rawFile.name, 
          error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
        });
      }
    }

    console.log('\n[Migration] Summary:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Skipped: ${result.skipped}`);
    if (result.errors.length > 0) {
      console.log('\n[Migration] Errors:');
      result.errors.forEach(({ identifier, error }) => {
        console.log(`  - ${identifier}: ${error}`);
      });
    }

    return result;

  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    throw error;
  }
}

// Run migration if called directly
// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('migrate-docs-to-per-file-paths') ||
                     process.argv[1]?.endsWith('migrate-docs-to-per-file-paths.ts');

if (isMainModule) {
  migrateDocs()
    .then((result) => {
      console.log('\n[Migration] Completed');
      console.log(`  ✅ Success: ${result.success}`);
      console.log(`  ❌ Failed: ${result.failed}`);
      console.log(`  ⏭️  Skipped: ${result.skipped}`);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('[Migration] Fatal error:', error);
      process.exit(1);
    });
}

export { migrateDocs };
