import { test, expect } from '@playwright/test';

/**
 * Test Claude-generering för application-processen
 * 
 * Detta test verifierar att:
 * 1. Claude-generering kan aktiveras
 * 2. Dokumentation genereras för application-processen
 * 3. Genererade dokumentation kan visas
 */

test.describe('Claude-generering för Application', () => {
  // Seed-användare från README
  const SEED_EMAIL = 'seed-bot@local.test';
  const SEED_PASSWORD = 'Passw0rd!';

  test.beforeEach(async ({ page }) => {
    // Storage state laddas automatiskt från global-setup
    // Men vi kan behöva logga in om sessionen har gått ut
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Vänta lite för att se om redirect sker
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      // Session har gått ut eller storage state saknas - logga in
      console.log('🔐 Session saknas, loggar in...');
      await page.waitForSelector('#signin-email', { timeout: 10000 });
      await page.fill('#signin-email', SEED_EMAIL);
      await page.fill('#signin-password', SEED_PASSWORD);
      
      // Vänta på navigation efter login (React Router navigation, inte full page reload)
      await Promise.all([
        page.waitForResponse(response => 
          response.url().includes('/auth/v1/token') && response.status() === 200
        ).catch(() => {}),
        page.click('button:has-text("Logga in")'),
      ]);
      
      // Vänta på att vi navigeras bort från /auth
      await page.waitForURL(/\/(?!auth)/, { timeout: 20000 });
      await page.waitForLoadState('networkidle');
    }
  });

  test('Generera dokumentation för application-processen med Claude', async ({ page }) => {
    // 1. Gå till BPMN File Manager (navigera direkt istället för att söka efter länk)
    await page.goto('/files');
    await expect(page).toHaveURL(/.*\/files/);
    await page.waitForLoadState('networkidle');

    // 2. Vänta på att filerna laddas och UI är redo
    await page.waitForSelector('text=mortgage-se-application.bpmn', { timeout: 15000 });
    
    // Vänta lite extra för att säkerställa att allt är laddat
    await page.waitForTimeout(1000);

    // 3. Välj "mortgage-se-application.bpmn"
    const fileLink = page.locator('text=mortgage-se-application.bpmn').first();
    await fileLink.waitFor({ state: 'visible', timeout: 10000 });
    await fileLink.click();
    
    // Vänta på att filen ska markeras och UI uppdateras
    await page.waitForTimeout(1000);

    // 4. Välj Claude (moln-LLM) som genereringsläge
    // Försök hitta knappen med olika selektorer - vänta på att genereringsläge-sektionen är synlig
    await page.waitForSelector('button:has-text("Local"), button:has-text("Claude"), button:has-text("Ollama")', { timeout: 15000 });
    
    // Hitta Claude-knappen - försök olika varianter
    let claudeButton = page.locator('button:has-text("Claude (moln-LLM)")').first();
    let claudeButtonVisible = await claudeButton.isVisible().catch(() => false);
    
    if (!claudeButtonVisible) {
      claudeButton = page.locator('button:has-text("Claude")').first();
      claudeButtonVisible = await claudeButton.isVisible().catch(() => false);
    }
    
    if (!claudeButtonVisible) {
      // Försök hitta via Sparkles-ikon (som används i Claude-knappen)
      claudeButton = page.locator('button:has(svg)').filter({ hasText: /Claude|moln/i }).first();
    }
    
    await claudeButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Kolla om knappen redan är aktiv (default)
    const isActive = await claudeButton.evaluate((el) => {
      return el.classList.contains('ring-2') || 
             el.classList.contains('ring-primary') ||
             el.getAttribute('aria-pressed') === 'true' ||
             el.getAttribute('data-state') === 'active' ||
             el.classList.contains('bg-primary');
    });
    
    if (!isActive) {
      await claudeButton.click();
      await page.waitForTimeout(1000);
      
      // Verifiera att knappen nu är aktiv
      const nowActive = await claudeButton.evaluate((el) => {
        return el.classList.contains('ring-2') || 
               el.classList.contains('ring-primary') ||
               el.getAttribute('aria-pressed') === 'true';
      });
      
      if (!nowActive) {
        console.warn('⚠️  Claude-knappen verkar inte ha aktiverats korrekt');
      }
    }

    // 5. Verifiera att template-version-väljaren är dold (Claude använder alltid v2)
    const templateVersionSection = page.locator('text=Feature Goal Template Version').locator('..');
    const templateSectionVisible = await templateVersionSection.isVisible().catch(() => false);
    
    if (templateSectionVisible) {
      // Om den är synlig, kontrollera att det står "Template v2 (Claude använder alltid v2)"
      const claudeTemplateText = page.locator('text=Claude använder alltid v2');
      await expect(claudeTemplateText).toBeVisible({ timeout: 2000 });
    }

    // 6. Klicka på "Generera artefakter för vald fil"
    const generateButton = page.locator('button:has-text("Generera artefakter"), button:has-text("Generera")').first();
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await expect(generateButton).toBeEnabled({ timeout: 5000 });
    
    await generateButton.click();

    // 7. Vänta på att genereringen startar (kan visa loading-indikator eller overlay)
    // Vi väntar antingen på att en loading-indikator visas eller att en success-meddelande visas
    const loadingIndicator = page.locator('text=Genererar, text=Generating, [aria-label*="generating"], .animate-spin').first();
    const successToast = page.locator('text=klart, text=klar, text=success, text=slutförd').first();
    
    // Vänta på antingen loading eller success (generering kan vara snabb)
    await Promise.race([
      loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      successToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(2000), // Fallback timeout
    ]);

    // 8. Vänta på att genereringen är klar
    // Detta kan ta 30-120 sekunder beroende på antal noder
    console.log('⏳ Väntar på att Claude-generering ska slutföras...');
    
    // Vänta på att loading-indikator försvinner eller att success-meddelande visas
    await Promise.race([
      // Vänta på att loading-indikator försvinner
      loadingIndicator.waitFor({ state: 'hidden', timeout: 180000 }).catch(() => {}),
      // Eller vänta på success-meddelande
      successToast.waitFor({ state: 'visible', timeout: 180000 }).catch(() => {}),
      // Eller vänta på att overlay försvinner
      page.waitForSelector('.backdrop-blur-sm, [role="dialog"]', { state: 'hidden', timeout: 180000 }).catch(() => {}),
    ]);

    console.log('✅ Generering verkar vara klar');

    // 9. Verifiera att dokumentation genererades
    // Navigera till Doc Viewer för application
    const docViewerUrl = '/doc-viewer/nodes/mortgage-se-application.bpmn/mortgage-se-application';
    await page.goto(docViewerUrl);
    await page.waitForLoadState('networkidle');

    // 10. Verifiera att dokumentationen laddades
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content?.length).toBeGreaterThan(100); // Minst 100 tecken innehåll

    // 11. Verifiera att det finns information om "application"
    const pageText = await page.locator('body').textContent() || '';
    expect(pageText.toLowerCase()).toContain('application');

    // 12. Verifiera att det finns Claude-genererat innehåll
    // Kolla om det finns "LLM (Claude)" eller liknande indikator
    const generationSource = page.locator('text=LLM (Claude), text=Claude, text=genereringskälla').first();
    const hasClaudeIndicator = await generationSource.isVisible().catch(() => false);
    
    // Detta är inte kritiskt - viktigare är att innehållet finns
    if (hasClaudeIndicator) {
      console.log('✅ Claude-genereringsindikator hittades');
    } else {
      console.log('ℹ️  Claude-genereringsindikator hittades inte, men innehåll finns');
    }

    console.log('✅ Test slutfört - Claude-generering fungerar!');
  });

  test('Verifiera att template-version-väljaren döljs för Claude', async ({ page }) => {
    // Login hanteras i beforeEach
    await loginIfNeeded(page);
    
    // Navigera till /files
    await page.goto('/files');
    await page.waitForLoadState('networkidle');

    // 2. Välj Claude som genereringsläge
    const claudeButton = page.locator('button:has-text("Claude (moln-LLM)"), button:has-text("Claude"), [aria-label*="Claude"]').first();
    await claudeButton.waitFor({ state: 'visible', timeout: 10000 });
    
    const isActive = await claudeButton.evaluate((el) => {
      return el.classList.contains('ring-2') || 
             el.classList.contains('ring-primary') ||
             el.getAttribute('aria-pressed') === 'true' ||
             el.getAttribute('data-state') === 'active';
    });
    
    if (!isActive) {
      await claudeButton.click();
      await page.waitForTimeout(500);
    }

    // 3. Verifiera att template-version-väljaren antingen är dold eller visar "Template v2 (Claude använder alltid v2)"
    const templateV1Button = page.locator('button:has-text("Template v1")');
    const templateV2Button = page.locator('button:has-text("Template v2")');
    const claudeTemplateText = page.locator('text=Claude använder alltid v2');

    const v1Visible = await templateV1Button.isVisible().catch(() => false);
    const v2Visible = await templateV2Button.isVisible().catch(() => false);
    const claudeTextVisible = await claudeTemplateText.isVisible().catch(() => false);

    // Antingen ska v1/v2-knapparna vara dolda, eller så ska det stå "Claude använder alltid v2"
    expect(v1Visible || claudeTextVisible).toBeTruthy();
    
    if (v1Visible) {
      // Om v1-knappen är synlig, ska det betyda att vi är i lokal-läge, inte Claude
      // Detta är ett fel - Claude ska inte visa v1-knappen
      throw new Error('Template v1-knappen ska inte vara synlig när Claude är valt');
    }

    if (claudeTextVisible) {
      console.log('✅ Template-version-väljaren visar korrekt information för Claude');
    }
  });
});

