#!/usr/bin/env node

/**
 * Script som stoppar alla utvecklingsprocesser.
 * 
 * Användning:
 *   node scripts/stop-dev.mjs
 *   eller
 *   npm run stop:dev
 */

import { execSync } from 'child_process';

function log(message) {
  console.log(`[Stop Dev] ${message}`);
}

function error(message) {
  console.error(`[Stop Dev] ERROR: ${message}`);
}

async function main() {
  log('Stoppar utvecklingsprocesser...');
  console.log('');

  // Stoppa Supabase
  log('Stoppar Supabase...');
  try {
    execSync('supabase stop', { stdio: 'inherit' });
    log('✅ Supabase stoppad.');
  } catch (err) {
    log('⚠️  Supabase körde inte eller kunde inte stoppas.');
  }

  // Stoppa edge functions och dev-server (de körs i bakgrunden)
  log('Stoppar edge functions och dev-server...');
  try {
    // Hitta processer som kör supabase functions serve
    execSync("pkill -f 'supabase functions serve'", { stdio: 'ignore' });
    log('✅ Edge functions stoppade.');
  } catch (err) {
    log('⚠️  Inga edge functions hittades att stoppa.');
  }

  try {
    // Hitta processer som kör npm run dev eller vite
    execSync("pkill -f 'vite'", { stdio: 'ignore' });
    log('✅ Dev-server stoppad.');
  } catch (err) {
    log('⚠️  Ingen dev-server hittades att stoppa.');
  }

  console.log('');
  log('✅ Alla processer stoppade.');
  console.log('');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});

















