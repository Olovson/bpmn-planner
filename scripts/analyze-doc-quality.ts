#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Analyze quality of generated documentation
 * Usage: npx tsx scripts/analyze-doc-quality.ts mortgage-se-household.bpmn
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

function extractSection(html: string, title: string, swedishTitles?: string[]) {
  // Try English title first
  let regex = new RegExp(`<h2[^>]*>.*?${title}.*?</h2>([\\s\\S]*?)(?=<h2|</body>|$)`, 'i');
  let match = html.match(regex);
  
  // If not found and Swedish titles provided, try those
  if (!match && swedishTitles) {
    for (const swedishTitle of swedishTitles) {
      regex = new RegExp(`<h2[^>]*>.*?${swedishTitle}.*?</h2>([\\s\\S]*?)(?=<h2|</body>|$)`, 'i');
      match = html.match(regex);
      if (match) break;
    }
  }
  
  if (!match) return null;
  const content = match[1].replace(/<[^>]+>/g, '').trim();
  const items = match[1].match(/<li[^>]*>(.*?)<\/li>/gis) || [];
  return { content, items: items.map(i => i.replace(/<[^>]+>/g, '').trim()) };
}

async function analyzeDoc(bpmnFileName: string) {
  console.log(`\n📊 Analys av dokumentationskvalitet: ${bpmnFileName}\n`);
  console.log('═'.repeat(70));

  // Find the versioned Claude-generated doc
  const versionedDocPath = 'docs/slow/chatgpt/mortgage-se-household.bpmn/d78c60ff6cb050cca67e0036563b357b20db67b214e33c65872769d0389c1e3e/nodes/mortgage-se-household/register-household-economy-information.html';
  
  console.log('\n📄 Laddar ner dokumentation...');
  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .download(versionedDocPath);

  if (error || !data) {
    console.error('❌ Fel vid nedladdning:', error?.message || 'No data');
    return;
  }

  const html = await data.text();
  console.log(`✅ Nedladdad: ${html.length} bytes\n`);

  console.log('🔍 Förväntade sektioner för Epic (UserTask/ServiceTask):\n');
  console.log('─'.repeat(70));

  // Required sections for Epic (check both English and Swedish)
  const requiredSections = [
    { name: 'Summary', swedish: ['Sammanfattning', 'Syfte', 'Syfte & Effekt'], key: 'summary', required: true },
    { name: 'Prerequisites', swedish: ['Förutsättningar', 'Förutsättningar & kontext'], key: 'prerequisites', required: true },
    { name: 'Flow Steps', swedish: ['Funktionellt flöde', 'Flödessteg'], key: 'flowSteps', required: true },
    { name: 'User Stories', swedish: ['User Stories', 'Användarhistorier'], key: 'userStories', required: true },
    { name: 'Implementation Notes', swedish: ['Implementation Notes', 'Implementation', 'Tekniska noteringar', 'Implementation notes'], key: 'implementationNotes', required: true },
  ];

  const optionalSections = [
    { name: 'Interactions', swedish: ['Interaktioner'], key: 'interactions', required: false },
    { name: 'Inputs', swedish: ['Inputs', 'Indata'], key: 'inputs', required: false },
    { name: 'Outputs', swedish: ['Outputs', 'Output', 'Utdata'], key: 'outputs', required: false },
  ];

  let allRequiredPresent = true;
  const findings: Array<{ section: string; status: 'ok' | 'missing' | 'empty'; details: string }> = [];

  // Check required sections
  for (const section of requiredSections) {
    const extracted = extractSection(html, section.name, section.swedish);
    if (!extracted) {
      console.log(`❌ ${section.name}: SAKNAS`);
      findings.push({ section: section.name, status: 'missing', details: 'Sektionen finns inte i dokumentationen' });
      allRequiredPresent = false;
    } else if (extracted.items.length === 0 && extracted.content.length < 50) {
      console.log(`⚠️  ${section.name}: TOM eller för kort (${extracted.content.length} tecken)`);
      findings.push({ section: section.name, status: 'empty', details: `Innehåll: ${extracted.content.length} tecken` });
    } else {
      const itemCount = extracted.items.length > 0 ? extracted.items.length : 1;
      console.log(`✅ ${section.name}: ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`);
      
      // Show preview
      if (extracted.items.length > 0) {
        extracted.items.slice(0, 2).forEach((item, i) => {
          const preview = item.substring(0, 80);
          console.log(`   ${i + 1}. ${preview}${item.length > 80 ? '...' : ''}`);
        });
        if (extracted.items.length > 2) {
          console.log(`   ... och ${extracted.items.length - 2} fler`);
        }
      } else {
        const preview = extracted.content.substring(0, 150);
        console.log(`   ${preview}${extracted.content.length > 150 ? '...' : ''}`);
      }
      
      findings.push({ 
        section: section.name, 
        status: 'ok', 
        details: `${itemCount} items, ${extracted.content.length} tecken totalt` 
      });
    }
    console.log('');
  }

  // Check optional sections
  console.log('ℹ️  Valfria sektioner:\n');
  for (const section of optionalSections) {
    const extracted = extractSection(html, section.name, section.swedish);
    if (extracted) {
      const itemCount = extracted.items.length > 0 ? extracted.items.length : 1;
      console.log(`✅ ${section.name}: ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`);
    } else {
      console.log(`ℹ️  ${section.name}: Inte inkluderad (valfritt)`);
    }
  }

  // Quality assessment
  console.log('\n' + '═'.repeat(70));
  console.log('📋 BEDÖMNING\n');
  
  if (allRequiredPresent) {
    console.log('✅ Alla krävda sektioner finns');
  } else {
    console.log('❌ Några krävda sektioner saknas');
  }

  // Check content quality
  const summary = extractSection(html, 'Summary', ['Sammanfattning', 'Syfte']);
  const userStories = extractSection(html, 'User Stories', ['User Stories', 'Användarhistorier']);
  const flowSteps = extractSection(html, 'Flow Steps', ['Funktionellt flöde', 'Flödessteg']);
  
  let qualityScore = 0;
  let qualityNotes: string[] = [];

  if (summary && summary.content.length > 200) {
    qualityScore += 1;
    qualityNotes.push('Summary är tillräckligt detaljerad');
  } else if (summary) {
    qualityNotes.push('Summary är kort (överväg att utöka)');
  }

  if (userStories && userStories.items.length >= 3) {
    qualityScore += 1;
    qualityNotes.push('Tillräckligt många user stories (≥3)');
  } else if (userStories) {
    qualityNotes.push(`Få user stories (${userStories.items.length}), överväg fler`);
  }

  if (flowSteps && flowSteps.items.length >= 4) {
    qualityScore += 1;
    qualityNotes.push('Tillräckligt många flow steps (≥4)');
  } else if (flowSteps) {
    qualityNotes.push(`Få flow steps (${flowSteps.items.length}), överväg fler`);
  }

  if (summary && summary.content.includes('kunden') || summary?.content.includes('användaren')) {
    qualityScore += 1;
    qualityNotes.push('Summary använder affärsspråk');
  } else {
    qualityNotes.push('Summary kan förbättras med mer affärsspråk');
  }

  console.log(`\nKvalitetspoäng: ${qualityScore}/4`);
  qualityNotes.forEach(note => console.log(`  • ${note}`));

  console.log(`\nTotal HTML-storlek: ${html.length} bytes`);
  console.log(`Antal sektioner: ${requiredSections.length + optionalSections.filter(s => extractSection(html, s.name)).length}`);

  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ Analys klar!\n');
}

const bpmnFileName = process.argv[2] || 'mortgage-se-household.bpmn';
analyzeDoc(bpmnFileName)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });




