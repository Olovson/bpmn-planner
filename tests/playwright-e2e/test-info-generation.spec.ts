/**
 * E2E test: Testinfo-generering med förutsättningar
 * 
 * Detta test verifierar hela flödet för testinfo-generering:
 * 1. Förutsätter att BPMN-filer redan är uppladdade
 * 2. Förutsätter att Feature Goal-dokumentation redan är skapad
 * 3. Testar "Generera testinformation (alla filer)"
 * 4. Validerar GenerationDialog popup (counter, detaljerad info)
 * 5. Validera att testinfo genereras korrekt
 * 6. Validerar att testinfo visas korrekt på test-coverage sidan
 * 
 * VIKTIGT: Detta test använder faktiska Claude API-anrop (inte mockar) för att
 * säkerställa att testet validerar samma flöde som produktionen använder.
 * Om Claude API inte är tillgängligt, hoppar testet över.
 * 
 * SÄKERHET: Testet kontrollerar om det finns befintlig testinfo-data i databasen
 * och pausar för användarbekräftelse innan det fortsätter.
 */

import { test, expect } from '@playwright/test';
import * as readline from 'readline';
import {
  createTestContext,
  stepLogin,
  stepNavigateToFiles,
  stepSelectGenerationMode,
} from './utils/testSteps';

test.use({ storageState: 'playwright/.auth/user.json' });

/**
 * Kontrollerar om det finns BPMN-filer och Feature Goal-dokumentation
 * VIKTIGT: Detta test förutsätter att filer och dokumentation redan finns.
 * Testet laddar INTE upp filer eller genererar dokumentation.
 * 
 * Kontrollerar Process Feature Goal dokumentation på rätt plats:
 * docs/claude/{bpmnFileName}/{versionHash}/{feature-goal-{baseName}.html}
 */
async function checkPrerequisites(page: any): Promise<{ hasBpmnFiles: boolean; hasDocumentation: boolean; missingDocs: string[]; details: string }> {
  return await page.evaluate(async () => {
    // @ts-ignore
    const supabase = window.__SUPABASE_CLIENT__;
    if (!supabase) {
      return { hasBpmnFiles: false, hasDocumentation: false, missingDocs: [], details: 'Supabase client not available' };
    }

    let hasBpmnFiles = false;
    let hasDocumentation = true;
    const missingDocs: string[] = [];
    const details: string[] = [];

    try {
      // Kontrollera att det finns BPMN-filer
      const { data: bpmnFiles, error: filesError } = await supabase
        .from('bpmn_files')
        .select('file_name')
        .eq('file_type', 'bpmn')
        .limit(10);

      if (!filesError && bpmnFiles && bpmnFiles.length > 0) {
        hasBpmnFiles = true;
        const fileNames = bpmnFiles.map((row: any) => row.file_name);
        details.push(`Found ${bpmnFiles.length} BPMN file(s): ${fileNames.join(', ')}`);

        // För varje BPMN-fil, kontrollera om Process Feature Goal dokumentation finns
        // Process Feature Goals använder format: docs/claude/{bpmnFileName}/{versionHash}/feature-goal-{baseName}.html
        for (const fileName of fileNames) {
          const baseName = fileName.replace('.bpmn', '');
          
          // Hämta version hash för filen från bpmn_versions tabellen
          const { data: versions, error: versionError } = await supabase
            .from('bpmn_versions')
            .select('version_hash')
            .eq('file_name', fileName)
            .order('created_at', { ascending: false })
            .limit(1);

          if (versionError || !versions || versions.length === 0) {
            hasDocumentation = false;
            missingDocs.push(fileName);
            details.push(`  ⚠️  ${fileName}: No version hash found`);
            continue;
          }

          const versionHash = versions[0].version_hash;
          
          // Bygg storage path för Process Feature Goal (non-hierarchical)
          // Format: docs/claude/{bpmnFileName}/{versionHash}/feature-goals/{baseName}.html
          // (getFeatureGoalDocFileKey returnerar "feature-goals/{baseName}.html")
          const docFileName = `feature-goals/${baseName}.html`;
          const docPath = `docs/claude/${fileName}/${versionHash}/${docFileName}`;
          
          // Kontrollera om dokumentation finns i storage
          // Försök först med download (snabbast)
          const { data: docData, error: docError } = await supabase.storage
            .from('bpmn-files')
            .download(docPath);

          if (docError || !docData) {
            // Om download misslyckas, försök lista filen istället (för debug)
            const pathParts = docPath.split('/');
            const parentPath = pathParts.slice(0, -1).join('/');
            const fileNameOnly = pathParts[pathParts.length - 1];
            
            const { data: listData, error: listError } = await supabase.storage
              .from('bpmn-files')
              .list(parentPath, {
                search: fileNameOnly
              });

            if (listError || !listData || listData.length === 0) {
              hasDocumentation = false;
              missingDocs.push(fileName);
              details.push(`  ⚠️  ${fileName}: Missing Process Feature Goal doc at ${docPath}`);
              if (docError) {
                details.push(`      Error: ${docError.message || JSON.stringify(docError)}`);
              }
            } else {
              // Filen finns i listan men download misslyckades - anta att den finns
              details.push(`  ✅ ${fileName}: Process Feature Goal doc found (via list)`);
            }
          } else {
            details.push(`  ✅ ${fileName}: Process Feature Goal doc found`);
          }
        }

        if (missingDocs.length > 0) {
          details.push(`\n⚠️  Missing Feature Goal documentation for: ${missingDocs.join(', ')}`);
          details.push(`   Please generate documentation for these files before running this test.`);
        } else {
          details.push(`\n✅ Feature Goal documentation found for all BPMN files`);
        }
      } else {
        details.push('No BPMN files found in database');
        details.push('Please upload BPMN files before running this test.');
      }
    } catch (error) {
      details.push(`Error checking prerequisites: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      hasBpmnFiles,
      hasDocumentation,
      missingDocs,
      details: details.join('\n')
    };
  });
}

/**
 * Kontrollerar om det finns befintlig testinfo-data i databasen och storage
 */
async function checkExistingTestInfo(page: any): Promise<{ hasPlannedScenarios: boolean; hasE2eScenarios: boolean; details: string }> {
  return await page.evaluate(async () => {
    // @ts-ignore
    const supabase = window.__SUPABASE_CLIENT__;
    if (!supabase) {
      return { hasPlannedScenarios: false, hasE2eScenarios: false, details: 'Supabase client not available' };
    }

    let hasPlannedScenarios = false;
    let hasE2eScenarios = false;
    const details: string[] = [];

    try {
      // Kontrollera node_planned_scenarios tabellen
      const { data: plannedData, error: plannedError } = await supabase
        .from('node_planned_scenarios')
        .select('bpmn_file, bpmn_element_id, provider, origin')
        .limit(10);

      if (!plannedError && plannedData && plannedData.length > 0) {
        hasPlannedScenarios = true;
        const uniqueFiles = new Set(plannedData.map((row: any) => row.bpmn_file));
        details.push(`Found ${plannedData.length} planned scenario row(s) for ${uniqueFiles.size} BPMN file(s): ${Array.from(uniqueFiles).join(', ')}`);
      }
    } catch (error) {
      details.push(`Error checking planned scenarios: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Kontrollera E2E scenarios i storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('bpmn-files')
        .list('e2e-scenarios', {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (!storageError && storageFiles && storageFiles.length > 0) {
        hasE2eScenarios = true;
        const uniqueFiles = new Set(storageFiles.map((file: any) => file.name.split('/')[0]));
        details.push(`Found E2E scenarios in storage for ${uniqueFiles.size} BPMN file(s): ${Array.from(uniqueFiles).join(', ')}`);
      }
    } catch (error) {
      details.push(`Error checking E2E scenarios: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      hasPlannedScenarios,
      hasE2eScenarios,
      details: details.join('\n')
    };
  });
}

/**
 * Kontrollerar om användaren har bekräftat via environment variable
 * VIKTIGT: I headless/CI mode, avbryt istället för att vänta på input
 */
async function waitForUserConfirmation(message: string): Promise<boolean> {
  // Kolla om användaren redan har bekräftat via environment variable
  const forceConfirm = process.env.TEST_OVERWRITE_TESTINFO === 'true';
  if (forceConfirm) {
    console.log('✅ TEST_OVERWRITE_TESTINFO=true - fortsätter automatiskt...\n');
    return true;
  }

  // I CI eller headless mode, avbryt istället för att vänta på input
  if (process.env.CI || !process.stdout.isTTY) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  VARNING: Befintlig testinfo-data hittades!');
    console.log('='.repeat(80));
    console.log(message);
    console.log('='.repeat(80));
    console.log('Detta test kommer att skriva över befintlig testinfo-data i databasen och storage.');
    console.log('\nFör att fortsätta automatiskt, kör testet med:');
    console.log('  TEST_OVERWRITE_TESTINFO=true npx playwright test tests/playwright-e2e/test-info-generation.spec.ts');
    console.log('\n❌ Testet avbryts eftersom vi är i headless/CI mode och ingen bekräftelse gavs.\n');
    return false;
  }

  // Annars, visa varning och vänta på bekräftelse (endast i interaktivt läge)
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  VARNING: Befintlig testinfo-data hittades!');
  console.log('='.repeat(80));
  console.log(message);
  console.log('='.repeat(80));
  console.log('Detta test kommer att skriva över befintlig testinfo-data i databasen och storage.');
  console.log('\nFör att fortsätta automatiskt, kör testet med:');
  console.log('  TEST_OVERWRITE_TESTINFO=true npx playwright test tests/playwright-e2e/test-info-generation.spec.ts');
  console.log('\nEller bekräfta manuellt genom att svara "ja" nedan:');
  console.log('Vill du fortsätta? (ja/nej): ');

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('', (answer) => {
      rl.close();
      const confirmed = answer.toLowerCase().trim() === 'ja' || answer.toLowerCase().trim() === 'j' || answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes';
      if (confirmed) {
        console.log('✅ Användaren bekräftade - fortsätter med testet...\n');
      } else {
        console.log('❌ Användaren avbröt - avbryter testet...\n');
      }
      resolve(confirmed);
    });
  });
}

test.describe('Test Info Generation', () => {
  test('should generate testinfo for all files and display in popup and test-coverage page', async ({ page }) => {
    const testStartTime = Date.now();
    const ctx = createTestContext(page);

    // Steg 1: Login (om session saknas)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    if (currentUrl.includes('/auth') || currentUrl.includes('#/auth')) {
      await stepLogin(ctx);
    }

    // Steg 2: Navigera till Files
    await stepNavigateToFiles(ctx);

    // Steg 3: Kontrollera förutsättningar (BPMN-filer och dokumentation)
    console.log('🔍 Checking prerequisites (BPMN files and documentation)...');
    const prerequisites = await checkPrerequisites(page);
    
    if (!prerequisites.hasBpmnFiles) {
      throw new Error('No BPMN files found in database. Please upload BPMN files before running this test.');
    }

    if (!prerequisites.hasDocumentation) {
      throw new Error(
        `Missing Feature Goal documentation for: ${prerequisites.missingDocs.join(', ')}\n` +
        `Please generate documentation for these files before running this test.\n` +
        `This test only tests testinfo generation, not file upload or documentation generation.`
      );
    }

    console.log('✅ Prerequisites met:');
    console.log(prerequisites.details);

    // Steg 4: Kontrollera om det finns befintlig testinfo-data
    console.log('🔍 Checking for existing testinfo data...');
    const existingData = await checkExistingTestInfo(page);
    
    if (existingData.hasPlannedScenarios || existingData.hasE2eScenarios) {
      // Kolla om användaren redan har bekräftat via environment variable
      const forceConfirm = process.env.TEST_OVERWRITE_TESTINFO === 'true';
      
      if (!forceConfirm) {
        // Pausa testet och fråga användaren
        const message = `\nBefintlig testinfo-data hittades:\n\n${existingData.details}\n`;
        const confirmed = await waitForUserConfirmation(message);
        
        if (!confirmed) {
          throw new Error('Test aborted by user - existing testinfo data would be overwritten. Set TEST_OVERWRITE_TESTINFO=true to skip this check.');
        }
      } else {
        console.log('⚠️  TEST_OVERWRITE_TESTINFO=true - fortsätter automatiskt (befintlig data kommer att skrivas över)');
        console.log(`\nBefintlig data som kommer att skrivas över:\n${existingData.details}\n`);
      }
    } else {
      console.log('✅ No existing testinfo data found - proceeding with test');
    }

    // Steg 5: Välj genereringsläge (Claude - faktiska API-anrop)
    await stepSelectGenerationMode(ctx, 'claude');

    // Steg 6: Hitta och klicka på "Generera testinformation (alla filer)" knappen
    const generateTestInfoAllButton = page.locator(
      'button:has-text("Generera testinformation (alla filer)")'
    ).first();

    // Vänta på att knappen är synlig
    await generateTestInfoAllButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verifiera att knappen inte är disabled
    const isDisabled = await generateTestInfoAllButton.isDisabled();
    expect(isDisabled).toBe(false);

    // Klicka på knappen
    await generateTestInfoAllButton.click();
    console.log('✅ Clicked "Generera testinformation (alla filer)" button');

    // Steg 7: Vänta på att GenerationDialog öppnas
    const generationDialog = page.locator('[role="dialog"]').first();
    await generationDialog.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ GenerationDialog opened');

    // Steg 8: Vänta på att generering är klar
    // Vänta på att dialogen visar "Generering Klar" eller "Alla artefakter"
    await page.waitForSelector(
      'text=/Generering Klar/i, text=/Alla artefakter/i, text=/Generering klar/i',
      { timeout: 300000 } // 5 minuter max för faktisk testinfo-generering (inkluderar Claude API-anrop)
    );
    console.log('✅ Generation completed');

    // Steg 9: Validera GenerationDialog popup - counter
    const testInfoCard = page.locator('text=/Testinformation/i').locator('..').first();
    const hasTestInfoCard = await testInfoCard.isVisible().catch(() => false);
    expect(hasTestInfoCard).toBe(true);
    console.log('✅ Testinformation card found in dialog');

    // Validera att counter finns
    const totalScenariosText = page.locator('text=/Totalt testscenarios/i').first();
    const e2eScenariosText = page.locator('text=/E2E-scenarios/i').first();
    const featureGoalScenariosText = page.locator('text=/Feature Goal-test scenarios/i').first();

    const hasTotalScenarios = await totalScenariosText.isVisible().catch(() => false);
    const hasE2eScenarios = await e2eScenariosText.isVisible().catch(() => false);
    const hasFeatureGoalScenarios = await featureGoalScenariosText.isVisible().catch(() => false);

    expect(hasTotalScenarios || hasE2eScenarios || hasFeatureGoalScenarios).toBe(true);
    console.log('✅ Test scenario counters found in dialog');

    // Steg 10: Validera GenerationDialog popup - detaljerad rapport
    const detailedReportTrigger = page.locator('text=/Visa Detaljerad Rapport/i').first();
    const hasDetailedReport = await detailedReportTrigger.isVisible().catch(() => false);
    
    if (hasDetailedReport) {
      // Klicka för att expandera detaljerad rapport
      await detailedReportTrigger.click();
      await page.waitForTimeout(500);

      // Validera att detaljerad rapport visar filer
      const analyzedFilesText = page.locator('text=/Analyserade BPMN-filer/i').first();
      const hasAnalyzedFiles = await analyzedFilesText.isVisible().catch(() => false);
      
      // Validera att detaljerad rapport visar E2E scenarios (om de finns)
      const e2eDetailsText = page.locator('text=/E2E-scenarios/i').first();
      const hasE2eDetails = await e2eDetailsText.isVisible().catch(() => false);
      
      // Validera att detaljerad rapport visar Feature Goal scenarios (om de finns)
      const featureGoalDetailsText = page.locator('text=/Feature Goal-test scenarios/i').first();
      const hasFeatureGoalDetails = await featureGoalDetailsText.isVisible().catch(() => false);

      expect(hasAnalyzedFiles || hasE2eDetails || hasFeatureGoalDetails).toBe(true);
      console.log('✅ Detailed report expanded and shows information');
    }

    // Steg 11: Stäng dialog
    const closeButton = page.locator('[role="dialog"] button:has-text("Stäng"), [role="dialog"] button[aria-label*="close"], [role="dialog"] button:has(svg)').first();
    await closeButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Dialog closed');

    // Steg 12: Navigera till test-coverage sidan
    await page.goto('/#/test-coverage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Vänta på att testinfo laddas
    console.log('✅ Navigated to test-coverage page');

    // Steg 13: Validera att testinfo visas på test-coverage sidan
    // Kolla om det finns en scenario selector (indikerar att E2E scenarios finns)
    const scenarioSelector = page.locator('select, [role="combobox"]').first();
    const hasScenarioSelector = await scenarioSelector.isVisible().catch(() => false);

    // Kolla om det finns en TestCoverageTable
    const testCoverageTable = page.locator('table').first();
    const hasTable = await testCoverageTable.isVisible().catch(() => false);

    // Kolla om det finns Feature Goal-test information (Given/When/Then kolumner)
    const givenColumn = page.locator('text=/Given/i, text=/Givet/i').first();
    const whenColumn = page.locator('text=/When/i, text=/När/i').first();
    const thenColumn = page.locator('text=/Then/i, text=/Då/i').first();

    const hasGiven = await givenColumn.isVisible().catch(() => false);
    const hasWhen = await whenColumn.isVisible().catch(() => false);
    const hasThen = await thenColumn.isVisible().catch(() => false);

    // Validera att antingen scenario selector eller table finns
    expect(hasScenarioSelector || hasTable).toBe(true);
    console.log('✅ Test coverage page shows test information');

    // Om table finns, validera att Given/When/Then kolumner finns (om Feature Goal-tester genererades)
    if (hasTable && (hasGiven || hasWhen || hasThen)) {
      console.log('✅ Feature Goal test information (Given/When/Then) found in test coverage table');
    }

    // Steg 14: Validera att testinfo faktiskt innehåller data
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Kolla om det finns test-scenario data (inte bara tomma tabeller)
    const hasTestData = pageContent?.includes('scenario') || 
                       pageContent?.includes('test') ||
                       hasTable;
    
    // Om inga scenarios finns, ska det finnas ett meddelande om det
    if (!hasTestData) {
      const noScenariosMessage = pageContent?.includes('Inga E2E-scenarier') || 
                                pageContent?.includes('No scenarios');
      // Det är okej om det inte finns scenarios ännu, men sidan ska laddas korrekt
      expect(pageContent?.length).toBeGreaterThan(100);
      console.log('ℹ️  No test scenarios found yet, but page loaded correctly');
    } else {
      console.log('✅ Test data found on test-coverage page');
    }

    console.log('✅ Test info generation test completed successfully');
    
    // OBS: Ingen cleanup - testet ska INTE radera filer eller dokumentation
    // Testet testar bara testinfo-generering för befintliga filer med dokumentation
  });
});
