#!/usr/bin/env node

/**
 * Script som resetar Supabase lokalt och verifierar schema.
 * 
 * Användning:
 *   node scripts/reset-supabase.mjs
 *   eller
 *   npm run supabase:reset
 */

import { execSync } from 'child_process';

function log(message) {
  console.log(`[Supabase Reset] ${message}`);
}

function error(message) {
  console.error(`[Supabase Reset] ERROR: ${message}`);
}

function runCommand(command, description, ignoreErrors = false) {
  try {
    log(description);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (err) {
    if (ignoreErrors) {
      log(`${description} misslyckades men ignoreras (${err.message})`);
      return true;
    }
    error(`${description} misslyckades: ${err.message}`);
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

async function main() {
  log('Kontrollerar om Supabase körs...');
  const isRunning = checkSupabaseRunning();

  if (isRunning) {
    log('Supabase körs. Stoppar...');
    if (!runCommand('supabase stop', 'Stoppar Supabase', false)) {
      process.exit(1);
    }
  } else {
    log('Supabase körs inte redan.');
  }

  log('Resetar databas...');
  if (!runCommand('supabase db reset', 'Resetar databas', false)) {
    process.exit(1);
  }

  log('Startar Supabase...');
  if (!runCommand('supabase start', 'Startar Supabase', false)) {
    error('Kunde inte starta Supabase. Kontrollera att Docker körs och att portarna är lediga.');
    process.exit(1);
  }

  // Vänta lite för att PostgREST ska hinna läsa schemat
  log('Väntar på att PostgREST ska läsa schemat...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  log('Verifierar schema...');
  if (!runCommand('npm run check:db-schema', 'Verifierar schema', false)) {
    error('Schema-verifiering misslyckades. Supabase kan vara startad men cache kan vara utdaterad.');
    process.exit(1);
  }

  log('✅ Supabase reset klar och schema verifierat!');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});

