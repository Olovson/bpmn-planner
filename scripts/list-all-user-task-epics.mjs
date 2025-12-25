#!/usr/bin/env node
/**
 * Script to list all User Task epics that need to be regenerated
 * Outputs a JSON file with all User Task epics for batch regeneration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
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

async function main() {
  console.log('🔍 Finding all User Task epics...\n');

  // Lista alla dokumentationsfiler i nodes/ mappen
  const docDirs = [
    'docs/local/nodes',
    'docs/slow/chatgpt/nodes',
    'docs/slow/ollama/nodes',
    'docs/nodes', // Legacy
  ];

  const allDocs = new Map(); // key: bpmnFile:elementId, value: { path, html, bpmnFile, elementId }

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

  // Filtrera till User Tasks
  const userTaskEpics = [];

  for (const [key, doc] of allDocs.entries()) {
    const html = doc.html.toLowerCase();
    
    // Kolla om dokumentationen är för en User Task
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
      
      // Extrahera BPMN filnamn (lägg till .bpmn om det saknas)
      const bpmnFile = doc.bpmnFile.endsWith('.bpmn') ? doc.bpmnFile : `${doc.bpmnFile}.bpmn`;
      
      userTaskEpics.push({
        bpmnFile,
        elementId: doc.elementId,
        nodeName,
        storagePath: doc.path,
      });
    }
  }

  // Sortera efter fil, sedan elementId
  userTaskEpics.sort((a, b) => {
    if (a.bpmnFile !== b.bpmnFile) {
      return a.bpmnFile.localeCompare(b.bpmnFile);
    }
    return a.elementId.localeCompare(b.elementId);
  });

  console.log(`✅ Found ${userTaskEpics.length} User Task epics\n`);

  // Skriv till JSON-fil
  const outputPath = join(__dirname, '../user-task-epics-list.json');
  writeFileSync(outputPath, JSON.stringify(userTaskEpics, null, 2), 'utf-8');

  console.log(`📝 Saved list to: ${outputPath}\n`);
  console.log('📋 User Task Epics to regenerate:\n');
  
  userTaskEpics.forEach((epic, index) => {
    console.log(`${index + 1}. ${epic.nodeName}`);
    console.log(`   File: ${epic.bpmnFile}`);
    console.log(`   Element ID: ${epic.elementId}\n`);
  });

  console.log(`\n✅ Total: ${userTaskEpics.length} User Task epics`);
}

main().catch(console.error);











