#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Regenerera HTML-filer från befintligt JSON-material i llm-debug/docs-raw
 * med korrekt namn och placering (versioned paths, hierarchical naming).
 * 
 * Detta script:
 * 1. Listar alla JSON-filer i llm-debug/docs-raw
 * 2. Parsar JSON och extraherar dokumentationsmodeller
 * 3. Re-renderar HTML med korrekt namngivning (hierarchical för Feature Goals)
 * 4. Uploadar till korrekta versioned paths: docs/claude/{bpmnFile}/{versionHash}/...
 * 5. Använder korrekt namngivning baserat på node-typ (call activity vs process node)
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
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
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

// Helper to get version hash
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

// Dynamic imports for app code (to avoid path-intersection issues)
async function getAppImports() {
  // Import modules one at a time to avoid path-intersection issues
  const [
    bpmnProcessGraphModule,
    documentationContextModule,
    documentationTemplatesModule,
    artifactPathsModule,
    nodeArtifactPathsModule,
  ] = await Promise.all([
    import('../src/lib/bpmnProcessGraph'),
    import('../src/lib/documentationContext'),
    import('../src/lib/documentationTemplates'),
    import('../src/lib/artifactPaths'),
    import('../src/lib/nodeArtifactPaths'),
  ]);
  
  return {
    buildBpmnProcessGraph: bpmnProcessGraphModule.buildBpmnProcessGraph,
    buildNodeDocumentationContext: documentationContextModule.buildNodeDocumentationContext,
    renderEpicDoc: documentationTemplatesModule.renderEpicDoc,
    renderFeatureGoalDoc: documentationTemplatesModule.renderFeatureGoalDoc,
    renderBusinessRuleDoc: documentationTemplatesModule.renderBusinessRuleDoc,
    buildDocStoragePaths: artifactPathsModule.buildDocStoragePaths,
    getNodeDocFileKey: nodeArtifactPathsModule.getNodeDocFileKey,
    getFeatureGoalDocFileKey: nodeArtifactPathsModule.getFeatureGoalDocFileKey,
  };
}

interface RegenerationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ identifier: string; error: string }>;
}

/**
 * Parse JSON from raw text
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
 */
function parseIdentifier(identifier: string, allBpmnFiles: string[]): { bpmnFile: string; elementId: string } | null {
  const sanitizeForMatch = (s: string) => 
    s.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  const sortedFiles = [...allBpmnFiles].sort((a, b) => b.length - a.length);
  
  for (const bpmnFile of sortedFiles) {
    const fileBase = bpmnFile.replace('.bpmn', '');
    const sanitizedFile = sanitizeForMatch(fileBase);
    
    if (identifier.startsWith(sanitizedFile + '-')) {
      const elementId = identifier.slice(sanitizedFile.length + 1);
      return { bpmnFile, elementId };
    }
    
    if (identifier === sanitizedFile) {
      return { bpmnFile, elementId: fileBase };
    }
  }
  
  // Fallback patterns
  const mortgageSeMatch = identifier.match(/^mortgage-se-([^-]+(?:-[^-]+)*?)-(.+)$/);
  if (mortgageSeMatch) {
    const [, subprocessPart, elementId] = mortgageSeMatch;
    const possibleFile = `mortgage-se-${subprocessPart}.bpmn`;
    if (allBpmnFiles.includes(possibleFile)) {
      return { bpmnFile: possibleFile, elementId };
    }
  }
  
  if (identifier.startsWith('mortgage-') && allBpmnFiles.includes('mortgage.bpmn')) {
    const elementId = identifier.replace('mortgage-', '');
    return { bpmnFile: 'mortgage.bpmn', elementId };
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
    return 'epic';
  }
  
  return null;
}

async function regenerateDocs(): Promise<RegenerationResult> {
  const result: RegenerationResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  console.log('[Regeneration] Starting regeneration of HTML from JSON...');
  console.log('[Regeneration] Loading app modules...');

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
        limit: 10000,
      });

    if (listError) {
      console.error('[Regeneration] Error listing files:', listError);
      throw listError;
    }

    if (!rawFiles || rawFiles.length === 0) {
      console.log('[Regeneration] No files found in llm-debug/docs-raw');
      return result;
    }

    console.log(`[Regeneration] Found ${rawFiles.length} JSON files in llm-debug/docs-raw`);

    // 2. Get all BPMN files
    const { data: bpmnFiles } = await supabase
      .from('bpmn_files')
      .select('file_name')
      .eq('file_type', 'bpmn');
    
    const allBpmnFiles = bpmnFiles?.map(f => f.file_name) || [];
    console.log(`[Regeneration] Found ${allBpmnFiles.length} BPMN files in database`);

    // 3. Build graph for context
    let graph: any = null;
    try {
      if (allBpmnFiles.length > 0) {
        const rootFile = allBpmnFiles.find(f => f === 'mortgage.bpmn') || allBpmnFiles[0];
        graph = await buildBpmnProcessGraph(rootFile, allBpmnFiles);
        console.log(`[Regeneration] Built BPMN process graph with root: ${rootFile}`);
      }
    } catch (error) {
      console.warn('[Regeneration] Could not build graph, will skip context-dependent rendering:', error);
    }

    // 4. Process each file
    const versionHashCache = new Map<string, string | null>();
    const getVersionHash = async (fileName: string): Promise<string | null> => {
      if (versionHashCache.has(fileName)) {
        return versionHashCache.get(fileName) || null;
      }
      const hash = await getCurrentVersionHash(fileName);
      versionHashCache.set(fileName, hash);
      return hash;
    };

    for (const rawFile of rawFiles) {
      try {
        // Extract identifier from filename
        const fileName = rawFile.name;
        const identifierMatch = fileName.match(/^(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.txt$/);
        if (!identifierMatch) {
          console.warn(`[Regeneration] Skipping file with unexpected format: ${fileName}`);
          result.skipped++;
          continue;
        }

        const identifier = identifierMatch[1];
        const parsed = parseIdentifier(identifier, allBpmnFiles);
        
        if (!parsed) {
          console.warn(`[Regeneration] Could not parse identifier: ${identifier}`);
          result.skipped++;
          continue;
        }

        const { bpmnFile, elementId } = parsed;
        
        if (!allBpmnFiles.includes(bpmnFile)) {
          console.warn(`[Regeneration] BPMN file ${bpmnFile} not found for ${identifier}`);
          result.skipped++;
          continue;
        }

        // Download and parse JSON
        const { data: rawData, error: downloadError } = await supabase.storage
          .from('bpmn-files')
          .download(`llm-debug/docs-raw/${fileName}`);

        if (downloadError || !rawData) {
          console.warn(`[Regeneration] Failed to download ${fileName}:`, downloadError);
          result.failed++;
          result.errors.push({ identifier, error: `Download failed: ${downloadError?.message || 'Unknown'}` });
          continue;
        }

        const rawText = await rawData.text();
        let docJson: any;
        try {
          docJson = parseJsonFromRawText(rawText);
        } catch (parseError) {
          console.warn(`[Regeneration] Failed to parse JSON from ${fileName}:`, parseError);
          result.failed++;
          result.errors.push({ identifier, error: `Parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}` });
          continue;
        }

        // Determine docType
        const docType = determineDocType(docJson);
        if (!docType) {
          console.warn(`[Regeneration] Could not determine docType for ${identifier}`);
          result.skipped++;
          continue;
        }

        // Build context
        let context: any = null;
        if (graph) {
          const nodeId = `${bpmnFile}::${elementId}`;
          context = buildNodeDocumentationContext(graph, nodeId);
          if (!context) {
            console.warn(`[Regeneration] Could not build context for ${nodeId}, skipping`);
            result.skipped++;
            continue;
          }
        } else {
          console.warn(`[Regeneration] No graph available, skipping ${identifier}`);
          result.skipped++;
          continue;
        }

        // Convert JSON to string format
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
          console.warn(`[Regeneration] Failed to render HTML for ${identifier}:`, renderError);
          result.failed++;
          result.errors.push({ identifier, error: `Render failed: ${renderError instanceof Error ? renderError.message : String(renderError)}` });
          continue;
        }

        // Determine storage path with correct naming
        const versionHash = await getVersionHash(bpmnFile);
        let docFileName: string;
        
        if (docType === 'feature') {
          // For Feature Goals: determine if this is a call activity (has parent) or process node
          // Check node type and bpmnFile to determine parent
          const nodeType = context.node?.type;
          const nodeBpmnFile = context.node?.bpmnFile;
          
          // If node type is 'callActivity', it's a call activity with a parent
          // The parent is where the call activity is defined (node.bpmnFile)
          // The subprocess file is the file being called (bpmnFile from identifier)
          const isCallActivity = nodeType === 'callActivity';
          const parentFile = isCallActivity ? nodeBpmnFile : undefined;
          
          // For call activities: use subprocess file (bpmnFile) with parent (nodeBpmnFile) for hierarchical naming
          // For process nodes: use bpmnFile without parent
          docFileName = getFeatureGoalDocFileKey(
            bpmnFile, // subprocess file (the file being called/defined)
            elementId,
            undefined, // no version suffix
            parentFile // parent file for hierarchical naming (if call activity)
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
          console.error(`[Regeneration] Failed to upload ${identifier} to ${modePath}:`, uploadError);
          result.failed++;
          result.errors.push({ identifier, error: `Upload failed: ${uploadError.message}` });
          continue;
        }

        console.log(`[Regeneration] ✓ Regenerated ${identifier} -> ${modePath}`);
        result.success++;

      } catch (error) {
        console.error(`[Regeneration] Unexpected error processing ${rawFile.name}:`, error);
        result.failed++;
        result.errors.push({ 
          identifier: rawFile.name, 
          error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
        });
      }
    }

    console.log('\n[Regeneration] Summary:');
    console.log(`  ✅ Success: ${result.success}`);
    console.log(`  ❌ Failed: ${result.failed}`);
    console.log(`  ⏭️  Skipped: ${result.skipped}`);
    if (result.errors.length > 0 && result.errors.length <= 20) {
      console.log('\n[Regeneration] Errors:');
      result.errors.forEach(({ identifier, error }) => {
        console.log(`  - ${identifier}: ${error}`);
      });
    } else if (result.errors.length > 20) {
      console.log(`\n[Regeneration] ${result.errors.length} errors (showing first 20):`);
      result.errors.slice(0, 20).forEach(({ identifier, error }) => {
        console.log(`  - ${identifier}: ${error}`);
      });
    }

    return result;

  } catch (error) {
    console.error('[Regeneration] Fatal error:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || 
    process.argv[1]?.includes('regenerate-html-from-json')) {
  regenerateDocs()
    .then((result) => {
      console.log('\n[Regeneration] Completed');
      console.log(`  ✅ Success: ${result.success}`);
      console.log(`  ❌ Failed: ${result.failed}`);
      console.log(`  ⏭️  Skipped: ${result.skipped}`);
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('[Regeneration] Fatal error:', error);
      process.exit(1);
    });
}

export { regenerateDocs };
