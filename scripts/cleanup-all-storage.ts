/**
 * Script för att rensa ALLT från Supabase Storage
 * 
 * Detta tar bort:
 * - Alla BPMN/DMN filer i root
 * - bpmn-map.json
 * - Alla dokumentation, tester, reports, etc.
 * - llm-debug
 * 
 * VIKTIGT: Detta raderar ALLT i Storage. Använd bara om du verkligen vill starta om från scratch.
 * 
 * Användning:
 *   npm run cleanup:all-storage
 *   npm run cleanup:all-storage:dry  (dry-run, visar bara vad som skulle raderas)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--dry');

/**
 * Lista alla filer rekursivt i en mapp
 */
async function listAllFiles(prefix: string): Promise<string[]> {
  const files: string[] = [];
  
  async function listRecursive(path: string) {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list(path, {
        limit: 1000,
        offset: 0,
      });
    
    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return;
      }
      console.error(`Error listing ${path}:`, error);
      return;
    }
    
    if (!data || data.length === 0) {
      return;
    }
    
    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      const hasExtension = item.name.includes('.') && !item.name.endsWith('/');
      const hasSize = item.metadata?.size && item.metadata.size > 0;
      
      if (hasExtension || hasSize) {
        files.push(fullPath);
      } else {
        await listRecursive(fullPath);
      }
    }
  }
  
  await listRecursive(prefix);
  return files;
}

/**
 * Ta bort alla filer i en lista
 */
async function deleteFiles(filePaths: string[]): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  
  if (isDryRun) {
    console.log(`\n[DRY-RUN] Would delete ${filePaths.length} files:`);
    filePaths.slice(0, 20).forEach(f => console.log(`  - ${f}`));
    if (filePaths.length > 20) {
      console.log(`  ... and ${filePaths.length - 20} more`);
    }
    return { deleted: filePaths.length, errors: 0 };
  }
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    const { error } = await supabase.storage
      .from('bpmn-files')
      .remove([filePath]);
    
    if (error) {
      console.error(`Error deleting ${filePath}:`, error.message);
      errors++;
    } else {
      deleted++;
      if ((i + 1) % 50 === 0 || i === filePaths.length - 1) {
        console.log(`Deleted ${i + 1}/${filePaths.length} files...`);
      }
    }
  }
  
  return { deleted, errors };
}

async function main() {
  console.log(isDryRun ? '🔍 [DRY-RUN] Analyzing Storage...\n' : '🧹 Starting complete Storage cleanup...\n');
  
  // List all files in root (BPMN/DMN files and bpmn-map.json)
  console.log('📁 Listing files in root...');
  const { data: rootFiles } = await supabase.storage
    .from('bpmn-files')
    .list('', { limit: 1000 });
  
  const rootFilesToDelete: string[] = [];
  const rootBpmnDmn = rootFiles?.filter(f => f.name.endsWith('.bpmn') || f.name.endsWith('.dmn')) || [];
  const rootOther = rootFiles?.filter(f => 
    !f.name.endsWith('.bpmn') && 
    !f.name.endsWith('.dmn') && 
    f.name.includes('.') && // Has extension (files, not folders)
    f.metadata?.size !== undefined // Has metadata (is a file, not a folder)
  ) || [];
  
  rootBpmnDmn.forEach(f => rootFilesToDelete.push(f.name));
  rootOther.forEach(f => rootFilesToDelete.push(f.name));
  
  // Always try to delete bpmn-map.json even if it doesn't show up in list
  if (!rootFilesToDelete.includes('bpmn-map.json')) {
    // Try to check if it exists by attempting to download it
    const { error: checkError } = await supabase.storage
      .from('bpmn-files')
      .download('bpmn-map.json');
    
    if (!checkError) {
      console.log('   Found bpmn-map.json (not in list, but exists)');
      rootFilesToDelete.push('bpmn-map.json');
    }
  }
  
  if (rootFilesToDelete.length > 0) {
    console.log(`   Found ${rootFilesToDelete.length} files in root`);
  }
  
  // List all files in subdirectories
  const subdirs = ['docs', 'tests', 'test-reports', 'reports', 'llm-debug', 'e2e-scenarios'];
  const allFilesToDelete: string[] = [...rootFilesToDelete];
  
  for (const subdir of subdirs) {
    console.log(`📁 Listing files in ${subdir}/...`);
    const files = await listAllFiles(subdir);
    if (files.length > 0) {
      console.log(`   Found ${files.length} files`);
      allFilesToDelete.push(...files);
    }
  }
  
  // Always include bpmn-map.json if it exists
  if (rootOther.some(f => f.name === 'bpmn-map.json')) {
    if (!allFilesToDelete.includes('bpmn-map.json')) {
      allFilesToDelete.push('bpmn-map.json');
    }
  }
  
  if (allFilesToDelete.length === 0) {
    console.log('\n   ✓ No files found to delete');
    console.log('\n✅ Cleanup complete! (nothing to clean)');
    return;
  }
  
  console.log(`\n   Total files to delete: ${allFilesToDelete.length}`);
  if (allFilesToDelete.length <= 20) {
    console.log(`   Files to delete:`);
    allFilesToDelete.forEach(f => console.log(`     - ${f}`));
  } else {
    console.log(`   First 20 files:`);
    allFilesToDelete.slice(0, 20).forEach(f => console.log(`     - ${f}`));
    console.log(`   ... and ${allFilesToDelete.length - 20} more`);
  }
  
  if (isDryRun) {
    console.log('\n🔍 [DRY-RUN] Would delete the above files. Run without --dry-run to actually delete.');
    return;
  }
  
  console.log(`\n🗑️  Deleting ${allFilesToDelete.length} files...`);
  const result = await deleteFiles(allFilesToDelete);
  
  console.log(`\n   ✓ Deleted: ${result.deleted} files`);
  if (result.errors > 0) {
    console.log(`   ⚠️  Errors: ${result.errors} files`);
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log('\n💡 All files have been removed from Storage. You can now start fresh.');
}

main().catch((error) => {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
});

