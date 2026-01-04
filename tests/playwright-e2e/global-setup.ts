import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

/**
 * Global setup som:
 * 1. Skapar seed-användaren om den saknas
 * 
 * OBS: Vi sparar INTE sessionen här - testerna loggar in själva med stepLogin() om de behöver.
 * Detta är enklare och mer robust.
 */
async function ensureSeedUser() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.join(__dirname, '../..');

  // Determine which env file to use based on VITE_APP_ENV
  // Default to "test" to avoid accidentally using production for E2E runs.
  const appEnv = process.env.VITE_APP_ENV || 'test';
  const envFile = appEnv === 'test' ? '.env.test' : '.env.local';
  const envPath = path.join(projectRoot, envFile);

  let SUPABASE_URL = 'http://127.0.0.1:54321';
  let SERVICE_ROLE_KEY: string | undefined;
  let APP_ENV = 'production';

  try {
    const envContents = readFileSync(envPath, 'utf-8');
    for (const line of envContents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!key) continue;
      const value = rest.join('=');
      if (key === 'VITE_SUPABASE_URL') {
        SUPABASE_URL = value;
      } else if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY_TEST') {
        SERVICE_ROLE_KEY = value;
      } else if (key === 'VITE_APP_ENV') {
        APP_ENV = value;
      }
    }
  } catch {
    // Optional file, ignore if missing
  }

  if (!SERVICE_ROLE_KEY) {
    console.warn(`⚠️  SUPABASE_SERVICE_ROLE_KEY saknas i ${envFile} - hoppar över seed-användare`);
    return;
  }

  // SAFETY CHECK: Ensure tests use the test Supabase project
  const KNOWN_TEST_SUPABASE_URL = 'https://jxtlfdanzclcmtsgsrdd.supabase.co';
  if (APP_ENV === 'test' && !SUPABASE_URL.includes('jxtlfdanzclcmtsgsrdd')) {
    throw new Error(
      `SAFETY CHECK FAILED: VITE_APP_ENV=test but VITE_SUPABASE_URL does not point to test project!\n` +
      `  Expected: ${KNOWN_TEST_SUPABASE_URL}\n` +
      `  Got: ${SUPABASE_URL}\n` +
      `  Check your ${envFile} file.`
    );
  }

  console.log(`📋 Using ${envFile} (${APP_ENV} mode)`);

  const SEED_USER_EMAIL = 'seed-bot@local.test';
  const SEED_USER_PASSWORD = 'Passw0rd!';
  
  // Dedikerat test-konto för Playwright-tester
  const TEST_USER_EMAIL = 'test-bot@local.test';
  const TEST_USER_PASSWORD = 'TestPassw0rd!';

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    console.log('🔍 Kontrollerar seed-användare...');
    
    const { data, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      console.warn('⚠️  Kunde inte lista användare:', listError.message);
      return;
    }

    const existingSeed = data.users.find((user) => user.email === SEED_USER_EMAIL);
    const existingTest = data.users.find((user) => user.email === TEST_USER_EMAIL);

    // Skapa/uppdatera seed-användare
    if (existingSeed) {
      console.log(`✅ Seed-användare finns redan. Uppdaterar lösenord...`);
      await adminClient.auth.admin.updateUserById(existingSeed.id, {
        password: SEED_USER_PASSWORD,
        email_confirm: true,
      });
      console.log(`✅ Seed-användare uppdaterad`);
    } else {
      console.log(`📝 Skapar seed-användare: ${SEED_USER_EMAIL}...`);
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: SEED_USER_EMAIL,
        password: SEED_USER_PASSWORD,
        email_confirm: true,
      });

      if (createError || !created?.user) {
        console.warn('⚠️  Kunde inte skapa seed-användare:', createError?.message ?? 'Unknown error');
      } else {
        console.log(`✅ Seed-användare skapad`);
      }
    }
    
    // Skapa/uppdatera dedikerat test-konto för Playwright-tester
    if (existingTest) {
      console.log(`✅ Test-användare finns redan. Uppdaterar lösenord...`);
      await adminClient.auth.admin.updateUserById(existingTest.id, {
        password: TEST_USER_PASSWORD,
        email_confirm: true,
      });
      console.log(`✅ Test-användare uppdaterad`);
    } else {
      console.log(`📝 Skapar test-användare: ${TEST_USER_EMAIL}...`);
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
      });

      if (createError || !created?.user) {
        console.warn('⚠️  Kunde inte skapa test-användare:', createError?.message ?? 'Unknown error');
      } else {
        console.log(`✅ Test-användare skapad`);
      }
    }
  } catch (err) {
    console.warn('⚠️  Oväntat fel vid skapande av seed-användare:', err instanceof Error ? err.message : String(err));
  }
}

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  if (!baseURL) {
    throw new Error('baseURL is not set in Playwright config');
  }

  // Seed-användare från README
  const SEED_EMAIL = 'seed-bot@local.test';
  const SEED_PASSWORD = 'Passw0rd!';

  // 1. Se till att seed-användaren finns
  await ensureSeedUser();

  // Skapa auth-mappen om den inte finns (ES module-compatible)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const authDir = path.join(__dirname, '../../playwright/.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Skapa en tom storage state fil - testerna kommer att logga in själva med stepLogin()
  const emptyState = { cookies: [], origins: [] };
  fs.writeFileSync(path.join(authDir, 'user.json'), JSON.stringify(emptyState, null, 2));
  console.log('✅ Tom storage state skapad - testerna kommer att logga in själva');
}

export default globalSetup;
