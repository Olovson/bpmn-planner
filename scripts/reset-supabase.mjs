#!/usr/bin/env node

/**
 * Script som resetar Supabase lokalt, verifierar schema och skapar seed-användaren.
 * 
 * Användning:
 *   node scripts/reset-supabase.mjs
 *   eller
 *   npm run supabase:reset
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

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

async function createSeedUser() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Load .env.local
  const envPath = resolve(__dirname, '../.env.local');
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
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || 'seed-bot@local.test';
  const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Passw0rd!';

  if (!SERVICE_ROLE_KEY) {
    log('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY. Skipping seed user creation.');
    return;
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    log('Skapar seed-användare...');
    
    const { data, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      log(`⚠️  Kunde inte lista användare: ${listError.message}. Hoppar över seed-användare.`);
      return;
    }

    const existing = data.users.find((user) => user.email === SEED_USER_EMAIL);

    if (existing) {
      log(`✅ Användare ${SEED_USER_EMAIL} finns redan. Uppdaterar lösenord...`);
      
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
        password: SEED_USER_PASSWORD,
        email_confirm: true,
      });

      if (updateError) {
        log(`⚠️  Kunde inte uppdatera seed-användare: ${updateError.message}`);
        return;
      }

      log(`✅ Seed-användare uppdaterad! (${SEED_USER_EMAIL})`);
      return;
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: SEED_USER_EMAIL,
      password: SEED_USER_PASSWORD,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      log(`⚠️  Kunde inte skapa seed-användare: ${createError?.message ?? 'Unknown error'}`);
      return;
    }

    log(`✅ Seed-användare skapad! (${SEED_USER_EMAIL})`);
  } catch (err) {
    log(`⚠️  Oväntat fel vid skapande av seed-användare: ${err.message}`);
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

  // Skapa seed-användare
  await createSeedUser();

  log('✅ Supabase reset klar, schema verifierat och seed-användare skapad!');
}

main().catch((err) => {
  error(`Oväntat fel: ${err.message}`);
  process.exit(1);
});

