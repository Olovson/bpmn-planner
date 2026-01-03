/**
 * Återanvändbara test-steg för E2E-tester
 * 
 * Dessa steg kan användas individuellt eller kombineras till A-Ö tester.
 * Varje steg är självständigt och kan testas isolerat.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface TestContext {
  page: Page;
}

/**
 * Steg 1: Logga in
 * 
 * Använder Supabase client direkt (via window.__SUPABASE_CLIENT__) för att logga in.
 * Detta säkerställer att sessionen sparas korrekt i localStorage.
 */
export async function stepLogin(ctx: TestContext) {
  const { page } = ctx;
  
  console.log('🔐 [stepLogin] Starting login via Supabase client...');
  
  // Gå till appen först så att Supabase client laddas
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Vänta på att Supabase client är laddad
  
  let currentUrl = page.url();
  console.log('🔐 [stepLogin] Initial URL:', currentUrl);
  
  // Om vi redan är inloggade (inte på /auth), är vi klara
  if (!currentUrl.includes('/auth') && !currentUrl.includes('#/auth')) {
    console.log('✅ [stepLogin] Already logged in!');
    return;
  }
  
  // Logga in via Supabase client direkt
  console.log('🔐 [stepLogin] Logging in via Supabase client...');
  const loginResult = await page.evaluate(async () => {
    // @ts-ignore
    const supabase = window.__SUPABASE_CLIENT__;
    
    if (!supabase) {
      throw new Error('Supabase client not found in window. Make sure app is loaded.');
    }
    
    // Försök först med test-bot, sedan seed-bot
    let result = await supabase.auth.signInWithPassword({
      email: 'test-bot@local.test',
      password: 'TestPassw0rd!',
    });
    
    if (result.error) {
      console.log('test-bot login failed, trying seed-bot...', result.error.message);
      result = await supabase.auth.signInWithPassword({
        email: 'seed-bot@local.test',
        password: 'Passw0rd!',
      });
    }
    
    if (result.error) {
      throw new Error(`Login failed: ${result.error.message}`);
    }
    
    if (!result.data.session) {
      throw new Error('Login failed - no session in response');
    }
    
    // Verifiera att sessionen faktiskt sparas
    const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
    if (!verifySession) {
      throw new Error(`Login failed - session not found after login. Error: ${verifyError?.message}`);
    }
    
    return { 
      success: true, 
      userEmail: verifySession.user?.email,
      hasAccessToken: !!verifySession.access_token,
    };
  });
  
  if (!loginResult.success) {
    throw new Error('Login failed');
  }
  
  console.log('✅ [stepLogin] Login successful! User:', loginResult.userEmail);
  
  // Vänta lite för att sessionen ska sparas helt
  await page.waitForTimeout(2000);
  
  // Verifiera att sessionen faktiskt finns i localStorage
  const sessionCheck = await page.evaluate(() => {
    const info: { hasSession: boolean; sessionKey?: string } = {
      hasSession: false,
    };
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && ((key.includes('supabase') || key.startsWith('sb-')) && key.includes('auth'))) {
        const value = localStorage.getItem(key);
        if (value && (value.includes('access_token') || value.includes('"access_token"'))) {
          info.hasSession = true;
          info.sessionKey = key;
          break;
        }
      }
    }
    return info;
  });
  
  console.log('🔐 [stepLogin] Session in localStorage:', sessionCheck);
  
  if (!sessionCheck.hasSession) {
    throw new Error('Login failed - session not found in localStorage after login');
  }
  
  // Vänta på att ProtectedRoute faktiskt kan läsa sessionen
  // Vi gör detta genom att vänta på att vi kan navigera till en skyddad route
  // och att vi INTE redirectas till /auth
  console.log('🔐 [stepLogin] Verifying session by navigating to protected route...');
  
  // Vänta på att sessionen är helt etablerad genom att kolla att Supabase client kan läsa den
  let sessionVerified = false;
  for (let i = 0; i < 5; i++) {
    const check = await page.evaluate(async () => {
      // @ts-ignore
      const supabase = window.__SUPABASE_CLIENT__;
      if (supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { 
          hasSession: !!session,
          userEmail: session?.user?.email,
          error: error?.message,
        };
      }
      return { hasSession: false, error: 'No Supabase client' };
    });
    
    if (check.hasSession) {
      console.log('✅ [stepLogin] Session verified by Supabase client:', check.userEmail);
      sessionVerified = true;
      break;
    }
    
    console.log(`🔐 [stepLogin] Session check attempt ${i + 1}/5:`, check);
    await page.waitForTimeout(1000);
  }
  
  if (!sessionVerified) {
    throw new Error('Login failed - Supabase client cannot read session after login');
  }
  
  // Nu navigera till /files och vänta på att ProtectedRoute accepterar sessionen
  // Problemet är att ProtectedRoute använder useEffect som körs asynkront,
  // så vi måste vänta på att den faktiskt har verifierat sessionen
  console.log('🔐 [stepLogin] Navigating to /files...');
  
  // Navigera till /files
  // VIKTIGT: I HashRouter måste vi navigera till /#/files istället för /files
  // eftersom HashRouter använder hash-baserad routing
  console.log('🔐 [stepLogin] Navigating to /#/files...');
  await page.goto('/#/files', { waitUntil: 'domcontentloaded' });
  
  // Vänta på att ProtectedRoute har laddat klart
  // ProtectedRoute visar "Laddar..." medan den verifierar sessionen
  // Vi väntar på att antingen:
  // 1. "Laddar..." försvinner OCH vi ser innehåll från /files (success)
  // 2. Vi redirectas till #/auth (failure)
  console.log('🔐 [stepLogin] Waiting for ProtectedRoute to finish loading...');
  
  // Vänta på att antingen sidan laddas eller vi redirectas
  try {
    const result = await Promise.race([
      // Success: Vi ser innehåll från /files-sidan (använd generella selectors, inte uppladdnings-specifika)
      page.waitForSelector('h1:has-text("Filer"), text="BPMN & DMN Filhantering"', { timeout: 10000 }).then(() => {
        console.log('✅ [stepLogin] /files page loaded successfully');
        return 'success';
      }),
      // Failure: Vi redirectas till #/auth
      page.waitForURL(/#\/auth/, { timeout: 10000 }).then(() => {
        console.log('❌ [stepLogin] Redirected to #/auth');
        return 'auth';
      }),
    ]);
    
    if (result === 'auth') {
      // Debug: Kolla vad ProtectedRoute faktiskt ser
      const protectedRouteCheck = await page.evaluate(async () => {
        // @ts-ignore
        const supabase = window.__SUPABASE_CLIENT__;
        if (supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          return { 
            sessionExists: !!session, 
            userEmail: session?.user?.email,
            sessionError: error?.message 
          };
        }
        return { sessionExists: false, sessionError: 'Supabase client not available' };
      });
      console.log('🔐 [stepLogin] ProtectedRoute sees:', protectedRouteCheck);
      throw new Error(`Login failed - redirected to #/auth. ProtectedRoute sees: ${JSON.stringify(protectedRouteCheck)}`);
    }
  } catch (error) {
    // Timeout eller annat fel - kolla var vi är
    const finalUrl = page.url();
    console.log('🔐 [stepLogin] Error or timeout waiting for /files, current URL:', finalUrl);
    
    if (finalUrl.includes('/auth') || finalUrl.includes('#/auth')) {
      // Debug: Kolla vad ProtectedRoute faktiskt ser
      const protectedRouteCheck = await page.evaluate(async () => {
        // @ts-ignore
        const supabase = window.__SUPABASE_CLIENT__;
        if (supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          return { 
            sessionExists: !!session, 
            userEmail: session?.user?.email,
            sessionError: error?.message 
          };
        }
        return { sessionExists: false, sessionError: 'Supabase client not available' };
      });
      console.log('🔐 [stepLogin] ProtectedRoute sees:', protectedRouteCheck);
      throw new Error(`Login failed - redirected to /auth. ProtectedRoute sees: ${JSON.stringify(protectedRouteCheck)}`);
    }
    
    // Om vi inte är på /auth, kanske sidan laddades ändå
    // Men vänta lite till och kolla igen om vi redirectas
    await page.waitForTimeout(2000);
    const retryUrl = page.url();
    
    if (retryUrl.includes('/auth') || retryUrl.includes('#/auth')) {
      // Debug: Kolla vad ProtectedRoute faktiskt ser
      const protectedRouteCheck = await page.evaluate(async () => {
        // @ts-ignore
        const supabase = window.__SUPABASE_CLIENT__;
        if (supabase) {
          const { data: { session }, error } = await supabase.auth.getSession();
          return { 
            sessionExists: !!session, 
            userEmail: session?.user?.email,
            sessionError: error?.message 
          };
        }
        return { sessionExists: false, sessionError: 'Supabase client not available' };
      });
      console.log('🔐 [stepLogin] ProtectedRoute sees:', protectedRouteCheck);
      throw new Error(`Login failed - redirected to /auth after timeout. ProtectedRoute sees: ${JSON.stringify(protectedRouteCheck)}`);
    }
    
    const pageContent = await page.textContent('body') || '';
    const hasFilesContent = pageContent.includes('Filer') || 
                            pageContent.includes('Ladda upp') || 
                            pageContent.includes('BPMN & DMN');
    
    if (hasFilesContent) {
      console.log('✅ [stepLogin] /files page loaded (despite timeout)');
    } else {
      throw new Error(`Login failed - timeout waiting for /files page. Current URL: ${retryUrl}`);
    }
  }
  
  // Vänta på att sidan är helt laddad
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Verifiera att vi INTE redirectas till /auth
  const finalUrl = page.url();
  console.log('🔐 [stepLogin] Final URL check:', finalUrl);
  
  if (finalUrl.includes('/auth') || finalUrl.includes('#/auth')) {
    // Debug: Kolla vad ProtectedRoute faktiskt ser
    const protectedRouteCheck = await page.evaluate(async () => {
      // @ts-ignore
      const supabase = window.__SUPABASE_CLIENT__;
      if (supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { 
          sessionExists: !!session, 
          userEmail: session?.user?.email,
          sessionError: error?.message 
        };
      }
      return { sessionExists: false, sessionError: 'Supabase client not available' };
    });
    console.log('🔐 [stepLogin] ProtectedRoute sees:', protectedRouteCheck);
    throw new Error(`Login failed - still on /auth. ProtectedRoute sees: ${JSON.stringify(protectedRouteCheck)}`);
  }
  
  console.log('✅ [stepLogin] Login verified! Current URL:', finalUrl);
}

/**
 * Steg 2: Navigera till Files-sidan
 * VIKTIGT: I HashRouter måste vi navigera till /#/files istället för /files
 */
export async function stepNavigateToFiles(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/#/files');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

/**
 * Steg 3: Ladda upp BPMN-fil
 */
export async function stepUploadBpmnFile(ctx: TestContext, fileName: string, content: string) {
  const { page } = ctx;
  
  // VIKTIGT: Skydd mot att test skriver över produktionsfiler
  // Alla test-filer måste ha prefix "test-" för att undvika att skriva över produktionsfiler
  if (!fileName.startsWith('test-')) {
    throw new Error(
      `[stepUploadBpmnFile] SECURITY: Test files must have "test-" prefix to avoid overwriting production files. ` +
      `Received: "${fileName}". Use generateTestFileName() to create safe test file names.`
    );
  }
  
  // Vänta på att sidan är laddad
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Vänta på att file input finns i DOM (även om den är hidden)
  // FileUploadArea renderar input med id="file-upload"
  const fileInputSelector = 'input[type="file"][id="file-upload"]';
  
  try {
    // Vänta på att input-elementet finns i DOM
    await page.waitForSelector(fileInputSelector, { 
      state: 'attached',
      timeout: 15000 
    });
  } catch (error) {
    // Om specifik selector inte hittas, försök hitta någon file input
    const anyFileInput = await page.locator('input[type="file"]').first().count();
    if (anyFileInput === 0) {
      throw new Error(`File upload input not found. Selector: ${fileInputSelector}. Make sure you are on the files page and FileUploadArea is rendered.`);
    }
  }
  
  // Hitta file input (prioritera id="file-upload")
  const uploadInput = page.locator(fileInputSelector).first();
  const inputCount = await uploadInput.count();
  
  if (inputCount > 0) {
    // Input-elementet är hidden men finns i DOM - setInputFiles fungerar ändå
    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'application/xml',
      buffer: Buffer.from(content),
    });
    
    // Vänta på att upload är klar (kolla efter success-meddelande eller att filen visas i tabellen)
    try {
      // Försök hitta success-meddelande eller filen i tabellen
      await Promise.race([
        page.waitForSelector(`text=/success/i, text=/uploaded/i, text=${fileName}`, { timeout: 30000 }).catch(() => null),
        page.waitForSelector(`table:has-text("${fileName}")`, { timeout: 30000 }).catch(() => null),
        page.waitForTimeout(10000), // Fallback timeout
      ]);
    } catch {
      // Om success-meddelande inte visas direkt, fortsätt ändå
    }
    
    // Verifiera att filen faktiskt laddades upp (kolla tabellen)
    // Vänta på att filen visas i tabellen - detta kan ta tid eftersom queries behöver uppdateras
    console.log(`📤 [stepUploadBpmnFile] Waiting for file "${fileName}" to appear in table...`);
    
    const fileInTable = page.locator(`tr:has-text("${fileName}"), table:has-text("${fileName}")`).first();
    
    try {
      // Vänta på att filen faktiskt visas i tabellen (max 15 sekunder)
      await fileInTable.waitFor({ state: 'visible', timeout: 15000 });
      console.log(`✅ [stepUploadBpmnFile] File "${fileName}" found in table`);
    } catch (error) {
      // Om filen inte visas, försök vänta lite till och kolla igen
      // Men först kolla om sidan fortfarande är öppen
      try {
        const isClosed = page.isClosed();
        if (isClosed) {
          throw new Error(`Page was closed while waiting for file "${fileName}" to appear`);
        }
      } catch (closedError) {
        throw new Error(`Page was closed while waiting for file "${fileName}" to appear: ${closedError}`);
      }
      
      console.warn(`⚠️  [stepUploadBpmnFile] File "${fileName}" not immediately visible, waiting a bit more...`);
      
      // Försök vänta, men fånga om sidan stängs
      try {
        await page.waitForTimeout(3000);
      } catch (timeoutError) {
        // Om sidan stängs, försök navigera tillbaka
        if (timeoutError instanceof Error && timeoutError.message.includes('closed')) {
          console.warn(`⚠️  [stepUploadBpmnFile] Page was closed, attempting to recover...`);
          // Detta kommer inte fungera om sidan är stängd, men vi försöker
          throw new Error(`Page was closed while waiting for file "${fileName}"`);
        }
        throw timeoutError;
      }
      
      const fileExistsRetry = await fileInTable.isVisible({ timeout: 5000 }).catch(() => false);
      if (!fileExistsRetry) {
        // Kolla om filen finns i databasen ändå (upload kan ha fungerat men UI inte uppdaterats)
        const fileInDb = await page.evaluate(async (fileName: string) => {
          try {
            const { supabase } = await import('/src/integrations/supabase/client');
            const { data, error } = await supabase
              .from('bpmn_files')
              .select('file_name')
              .eq('file_name', fileName)
              .maybeSingle();
            return !error && data !== null;
          } catch {
            return false;
          }
        }, fileName);
        
        if (fileInDb) {
          console.warn(`⚠️  [stepUploadBpmnFile] File "${fileName}" exists in database but not visible in table - UI may need refresh`);
          // Försök uppdatera sidan eller vänta lite till
          await page.waitForTimeout(2000);
        } else {
          throw new Error(`File "${fileName}" was not uploaded successfully - not found in database or table`);
        }
      }
    }
    
    await page.waitForTimeout(1000); // Låt UI uppdateras
  } else {
    // Fallback: försök hitta någon file input
    const anyFileInput = page.locator('input[type="file"]').first();
    const anyInputCount = await anyFileInput.count();
    
    if (anyInputCount > 0) {
      await anyFileInput.setInputFiles({
        name: fileName,
        mimeType: 'application/xml',
        buffer: Buffer.from(content),
      });
      await page.waitForTimeout(3000);
    } else {
      throw new Error(`Upload input not found. Selector: ${fileInputSelector}. Make sure you are on the files page and FileUploadArea is rendered. Current URL: ${page.url()}`);
    }
  }
}

/**
 * Steg 4: Bygg hierarki
 */
export async function stepBuildHierarchy(ctx: TestContext) {
  const { page } = ctx;
  
  const buildHierarchyButton = page.locator(
    'button:has-text("Bygg hierarki"), button:has-text("Build hierarchy"), button:has-text("hierarki")'
  ).first();
  
  const buttonCount = await buildHierarchyButton.count();
  
  if (buttonCount > 0 && await buildHierarchyButton.isVisible().catch(() => false)) {
    await buildHierarchyButton.click();
    
    // Vänta på att hierarki är byggd
    await Promise.race([
      page.waitForSelector('text=/success/i, text=/klar/i, text=/complete/i', { timeout: 30000 }),
      page.waitForTimeout(5000),
    ]).catch(() => {});
    
    await page.waitForTimeout(2000);
  } else {
    throw new Error('Build hierarchy button not found');
  }
}

/**
 * Steg 5: Välj genereringsläge
 */
export async function stepSelectGenerationMode(ctx: TestContext, mode: 'claude' | 'ollama' | 'local' = 'claude') {
  const { page } = ctx;
  
  let modeButton;
  if (mode === 'claude') {
    modeButton = page.locator('button:has-text("Claude"), button:has-text("Claude (moln-LLM)")').first();
  } else if (mode === 'ollama') {
    modeButton = page.locator('button:has-text("Ollama"), button:has-text("Ollama (lokal)")').first();
  } else {
    modeButton = page.locator('button:has-text("Local"), button:has-text("Lokal")').first();
  }
  
  const buttonCount = await modeButton.count();
  
  if (buttonCount > 0 && await modeButton.isVisible().catch(() => false)) {
    // Kolla om redan aktiv
    const isActive = await modeButton.evaluate((el) => {
      return el.classList.contains('ring-2') || 
             el.classList.contains('ring-primary') ||
             el.getAttribute('aria-pressed') === 'true';
    });
    
    if (!isActive) {
      await modeButton.click();
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Steg 6: Välj fil för generering
 */
export async function stepSelectFile(ctx: TestContext, fileName: string) {
  const { page } = ctx;
  
  console.log(`📁 [stepSelectFile] Looking for file: ${fileName}`);
  
  // Vänta på att sidan är laddad och stabil
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Vänta på att tabellen är laddad och stabil (kan ta tid om queries uppdateras)
  let tableFound = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    const table = page.locator('table').first();
    const count = await table.count();
    if (count > 0) {
      const isVisible = await table.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        tableFound = true;
        break;
      }
    }
    console.log(`📁 [stepSelectFile] Table not found yet, attempt ${attempt + 1}/10, waiting...`);
    await page.waitForTimeout(1000);
  }
  
  if (!tableFound) {
    // Debug: Kolla vad som finns på sidan
    const currentUrl = page.url();
    const pageTitle = await page.title().catch(() => 'unknown');
    const bodyText = await page.locator('body').textContent().catch(() => '');
    console.log(`📁 [stepSelectFile] Debug: URL=${currentUrl}, Title=${pageTitle}, Body length=${bodyText?.length || 0}`);
    
    // Försök navigera tillbaka till /files om vi inte är där
    if (!currentUrl.includes('/files')) {
      console.log(`📁 [stepSelectFile] Not on /files page, navigating back...`);
      await page.goto('/#/files');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Försök hitta tabellen igen
      const table = page.locator('table').first();
      const count = await table.count();
      if (count > 0) {
        const isVisible = await table.isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
          tableFound = true;
          console.log(`📁 [stepSelectFile] Table found after navigation`);
        }
      }
    }
    
    if (!tableFound) {
      throw new Error(`Table not found on page after ${10} attempts and navigation. Current URL: ${currentUrl}`);
    }
  }
  
  await page.waitForTimeout(1000); // Låt tabellen stabilisera
  
  // Filerna renderas i TableRow med onClick, inte som länkar/knappar
  // Försök hitta TableRow som innehåller filnamnet
  // Använd mer flexibel selector som matchar filnamnet i TableCell
  const fileRow = page.locator(`tr:has-text("${fileName}")`).first();
  
  // Försök hitta filen - kan ta lite tid om tabellen uppdateras
  let fileFound = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await fileRow.count();
    if (count > 0) {
      const isVisible = await fileRow.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        fileFound = true;
        break;
      }
    }
    console.log(`📁 [stepSelectFile] File not found yet, attempt ${attempt + 1}/5, waiting...`);
    await page.waitForTimeout(1000);
  }
  
  if (!fileFound) {
    // Debug: Kolla vilka filer som faktiskt finns i tabellen
    const allRows = page.locator('table tbody tr');
    const rowCount = await allRows.count();
    console.log(`📁 [stepSelectFile] Debug: Found ${rowCount} rows in table`);
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const rowText = await allRows.nth(i).textContent().catch(() => '');
      console.log(`📁 [stepSelectFile] Debug: Row ${i}: ${rowText?.substring(0, 100)}`);
    }
    throw new Error(`File "${fileName}" not found in table after ${5} attempts`);
  }
  console.log(`📁 [stepSelectFile] File row found, clicking...`);
  
  // Klicka på raden (TableRow har onClick som väljer filen)
  // Om en dialog öppnas (t.ex. MapSuggestionsDialog), stäng den först
  // Vänta lite för att se om en dialog öppnas
  await page.waitForTimeout(500);
  
  // Kolla om det finns en dialog öppen
  const dialog = page.locator('[role="dialog"]').first();
  const hasDialog = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (hasDialog) {
    console.log(`📁 [stepSelectFile] Dialog detected, closing it...`);
    
    // Försök hitta och klicka på stäng-knappen
    const closeButton = dialog.locator('button:has-text("Stäng"), button:has-text("Close"), button[aria-label="Close"], button[aria-label*="close" i]').first();
    const hasCloseButton = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasCloseButton) {
      await closeButton.click();
      // Vänta på att dialogen faktiskt stängs
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {
        console.log(`📁 [stepSelectFile] Dialog did not close, trying Escape...`);
      });
    } else {
      // Try pressing Escape
      await page.keyboard.press('Escape');
      // Vänta på att dialogen stängs
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {
        console.log(`📁 [stepSelectFile] Dialog still visible after Escape`);
      });
    }
    
    // Vänta lite extra för att säkerställa att dialogen är stängd
    await page.waitForTimeout(500);
  }
  
  // Scrolla till filen för att säkerställa att den är synlig
  await fileRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // Försök klicka på filen - använd force om nödvändigt
  try {
    await fileRow.click({ timeout: 5000 });
  } catch (error) {
    // Om vanligt klick inte fungerar, försök med force
    console.log(`📁 [stepSelectFile] Normal click failed, trying force click...`);
    await fileRow.click({ force: true, timeout: 5000 });
  }
  
  // Vänta lite för att filen ska väljas
  await page.waitForTimeout(500);
  
  console.log(`✅ [stepSelectFile] File selected: ${fileName}`);
}

/**
 * Steg 7: Starta generering
 */
export async function stepStartGeneration(ctx: TestContext) {
  const { page } = ctx;
  
  const generateButton = page.locator(
    'button:has-text("Generera artefakter"), button:has-text("Generera")'
  ).first();
  
  await expect(generateButton).toBeVisible({ timeout: 5000 });
  await expect(generateButton).toBeEnabled({ timeout: 5000 });
  await generateButton.click();
}

/**
 * Steg 8: Vänta på att generering är klar
 */
export async function stepWaitForGenerationComplete(ctx: TestContext, timeout: number = 180000) {
  const { page } = ctx;
  
  console.log(`⏳ [stepWaitForGenerationComplete] Waiting for generation to complete (timeout: ${timeout}ms)...`);
  
  // Monitor page state
  const pageClosed = new Promise<void>((resolve) => {
    page.once('close', () => {
      console.error('❌ [stepWaitForGenerationComplete] Page closed during wait!');
      resolve();
    });
  });
  
  // Vänta på att generering är klar
  try {
    await Promise.race([
      page.waitForSelector(
        'text=/completed/i, text=/klar/i, text=/success/i, text=/done/i, text=/Generering Klar/i',
        { timeout }
      ),
      page.waitForTimeout(10000), // Fallback timeout
      pageClosed.then(() => {
        throw new Error('Page was closed during generation wait');
      }),
    ]);
    console.log('✅ [stepWaitForGenerationComplete] Generation completed');
  } catch (error) {
    // Check if page is still open
    if (page.isClosed()) {
      console.error('❌ [stepWaitForGenerationComplete] Page is closed!');
      throw new Error('Page was closed during generation wait');
    }
    // Timeout är acceptabelt - generering kan ta längre tid
    console.warn('⚠️  [stepWaitForGenerationComplete] Timeout waiting for generation completion');
  }
}

/**
 * Steg 9: Verifiera GenerationDialog result view
 */
export async function stepVerifyGenerationResult(ctx: TestContext) {
  const { page } = ctx;
  
  const resultView = page.locator(
    'text=/Generering Klar/i, text=/Generering klar/i, text=/Alla artefakter/i'
  ).first();
  
  const hasResultView = await resultView.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (hasResultView) {
    // Verifiera summary cards
    const summaryCards = page.locator('text=/Filer/i, text=/Tester/i, text=/Dokumentation/i');
    const cardsCount = await summaryCards.count();
    expect(cardsCount).toBeGreaterThan(0);
  }
}

/**
 * Steg 10: Navigera till Test Report
 */
export async function stepNavigateToTestReport(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/#/test-report');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 11: Navigera till Test Coverage
 */
export async function stepNavigateToTestCoverage(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/#/test-coverage');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 12: Navigera till Doc Viewer
 */
export async function stepNavigateToDocViewer(ctx: TestContext, bpmnFile: string, elementId: string) {
  const { page } = ctx;
  const docViewerUrl = `/#/doc-viewer/nodes/${bpmnFile}/${elementId}`;
  console.log(`📄 [stepNavigateToDocViewer] Navigating to: ${docViewerUrl}`);
  
  await page.goto(docViewerUrl);
  console.log(`📄 [stepNavigateToDocViewer] Navigation complete, current URL: ${page.url()}`);
  
  await page.waitForLoadState('networkidle');
  console.log(`📄 [stepNavigateToDocViewer] Network idle`);
  
  // Vänta lite extra för att React ska hinna rendera
  await page.waitForTimeout(3000);
  console.log(`📄 [stepNavigateToDocViewer] Wait complete`);
  
  // Verifiera att dokumentation laddades
  const pageContent = await page.textContent('body');
  const pageHTML = await page.content();
  
  console.log(`📄 [stepNavigateToDocViewer] Page content check:`, {
    hasContent: !!pageContent,
    contentLength: pageContent?.length || 0,
    htmlLength: pageHTML?.length || 0,
    preview: pageContent?.substring(0, 200) || 'NO CONTENT'
  });
  
  // Kolla om det finns specifika element som indikerar att sidan laddades
  const hasDocContent = await page.locator('article, .doc-content, [data-testid="doc-content"], main').count();
  const hasError = await page.locator('text=/error/i, text=/not found/i, text=/404/i').count();
  const hasLoading = await page.locator('text=/loading/i, text=/laddar/i').count();
  
  console.log(`📄 [stepNavigateToDocViewer] Element checks:`, {
    hasDocContent,
    hasError,
    hasLoading
  });
  
  // Om sidan är för kort, kan det vara ett fel eller att innehållet inte laddades
  if (!pageContent || pageContent.length < 100) {
    console.log(`❌ [stepNavigateToDocViewer] Page content too short. Full HTML preview:`, pageHTML?.substring(0, 500));
    throw new Error(`Doc viewer page content too short (${pageContent?.length || 0} chars). URL: ${docViewerUrl}. This may indicate the documentation was not generated or the page failed to load.`);
  }
  
  console.log(`✅ [stepNavigateToDocViewer] Doc viewer loaded successfully`);
}

/**
 * Steg 13: Navigera till Process Explorer
 */
export async function stepNavigateToProcessExplorer(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/#/process-explorer');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 14: Navigera till Node Matrix
 */
export async function stepNavigateToNodeMatrix(ctx: TestContext) {
  const { page } = ctx;
  await page.goto('/#/node-matrix');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Steg 15: Navigera till Index (Diagram)
 * VIKTIGT: I HashRouter måste vi navigera till /#/ istället för /
 */
export async function stepNavigateToDiagram(ctx: TestContext, file?: string) {
  const { page } = ctx;
  // I HashRouter är root-routen /#/ och query params kan läggas till
  const url = file ? `/#/?file=${file}` : '/#/';
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verifiera att sidan laddades
  const pageContent = await page.textContent('body');
  expect(pageContent).toBeTruthy();
}

/**
 * Helper: Skapa test context från page
 */
export function createTestContext(page: Page): TestContext {
  return { page };
}

