/**
 * Script för att rensa gamla LLM debug-filer från Supabase Storage
 * 
 * Tar bort alla filer i:
 * - llm-debug/docs-raw/
 * - llm-debug/docs/
 * 
 * Dessa är gamla debug-filer som inte längre används.
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

/**
 * Lista alla filer i en mapp rekursivt
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
      console.error(`Error listing ${path}:`, error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return;
    }
    
    if (!data || data.length === 0) {
      return;
    }
    
    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      // Supabase Storage list() returnerar items där:
      // - id är null för filer
      // - id är inte null för mappar
      // Men vi kan också kolla metadata för att avgöra
      if (item.id === null || !item.metadata) {
        // Det är en fil
        files.push(fullPath);
      } else {
        // Det är en mapp, lista rekursivt
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
  
  // Ta bort en i taget för bättre felhantering
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    // Försök ta bort filen
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .remove([filePath]);
    
    if (error) {
      // Om det är en mapp, försök lista innehållet först och ta bort alla filer i den
      if (error.message?.includes('folder') || error.message?.includes('directory')) {
        console.log(`   ${filePath} appears to be a folder, listing contents...`);
        const folderFiles = await listAllFiles(filePath);
        if (folderFiles.length > 0) {
          console.log(`   Found ${folderFiles.length} files in folder, deleting them...`);
          const folderResult = await deleteFiles(folderFiles);
          deleted += folderResult.deleted;
          errors += folderResult.errors;
        }
        // Försök ta bort mappen själv (kan kräva att den är tom)
        const { error: folderError } = await supabase.storage
          .from('bpmn-files')
          .remove([filePath]);
        if (!folderError) {
          deleted++;
        } else {
          console.error(`   Could not remove folder ${filePath}:`, folderError);
          errors++;
        }
      } else {
        console.error(`Error deleting ${filePath}:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        errors++;
      }
    } else {
      deleted++;
      if ((i + 1) % 10 === 0 || i === filePaths.length - 1) {
        console.log(`Deleted ${i + 1}/${filePaths.length} files...`);
      }
    }
  }
  
  return { deleted, errors };
}

async function main() {
  console.log('🧹 Starting cleanup of old LLM debug files...\n');
  
  const foldersToClean = ['llm-debug/docs-raw', 'llm-debug/docs'];
  const allFilesToDelete: string[] = [];
  
  for (const folder of foldersToClean) {
    console.log(`📁 Listing files in ${folder}/...`);
    
    // Lista alla filer i mappen rekursivt
    const files = await listAllFiles(folder);
    
    if (files.length > 0) {
      console.log(`   Found ${files.length} files`);
      allFilesToDelete.push(...files);
    } else {
      // Om listAllFiles inte hittar något, försök lista direkt
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .list(folder, { limit: 1000 });
      
      if (error) {
        console.log(`   Error listing ${folder}: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`   Found ${data.length} items (direct list)`);
        // Lägg till alla items som filer (Supabase Storage list() returnerar både filer och mappar)
        data.forEach(item => {
          const filePath = `${folder}/${item.name}`;
          allFilesToDelete.push(filePath);
        });
      } else {
        console.log(`   ✓ No files found in ${folder}/`);
      }
    }
  }
  
  if (allFilesToDelete.length === 0) {
    console.log('\n   ✓ No files found to delete');
    console.log('\n✅ Cleanup complete! (nothing to clean)');
    return;
  }
  
  console.log(`\n   Total files to delete: ${allFilesToDelete.length}`);
  if (allFilesToDelete.length <= 20) {
    console.log(`   Files to delete:`, allFilesToDelete.map(f => `\n     - ${f}`).join(''));
  } else {
    console.log(`   First 10 files:`, allFilesToDelete.slice(0, 10).map(f => `\n     - ${f}`).join(''));
    console.log(`   ... and ${allFilesToDelete.length - 10} more`);
  }
  
  console.log(`\n🗑️  Deleting ${allFilesToDelete.length} files...`);
  const result = await deleteFiles(allFilesToDelete);
  
  console.log(`\n   ✓ Deleted: ${result.deleted} files`);
  if (result.errors > 0) {
    console.log(`   ⚠️  Errors: ${result.errors} files`);
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log('\n💡 Tip: If files still exist, you can delete the folders directly in Supabase Dashboard:');
  console.log('   - Storage > bpmn-files > llm-debug > docs');
  console.log('   - Storage > bpmn-files > llm-debug > docs-raw');
}

main().catch((error) => {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
});
