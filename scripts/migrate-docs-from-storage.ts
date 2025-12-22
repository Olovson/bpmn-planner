#!/usr/bin/env tsx
/* eslint-disable no-console */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Get version hash for a BPMN file
async function getVersionHash(fileName: string): Promise<string | null> {
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

// Build new storage path
function buildNewPath(
  bpmnFile: string,
  elementId: string,
  versionHash: string | null,
  docType: 'epic' | 'feature'
): string {
  const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
  const safeElementId = sanitize(elementId);
  
  if (docType === 'feature') {
    // Feature goals: docs/claude/{bpmnFile}/{hash}/feature-goals/{elementId}.html
    if (versionHash) {
      return `docs/claude/${bpmnFile}/${versionHash}/feature-goals/${safeElementId}.html`;
    }
    return `docs/claude/feature-goals/${safeElementId}.html`;
  } else {
    // Epics: docs/claude/{bpmnFile}/{hash}/nodes/{bpmnFileBase}/{elementId}.html
    const bpmnFileBase = bpmnFile.replace('.bpmn', '');
    if (versionHash) {
      return `docs/claude/${bpmnFile}/${versionHash}/nodes/${bpmnFileBase}/${safeElementId}.html`;
    }
    return `docs/claude/nodes/${bpmnFileBase}/${safeElementId}.html`;
  }
}

async function migrateDocs() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  const oldBasePath = `docs/claude/mortgage.bpmn/${rootHash}`;
  
  console.log('[Migration] Starting migration from storage...');
  console.log(`[Migration] Source: ${oldBasePath}\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  // 1. Process nodes (epics)
  console.log('[Migration] Step 1: Processing nodes (epics)...');
  const { data: nodeDirs } = await supabase.storage
    .from('bpmn-files')
    .list(`${oldBasePath}/nodes`, { limit: 1000 });
  
  if (nodeDirs) {
    for (const dir of nodeDirs) {
      const { data: files } = await supabase.storage
        .from('bpmn-files')
        .list(`${oldBasePath}/nodes/${dir.name}`, { limit: 1000 });
      
      const htmlFiles = files?.filter(f => f.name.endsWith('.html')) || [];
      
      for (const file of htmlFiles) {
        try {
          // Extract bpmnFile and elementId from path
          // Path format: nodes/{bpmnFileBase}/{elementId}.html
          // Example: nodes/mortgage-se-appeal/screen-appeal.html
          const bpmnFileBase = dir.name; // e.g., "mortgage-se-appeal"
          const elementId = file.name.replace('.html', ''); // e.g., "screen-appeal"
          const bpmnFile = `${bpmnFileBase}.bpmn`; // e.g., "mortgage-se-appeal.bpmn"
          
          // Download from old path
          const oldPath = `${oldBasePath}/nodes/${bpmnFileBase}/${file.name}`;
          const { data: htmlData, error: downloadError } = await supabase.storage
            .from('bpmn-files')
            .download(oldPath);
          
          if (downloadError || !htmlData) {
            console.warn(`[Migration] ⚠️  Failed to download ${oldPath}: ${downloadError?.message || 'No data'}`);
            failed++;
            continue;
          }
          
          // Get version hash for this BPMN file
          const versionHash = await getVersionHash(bpmnFile);
          
          // Build new path
          const newPath = buildNewPath(bpmnFile, elementId, versionHash, 'epic');
          
          // Upload to new path
          const htmlContent = await htmlData.text();
          const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
          
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(newPath, htmlBlob, {
              upsert: true,
              contentType: 'text/html; charset=utf-8',
              cacheControl: '3600',
            });
          
          if (uploadError) {
            console.error(`[Migration] ❌ Failed to upload ${newPath}: ${uploadError.message}`);
            failed++;
            continue;
          }
          
          console.log(`[Migration] ✅ ${oldPath} -> ${newPath}`);
          success++;
          
        } catch (error) {
          console.error(`[Migration] ❌ Error processing ${dir.name}/${file.name}:`, error);
          failed++;
        }
      }
    }
  }

  // 2. Process feature-goals
  console.log('\n[Migration] Step 2: Processing feature-goals...');
  const { data: featureFiles } = await supabase.storage
    .from('bpmn-files')
    .list(`${oldBasePath}/feature-goals`, { limit: 1000 });
  
  const htmlFeatureFiles = featureFiles?.filter(f => f.name.endsWith('.html')) || [];
  
  for (const file of htmlFeatureFiles) {
    try {
      // Extract elementId from filename
      // Feature goal filenames can be:
      // - appeal.html (just elementId)
      // - mortgage-appeal.html (mortgage-{elementId})
      // - mortgage-se-application-internal-data-gathering.html (hierarchical)
      const fileName = file.name.replace('.html', '');
      
      // Try to determine bpmnFile from filename
      // This is tricky - we need to infer from the filename pattern
      let bpmnFile: string | null = null;
      let elementId: string;
      
      // Pattern 1: mortgage-se-{subprocess}-{elementId}
      const hierarchicalMatch = fileName.match(/^mortgage-se-([^-]+(?:-[^-]+)*?)-(.+)$/);
      if (hierarchicalMatch) {
        const [, subprocessPart, elementIdPart] = hierarchicalMatch;
        bpmnFile = `mortgage-se-${subprocessPart}.bpmn`;
        elementId = elementIdPart;
      } else if (fileName.startsWith('mortgage-')) {
        // Pattern 2: mortgage-{elementId} -> likely mortgage-se-{elementId}.bpmn
        const elementIdPart = fileName.replace('mortgage-', '');
        // Try to find matching BPMN file
        const possibleFile = `mortgage-se-${elementIdPart}.bpmn`;
        // For now, use the elementId directly and let the system figure it out
        bpmnFile = possibleFile;
        elementId = elementIdPart;
      } else {
        // Pattern 3: Just elementId (e.g., "appeal" -> "mortgage-se-appeal.bpmn")
        elementId = fileName;
        bpmnFile = `mortgage-se-${elementId}.bpmn`;
      }
      
      if (!bpmnFile) {
        console.warn(`[Migration] ⚠️  Could not determine bpmnFile for ${file.name}, skipping`);
        skipped++;
        continue;
      }
      
      // Download from old path
      const oldPath = `${oldBasePath}/feature-goals/${file.name}`;
      const { data: htmlData, error: downloadError } = await supabase.storage
        .from('bpmn-files')
        .download(oldPath);
      
      if (downloadError || !htmlData) {
        console.warn(`[Migration] ⚠️  Failed to download ${oldPath}: ${downloadError?.message || 'No data'}`);
        failed++;
        continue;
      }
      
      // Get version hash for this BPMN file
      const versionHash = await getVersionHash(bpmnFile);
      
      // Build new path
      const newPath = buildNewPath(bpmnFile, elementId, versionHash, 'feature');
      
      // Upload to new path
      const htmlContent = await htmlData.text();
      const htmlBlob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      
      const { error: uploadError } = await supabase.storage
        .from('bpmn-files')
        .upload(newPath, htmlBlob, {
          upsert: true,
          contentType: 'text/html; charset=utf-8',
          cacheControl: '3600',
        });
      
      if (uploadError) {
        console.error(`[Migration] ❌ Failed to upload ${newPath}: ${uploadError.message}`);
        failed++;
        continue;
      }
      
      console.log(`[Migration] ✅ ${oldPath} -> ${newPath}`);
      success++;
      
    } catch (error) {
      console.error(`[Migration] ❌ Error processing feature-goal ${file.name}:`, error);
      failed++;
    }
  }

  console.log('\n[Migration] Summary:');
  console.log(`  ✅ Successfully copied: ${success}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`\n[Migration] NOTE: Old HTML files are kept in place for safety.`);
  console.log('[Migration] New files are uploaded to per-file versioned paths.');
}

migrateDocs()
  .then(() => {
    console.log('\n[Migration] Completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  });
