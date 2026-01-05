#!/usr/bin/env node
/**
 * CLI-script för att generera/uppdatera bpmn-map.json via orchestratorn.
 *
 * Funktioner:
 * - Läser befintlig map från Supabase Storage (via bpmnMapStorage)
 * - Kör heuristisk generator (generateBpmnMapFromFiles)
 * - Mergar enligt reglerna (manual vinner, heuristik kompletterar)
 * - Kan köras i preview-läge (ingen skrivning) eller med --force för overwrite
 *
 * Användning (exempel):
 *   # Preview (ingen skrivning, bara rapport)
 *   node scripts/generate-bpmn-map.mjs --preview
 *
 *   # Overwrite + ev. GitHub-sync (endast när du är säker)
 *   VITE_APP_ENV=test node scripts/generate-bpmn-map.mjs --force
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { generateAndMaybeSaveBpmnMap } from '../src/lib/bpmn/bpmnMapGenerationOrchestrator';
import { validateBpmnMap } from '../src/lib/bpmn/validateBpmnMap';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(path) {
  try {
    const envContents = readFileSync(path, 'utf-8');
    for (const line of envContents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      const value = rest.join('=');
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // valfritt
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args);

  const preview = flags.has('--preview') || (!flags.has('--force') && !flags.has('--write'));
  const forceOverwrite = flags.has('--force');
  const noLlm = flags.has('--no-llm');
  const useLlm = flags.has('--llm');
  const syncToGitHub = flags.has('--sync-github');

  // Ladda env (för Supabase mm)
  const projectRoot = resolve(__dirname, '..');
  // Försök först .env.test, sedan .env.local, sedan .env
  loadEnvFile(resolve(projectRoot, '.env.test'));
  loadEnvFile(resolve(projectRoot, '.env.local'));
  loadEnvFile(resolve(projectRoot, '.env'));

  const appEnv = process.env.VITE_APP_ENV || 'test';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const KNOWN_TEST_SUPABASE_URL = 'https://jxtlfdanzclcmtsgsrdd.supabase.co';

  if (appEnv === 'test') {
    if (!supabaseUrl) {
      console.error(
        '[generate-bpmn-map] VITE_APP_ENV=test men VITE_SUPABASE_URL är tom. ' +
          'Kontrollera att .env.test pekar på test-projektet:',
        KNOWN_TEST_SUPABASE_URL,
      );
      process.exit(1);
    }
    if (!supabaseUrl.includes('jxtlfdanzclcmtsgsrdd')) {
      console.error(
        '[generate-bpmn-map] SAFETY CHECK FAILED: VITE_APP_ENV=test men VITE_SUPABASE_URL pekar inte på test-projektet.\n' +
          `  Expected: ${KNOWN_TEST_SUPABASE_URL}\n` +
          `  Got: ${supabaseUrl}\n`,
      );
      process.exit(1);
    }
  } else if (forceOverwrite) {
    console.error(
      '[generate-bpmn-map] ⚠️ --force används i en miljö som inte är VITE_APP_ENV=test. ' +
        'Av säkerhetsskäl avbryts körningen. Sätt VITE_APP_ENV=test och använd test-Supabase om du vill overwrite:a.',
    );
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('[generate-bpmn-map] Startar bpmn-map generering');
  console.log('  preview        :', preview);
  console.log('  forceOverwrite:', forceOverwrite);
  console.log('  useLlm        :', useLlm && !noLlm);
  console.log('  syncToGitHub  :', syncToGitHub);
  console.log('  VITE_APP_ENV  :', appEnv);
  console.log('='.repeat(80));

  try {
    const report = await generateAndMaybeSaveBpmnMap({
      useLlm,
      noLlm,
      preview,
      forceOverwrite,
      syncToGitHub,
    });

    console.log('\n[generate-bpmn-map] Källa för befintlig map:', report.source);
    console.log('[generate-bpmn-map] Statistik:');
    console.log('  Totala callActivities :', report.stats.totalCallActivities);
    console.log('  Från befintlig map    :', report.stats.fromExisting);
    console.log('  Från heuristik        :', report.stats.fromHeuristic);
    console.log('  Låsta (manual)        :', report.stats.manualLocked);
    console.log('  Konflikter            :', report.stats.conflicts);

    if (report.conflicts.length > 0) {
      console.log('\nKonflikter (manual vs heuristik):');
      for (const c of report.conflicts.slice(0, 10)) {
        console.log(
          `  ${c.bpmn_file} [${c.process_id}] :: ${c.bpmn_id} – ` +
            `${c.previous_subprocess_bpmn_file} -> ${c.heuristic_subprocess_bpmn_file}`,
        );
      }
      if (report.conflicts.length > 10) {
        console.log(`  … (${report.conflicts.length - 10} fler konflikter)`);
      }
    }

    // Kör alltid validering av merged map innan vi ev. sparar
    console.log('\n[generate-bpmn-map] Validerar merged map...');
    const validation = await validateBpmnMap(report.mergedMap, {
      checkFiles: true,
      buildGraph: true,
    });

    if (!validation.valid) {
      console.error('\n❌ BPMN map validation failed:');
      validation.errors.forEach((err) => console.error('  -', err));
      if (validation.warnings.length) {
        console.error('\nVarningar:');
        validation.warnings.forEach((w) => console.error('  -', w));
      }
      console.error(
        '\n[generate-bpmn-map] Ingen skrivning har gjorts p.g.a. valideringsfel.',
      );
      process.exit(1);
    }

    if (preview) {
      console.log(
        '\n[generate-bpmn-map] Preview-läge – ingen skrivning har gjorts. ' +
          'Använd --force (med VITE_APP_ENV=test) om du vill overwrite:a i storage.',
      );
    } else if (report.saved) {
      console.log('\n[generate-bpmn-map] ✓ Ny bpmn-map.json sparad till storage.');
      if (report.githubSynced) {
        console.log('[generate-bpmn-map] ✓ GitHub-sync lyckades.');
      } else if (syncToGitHub) {
        console.log('[generate-bpmn-map] ⚠️ GitHub-sync var aktiverad men verkar inte ha lyckats. Se loggar.');
      }
    } else {
      console.log('\n[generate-bpmn-map] Ingen skrivning utfördes (preview eller forceOverwrite=false).');
    }
  } catch (err) {
    console.error('\n[generate-bpmn-map] Fel:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Kör endast main när scriptet körs direkt
  main();
}
