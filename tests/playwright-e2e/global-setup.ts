import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

/**
 * Global setup som:
 * 1. Skapar seed-användaren om den saknas
 * 2. Loggar ut om det finns en gammal session
 * 3. Loggar in på nytt och sparar sessionen
 */
async function ensureSeedUser() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.join(__dirname, '../..');
  
  // Load .env.local
  const envPath = path.join(projectRoot, '.env.local');
  let SUPABASE_URL = 'http://127.0.0.1:54321';
  let SERVICE_ROLE_KEY: string | undefined;
  
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
      } else if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        SERVICE_ROLE_KEY = value;
      }
    }
  } catch {
    // Optional file, ignore if missing
  }

  if (!SERVICE_ROLE_KEY) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY saknas i .env.local - hoppar över seed-användare');
    return;
  }

  const SEED_USER_EMAIL = 'seed-bot@local.test';
  const SEED_USER_PASSWORD = 'Passw0rd!';

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

    const existing = data.users.find((user) => user.email === SEED_USER_EMAIL);

    if (existing) {
      console.log(`✅ Seed-användare finns redan. Uppdaterar lösenord...`);
      await adminClient.auth.admin.updateUserById(existing.id, {
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
        return;
      }

      console.log(`✅ Seed-användare skapad`);
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

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🔐 Loggar in med seed-användare för att spara session...');
    
    // Gå till appen
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    
    // Vänta lite för att se om redirect sker
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    
    // Om vi inte är på /auth, logga ut först för att säkerställa en ren session
    if (!currentUrl.includes('/auth')) {
      console.log('🔓 Loggar ut för att säkerställa ren session...');
      try {
        // Försök hitta och klicka på logout-knappen
        const signOutButton = page.locator('button:has-text("Logga ut"), button:has-text("Sign out"), [data-testid="sign-out"]').first();
        if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signOutButton.click();
          await page.waitForURL(/\/auth/, { timeout: 5000 });
          await page.waitForLoadState('networkidle');
        }
      } catch {
        // Ignorera om logout inte fungerar - vi försöker logga in ändå
      }
    }
    
    // Gå till /auth för att logga in
    await page.goto(`${baseURL}/auth`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const finalUrl = page.url();
    if (finalUrl.includes('/auth')) {
      // Vänta på login-formuläret
      await page.waitForSelector('#signin-email', { timeout: 10000 });
      await page.waitForSelector('#signin-password', { timeout: 10000 });
      
      // Fyll i formuläret
      await page.fill('#signin-email', SEED_EMAIL);
      await page.fill('#signin-password', SEED_PASSWORD);
      
      // Klicka på login-knappen och vänta på auth API-response
      const loginButton = page.locator('button:has-text("Logga in"), button[type="submit"]').first();
      await loginButton.waitFor({ state: 'visible', timeout: 5000 });
      
      // Vänta på Supabase auth API-response (React Router navigation, inte full page reload)
      await Promise.all([
        page.waitForResponse(response => 
          response.url().includes('/auth/v1/token') && response.status() === 200
        ).catch(() => {}),
        loginButton.click(),
      ]);
      
      // Vänta på att vi navigeras bort från /auth
      await page.waitForURL(/\/(?!auth)/, { timeout: 20000 });
      await page.waitForLoadState('networkidle');
      console.log('✅ Inloggning klar');
    } else {
      console.log('✅ Redan inloggad eller ingen login krävs');
    }

    // Spara storage state (cookies, localStorage, etc.)
    await page.context().storageState({ path: path.join(authDir, 'user.json') });
    console.log('✅ Storage state sparad');
  } catch (error) {
    console.error('❌ Fel vid global setup:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

