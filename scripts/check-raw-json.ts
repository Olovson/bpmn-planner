#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Check what was actually generated in the raw JSON response
 * Usage: npx tsx scripts/check-raw-json.ts mortgage-se-household register-household-economy-information
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

async function checkRawJson(bpmnFile: string, elementId: string) {
  console.log(`\n🔍 Kontrollerar rå JSON för: ${bpmnFile} - ${elementId}\n`);
  console.log('═'.repeat(70));

  const identifier = `${bpmnFile}-${elementId}`;
  const safeId = identifier.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  console.log(`Söker efter: llm-debug/docs-raw/${safeId}-*.txt\n`);

  // List all files in llm-debug/docs-raw
  const { data: files, error } = await supabase.storage
    .from('bpmn-files')
    .list('llm-debug/docs-raw', {
      search: safeId,
    });

  if (error) {
    console.error('❌ Fel vid sökning:', error);
    return;
  }

  if (!files || files.length === 0) {
    console.log('❌ Inga rå JSON-filer hittades');
    console.log('   Detta kan betyda att:');
    console.log('   - Genereringen kördes i test-läge (debug artifacts sparas inte)');
    console.log('   - Filen har inte genererats ännu');
    console.log('   - Identifier matchar inte');
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
    .download(`llm-debug/docs-raw/${files[0].name}`);

  if (downloadError || !fileData) {
    console.error('❌ Fel vid nedladdning:', downloadError?.message || 'No data');
    return;
  }

  const rawText = await fileData.text();
  console.log(`📄 Nedladdad: ${rawText.length} bytes\n`);

  // Try to parse JSON
  let jsonObj: any = null;
  try {
    // Remove markdown code blocks if present
    let jsonText = rawText.trim();
    jsonText = jsonText.replace(/```(?:json|javascript)?/gi, '').replace(/```/g, '').trim();
    
    // Remove comments
    jsonText = jsonText.replace(/\/\/.*$/gm, '');
    jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');

    // Find JSON object
    const firstBrace = jsonText.indexOf('{');
    if (firstBrace >= 0) {
      jsonText = jsonText.slice(firstBrace);
      // Find matching closing brace
      let braceCount = 0;
      let end = -1;
      for (let i = 0; i < jsonText.length; i++) {
        if (jsonText[i] === '{') braceCount++;
        if (jsonText[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end > 0) {
        jsonText = jsonText.slice(0, end);
      }
    }

    jsonObj = JSON.parse(jsonText);
    console.log('✅ JSON parsad framgångsrikt\n');
  } catch (parseError) {
    console.error('❌ Kunde inte parsa JSON:', parseError);
    console.log('\n📄 Första 500 tecknen av rå text:');
    console.log(rawText.substring(0, 500));
    return;
  }

  // Analyze the JSON structure
  console.log('📋 Analys av genererad JSON:\n');
  console.log('─'.repeat(70));

  const requiredFields = [
    { key: 'summary', label: 'Summary' },
    { key: 'prerequisites', label: 'Prerequisites' },
    { key: 'flowSteps', label: 'Flow Steps' },
    { key: 'userStories', label: 'User Stories' },
    { key: 'implementationNotes', label: 'Implementation Notes' },
  ];

  const optionalFields = [
    { key: 'interactions', label: 'Interactions' },
    { key: 'inputs', label: 'Inputs' },
    { key: 'outputs', label: 'Outputs' },
  ];

  console.log('Krävda fält:\n');
  for (const field of requiredFields) {
    const value = jsonObj[field.key];
    if (value === undefined) {
      console.log(`❌ ${field.label}: SAKNAS i JSON`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        console.log(`⚠️  ${field.label}: TOM array (${value.length} items)`);
      } else {
        console.log(`✅ ${field.label}: ${value.length} items`);
        if (field.key === 'userStories') {
          value.slice(0, 2).forEach((story: any, i: number) => {
            console.log(`   ${i + 1}. ${story.goal || story.name || 'Unnamed'}`);
            if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
              console.log(`      Acceptanskriterier: ${story.acceptanceCriteria.length} st`);
            }
          });
        } else {
          value.slice(0, 2).forEach((item: string, i: number) => {
            const preview = item.substring(0, 80);
            console.log(`   ${i + 1}. ${preview}${item.length > 80 ? '...' : ''}`);
          });
        }
      }
    } else if (typeof value === 'string') {
      if (value.trim().length === 0) {
        console.log(`⚠️  ${field.label}: TOM sträng`);
      } else {
        const preview = value.substring(0, 100);
        console.log(`✅ ${field.label}: "${preview}${value.length > 100 ? '...' : ''}"`);
      }
    } else {
      console.log(`⚠️  ${field.label}: Fel typ (${typeof value})`);
    }
    console.log('');
  }

  console.log('Valfria fält:\n');
  for (const field of optionalFields) {
    const value = jsonObj[field.key];
    if (value === undefined) {
      console.log(`ℹ️  ${field.label}: Inte inkluderad (valfritt)`);
    } else if (Array.isArray(value)) {
      console.log(`✅ ${field.label}: ${value.length} items`);
    } else {
      console.log(`⚠️  ${field.label}: Fel typ (${typeof value})`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 Sammanfattning:\n');

  const missing = requiredFields.filter(f => jsonObj[f.key] === undefined);
  const empty = requiredFields.filter(f => {
    const val = jsonObj[f.key];
    return val !== undefined && (
      (Array.isArray(val) && val.length === 0) ||
      (typeof val === 'string' && val.trim().length === 0)
    );
  });

  if (missing.length === 0 && empty.length === 0) {
    console.log('✅ Alla krävda fält finns och har innehåll');
  } else {
    if (missing.length > 0) {
      console.log(`❌ Saknade fält: ${missing.map(f => f.label).join(', ')}`);
    }
    if (empty.length > 0) {
      console.log(`⚠️  Tomma fält: ${empty.map(f => f.label).join(', ')}`);
    }
  }

  console.log('\n✅ Analys klar!\n');
}

const bpmnFile = process.argv[2] || 'mortgage-se-household.bpmn';
const elementId = process.argv[3] || 'register-household-economy-information';

checkRawJson(bpmnFile, elementId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });




















