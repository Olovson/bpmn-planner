#!/usr/bin/env node
/**
 * Script to check all documentation types (Epics, Feature Goals, Business Rules)
 * for incorrect user/stakeholder designation (kund vs handläggare/anställd)
 * 
 * This checks:
 * - User Task Epics (already checked separately)
 * - Feature Goals (callActivities) - can mention users based on child nodes
 * - Business Rules - typically don't mention users, but check anyway
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

// Kopiera logiken från inferLane() - samma som används i llmDocumentation.ts
function inferLane(nodeName, nodeType) {
  const name = (nodeName || '').toLowerCase();

  // Regelmotor / system
  if (nodeType === 'businessRuleTask' || nodeType === 'serviceTask' || nodeType === 'dmnDecision') {
    return 'Regelmotor';
  }

  // User Tasks: använd samma logik som process-explorer
  if (nodeType === 'userTask') {
    const internalKeywords = [
      'review', 'granska', 'assess', 'utvärdera', 'evaluate',
      'advanced-underwriting', 'board', 'committee',
      'four eyes', 'four-eyes', 'manual', 'distribute',
      'distribuera', 'archive', 'arkivera', 'verify', 'handläggare',
    ];

    if (internalKeywords.some((keyword) => name.includes(keyword))) {
      return 'Handläggare';
    }

    return 'Kund';
  }

  // Call activities behandlas som system/regelmotor
  if (nodeType === 'callActivity') {
    return 'Regelmotor';
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

function checkDocForUserMentions(html, docType, nodeName, nodeType) {
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
  
  // För Feature Goals: kolla om de nämner användare baserat på child nodes
  // Feature Goals kan nämna användare i flowSteps om de har User Task children
  // Vi behöver inte validera Feature Goals på samma sätt som Epics,
  // men vi kan flagga om de nämner användare inkorrekt
  
  // För Business Rules: de ska typiskt inte nämna användare alls
  // Men om de gör det, ska det vara "systemet" eller "regelmotorn"
  
  return {
    mentionsKund,
    mentionsHandläggare,
    mentionsAnställd,
    sampleText: [...new Set(sampleText)].slice(0, 3),
  };
}

async function main() {
  console.log('🔍 Checking all documentation types for incorrect user/stakeholder designation...\n');
  console.log('📊 Scanning documentation files in storage...\n');

  // Lista alla dokumentationsfiler
  // Feature Goals kan finnas i feature-goals/ mappen (rekursivt)
  const docDirs = [
    'docs/local/nodes',
    'docs/local/feature-goals',
    'docs/slow/chatgpt/nodes',
    'docs/slow/chatgpt/feature-goals',
    'docs/slow/ollama/nodes',
    'docs/slow/ollama/feature-goals',
    'docs/slow/nodes',
    'docs/slow/feature-goals',
    'docs/nodes', // Legacy
    'docs/feature-goals', // Legacy
  ];

  const allDocs = new Map(); // key: type:file:elementId, value: { path, html, bpmnFile, elementId, docType }

  for (const baseDir of docDirs) {
    try {
      const { data: files, error } = await supabase.storage
        .from('bpmn-files')
        .list(baseDir, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

      if (error) {
        console.warn(`⚠️  Could not list ${baseDir}:`, error.message);
        continue;
      }

      if (!files || files.length === 0) continue;

      for (const file of files) {
        if (file.name.endsWith('.html')) {
          const path = `${baseDir}/${file.name}`;
          const html = await fetchDocFromStorage(path);
          if (html) {
            // Bestäm docType baserat på path
            const isFeatureGoal = baseDir.includes('feature-goals');
            const docType = isFeatureGoal ? 'feature-goal' : 'epic';
            
            // Extrahera bpmnFile och elementId från path
            let match;
            if (isFeatureGoal) {
              // Format: feature-goals/{filename}.html (kan vara hierarkisk eller legacy)
              // Filen kan vara t.ex. "mortgage-se-application-internal-data-gathering-v2.html"
              // eller "mortgage-se-internal-data-gathering-v2.html"
              const filename = file.name.replace(/\.html$/, '').replace(/-v[12]$/, '');
              // Försök extrahera bpmnFile och elementId från filename
              // Detta är komplext eftersom Feature Goals kan ha olika namngivningskonventioner
              // För nu, använd filename som både bpmnFile och elementId
              const key = `${docType}:${filename}:${filename}`;
              if (!allDocs.has(key)) {
                allDocs.set(key, { path, html, bpmnFile: filename, elementId: filename, docType });
              }
            } else {
              // Format: nodes/{bpmnFile}/{elementId}.html
              match = path.match(/nodes\/([^\/]+)\/([^\/]+)\.html$/);
              if (match) {
                const [, bpmnFile, elementId] = match;
                const key = `${docType}:${bpmnFile}:${elementId}`;
                if (!allDocs.has(key)) {
                  allDocs.set(key, { path, html, bpmnFile, elementId, docType });
                }
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
                  const isFeatureGoal = baseDir.includes('feature-goals');
                  const docType = isFeatureGoal ? 'feature-goal' : 'epic';
                  
                  let match;
                  if (isFeatureGoal) {
                    match = path.match(/feature-goals\/([^\/]+)\/([^\/]+)\.html$/);
                  } else {
                    match = path.match(/nodes\/([^\/]+)\/([^\/]+)\.html$/);
                  }
                  
                  if (match) {
                    const [, bpmnFile, elementId] = match;
                    const key = `${docType}:${bpmnFile}:${elementId}`;
                    if (!allDocs.has(key)) {
                      allDocs.set(key, { path, html, bpmnFile, elementId, docType });
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

  // Separera i olika typer baserat på path och innehåll
  const epicDocs = [];
  const featureGoalDocs = [];
  const businessRuleDocs = [];

  for (const [key, doc] of allDocs.entries()) {
    const html = doc.html.toLowerCase();
    const isFeatureGoalPath = doc.path.includes('feature-goals');
    
    // Extrahera nodnamn
    const nameMatch = doc.html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                      doc.html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const nodeName = nameMatch ? nameMatch[1].trim() : doc.elementId;
    
    // Identifiera typ baserat på path först, sedan innehåll
    if (isFeatureGoalPath || doc.docType === 'feature-goal') {
      featureGoalDocs.push({ ...doc, nodeName, nodeType: 'callActivity' });
    } else {
      // Epics eller Business Rules i nodes/ mappen
      const isBusinessRule =
        html.includes('business rule') ||
        html.includes('affärsregel') ||
        html.includes('regelmotor') ||
        html.includes('dmn') ||
        html.includes('decision');
      
      // Epics är User Tasks eller Service Tasks
      const isUserTaskEpic = 
        html.includes('epic') &&
        (html.includes('kund / rådgivare') ||
         html.includes('swimlane') ||
         html.includes('interaktion'));
      
      if (isBusinessRule) {
        businessRuleDocs.push({ ...doc, nodeName, nodeType: 'businessRuleTask' });
      } else if (isUserTaskEpic) {
        // Bara User Task epics - kolla om det verkligen är en User Task
        const isUserTask = 
          html.includes('kund / rådgivare') ||
          (html.includes('epic') && html.includes('interaktion') && !html.includes('automatiserad systemexekvering'));
        
        if (isUserTask) {
          epicDocs.push({ ...doc, nodeName, nodeType: 'userTask' });
        }
      }
    }
  }

  console.log(`📊 Breakdown:`);
  console.log(`   Epics: ${epicDocs.length}`);
  console.log(`   Feature Goals: ${featureGoalDocs.length}`);
  console.log(`   Business Rules: ${businessRuleDocs.length}\n`);

  // Analysera Epics (User Tasks)
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 EPICS (User Tasks)\n');
  
  const epicResults = [];
  for (const doc of epicDocs) {
    const expectedLane = inferLane(doc.nodeName, doc.nodeType);
    const mentions = checkDocForUserMentions(doc.html, 'epic', doc.nodeName, doc.nodeType);
    
    const issues = [];
    if (expectedLane === 'Kund') {
      if (mentions.mentionsHandläggare && !mentions.mentionsKund) {
        issues.push('❌ Nämner handläggare men inte kund (ska vara kund)');
      }
      if (mentions.mentionsAnställd && !mentions.mentionsKund) {
        issues.push('❌ Nämner anställd men inte kund (ska vara kund)');
      }
    } else if (expectedLane === 'Handläggare') {
      if (mentions.mentionsKund && !mentions.mentionsHandläggare && !mentions.mentionsAnställd) {
        issues.push('❌ Nämner kund men inte handläggare (ska vara handläggare)');
      }
    }
    
    if (issues.length > 0) {
      epicResults.push({ ...doc, expectedLane, mentions, issues });
    }
  }

  if (epicResults.length > 0) {
    console.log(`❌ Epics med problem: ${epicResults.length}\n`);
    epicResults.forEach(result => {
      console.log(`   - ${result.nodeName} (${result.bpmnFile}::${result.elementId})`);
      result.issues.forEach(issue => console.log(`     ${issue}`));
    });
  } else {
    console.log('✅ Alla Epics har korrekt användarbenämning\n');
  }

  // Analysera Feature Goals
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 FEATURE GOALS (Call Activities)\n');
  console.log('ℹ️  Feature Goals nämner ofta användare baserat på child nodes.');
  console.log('   Om child nodes har fel lane, kan Feature Goals också nämna användare inkorrekt.\n');
  
  const featureGoalResults = [];
  for (const doc of featureGoalDocs) {
    const mentions = checkDocForUserMentions(doc.html, 'feature-goal', doc.nodeName, doc.nodeType);
    
    // Feature Goals kan nämna både kund och handläggare (beroende på child nodes)
    // Vi flaggar bara om de nämner användare inkorrekt baserat på child nodes
    // För nu, vi kollar bara om de nämner användare alls (för att se om de behöver uppdateras)
    
    // Om Feature Goal nämner användare, kolla om det är konsekvent
    if (mentions.mentionsKund || mentions.mentionsHandläggare || mentions.mentionsAnställd) {
      // Feature Goals kan nämna användare - detta är OK om det är baserat på child nodes
      // Men vi kan flagga om det verkar inkorrekt
      const issues = [];
      
      // Om Feature Goal bara nämner handläggare men inte kund, kan det vara ett problem
      // om child nodes innehåller User Tasks som ska vara kund
      if (mentions.mentionsHandläggare && !mentions.mentionsKund && !mentions.mentionsAnställd) {
        issues.push('⚠️  Nämner bara handläggare - kontrollera om child nodes innehåller kund-uppgifter');
      }
      
      if (issues.length > 0) {
        featureGoalResults.push({ ...doc, mentions, issues });
      }
    }
  }

  if (featureGoalResults.length > 0) {
    console.log(`⚠️  Feature Goals som kan behöva granskas: ${featureGoalResults.length}\n`);
    featureGoalResults.forEach(result => {
      console.log(`   - ${result.nodeName} (${result.bpmnFile}::${result.elementId})`);
      result.issues.forEach(issue => console.log(`     ${issue}`));
    });
  } else {
    console.log('✅ Feature Goals verkar ha korrekt användarbenämning (eller nämner inte användare)\n');
  }

  // Analysera Business Rules
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 BUSINESS RULES\n');
  console.log('ℹ️  Business Rules ska typiskt inte nämna användare alls.');
  console.log('   De ska beskriva regler och logik, inte användarinteraktioner.\n');
  
  const businessRuleResults = [];
  for (const doc of businessRuleDocs) {
    const mentions = checkDocForUserMentions(doc.html, 'business-rule', doc.nodeName, doc.nodeType);
    
    // Business Rules ska inte nämna användare
    if (mentions.mentionsKund || mentions.mentionsHandläggare || mentions.mentionsAnställd) {
      businessRuleResults.push({
        ...doc,
        mentions,
        issues: ['⚠️  Nämner användare - Business Rules ska beskriva regler, inte användarinteraktioner'],
      });
    }
  }

  if (businessRuleResults.length > 0) {
    console.log(`⚠️  Business Rules som nämner användare: ${businessRuleResults.length}\n`);
    businessRuleResults.forEach(result => {
      console.log(`   - ${result.nodeName} (${result.bpmnFile}::${result.elementId})`);
      result.issues.forEach(issue => console.log(`     ${issue}`));
    });
  } else {
    console.log('✅ Business Rules nämner inte användare (korrekt)\n');
  }

  // Sammanfattning
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SAMMANFATTNING\n');
  console.log(`Total dokumentation kontrollerad: ${allDocs.size}`);
  console.log(`   Epics: ${epicDocs.length}`);
  console.log(`   Feature Goals: ${featureGoalDocs.length}`);
  console.log(`   Business Rules: ${businessRuleDocs.length}\n`);
  console.log(`Epics med problem: ${epicResults.length}`);
  console.log(`Feature Goals att granska: ${featureGoalResults.length}`);
  console.log(`Business Rules som nämner användare: ${businessRuleResults.length}\n`);
  
  if (epicResults.length === 0 && featureGoalResults.length === 0 && businessRuleResults.length === 0) {
    console.log('✅ Alla dokumentationstyper har korrekt användarbenämning!');
  } else {
    console.log('💡 Rekommendation:');
    if (epicResults.length > 0) {
      console.log('   - Regenerera User Task epics med uppdaterad lane inference-logik');
    }
    if (featureGoalResults.length > 0) {
      console.log('   - Granska Feature Goals - de kan behöva uppdateras efter att child nodes regenererats');
    }
    if (businessRuleResults.length > 0) {
      console.log('   - Granska Business Rules - de ska inte nämna användare');
    }
  }
}

main().catch(console.error);



















