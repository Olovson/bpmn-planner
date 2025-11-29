#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Export Feature Goal HTML documentation from Supabase Storage to local filesystem
 * 
 * Usage:
 *   npm run export:feature-goals [v1|v2|all]
 * 
 * Examples:
 *   npm run export:feature-goals        # Exports all versions
 *   npm run export:feature-goals v1    # Exports only v1 files
 *   npm run export:feature-goals v2    # Exports only v2 files
 *   npm run export:feature-goals all   # Exports all versions (same as default)
 * 
 * Exports Feature Goal HTML files from Supabase Storage to exports/feature-goals/
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, join, dirname } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const EXPORT_DIR = resolve(__dirname, '../exports/feature-goals');

// Parse command line arguments
const versionFilter = process.argv[2]?.toLowerCase();
const validVersions = ['v1', 'v2', 'all'];
const requestedVersion = validVersions.includes(versionFilter) ? versionFilter : 'all';

interface FeatureGoalFile {
  path: string;
  name: string;
  size: number;
  lastModified: string;
  mode?: string;
  version?: string;
}

/**
 * Recursively list all files in a storage folder
 */
async function listFilesRecursive(
  folder: string = '',
  allFiles: FeatureGoalFile[] = []
): Promise<FeatureGoalFile[]> {
  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .list(folder, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    console.error(`Error listing folder ${folder}:`, error);
    return allFiles;
  }

  if (!data) return allFiles;

  for (const item of data) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder, recurse
      await listFilesRecursive(fullPath, allFiles);
    } else {
      // It's a file - check if it's a Feature Goal HTML file
      if (fullPath.includes('feature-goals/') && fullPath.endsWith('.html')) {
        // Extract version from filename (e.g., "file-v1.html" or "file-v2.html")
        const versionMatch = item.name.match(/-v([12])\.html$/);
        const fileVersion = versionMatch ? `v${versionMatch[1]}` : undefined;
        
        // Filter by requested version (skip if doesn't match)
        if (requestedVersion !== 'all') {
          if (requestedVersion === 'v1' && fileVersion !== 'v1') continue;
          if (requestedVersion === 'v2' && fileVersion !== 'v2') continue;
          // Also skip legacy files (no version) when filtering for specific version
          if (requestedVersion === 'v1' && !fileVersion) continue;
          if (requestedVersion === 'v2' && !fileVersion) continue;
        }
        
        // Extract mode from path (local, slow/chatgpt, slow/ollama, etc.)
        const modeMatch = fullPath.match(/docs\/(local|slow(?:\/(?:chatgpt|ollama))?)\//);
        const mode = modeMatch ? modeMatch[1] : undefined;

        allFiles.push({
          path: fullPath,
          name: item.name,
          size: item.metadata?.size || 0,
          lastModified: item.updated_at || item.created_at || new Date().toISOString(),
          mode,
          version: fileVersion,
        });
      }
    }
  }

  return allFiles;
}

/**
 * Download a file from Supabase Storage
 */
async function downloadFile(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .download(storagePath);

  if (error) {
    console.error(`Error downloading ${storagePath}:`, error);
    return null;
  }

  if (!data) return null;

  return await data.text();
}

/**
 * Generate a safe filename for export
 */
function generateExportFilename(originalPath: string, mode?: string): string {
  // Extract filename from path: feature-goals/{bpmnFile}-{elementId}.html
  const match = originalPath.match(/feature-goals\/([^/]+\.html)$/);
  if (!match) {
    // Fallback: use last part of path
    const parts = originalPath.split('/');
    return parts[parts.length - 1];
  }

  const filename = match[1];
  
  // Add mode prefix if present
  if (mode) {
    const modePrefix = mode.replace(/\//g, '-');
    return `${modePrefix}--${filename}`;
  }

  return filename;
}

/**
 * Create export directory structure
 */
async function ensureExportDir(): Promise<void> {
  if (!existsSync(EXPORT_DIR)) {
    await mkdir(EXPORT_DIR, { recursive: true });
    console.log(`📁 Created export directory: ${EXPORT_DIR}`);
  }
}

/**
 * Generate index/README file with export information
 */
async function generateIndexFile(files: FeatureGoalFile[]): Promise<void> {
  const indexPath = join(EXPORT_DIR, 'README.md');
  const timestamp = new Date().toISOString();

  const content = `# Feature Goal Documentation Export

**Export Date:** ${new Date(timestamp).toLocaleString('sv-SE')}
**Total Files:** ${files.length}
**Version Filter:** ${requestedVersion}

## Files Exported

${files
  .map(
    (file, index) =>
      `${index + 1}. **${file.name}**\n   - Path: \`${file.path}\`\n   - Size: ${(file.size / 1024).toFixed(2)} KB\n   - Version: ${file.version || 'legacy (no version suffix)'}\n   - Mode: ${file.mode || 'legacy'}\n   - Last Modified: ${new Date(file.lastModified).toLocaleString('sv-SE')}`
  )
  .join('\n\n')}

## Export Structure

Files are exported with the following naming convention:
- \`{mode}--{bpmnFile}-{elementId}-v{version}.html\` (if mode and version are present)
- \`{mode}--{bpmnFile}-{elementId}.html\` (if mode is present but no version)
- \`{bpmnFile}-{elementId}-v{version}.html\` (if version is present but no mode)
- \`{bpmnFile}-{elementId}.html\` (legacy files)

Where:
- **mode** can be:
  - \`local\` - Local fallback documentation
  - \`slow-chatgpt\` - ChatGPT-generated documentation
  - \`slow-ollama\` - Ollama-generated documentation
  - \`slow\` - Generic LLM-generated documentation
  - (no prefix) - Legacy documentation
- **version** can be:
  - \`v1\` - Template version 1 (original structure)
  - \`v2\` - Template version 2 (new 8-chapter structure)
  - (no suffix) - Legacy files without version

## Usage

These HTML files can be:
- Opened directly in a web browser
- Served via a static file server
- Committed to version control
- Shared with team members
- Used for offline documentation

---

*Generated by BPMN Planner export script*
`;

  await writeFile(indexPath, content, 'utf-8');
  console.log(`📄 Generated index file: ${indexPath}`);
}

async function main() {
  console.log('🚀 Starting Feature Goal export...\n');
  
  if (requestedVersion !== 'all') {
    console.log(`📌 Filter: Exporting only ${requestedVersion.toUpperCase()} files\n`);
  } else {
    console.log('📌 Filter: Exporting all versions\n');
  }

  // Ensure export directory exists
  await ensureExportDir();

  // List all Feature Goal files
  console.log('📋 Scanning Supabase Storage for Feature Goal files...');
  const allFiles = await listFilesRecursive('docs');

  if (allFiles.length === 0) {
    console.log('⚠️  No Feature Goal HTML files found in Supabase Storage.');
    console.log('   Make sure you have generated documentation first.');
    process.exit(0);
  }

  console.log(`✅ Found ${allFiles.length} Feature Goal file(s)\n`);

  // Deduplicate files: keep only one version per (bpmnFile + elementId + version)
  // Priority: local > slow-chatgpt > slow-ollama > slow > legacy (no mode)
  const modePriority: Record<string, number> = {
    'local': 1,
    'slow/chatgpt': 2,
    'slow-chatgpt': 2,
    'slow/ollama': 3,
    'slow-ollama': 3,
    'slow': 4,
  };
  
  function getFileKey(file: FeatureGoalFile): string {
    // Extract bpmnFile and elementId from path
    const match = file.path.match(/feature-goals\/([^/]+)\.html$/);
    if (!match) return file.path;
    const filename = match[1];
    // Remove version suffix if present (e.g., "-v2")
    const baseName = filename.replace(/-v[12]$/, '');
    // Combine with version to create unique key
    return `${baseName}--${file.version || 'legacy'}`;
  }
  
  function getModePriority(file: FeatureGoalFile): number {
    if (!file.mode) return 999; // Legacy files have lowest priority
    return modePriority[file.mode] || 999;
  }
  
  // Group files by unique key and keep only the highest priority one
  const fileMap = new Map<string, FeatureGoalFile>();
  for (const file of allFiles) {
    const key = getFileKey(file);
    const existing = fileMap.get(key);
    
    if (!existing || getModePriority(file) < getModePriority(existing)) {
      fileMap.set(key, file);
    }
  }
  
  const deduplicatedFiles = Array.from(fileMap.values());
  const skippedCount = allFiles.length - deduplicatedFiles.length;
  
  if (skippedCount > 0) {
    console.log(`🔍 Deduplication: Skipped ${skippedCount} duplicate file(s), keeping ${deduplicatedFiles.length} unique file(s)\n`);
  }

  // Download and save each file
  let successCount = 0;
  let errorCount = 0;

  for (const file of deduplicatedFiles) {
    try {
      console.log(`📥 Downloading: ${file.path}`);
      const content = await downloadFile(file.path);

      if (!content) {
        console.error(`   ❌ Failed to download`);
        errorCount++;
        continue;
      }

      const exportFilename = generateExportFilename(file.path, file.mode);
      const exportPath = join(EXPORT_DIR, exportFilename);

      await writeFile(exportPath, content, 'utf-8');
      console.log(`   ✅ Saved: ${exportFilename} (${(file.size / 1024).toFixed(2)} KB)`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error processing ${file.path}:`, error);
      errorCount++;
    }
  }

  // Generate index file
  if (successCount > 0) {
    await generateIndexFile(deduplicatedFiles);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Export Summary:');
  console.log(`   ✅ Successfully exported: ${successCount} file(s)`);
  if (skippedCount > 0) {
    console.log(`   ⏭️  Skipped duplicates: ${skippedCount} file(s)`);
  }
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} file(s)`);
  }
  console.log(`   📁 Export directory: ${EXPORT_DIR}`);
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

