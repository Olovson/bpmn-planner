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

/**
 * Identifierar felaktigt genererade feature goals baserat på namn-mönster.
 * Feature goals ska bara finnas för:
 * 1. CallActivities (format: mortgage-se-{parent}-{elementId}.html)
 * 2. Subprocess process nodes (format: mortgage-se-{processId}.html)
 * 
 * Felaktiga är:
 * - Tasks med .bpmn-activity_ eller activity_ i namnet
 * - Tasks med .bpmn-{taskName} format (där taskName inte är en subprocess)
 */
function isIncorrectFeatureGoal(fileName: string): boolean {
  const name = fileName.replace('.html', '');
  
  // Pattern 1: Contains .bpmn-activity_ or activity_ (definitivt en task)
  if (/\.bpmn-[a-z_]+/i.test(name) || /^activity_[a-z0-9]+$/i.test(name)) {
    return true;
  }
  
  // Pattern 2: mortgage-Activity_... (task med mortgage- prefix)
  if (/^mortgage-Activity_[a-z0-9]+$/i.test(name)) {
    return true;
  }
  
  // Pattern 3: mortgage-se-{process}-Activity_... (task i en process)
  if (/^mortgage-se-[a-z-]+-Activity_[a-z0-9]+$/i.test(name)) {
    return true;
  }
  
  // Pattern 4: se-{file}.bpmn-{taskName} där taskName inte är en känd subprocess
  // (t.ex. se-application.bpmn-fetch-credit-information är en task, inte call activity)
  // Men vi måste vara försiktiga - vissa kan vara korrekta call activities
  // Låt oss kolla om det ser ut som en task (inte en känd subprocess)
  if (/^se-[a-z-]+\.bpmn-[a-z-]+$/i.test(name)) {
    // Om det inte matchar pattern för call activity (som skulle vara mortgage-se-{parent}-{elementId})
    // och inte är en känd subprocess-fil, så är det troligen en task
    // Men för att vara säkra, låt oss bara flagga de som definitivt är tasks
    // (de som har activity_ eller liknande)
    return false; // Vi hanterar detta i Pattern 1
  }
  
  return false;
}

async function removeIncorrectFeatureGoals() {
  const rootHash = '1a2f59c4a90e104a3f14078b90fde0c9b393e7e54cbd24f0304f4f4ca73b232d';
  
  console.log('🔍 Identifierar felaktigt genererade feature goals...\n');
  
  // List all feature goals in old location
  const { data: oldFiles, error: oldError } = await supabase.storage
    .from('bpmn-files')
    .list(`docs/claude/mortgage.bpmn/${rootHash}/feature-goals`, { limit: 1000 });
  
  if (oldError) {
    console.error('Error listing old files:', oldError);
    return;
  }
  
  // List all feature goals in new locations (per-file paths)
  // Vi behöver lista alla BPMN-filer först
  const { data: bpmnFiles } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_type', 'bpmn');
  
  const allFilesToCheck: Array<{ path: string; fileName: string }> = [];
  
  // Old location
  oldFiles?.forEach(file => {
    allFilesToCheck.push({
      path: `docs/claude/mortgage.bpmn/${rootHash}/feature-goals/${file.name}`,
      fileName: file.name
    });
  });
  
  // New locations (per-file paths)
  if (bpmnFiles) {
    for (const bpmnFile of bpmnFiles) {
      const fileName = bpmnFile.file_name;
      // List feature goals for this file
      const { data: newFiles } = await supabase.storage
        .from('bpmn-files')
        .list(`docs/claude/${fileName}`, { limit: 1000, search: 'feature-goals' });
      
      if (newFiles) {
        newFiles.forEach(file => {
          if (file.name.endsWith('.html') && file.name.includes('feature-goals')) {
            // Extract just the filename from the path
            const featureGoalName = file.name.split('/').pop() || file.name;
            allFilesToCheck.push({
              path: `docs/claude/${fileName}/${file.name}`,
              fileName: featureGoalName
            });
          }
        });
      }
    }
  }
  
  // Identify incorrect files
  const incorrectFiles = allFilesToCheck.filter(f => isIncorrectFeatureGoal(f.fileName));
  
  console.log(`📊 Totalt antal feature goals att kontrollera: ${allFilesToCheck.length}`);
  console.log(`❌ Felaktigt genererade: ${incorrectFiles.length}\n`);
  
  if (incorrectFiles.length === 0) {
    console.log('✅ Inga felaktiga feature goals hittades!');
    return;
  }
  
  console.log('📋 Felaktiga feature goals som kommer tas bort:');
  incorrectFiles.slice(0, 20).forEach(f => console.log(`  - ${f.fileName}`));
  if (incorrectFiles.length > 20) {
    console.log(`  ... och ${incorrectFiles.length - 20} fler`);
  }
  console.log('');
  
  // Remove files
  console.log('🗑️  Tar bort felaktiga feature goals...\n');
  
  let removed = 0;
  let errors = 0;
  
  for (const file of incorrectFiles) {
    const { error } = await supabase.storage
      .from('bpmn-files')
      .remove([file.path]);
    
    if (error) {
      console.error(`  ❌ Kunde inte ta bort ${file.path}:`, error.message);
      errors++;
    } else {
      removed++;
      if (removed % 10 === 0) {
        console.log(`  ✅ Tog bort ${removed}/${incorrectFiles.length}...`);
      }
    }
  }
  
  console.log('\n📊 Sammanfattning:');
  console.log(`  ✅ Tog bort: ${removed} filer`);
  if (errors > 0) {
    console.log(`  ❌ Fel: ${errors} filer`);
  }
  console.log(`  📊 Totalt: ${incorrectFiles.length} filer`);
}

removeIncorrectFeatureGoals().catch(console.error);
