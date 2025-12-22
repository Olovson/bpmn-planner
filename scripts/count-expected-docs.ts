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

async function countDocs() {
  console.log('=== Räkna förväntade dokumentationer ===\n');

  // 1. Räkna unika identifier från llm-debug/docs-raw
  console.log('1. Räknar unika identifier från llm-debug/docs-raw...');
  const { data: rawFiles } = await supabase.storage
    .from('bpmn-files')
    .list('llm-debug/docs-raw', { limit: 10000 });

  const identifiers = new Set<string>();
  rawFiles?.forEach(f => {
    const match = f.name.match(/^(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*?)\.txt$/);
    if (match) {
      identifiers.add(match[1]);
    } else {
      const altMatch = f.name.match(/^(.+?)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.txt$/);
      if (altMatch) {
        identifiers.add(altMatch[1]);
      }
    }
  });

  console.log(`   Total JSON-filer: ${rawFiles?.length || 0}`);
  console.log(`   Unika identifier: ${identifiers.size}\n`);

  // 2. Räkna faktiska noder från databasen
  console.log('2. Räknar faktiska noder från databasen...');
  const { data: mappings, error: mappingError } = await supabase
    .from('bpmn_element_mappings')
    .select('element_type');

  if (mappingError) {
    console.log(`   Fel vid hämtning: ${mappingError.message}`);
    console.log('   Försöker alternativ metod...\n');
    
    // Fallback: räkna från JSON-filerna direkt baserat på identifier
    console.log('   Baserat på identifier i llm-debug/docs-raw:');
    console.log(`   Unika identifier: ${identifiers.size}`);
    console.log('   (Detta är antalet unika dokumentationer som har genererats)\n');
    return;
  }

  if (!mappings || mappings.length === 0) {
    console.log('   Inga noder hittades i databasen');
    console.log('   Baserat på identifier i llm-debug/docs-raw:');
    console.log(`   Unika identifier: ${identifiers.size}\n`);
    return;
  }

  const nodesByType: Record<string, number> = {};
  mappings.forEach(mapping => {
    const type = mapping.element_type;
    nodesByType[type] = (nodesByType[type] || 0) + 1;
  });

  // Epics = UserTask + ServiceTask + BusinessRuleTask
  const epics = (nodesByType['UserTask'] || 0) + 
                (nodesByType['ServiceTask'] || 0) + 
                (nodesByType['BusinessRuleTask'] || 0);
  
  // Feature Goals = CallActivity
  const featureGoals = nodesByType['CallActivity'] || 0;

  console.log(`   Total noder: ${mappings.length}`);
  console.log(`   Epics (UserTask + ServiceTask + BusinessRuleTask): ${epics}`);
  console.log(`   Feature Goals (CallActivity): ${featureGoals}`);
  console.log(`   Förväntat totalt: ${epics + featureGoals}\n`);

  // 3. Jämför
  console.log('3. Jämförelse:');
  console.log(`   Unika identifier i llm-debug/docs-raw: ${identifiers.size}`);
  console.log(`   Förväntat från BPMN-noder: ${epics + featureGoals}`);
  console.log(`   Skillnad: ${identifiers.size - (epics + featureGoals)}`);
  
  if (identifiers.size > epics + featureGoals) {
    console.log(`\n   ⚠️  Det finns ${identifiers.size - (epics + featureGoals)} fler identifier än noder.`);
    console.log('   Detta kan bero på:');
    console.log('   - Flera versioner av samma dokument (olika timestamps)');
    console.log('   - Dokumentation för process-noder (inte bara tasks)');
    console.log('   - Dokumentation som inte längre finns i BPMN-filerna');
  } else if (identifiers.size < epics + featureGoals) {
    console.log(`\n   ⚠️  Det finns ${(epics + featureGoals) - identifiers.size} färre identifier än noder.`);
    console.log('   Detta kan bero på:');
    console.log('   - Noder som inte har genererats ännu');
    console.log('   - Noder som hoppades över vid generering');
  } else {
    console.log('\n   ✅ Antal matchar!');
  }
}

countDocs().catch(console.error);
