#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Experimentscript för att köra LLM-refinement på en lokal bpmn-map.json
 * utan att skriva tillbaka till Supabase.
 *
 * Flöde:
 * 1. Läser bpmn-map.json från projektroten
 * 2. Kör refineBpmnMapWithLlm (Claude) på osäkra/omappade callActivities
 * 3. Skriver resultatet till bpmn-map.llm.generated.json för manuell review
 *
 * Viktigt:
 * - Överskriver INTE befintlig bpmn-map.json
 * - Använder endast lokal fil, inte storage
 * - Kräver env-variabler för Claude:
 *     VITE_USE_LLM=true
 *     VITE_ANTHROPIC_API_KEY=...
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function setupImportMetaEnvForLlm() {
  const globalAny: any = globalThis as any;
  const env = {
    VITE_USE_LLM: process.env.VITE_USE_LLM ?? 'true',
    VITE_ANTHROPIC_API_KEY: process.env.VITE_ANTHROPIC_API_KEY ?? '',
    MODE: 'test',
    ...process.env,
  };

  if (!globalAny.import) {
    globalAny.import = { meta: { env } };
  } else if (!globalAny.import.meta) {
    globalAny.import.meta = { env };
  } else {
    globalAny.import.meta.env = env;
  }
}

async function run() {
  setupImportMetaEnvForLlm();

  // Dynamiska imports så att import.meta.env är satt innan llmClient laddas
  const { loadBpmnMap } = await import('../src/lib/bpmn/bpmnMapLoader');
  const { refineBpmnMapWithLlm } = await import(
    '../src/lib/bpmn/bpmnMapLlmRefinement'
  );

  const projectRoot = resolve(__dirname, '..');
  const mapPath = resolve(projectRoot, 'bpmn-map.json');
  const outputPath = resolve(projectRoot, 'bpmn-map.llm.generated.json');

  console.log('🗺  Laddar lokal bpmn-map.json från:', mapPath);

  let rawJson: any;
  try {
    const content = readFileSync(mapPath, 'utf-8');
    rawJson = JSON.parse(content);
  } catch (err) {
    console.error('❌ Kunde inte läsa eller parsa bpmn-map.json:', err);
    process.exit(1);
  }

  const map = loadBpmnMap(rawJson);

  const totalCallActivities = map.processes.reduce(
    (acc, p) => acc + (p.call_activities?.length || 0),
    0,
  );

  console.log(
    `🔍 Map innehåller ${map.processes.length} processer och ${totalCallActivities} callActivities`,
  );

  console.log('🤖 Kör LLM-refinement på osäkra/omappade callActivities...');

  const refined = await refineBpmnMapWithLlm(map);

  let updatedCount = 0;
  refined.processes.forEach((proc, idx) => {
    const originalProc = map.processes[idx];
    proc.call_activities.forEach((ca, j) => {
      const origCa = originalProc.call_activities[j];
      if (ca.subprocess_bpmn_file !== origCa.subprocess_bpmn_file) {
        updatedCount++;
      }
    });
  });

  console.log(
    `✅ LLM-refinement klart. Uppdaterade mappningen för ${updatedCount} callActivities.`,
  );

  writeFileSync(outputPath, JSON.stringify(refined, null, 2), 'utf-8');
  console.log('💾 Skrev resultat till:', outputPath);
  console.log(
    '📝 Granska bpmn-map.llm.generated.json manuellt innan du ev. kopierar över något till bpmn-map.json.',
  );
}

run().catch((err) => {
  console.error('❌ LLM-refinement experiment misslyckades:', err);
  process.exit(1);
});

