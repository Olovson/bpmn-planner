/**
 * Export Feature Goal documentation to JSON format
 * 
 * Exports the FeatureGoalDocModel as JSON for manual editing.
 * The exported JSON can be imported back using importFeatureGoalFromJson().
 */

import type { FeatureGoalDocModel } from './featureGoalLlmTypes';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { buildFeatureGoalDocModelFromContext } from './documentationTemplates';
import { buildNodeDocumentationContext } from './documentationContext';
import { buildBpmnProcessGraph } from './bpmnProcessGraph';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../.env.local');
try {
  const envContents = readFileSync(envPath, 'utf-8');
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Optional file
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Fetch existing Feature Goal HTML and extract model from it
 */
async function fetchExistingModel(
  bpmnFile: string,
  elementId: string,
): Promise<FeatureGoalDocModel | null> {
  const fileKey = getFeatureGoalDocFileKey(bpmnFile, elementId, undefined); // no version suffix

  // Try Supabase Storage (Claude-only)
  const possiblePaths = [
    `docs/claude/${fileKey}`,
    `docs/${fileKey}`,
    fileKey,
  ];

  for (const path of possiblePaths) {
    try {
      const { data } = supabase.storage.from('bpmn-files').getPublicUrl(path);
      if (!data?.publicUrl) continue;

      const versionedUrl = `${data.publicUrl}?t=${Date.now()}`;
      const response = await fetch(versionedUrl, { cache: 'no-store' });
      if (response.ok) {
        const html = await response.text();
        // TODO: Parse HTML to extract model (or use existing parser if available)
        // For now, return null to generate from context
      }
    } catch (error) {
      // Continue to next path
    }
  }

  return null;
}

/**
 * Export Feature Goal documentation to JSON
 * 
 * @param bpmnFile - BPMN file name (e.g., "mortgage-se-application.bpmn")
 * @param elementId - BPMN element ID (e.g., "application")
 * @param outputDir - Output directory (default: "exports/feature-goals")
 * @returns Path to exported JSON file
 */
export async function exportFeatureGoalToJson(
  bpmnFile: string,
  elementId: string,
  outputDir: string = 'exports/feature-goals',
): Promise<string> {
  // Try to fetch existing model from HTML
  let model = await fetchExistingModel(bpmnFile, elementId);

  // If no existing model, generate from context
  if (!model) {
    // Get all BPMN files from database
    const { data: bpmnFilesData } = await supabase
      .from('bpmn_files')
      .select('file_name')
      .eq('file_type', 'bpmn');
    
    const allBpmnFiles = bpmnFilesData?.map(row => row.file_name) || [bpmnFile];
    
    // Ensure target file is included
    if (!allBpmnFiles.includes(bpmnFile)) {
      allBpmnFiles.push(bpmnFile);
    }
    
    const graph = await buildBpmnProcessGraph(bpmnFile, allBpmnFiles);
    
    // Build context - nodeId format is "{bpmnFile}::{elementId}"
    const nodeId = `${bpmnFile}::${elementId}`;
    const context = buildNodeDocumentationContext(graph, nodeId);
    
    if (!context) {
      throw new Error(`Could not build context for node: ${bpmnFile}::${elementId}. Make sure the node exists in the BPMN file.`);
    }
    
    // Build model from context
    model = buildFeatureGoalDocModelFromContext(context);
  }

  // Create output directory if it doesn't exist
  const outputPath = resolve(__dirname, '..', outputDir);
  mkdirSync(outputPath, { recursive: true });

  // Generate filename
  const baseName = bpmnFile.replace('.bpmn', '');
  const sanitizedElementId = elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const filename = `${baseName}-${sanitizedElementId}.json`;
  const filePath = resolve(outputPath, filename);

  // Convert to JSON with pretty-print
  const json = JSON.stringify(model, null, 2);

  // Write to file
  writeFileSync(filePath, json, 'utf-8');

  return filePath;
}

