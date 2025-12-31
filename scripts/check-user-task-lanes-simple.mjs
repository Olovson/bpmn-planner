#!/usr/bin/env node
/**
 * Script to check which User Tasks have incorrect user/stakeholder designation
 * (kund vs handläggare/anställd) in generated documentation
 * 
 * Enklare version som läser direkt från storage utan att bygga hela process graph
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local so we can share the same config as Vite
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
  // Optional file, ignore if missing
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
function inferLane(nodeName, nodeType) {
  const name = (nodeName || '').toLowerCase();

  // Regelmotor / system
  if (nodeType === 'businessRuleTask' || nodeType === 'serviceTask' || nodeType === 'dmnDecision') {
    return 'Regelmotor';
  }

  // User Tasks: använd samma logik som process-explorer
  if (nodeType === 'userTask') {
    // Nyckelord som tydligt indikerar interna/handläggar-uppgifter
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

  return 'Handläggare';
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

  // Hämta process tree från Supabase function
  const rootFile = 'mortgage.bpmn';
  console.log('📊 Fetching process tree...');
  
  // Anropa build-process-tree function med query parameter
  const url = new URL(`${SUPABASE_URL}/functions/v1/build-process-tree`);
  url.searchParams.set('rootFile', rootFile);
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
  });

  if (!response.ok) {
    console.error('❌ Error fetching process tree:', response.status, response.statusText);
    const errorText = await response.text();
    console.error('Error details:', errorText);
    return;
  }

  const treeData = await response.json();
  
  if (!treeData || typeof treeData !== 'object') {
    console.error('❌ Invalid process tree data:', typeof treeData, treeData);
    return;
  }
  
  console.log('✅ Process tree fetched, type:', treeData.type, 'children:', treeData.children?.length || 0);

  // Rekursivt hitta alla User Tasks (inklusive i subprocesser)
  function findUserTasks(node, userTasks = []) {
    if (!node) return userTasks;
    
    // Lägg till User Task om det är en
    if (node.type === 'userTask') {
      userTasks.push({
        name: node.label || node.bpmnElementId || node.id,
        bpmnFile: node.bpmnFile || 'unknown.bpmn',
        elementId: node.bpmnElementId || node.id,
      });
    }
    
    // Rekursivt gå igenom alla children (inklusive subprocesser)
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        findUserTasks(child, userTasks);
      }
    }
    
    return userTasks;
  }

  const userTasks = findUserTasks(treeData);
  console.log(`📋 Found ${userTasks.length} User Tasks\n`);
  
  if (userTasks.length === 0) {
    console.log('⚠️  Inga User Tasks hittades i process tree. Kolla om trädet är korrekt byggt.');
    console.log('   Försöker lista alla nodtyper i trädet...\n');
    
    // Debug: lista alla nodtyper
    function countNodeTypes(node, counts = {}) {
      if (!node) return counts;
      counts[node.type] = (counts[node.type] || 0) + 1;
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          countNodeTypes(child, counts);
        }
      }
      return counts;
    }
    
    const typeCounts = countNodeTypes(treeData);
    console.log('   Nodtyper i trädet:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`      ${type}: ${count}`);
    });
    console.log('');
    return;
  }

  const results = [];

  for (const task of userTasks) {
    const { bpmnFile, elementId, name: nodeName } = task;
    
    // Hämta dokumentation
    const sanitizedId = elementId.replace(/[^a-zA-Z0-9_-]/g, '-');
    const nodeDocKey = `nodes/${bpmnFile.replace('.bpmn', '')}/${sanitizedId}.html`;
    const docPaths = [
      `docs/local/${nodeDocKey}`,
      `docs/slow/chatgpt/${nodeDocKey}`,
      `docs/slow/ollama/${nodeDocKey}`,
      `docs/${nodeDocKey}`,
    ];
    
    let docHtml = null;
    let docFound = false;
    
    for (const path of docPaths) {
      docHtml = await fetchDocFromStorage(path);
      if (docHtml) {
        docFound = true;
        break;
      }
    }
    
    if (!docFound) {
      results.push({
        bpmnFile,
        elementId,
        nodeName,
        expectedLane: inferLane(nodeName, 'userTask'),
        docFound: false,
        mentions: { mentionsKund: false, mentionsHandläggare: false, mentionsAnställd: false, sampleText: [] },
        issues: ['Ingen dokumentation hittad'],
      });
      continue;
    }
    
    // Bestäm förväntad lane
    const expectedLane = inferLane(nodeName, 'userTask');
    
    const mentions = checkDocForUserMentions(docHtml, expectedLane);
    
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
    
    // Lägg till i resultat om det finns problem eller saknar dokumentation
    if (issues.length > 0 || !docFound) {
      results.push({
        bpmnFile,
        elementId,
        nodeName,
        expectedLane,
        docFound,
        mentions: docFound ? mentions : { mentionsKund: false, mentionsHandläggare: false, mentionsAnställd: false, sampleText: [] },
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
  console.log(`Total User Tasks: ${userTasks.length}`);
  console.log(`Med problem: ${results.filter(r => r.issues.some(i => i.startsWith('❌'))).length}`);
  console.log(`Saknar dokumentation: ${results.filter(r => !r.docFound).length}`);
  console.log(`Korrekt: ${userTasks.length - results.length}\n`);

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



















