#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Import improved Feature Goal HTML documentation from local filesystem to Supabase Storage
 * 
 * Usage:
 *   npm run import:feature-goals
 * 
 * Imports all Feature Goal HTML files from exports/feature-goals/ back to Supabase Storage
 * This is used after AI has improved the content of exported files.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, join, dirname } from 'path';
import { readFile, readdir } from 'fs/promises';
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

interface FileToImport {
  localPath: string;
  filename: string;
  mode?: string;
  originalPath?: string;
}

/**
 * Parse filename to extract mode and original path information
 * Format: {mode}--{bpmnFile}-{elementId}.html
 */
function parseExportFilename(filename: string): { mode?: string; originalFilename: string } {
  // Check if filename has mode prefix (e.g., "local--", "slow-chatgpt--")
  const modeMatch = filename.match(/^(.+?)--(.+)$/);
  if (modeMatch) {
    return {
      mode: modeMatch[1],
      originalFilename: modeMatch[2],
    };
  }

  // No mode prefix - legacy file
  return {
    originalFilename: filename,
  };
}

/**
 * Reconstruct storage path from filename and mode
 */
function reconstructStoragePath(originalFilename: string, mode?: string): string {
  // Original filename format: {bpmnFile}-{elementId}.html
  // Storage path format: docs/{mode}/feature-goals/{bpmnFile}-{elementId}.html

  if (!mode) {
    // Legacy path
    return `docs/feature-goals/${originalFilename}`;
  }

  if (mode === 'local') {
    return `docs/local/feature-goals/${originalFilename}`;
  }

  if (mode === 'slow-chatgpt') {
    return `docs/slow/chatgpt/feature-goals/${originalFilename}`;
  }

  if (mode === 'slow-ollama') {
    return `docs/slow/ollama/feature-goals/${originalFilename}`;
  }

  if (mode === 'slow') {
    return `docs/slow/feature-goals/${originalFilename}`;
  }

  // Unknown mode - use legacy path
  console.warn(`⚠️  Unknown mode "${mode}" for ${originalFilename}, using legacy path`);
  return `docs/feature-goals/${originalFilename}`;
}

/**
 * Read all HTML files from export directory
 */
async function findExportFiles(): Promise<FileToImport[]> {
  if (!existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory does not exist: ${EXPORT_DIR}`);
    console.error('   Run "npm run export:feature-goals" first to export files.');
    process.exit(1);
  }

  const files: FileToImport[] = [];
  const entries = await readdir(EXPORT_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'README.md') {
      const localPath = join(EXPORT_DIR, entry.name);
      const { mode, originalFilename } = parseExportFilename(entry.name);
      const storagePath = reconstructStoragePath(originalFilename, mode);

      files.push({
        localPath,
        filename: entry.name,
        mode,
        originalPath: storagePath,
      });
    }
  }

  return files;
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadFile(file: FileToImport): Promise<boolean> {
  try {
    const content = await readFile(file.localPath, 'utf-8');
    // Convert to Buffer for Node.js (Blob is not available in Node.js)
    const buffer = Buffer.from(content, 'utf-8');

    if (!file.originalPath) {
      console.error(`❌ No storage path for ${file.filename}`);
      return false;
    }

    const { error: uploadError } = await supabase.storage
      .from('bpmn-files')
      .upload(file.originalPath, buffer, {
        upsert: true,
        contentType: 'text/html; charset=utf-8',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error(`   ❌ Upload error: ${uploadError.message}`);
      return false;
    }

    // Also upload to legacy path if mode is present
    if (file.mode) {
      const { originalFilename } = parseExportFilename(file.filename);
      const legacyPath = `docs/feature-goals/${originalFilename}`;
      if (legacyPath !== file.originalPath) {
        const { error: legacyError } = await supabase.storage
          .from('bpmn-files')
          .upload(legacyPath, buffer, {
            upsert: true,
            contentType: 'text/html; charset=utf-8',
            cacheControl: '3600',
          });

        if (legacyError) {
          console.warn(`   ⚠️  Could not upload legacy path: ${legacyError.message}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Error reading/uploading ${file.filename}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Feature Goal import...\n');

  // Find all export files
  console.log('📋 Scanning export directory for HTML files...');
  const files = await findExportFiles();

  if (files.length === 0) {
    console.log('⚠️  No HTML files found in export directory.');
    console.log(`   Expected location: ${EXPORT_DIR}`);
    console.log('   Make sure you have exported files first.');
    process.exit(0);
  }

  console.log(`✅ Found ${files.length} file(s) to import\n`);

  // Upload each file
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    console.log(`📤 Uploading: ${file.filename}`);
    console.log(`   → ${file.originalPath}`);
    if (file.mode) {
      console.log(`   Mode: ${file.mode}`);
    }

    const success = await uploadFile(file);
    if (success) {
      console.log(`   ✅ Successfully uploaded`);
      successCount++;
    } else {
      errorCount++;
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Successfully imported: ${successCount} file(s)`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount} file(s)`);
  }
  console.log('='.repeat(60));

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

