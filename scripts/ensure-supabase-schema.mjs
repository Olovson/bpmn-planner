#!/usr/bin/env node

/**
 * Script som säkerställer att Supabase lokalt har korrekt schema innan PostgREST startar.
 * Detta löser problemet där PostgREST schema-cache är utdaterad och vägrar inserts.
 *
 * Användning:
 *   node scripts/ensure-supabase-schema.mjs
 *
 * Detta script bör köras innan dev-server startar, eller som del av en start-pipeline.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_DIR = join(process.cwd(), 'supabase');
const MIGRATIONS_DIR = join(SUPABASE_DIR, 'migrations');

function log(message) {
  console.log(`[Schema Sync] ${message}`);
}

function error(message) {
  console.error(`[Schema Sync] ERROR: ${message}`);
}

function checkSupabaseInstalled() {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkSupabaseRunning() {
  try {
    const output = execSync('supabase status', { encoding: 'utf-8', stdio: 'pipe' });
    return output.includes('API URL:');
  } catch {
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(description);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (err) {
    error(`${description} misslyckades: ${err.message}`);
    return false;
  }
}

async function main() {
  log('Kontrollerar Supabase-installation...');
  if (!checkSupabaseInstalled()) {
    error('Supabase CLI är inte installerat. Installera via: npm install -g supabase');
    process.exit(1);
  }

  log('Kontrollerar om Supabase körs...');
  const isRunning = checkSupabaseRunning();

  if (isRunning) {
    log('Supabase körs redan. Stoppar för att säkerställa schema-sync...');
    if (!runCommand('supabase stop', 'Stoppar Supabase')) {
      process.exit(1);
    }
  }

  log('Kontrollerar att migrations-katalog finns...');
  if (!existsSync(MIGRATIONS_DIR)) {
    error(`Migrations-katalog saknas: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  log('Startar Supabase med schema-sync (migrationer körs automatiskt vid start)...');
  if (!runCommand('supabase start', 'Startar Supabase')) {
    error('Kunde inte starta Supabase. Kontrollera att Docker körs och att portarna är lediga.');
    process.exit(1);
  }

  // Vänta lite för att PostgREST ska hinna läsa schemat
  log('Väntar på att PostgREST ska läsa schemat...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Verifiera att schemat faktiskt är korrekt
  log('Verifierar schema...');
  try {
    const { execSync } = await import('child_process');
    execSync('npm run check:db-schema', { stdio: 'inherit', cwd: process.cwd() });
    log('Schema-verifiering lyckades. Supabase är redo med uppdaterat schema.');
  } catch (err) {
    error('Schema-verifiering misslyckades. Kör "npm run supabase:reset" manuellt.');
    process.exit(1);
  }
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});

