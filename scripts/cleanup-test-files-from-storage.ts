/**
 * Cleanup Test Files from Supabase Storage
 * 
 * Rensar alla testfiler (dokumentation, tester, etc.) från Supabase Storage
 * som har "test-" prefix i filnamnet eller path.
 * 
 * Usage:
 *   npm run cleanup:test-files:storage
 *   npm run cleanup:test-files:storage:dry  (dry-run)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
// För lokala scripts kan vi använda service_role key eller anon key
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ Supabase key is not set. Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in .env.local');
  console.error('   For local Supabase, you can use the anon key from Supabase Dashboard');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const isDryRun = process.argv.includes('--dry-run');

/**
 * Listar alla filer rekursivt i en mapp
 * Använder samma logik som cleanup-llm-debug-files.ts
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
      // Om mappen inte finns, det är ok
      if (error.message?.includes('not found') || error.message?.includes('does not exist') || error.statusCode === 404) {
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
      
      // Supabase Storage list() returnerar items där:
      // - Om item har en filändelse (t.ex. .txt, .json, .html) är det en fil
      // - Om item inte har filändelse eller är tom, kan det vara en mapp
      // - Vi kan också kolla om metadata.size finns och är > 0
      // - VIKTIGT: .bpmn kan vara både filer OCH mappar (versioned paths)
      const hasExtension = item.name.includes('.') && !item.name.endsWith('/');
      const hasSize = item.metadata?.size && item.metadata.size > 0;
      const isBpmnFile = item.name.endsWith('.bpmn');
      
      // Om det är en .bpmn-fil, försök lista innehållet först (kan vara en mapp)
      if (isBpmnFile) {
        // Försök lista innehållet - om det fungerar är det en mapp
        const { data: subData, error: subError } = await supabase.storage
          .from('bpmn-files')
          .list(fullPath, { limit: 1 });
        
        if (!subError && subData && subData.length > 0) {
          // Det är en mapp, lista rekursivt
          await listRecursive(fullPath);
        } else if (hasSize) {
          // Det är en fil
          files.push(fullPath);
        } else {
          // Osäker, försök lista rekursivt först
          await listRecursive(fullPath);
        }
      } else if (hasExtension || hasSize) {
        // Det är en fil
        files.push(fullPath);
      } else {
        // Det är troligen en mapp, lista rekursivt
        await listRecursive(fullPath);
      }
    }
  }
  
  await listRecursive(prefix);
  return files;
}

/**
 * Kontrollerar om en fil är en testfil
 */
function isTestFile(filePath: string): boolean {
  // Kontrollera om path innehåller "test-" någonstans
  // Testfiler har format: test-{timestamp}-{random}-{name}
  // Kan finnas i filnamnet eller i path:en (t.ex. i feature-goals/)
  const testPattern = /test-\d+-\d+-/;
  
  // Kolla både filnamnet och hela path:en
  const fileName = filePath.split('/').pop() || '';
  const pathParts = filePath.split('/');
  
  // Kolla om någon del av path:en matchar test-pattern
  return testPattern.test(filePath) || testPattern.test(fileName) || 
         pathParts.some(part => testPattern.test(part));
}

/**
 * Rensar gamla testfiler från databasen (bpmn_files tabellen)
 */
async function cleanupTestFilesFromDatabase(): Promise<void> {
  console.log('🧹 Cleaning up old test files from database...\n');
  
  // Hämta alla test-filer från databasen
  const { data: testFiles, error: fetchError } = await supabase
    .from('bpmn_files')
    .select('file_name, created_at')
    .like('file_name', 'test-%')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching test files from database:', fetchError);
    return;
  }
  
  if (!testFiles || testFiles.length === 0) {
    console.log('✓ No test files found in database');
    return;
  }
  
  // Filtrera bort test-filer från senaste 10 minuterna (behåll nyliga för pågående tester)
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  
  const oldTestFiles = testFiles.filter(file => {
    const createdAt = new Date(file.created_at);
    return createdAt < tenMinutesAgo;
  });
  
  if (oldTestFiles.length === 0) {
    console.log(`✓ No old test files to clean (${testFiles.length} recent test files kept)`);
    return;
  }
  
  console.log(`📋 Found ${oldTestFiles.length} old test files to delete (keeping ${testFiles.length - oldTestFiles.length} recent ones):`);
  if (oldTestFiles.length <= 20) {
    oldTestFiles.forEach(file => {
      console.log(`   - ${file.file_name} (created: ${file.created_at})`);
    });
  } else {
    oldTestFiles.slice(0, 10).forEach(file => {
      console.log(`   - ${file.file_name} (created: ${file.created_at})`);
    });
    console.log(`   ... and ${oldTestFiles.length - 10} more`);
  }
  
  if (isDryRun) {
    console.log('\n🔍 DRY-RUN: Would delete these files from database, but skipping actual deletion');
    return;
  }
  
  // Ta bort gamla test-filer från databasen
  const fileNamesToDelete = oldTestFiles.map(f => f.file_name);
  
  const { error: deleteError } = await supabase
    .from('bpmn_files')
    .delete()
    .in('file_name', fileNamesToDelete);
  
  if (deleteError) {
    console.error('❌ Error deleting test files from database:', deleteError);
  } else {
    console.log(`\n✅ Deleted ${oldTestFiles.length} old test files from database`);
  }
}

/**
 * Rensar alla testfiler från Storage
 */
async function cleanupTestFilesFromStorage(): Promise<void> {
  console.log('🧹 Starting cleanup of test files from Supabase Storage...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY-RUN mode: No files will be deleted\n');
  }
  
  // Lista alla filer i docs/claude (dokumentation) - rekursivt
  console.log('📁 Listing all files in docs/claude/ (recursive)...');
  const docsFiles = await listAllFiles('docs/claude');
  console.log(`   Found ${docsFiles.length} files in docs/claude/`);
  
  // Lista alla filer i tests (tester) - rekursivt
  console.log('📁 Listing all files in tests/ (recursive)...');
  const testFiles = await listAllFiles('tests');
  console.log(`   Found ${testFiles.length} files in tests/`);
  
  // Lista alla filer i llm-debug (debug artifacts) - rekursivt
  console.log('📁 Listing all files in llm-debug/ (recursive)...');
  const debugFiles = await listAllFiles('llm-debug');
  console.log(`   Found ${debugFiles.length} files in llm-debug/`);
  
  // Lista även alla filer i root för att hitta testfiler som kan ligga där
  console.log('📁 Listing all files in root (recursive)...');
  const rootFiles = await listAllFiles('');
  console.log(`   Found ${rootFiles.length} files in root`);
  
  // Kombinera alla filer
  const allFiles = [...docsFiles, ...testFiles, ...debugFiles, ...rootFiles];
  
  // Debug: Visa alla filer om det är få
  if (allFiles.length <= 50) {
    console.log('\n📋 All files found:');
    allFiles.forEach(file => {
      const isTest = isTestFile(file);
      console.log(`   ${isTest ? '🧪' : '  '} ${file}`);
    });
  }
  
  // Filtrera testfiler
  const testFilesToDelete = allFiles.filter(isTestFile);
  
  if (testFilesToDelete.length === 0) {
    console.log('\n✅ No test files found in Storage');
    if (allFiles.length > 0) {
      console.log(`   (Found ${allFiles.length} total files, but none match test pattern)`);
    }
    return;
  }
  
  console.log(`\n📋 Found ${testFilesToDelete.length} test files to delete:`);
  if (testFilesToDelete.length <= 20) {
    testFilesToDelete.forEach(file => {
      console.log(`   - ${file}`);
    });
  } else {
    testFilesToDelete.slice(0, 10).forEach(file => {
      console.log(`   - ${file}`);
    });
    console.log(`   ... and ${testFilesToDelete.length - 10} more`);
  }
  
  if (isDryRun) {
    console.log('\n🔍 DRY-RUN: Would delete these files, but skipping actual deletion');
    return;
  }
  
  // Ta bort filerna
  console.log(`\n🗑️  Deleting ${testFilesToDelete.length} test files...`);
  
  let deleted = 0;
  let errors = 0;
  const failedFiles: string[] = [];
  
  // Ta bort en i taget för bättre felhantering
  // Detta är långsammare men mer robust när det finns problem med vissa filer
  for (let i = 0; i < testFilesToDelete.length; i++) {
    const filePath = testFilesToDelete[i];
    
    try {
      const { error } = await supabase.storage
        .from('bpmn-files')
        .remove([filePath]);
      
      if (error) {
        // Om filen inte finns, det är ok (kan redan vara borttagen)
        if (error.message?.includes('not found') || 
            error.message?.includes('does not exist') || 
            error.statusCode === 404 ||
            error.message?.includes('No such file')) {
          // Filen finns inte, räkna som borttagen
          deleted++;
        } else {
          // Annat fel - logga och fortsätt
          console.error(`   ❌ Error deleting ${filePath}:`, error.message || error);
          errors++;
          failedFiles.push(filePath);
        }
      } else {
        deleted++;
      }
      
      // Visa progress var 10:e fil eller vid sista filen
      if ((i + 1) % 10 === 0 || i === testFilesToDelete.length - 1) {
        console.log(`   Progress: ${i + 1}/${testFilesToDelete.length} (${deleted} deleted, ${errors} errors)`);
      }
    } catch (err) {
      console.error(`   ❌ Exception deleting ${filePath}:`, err);
      errors++;
      failedFiles.push(filePath);
    }
  }
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted: ${deleted} files`);
  if (errors > 0) {
    console.log(`   Errors: ${errors} files`);
    if (failedFiles.length <= 20) {
      console.log(`\n   Failed files:`);
      failedFiles.forEach(file => console.log(`     - ${file}`));
    } else {
      console.log(`\n   First 10 failed files:`);
      failedFiles.slice(0, 10).forEach(file => console.log(`     - ${file}`));
      console.log(`     ... and ${failedFiles.length - 10} more`);
    }
  }
}

// Run cleanup
async function main() {
  // Först rensa från databasen
  await cleanupTestFilesFromDatabase();
  
  // Sedan rensa från Storage
  await cleanupTestFilesFromStorage();
}

main()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

