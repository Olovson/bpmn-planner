#!/usr/bin/env node
/**
 * Script to check which User Tasks have incorrect user/stakeholder designation
 * (kund vs handläggare/anställd) in generated documentation
 * 
 * Version som läser direkt från storage-dokumentation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '../.env.local');
try {
  const envContents = readFileSync(envPath, 'utf-8');
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    const value = rest.join('=');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Optional file
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

// Kopiera logiken från inferLane()
function inferLane(nodeName) {
  const name = (nodeName || '').toLowerCase();

  // User Tasks: använd samma logik som process-explorer
  const internalKeywords = [
    'review', 'granska', 'assess', 'utvärdera', 'evaluate',
    'advanced-underwriting', 'board', 'committee',
    'four eyes', 'four-eyes', 'manual', 'distribute',
    'distribuera', 'archive', 'arkivera', 'verify', 'handläggare',
  ];

  // Om den matchar interna ord → behandla som intern/backoffice (Handläggare)
  if (internalKeywords.some((keyword) => name.includes(keyword))) {
    return 'Handläggare';
  }

  // Default: kund- eller stakeholder-interaktion
  return 'Kund';
}

async function fetchDocFromStorage(storagePath) {
  try {
    const { data } = supabase.storage.from('bpmn-files').getPublicUrl(storagePath);
    if (!data?.publicUrl) return null;

    const response = await fetch(`${data.publicUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;

    return await response.text();
  } catch (error) {
    return null;
  }
}

function checkDocForUserMentions(html, expectedLane) {
  const lowerHtml = html.toLowerCase();
  
  const mentionsKund = 
    lowerHtml.includes('kunden') ||
    lowerHtml.includes('kund') ||
    lowerHtml.includes('customer') ||
    lowerHtml.includes('sökande') ||
    lowerHtml.includes('primary stakeholder') ||
    lowerHtml.includes('stakeholder');
  
  const mentionsHandläggare =
    lowerHtml.includes('handläggaren') ||
    lowerHtml.includes('handläggare') ||
    lowerHtml.includes('credit evaluator') ||
    lowerHtml.includes('evaluator');
  
  const mentionsAnställd =
    lowerHtml.includes('anställd') ||
    lowerHtml.includes('employee') ||
    lowerHtml.includes('admin');
  
  // Extrahera exempel på text
  const sampleText = [];
  const userMentions = [
    /kunden\s+[^<]{0,100}/gi,
    /handläggaren\s+[^<]{0,100}/gi,
    /primary stakeholder\s+[^<]{0,100}/gi,
  ];
  
  for (const regex of userMentions) {
    const matches = html.match(regex);
    if (matches) {
      sampleText.push(...matches.slice(0, 2).map(m => m.trim().substring(0, 150)));
    }
  }
  
  return {
    mentionsKund,
    mentionsHandläggare,
    mentionsAnställd,
    sampleText: [...new Set(sampleText)].slice(0, 3),
  };
}

async function main() {
  console.log('🔍 Checking User Tasks for incorrect user/stakeholder designation...\n');
  console.log('📊 Scanning documentation files in storage...\n');

  // Lista alla dokumentationsfiler i nodes/ mappen
  const docDirs = [
    'docs/local/nodes',
    'docs/slow/chatgpt/nodes',
    'docs/slow/ollama/nodes',
    'docs/nodes', // Legacy
  ];

  const allDocs = new Map(); // key: bpmnFile:elementId, value: { path, html }

  for (const baseDir of docDirs) {
    try {
      // Lista alla filer rekursivt
      const { data: files, error } = await supabase.storage
        .from('bpmn-files')
        .list(baseDir, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

      if (error) {
        console.warn(`⚠️  Could not list ${baseDir}:`, error.message);
        continue;
      }

      if (!files || files.length === 0) continue;

      // Gå igenom varje fil/mapp
      for (const file of files) {
        if (file.name.endsWith('.html')) {
          // Direkt HTML-fil
          const path = `${baseDir}/${file.name}`;
          const html = await fetchDocFromStorage(path);
          if (html) {
            // Extrahera bpmnFile och elementId från path
            // Format: nodes/{bpmnFile}/{elementId}.html
            const match = path.match(/nodes\/([^\/]+)\/([^\/]+)\.html$/);
            if (match) {
              const [, bpmnFile, elementId] = match;
              const key = `${bpmnFile}:${elementId}`;
              if (!allDocs.has(key)) {
                allDocs.set(key, { path, html, bpmnFile, elementId });
              }
            }
          }
        } else if (!file.name.includes('.')) {
          // Mapp - lista filer i mappen
          const { data: subFiles } = await supabase.storage
            .from('bpmn-files')
            .list(`${baseDir}/${file.name}`, { limit: 1000 });

          if (subFiles) {
            for (const subFile of subFiles) {
              if (subFile.name.endsWith('.html')) {
                const path = `${baseDir}/${file.name}/${subFile.name}`;
                const html = await fetchDocFromStorage(path);
                if (html) {
                  const match = path.match(/nodes\/([^\/]+)\/([^\/]+)\.html$/);
                  if (match) {
                    const [, bpmnFile, elementId] = match;
                    const key = `${bpmnFile}:${elementId}`;
                    if (!allDocs.has(key)) {
                      allDocs.set(key, { path, html, bpmnFile, elementId });
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error processing ${baseDir}:`, error.message);
    }
  }

  console.log(`📋 Found ${allDocs.size} documentation files\n`);

  // Filtrera till User Tasks (epics) - vi kan inte veta säkert från filnamnet,
  // men vi kan kolla i HTML:en om det är en User Task
  const userTaskDocs = [];

  for (const [key, doc] of allDocs.entries()) {
    const html = doc.html.toLowerCase();
    
      // Kolla om dokumentationen är för en User Task
      // User Tasks har "Kund / Rådgivare" i swimlaneOwner eller "interaktion" sektion
      // Service Tasks har "Backend & Integration" i swimlaneOwner eller "automatiserad systemexekvering"
      const lowerHtml = html.toLowerCase();
      
      // Kolla swimlaneOwner (mer pålitligt än andra indikatorer)
      const hasUserTaskSwimlane = 
        lowerHtml.includes('kund / rådgivare') ||
        lowerHtml.includes('swimlane.*kund') ||
        (lowerHtml.includes('swimlane') && lowerHtml.includes('rådgivare'));
      
      const hasServiceTaskSwimlane = 
        lowerHtml.includes('backend & integration') ||
        lowerHtml.includes('backend.*integration');
      
      // Kolla också innehåll
      const hasInteractions = lowerHtml.includes('interaktion') || lowerHtml.includes('interaction');
      const hasAutomaticExecution = lowerHtml.includes('automatiserad systemexekvering') || 
                                    lowerHtml.includes('automatisk systemuppgift');
      
      // User Task om: (swimlane = kund/rådgivare) ELLER (epic + interaktion + INTE automatisk)
      const isUserTask = 
        hasUserTaskSwimlane ||
        (lowerHtml.includes('epic') && hasInteractions && !hasAutomaticExecution && !hasServiceTaskSwimlane);
    
    if (isUserTask) {
      // Extrahera nodnamn från HTML
      const nameMatch = doc.html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                        doc.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const nodeName = nameMatch ? nameMatch[1].trim() : doc.elementId;
      
      userTaskDocs.push({
        ...doc,
        nodeName,
      });
    }
  }

  console.log(`📋 Found ${userTaskDocs.length} potential User Tasks (epics)\n`);

  if (userTaskDocs.length === 0) {
    console.log('⚠️  Inga User Task-dokumentation hittades.');
    return;
  }

  const results = [];

  for (const doc of userTaskDocs) {
    const { nodeName, bpmnFile, elementId, html } = doc;
    
    // Bestäm förväntad lane
    const expectedLane = inferLane(nodeName);
    
    const mentions = checkDocForUserMentions(html, expectedLane);
    
    // Identifiera problem
    const issues = [];
    
    if (expectedLane === 'Kund') {
      if (mentions.mentionsHandläggare && !mentions.mentionsKund) {
        issues.push('❌ Nämner handläggare men inte kund (ska vara kund)');
      }
      if (mentions.mentionsAnställd && !mentions.mentionsKund) {
        issues.push('❌ Nämner anställd men inte kund (ska vara kund)');
      }
      if (!mentions.mentionsKund && !mentions.mentionsHandläggare && !mentions.mentionsAnställd) {
        issues.push('⚠️  Nämner varken kund eller handläggare (förväntar kund)');
      }
    } else if (expectedLane === 'Handläggare') {
      if (mentions.mentionsKund && !mentions.mentionsHandläggare && !mentions.mentionsAnställd) {
        issues.push('❌ Nämner kund men inte handläggare (ska vara handläggare)');
      }
      if (!mentions.mentionsHandläggare && !mentions.mentionsAnställd && !mentions.mentionsKund) {
        issues.push('⚠️  Nämner varken kund eller handläggare (förväntar handläggare)');
      }
    }
    
    if (issues.length > 0) {
      results.push({
        bpmnFile,
        elementId,
        nodeName,
        expectedLane,
        mentions,
        issues,
      });
    }
  }

  // Sortera: problem först
  results.sort((a, b) => {
    if (a.issues.some(i => i.startsWith('❌')) && !b.issues.some(i => i.startsWith('❌'))) return -1;
    if (!a.issues.some(i => i.startsWith('❌')) && b.issues.some(i => i.startsWith('❌'))) return 1;
    return 0;
  });

  // Skriv ut resultat
  console.log('\n📊 RESULTAT:\n');
  console.log(`Total User Tasks kontrollerade: ${userTaskDocs.length}`);
  console.log(`Med problem: ${results.filter(r => r.issues.some(i => i.startsWith('❌'))).length}`);
  console.log(`Korrekt: ${userTaskDocs.length - results.length}\n`);

  if (results.length === 0) {
    console.log('✅ Alla User Tasks har korrekt användarbenämning!');
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  
  for (const result of results) {
    console.log(`📌 ${result.nodeName}`);
    console.log(`   Fil: ${result.bpmnFile}`);
    console.log(`   Element ID: ${result.elementId}`);
    console.log(`   Förväntad lane: ${result.expectedLane}`);
    console.log(`   Nämner kund: ${result.mentions.mentionsKund ? '✅' : '❌'}`);
    console.log(`   Nämner handläggare: ${result.mentions.mentionsHandläggare ? '✅' : '❌'}`);
    console.log(`   Nämner anställd: ${result.mentions.mentionsAnställd ? '✅' : '❌'}`);
    
    if (result.mentions.sampleText.length > 0) {
      console.log(`   Exempel på text:`);
      result.mentions.sampleText.forEach(text => {
        console.log(`      - ${text}...`);
      });
    }
    
    console.log(`   Problem:`);
    result.issues.forEach(issue => {
      console.log(`      ${issue}`);
    });
    
    console.log('');
  }

  // Sammanfattning
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 SAMMANFATTNING\n');
  
  const incorrectKund = results.filter(r => 
    r.expectedLane === 'Kund' && 
    r.issues.some(i => i.includes('handläggare') || i.includes('anställd'))
  );
  
  const incorrectHandläggare = results.filter(r => 
    r.expectedLane === 'Handläggare' && 
    r.issues.some(i => i.includes('kund'))
  );
  
  if (incorrectKund.length > 0) {
    console.log(`❌ User Tasks som ska vara KUND men nämner handläggare/anställd (${incorrectKund.length}):`);
    incorrectKund.forEach(r => {
      console.log(`   - ${r.nodeName} (${r.bpmnFile}::${r.elementId})`);
    });
    console.log('');
  }
  
  if (incorrectHandläggare.length > 0) {
    console.log(`❌ User Tasks som ska vara HANDLÄGGARE men nämner kund (${incorrectHandläggare.length}):`);
    incorrectHandläggare.forEach(r => {
      console.log(`   - ${r.nodeName} (${r.bpmnFile}::${r.elementId})`);
    });
    console.log('');
  }
}

main().catch(console.error);




















