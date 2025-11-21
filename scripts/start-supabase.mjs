#!/usr/bin/env node

/**
 * Script som startar Supabase och verifierar att allt fungerar.
 * 
 * Användning:
 *   node scripts/start-supabase.mjs
 *   eller
 *   npm run start:supabase
 */

import { execSync } from 'child_process';

function log(message) {
  console.log(`[Supabase Start] ${message}`);
}

function error(message) {
  console.error(`[Supabase Start] ERROR: ${message}`);
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
  log('Kontrollerar om Supabase redan körs...');
  const isRunning = checkSupabaseRunning();

  if (isRunning) {
    log('✅ Supabase körs redan.');
    log('Kontrollerar schema...');
    try {
      execSync('npm run check:db-schema', { stdio: 'inherit', cwd: process.cwd() });
      log('✅ Allt ser bra ut!');
      process.exit(0);
    } catch {
      log('⚠️  Schema-kontroll misslyckades. Kör "npm run supabase:reset" för att fixa.');
      process.exit(1);
    }
  } else {
    log('Supabase körs inte. Startar...');
    log('');
    log('═══════════════════════════════════════════════════════════');
    log('VIKTIGT: Detta script kan inte starta Supabase automatiskt.');
    log('Du måste köra följande kommandon manuellt i din terminal:');
    log('═══════════════════════════════════════════════════════════');
    log('');
    log('1. Starta Supabase:');
    log('   → supabase start');
    log('   → Vänta tills du ser "Started supabase local development setup."');
    log('');
    log('2. Reset databasen (kör migrationer):');
    log('   → supabase db reset');
    log('');
    log('3. Verifiera schema:');
    log('   → npm run check:db-schema');
    log('');
    log('4. Om allt ser bra ut, starta dev-servern:');
    log('   → npm run dev');
    log('');
    log('═══════════════════════════════════════════════════════════');
    log('');
    log('💡 Tips: Kör "npm run fix:supabase-profile" för detaljerad guide.');
    log('');
    process.exit(0);
  }
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});

