#!/usr/bin/env tsx
/**
 * Script to check which User Tasks have incorrect user/stakeholder designation
 * (kund vs handläggare/anställd) in generated documentation
 */

import { buildBpmnProcessGraph } from '../src/lib/bpmnProcessGraph';
import { getCurrentVersionHash } from '../src/lib/bpmnVersioning';
import { supabase } from '../src/integrations/supabase/client';
import { sanitizeElementId, getNodeDocFileKey } from '../src/lib/nodeArtifactPaths';

// Kopiera logiken från inferLane() och isCustomerFacingUserTask()
function inferLane(node: { type: string; name?: string; bpmnElementId?: string }): string {
  const name = (node.name || node.bpmnElementId || '').toLowerCase();

  // Regelmotor / system
  if (node.type === 'businessRuleTask' || node.type === 'serviceTask' || node.type === 'dmnDecision') {
    return 'Regelmotor';
  }

  // User Tasks: använd samma logik som process-explorer
  if (node.type === 'userTask') {
    // Nyckelord som tydligt indikerar interna/handläggar-uppgifter
    const internalKeywords = [
      'review',
      'granska',
      'assess',
      'utvärdera',
      'evaluate',
      'advanced-underwriting',
      'board',
      'committee',
      'four eyes',
      'four-eyes',
      'manual',
      'distribute',
      'distribuera',
      'archive',
      'arkivera',
      'verify',
      'handläggare',
    ];

    // Om den matchar interna ord → behandla som intern/backoffice (Handläggare)
    if (internalKeywords.some((keyword) => name.includes(keyword))) {
      return 'Handläggare';
    }

    // Default: kund- eller stakeholder-interaktion
    return 'Kund';
  }

  // Call activities utan tydlig signal behandlas som system/regelmotor
  if (node.type === 'callActivity') {
    return 'Regelmotor';
  }

  return 'Handläggare';
}

async function fetchDocFromStorage(storagePath: string): Promise<string | null> {
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

function checkDocForUserMentions(html: string, expectedLane: string): {
  mentionsKund: boolean;
  mentionsHandläggare: boolean;
  mentionsAnställd: boolean;
  mentionsRådgivare: boolean;
  sampleText: string[];
} {
  const lowerHtml = html.toLowerCase();
  
  // Sök efter olika varianter
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
    lowerHtml.includes('rådgivare') ||
    lowerHtml.includes('admin');
  
  const mentionsRådgivare =
    lowerHtml.includes('rådgivare') ||
    lowerHtml.includes('advisor');
  
  // Extrahera exempel på text som nämner användare
  const sampleText: string[] = [];
  const userMentions = [
    /kunden\s+[^<]{0,100}/gi,
    /handläggaren\s+[^<]{0,100}/gi,
    /primary stakeholder\s+[^<]{0,100}/gi,
    /sökande\s+[^<]{0,100}/gi,
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
    mentionsRådgivare,
    sampleText: [...new Set(sampleText)].slice(0, 3),
  };
}

async function main() {
  console.log('🔍 Checking User Tasks for incorrect user/stakeholder designation...\n');

  // Get root file
  const rootFile = 'mortgage.bpmn';
  
  // Build process graph
  console.log('📊 Building process graph...');
  const { data: bpmnFiles } = await supabase.storage
    .from('bpmn-files')
    .list('', { search: '.bpmn' });
  
  const bpmnFileNames = (bpmnFiles || [])
    .filter(f => f.name.endsWith('.bpmn'))
    .map(f => f.name);

  const versionHashes = new Map<string, string | null>();
  for (const file of bpmnFileNames) {
    const hash = await getVersionHashForFile(file);
    versionHashes.set(file, hash);
  }

  const graph = await buildBpmnProcessGraph(rootFile, bpmnFileNames, versionHashes);

  // Find all User Tasks
  const userTasks = Array.from(graph.allNodes.values())
    .filter(node => node.type === 'userTask')
    .sort((a, b) => {
      // Sortera efter fil, sedan namn
      if (a.bpmnFile !== b.bpmnFile) {
        return a.bpmnFile.localeCompare(b.bpmnFile);
      }
      return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
    });

  console.log(`\n📋 Found ${userTasks.length} User Tasks\n`);

  const results: Array<{
    node: typeof userTasks[number];
    expectedLane: string;
    docFound: boolean;
    mentions: ReturnType<typeof checkDocForUserMentions>;
    issues: string[];
  }> = [];

  for (const node of userTasks) {
    const elementId = node.bpmnElementId || node.id;
    const bpmnFile = node.bpmnFile;
    const nodeName = node.name || node.bpmnElementId || elementId;
    
    // Bestäm förväntad lane
    const expectedLane = inferLane(node);
    
    // Hitta dokumentation - använd getNodeDocFileKey för korrekt sökväg
    const nodeDocKey = getNodeDocFileKey(bpmnFile, elementId);
    const versionHash = versionHashes.get(bpmnFile);
    
    const docPaths = [
      // Vanliga node-dokumentation
      `docs/local/${nodeDocKey}`,
      `docs/slow/chatgpt/${nodeDocKey}`,
      `docs/slow/ollama/${nodeDocKey}`,
      `docs/${nodeDocKey}`,
      // Versioned paths
      ...(versionHash ? [
        `docs/local/${bpmnFile}/${versionHash}/${nodeDocKey}`,
        `docs/slow/chatgpt/${bpmnFile}/${versionHash}/${nodeDocKey}`,
        `docs/slow/ollama/${bpmnFile}/${versionHash}/${nodeDocKey}`,
      ] : []),
    ];
    
    let docHtml: string | null = null;
    let docFound = false;
    
    for (const path of docPaths) {
      docHtml = await fetchDocFromStorage(path);
      if (docHtml) {
        docFound = true;
        break;
      }
    }
    
    const mentions = docHtml ? checkDocForUserMentions(docHtml, expectedLane) : {
      mentionsKund: false,
      mentionsHandläggare: false,
      mentionsAnställd: false,
      mentionsRådgivare: false,
      sampleText: [],
    };
    
    // Identifiera problem
    const issues: string[] = [];
    
    if (!docFound) {
      issues.push('Ingen dokumentation hittad');
    } else {
      if (expectedLane === 'Kund') {
        // Förväntar kund, men nämner handläggare/anställd
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
        // Förväntar handläggare, men nämner kund
        if (mentions.mentionsKund && !mentions.mentionsHandläggare && !mentions.mentionsAnställd) {
          issues.push('❌ Nämner kund men inte handläggare (ska vara handläggare)');
        }
        if (!mentions.mentionsHandläggare && !mentions.mentionsAnställd && !mentions.mentionsKund) {
          issues.push('⚠️  Nämner varken kund eller handläggare (förväntar handläggare)');
        }
      }
    }
    
    if (issues.length > 0 || !docFound) {
      results.push({
        node,
        expectedLane,
        docFound,
        mentions,
        issues,
      });
    }
  }

  // Sortera: problem först, sedan saknade docs
  results.sort((a, b) => {
    if (a.issues.some(i => i.startsWith('❌')) && !b.issues.some(i => i.startsWith('❌'))) return -1;
    if (!a.issues.some(i => i.startsWith('❌')) && b.issues.some(i => i.startsWith('❌'))) return 1;
    if (!a.docFound && b.docFound) return -1;
    if (a.docFound && !b.docFound) return 1;
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
    const node = result.node;
    const nodeName = node.name || node.bpmnElementId || 'Unknown';
    const elementId = node.bpmnElementId || node.id;
    
    console.log(`📌 ${nodeName}`);
    console.log(`   Fil: ${node.bpmnFile}`);
    console.log(`   Element ID: ${elementId}`);
    console.log(`   Förväntad lane: ${result.expectedLane}`);
    console.log(`   Dokumentation: ${result.docFound ? '✅ Hittad' : '❌ Saknas'}`);
    
    if (result.docFound) {
      console.log(`   Nämner kund: ${result.mentions.mentionsKund ? '✅' : '❌'}`);
      console.log(`   Nämner handläggare: ${result.mentions.mentionsHandläggare ? '✅' : '❌'}`);
      console.log(`   Nämner anställd: ${result.mentions.mentionsAnställd ? '✅' : '❌'}`);
      
      if (result.mentions.sampleText.length > 0) {
        console.log(`   Exempel på text:`);
        result.mentions.sampleText.forEach(text => {
          console.log(`      - ${text}...`);
        });
      }
    }
    
    if (result.issues.length > 0) {
      console.log(`   Problem:`);
      result.issues.forEach(issue => {
        console.log(`      ${issue}`);
      });
    }
    
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
      console.log(`   - ${r.node.name || r.node.bpmnElementId} (${r.node.bpmnFile})`);
    });
    console.log('');
  }
  
  if (incorrectHandläggare.length > 0) {
    console.log(`❌ User Tasks som ska vara HANDLÄGGARE men nämner kund (${incorrectHandläggare.length}):`);
    incorrectHandläggare.forEach(r => {
      console.log(`   - ${r.node.name || r.node.bpmnElementId} (${r.node.bpmnFile})`);
    });
    console.log('');
  }
  
  const missingDocs = results.filter(r => !r.docFound);
  if (missingDocs.length > 0) {
    console.log(`⚠️  User Tasks utan dokumentation (${missingDocs.length}):`);
    missingDocs.forEach(r => {
      console.log(`   - ${r.node.name || r.node.bpmnElementId} (${r.node.bpmnFile})`);
    });
  }
}

main().catch(console.error);









