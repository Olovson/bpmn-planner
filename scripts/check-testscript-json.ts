#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Check raw JSON response for testscript generation
 * Usage: npx tsx scripts/check-testscript-json.ts register-household-economy-information
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
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTestscriptJson(elementId: string) {
  console.log(`\n🔍 Kontrollerar rå JSON för testscript: ${elementId}\n`);
  console.log('═'.repeat(70));

  const safeId = elementId.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  console.log(`Söker efter: llm-debug/tests/${safeId}*.json\n`);

  // List all files in llm-debug/tests
  const { data: files, error } = await supabase.storage
    .from('bpmn-files')
    .list('llm-debug/tests', {
      search: safeId,
    });

  if (error) {
    console.error('❌ Fel vid sökning:', error);
    return;
  }

  if (!files || files.length === 0) {
    console.log('❌ Inga rå JSON-filer hittades');
    return;
  }

  // Sort by created_at descending (newest first)
  files.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  console.log(`✅ Hittade ${files.length} fil(er), använder senaste:\n`);
  console.log(`   ${files[0].name}\n`);

  // Download the latest file
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('bpmn-files')
    .download(`llm-debug/tests/${files[0].name}`);

  if (downloadError || !fileData) {
    console.error('❌ Fel vid nedladdning:', downloadError?.message || 'No data');
    return;
  }

  const rawText = await fileData.text();
  console.log(`📄 Nedladdad: ${rawText.length} bytes\n`);

  // Show first 500 and last 500 chars
  console.log('📋 Första 500 tecknen:');
  console.log(rawText.substring(0, 500));
  console.log('\n📋 Sista 500 tecknen:');
  console.log(rawText.substring(Math.max(0, rawText.length - 500)));

  // Try to parse JSON
  let jsonObj: any = null;
  try {
    // Use same sanitization as in code
    let jsonText = rawText.trim();
    jsonText = jsonText.replace(/```(?:json)?/gi, '').replace(/```/g, '');

    const firstBrace = jsonText.indexOf('{');
    const firstBracket = jsonText.indexOf('[');
    const startCandidates = [firstBrace, firstBracket].filter((idx) => idx >= 0);
    if (startCandidates.length) {
      const start = Math.min(...startCandidates);
      if (start > 0) {
        jsonText = jsonText.slice(start);
      }
    }

    const lastBrace = jsonText.lastIndexOf('}');
    const lastBracket = jsonText.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end >= 0 && end + 1 < jsonText.length) {
      jsonText = jsonText.slice(0, end + 1);
    }

    jsonObj = JSON.parse(jsonText.trim());
    console.log('\n✅ JSON parsad framgångsrikt\n');
  } catch (parseError: any) {
    console.error('\n❌ Kunde inte parsa JSON:', parseError.message);
    
    // Show position if available
    const posMatch = parseError.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      console.log(`\n📍 Fel vid position ${pos}:`);
      const start = Math.max(0, pos - 100);
      const end = Math.min(rawText.length, pos + 100);
      console.log(rawText.substring(start, end));
      console.log('   '.repeat(Math.max(0, pos - start)) + '^');
    }
    
    return;
  }

  // Analyze scenarios
  const scenarios = Array.isArray(jsonObj) ? jsonObj : jsonObj?.scenarios;
  if (!Array.isArray(scenarios)) {
    console.error('❌ scenarios är inte en array');
    return;
  }

  console.log(`📊 Analys av ${scenarios.length} scenarier:\n`);
  scenarios.forEach((scenario, index) => {
    console.log(`Scenario ${index}:`);
    const required = ['name', 'description', 'expectedResult', 'type', 'steps'];
    const missing = required.filter(field => !(field in scenario));
    if (missing.length > 0) {
      console.log(`  ❌ Saknade fält: ${missing.join(', ')}`);
    } else {
      console.log(`  ✅ Alla required fields finns`);
      console.log(`     name: ${scenario.name?.substring(0, 50) || 'SAKNAS'}...`);
      console.log(`     type: ${scenario.type || 'SAKNAS'}`);
      console.log(`     steps: ${Array.isArray(scenario.steps) ? scenario.steps.length : 'INTE ARRAY'} steg`);
    }
    console.log('');
  });
}

const elementId = process.argv[2] || 'register-household-economy-information';

checkTestscriptJson(elementId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
















