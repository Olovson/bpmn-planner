#!/usr/bin/env tsx
/**
 * Script to validate that generated HTML documentation files have correct content.
 * 
 * Usage:
 *   tsx scripts/validate-generated-html.ts <bpmnFileName> [elementId]
 * 
 * Example:
 *   tsx scripts/validate-generated-html.ts mortgage-se-household.bpmn register-household-economy-information
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getNodeDocFileKey } from '../src/lib/nodeArtifactPaths';
import { buildDocStoragePaths } from '../src/lib/artifactPaths';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple version hash function (without importing the full module)
async function getCurrentVersionHash(bpmnFileName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('bpmn_files')
      .select('content_hash')
      .eq('file_name', bpmnFileName)
      .single();
    
    if (error || !data) {
      console.warn(`Could not get version hash for ${bpmnFileName}: ${error?.message || 'not found'}`);
      return null;
    }
    
    return data.content_hash;
  } catch (error) {
    console.warn(`Error getting version hash: ${error}`);
    return null;
  }
}

interface ValidationResult {
  fileExists: boolean;
  path: string;
  contentLength: number;
  hasValidStructure: boolean;
  hasContent: boolean;
  errors: string[];
  warnings: string[];
}

async function validateHtmlFile(
  bpmnFileName: string,
  elementId?: string,
  mode: 'slow' | 'local' = 'slow',
  provider: 'cloud' | 'local' | 'fallback' = 'cloud'
): Promise<ValidationResult> {
  const result: ValidationResult = {
    fileExists: false,
    path: '',
    contentLength: 0,
    hasValidStructure: false,
    hasContent: false,
    errors: [],
    warnings: [],
  };

  // Determine docFileName
  let docFileName: string;
  if (elementId) {
    docFileName = getNodeDocFileKey(bpmnFileName, elementId);
  } else {
    // File-level documentation
    const baseName = bpmnFileName.replace('.bpmn', '');
    docFileName = `${baseName}.html`;
  }

  // Get version hash
  const versionHash = await getCurrentVersionHash(bpmnFileName);
  if (!versionHash) {
    result.errors.push(`Could not get version hash for ${bpmnFileName}`);
    return result;
  }

  // Build storage path
  const { modePath } = buildDocStoragePaths(
    docFileName,
    mode,
    provider,
    bpmnFileName,
    versionHash
  );
  result.path = modePath;

  // Try to download the file
  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .download(modePath);

  if (error || !data) {
    result.errors.push(`File not found: ${modePath} (${error?.message || 'unknown error'})`);
    
    // Try legacy path
    const legacyPath = `docs/${docFileName}`;
    const { data: legacyData, error: legacyError } = await supabase.storage
      .from('bpmn-files')
      .download(legacyPath);
    
    if (legacyData && !legacyError) {
      result.warnings.push(`Found file in legacy path: ${legacyPath}`);
      result.path = legacyPath;
      result.fileExists = true;
      const text = await legacyData.text();
      result.contentLength = text.length;
      return validateHtmlContent(text, result, bpmnFileName, elementId);
    }
    
    return result;
  }

  result.fileExists = true;
  const text = await data.text();
  result.contentLength = text.length;

  return validateHtmlContent(text, result, bpmnFileName, elementId);
}

function validateHtmlContent(
  html: string,
  result: ValidationResult,
  bpmnFileName: string,
  elementId?: string
): ValidationResult {
  // Check basic HTML structure
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
    result.errors.push('Missing DOCTYPE or <html> tag');
  } else {
    result.hasValidStructure = true;
  }

  if (!html.includes('</html>')) {
    result.errors.push('Missing closing </html> tag');
  }

  // Check for body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) {
    result.errors.push('Missing <body> tag or body content');
  } else {
    const bodyContent = bodyMatch[1].trim();
    if (bodyContent.length < 100) {
      result.warnings.push(`Body content seems very short (${bodyContent.length} chars)`);
    } else {
      result.hasContent = true;
    }
  }

  // Check for expected content based on node type
  if (elementId) {
    // Should contain element ID or name
    if (!html.includes(elementId) && !html.toLowerCase().includes(elementId.toLowerCase())) {
      result.warnings.push(`Element ID "${elementId}" not found in content`);
    }
  }

  // Check for BPMN file reference
  if (!html.includes(bpmnFileName) && !html.includes(bpmnFileName.replace('.bpmn', ''))) {
    result.warnings.push(`BPMN file name "${bpmnFileName}" not found in content`);
  }

  // Check for common documentation sections
  const hasHeadings = /<h[1-6][^>]*>/i.test(html);
  if (!hasHeadings) {
    result.warnings.push('No headings found in content');
  }

  // Check for generation metadata
  if (!html.includes('generation-meta') && !html.includes('Generated')) {
    result.warnings.push('No generation metadata found');
  }

  // Check for truncated content
  if (html.length < 500) {
    result.errors.push(`HTML seems too short (${html.length} chars) - might be truncated`);
  }

  // Check for common errors
  if (html.includes('undefined') || html.includes('null')) {
    result.warnings.push('Content contains "undefined" or "null" - might indicate missing data');
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: tsx scripts/validate-generated-html.ts <bpmnFileName> [elementId] [mode] [provider]');
    console.error('Example: tsx scripts/validate-generated-html.ts mortgage-se-household.bpmn register-household-economy-information');
    process.exit(1);
  }

  const bpmnFileName = args[0];
  const elementId = args[1];
  const mode = (args[2] as 'slow' | 'local') || 'slow';
  const provider = (args[3] as 'cloud' | 'local' | 'fallback') || 'cloud';

  console.log(`\n🔍 Validating HTML for: ${bpmnFileName}${elementId ? ` (element: ${elementId})` : ''}`);
  console.log(`   Mode: ${mode}, Provider: ${provider}\n`);

  const result = await validateHtmlFile(bpmnFileName, elementId, mode, provider);

  console.log(`📄 File: ${result.path}`);
  console.log(`   Exists: ${result.fileExists ? '✅' : '❌'}`);
  console.log(`   Size: ${result.contentLength} bytes`);
  console.log(`   Valid structure: ${result.hasValidStructure ? '✅' : '❌'}`);
  console.log(`   Has content: ${result.hasContent ? '✅' : '❌'}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warn => console.log(`   - ${warn}`));
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`\n✅ Validation passed! File looks good.`);
  } else if (result.errors.length === 0) {
    console.log(`\n⚠️  Validation passed with warnings.`);
  } else {
    console.log(`\n❌ Validation failed!`);
    process.exit(1);
  }
}

main().catch(console.error);
