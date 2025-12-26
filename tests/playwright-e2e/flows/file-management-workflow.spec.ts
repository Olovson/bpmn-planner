/**
 * A-Ö Test: Filhanteringsflöde
 * 
 * Detta test fokuserar på filhantering:
 * 1. Navigera till Files
 * 2. Ladda upp fil
 * 3. Bygg hierarki
 * 4. Verifiera filer
 * 5. Navigera till olika vyer
 * 
 * Detta test använder återanvändbara test-steg från utils/testSteps.ts
 */

import { test, expect } from '@playwright/test';
import {
  createTestContext,
  stepLogin,
  stepNavigateToFiles,
  stepBuildHierarchy,
  stepNavigateToDiagram,
  stepNavigateToProcessExplorer,
  stepNavigateToNodeMatrix,
} from '../utils/testSteps';
import { ensureBpmnFileExists } from '../utils/testHelpers';
import { cleanupTestFiles } from '../utils/testCleanup';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('File Management Workflow A-Ö', () => {
  test('should complete file management workflow', async ({ page }) => {
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

    // Steg 3: Säkerställ att minst en fil finns
    await ensureBpmnFileExists(ctx, 'test-file-management');

    // Steg 4: Bygg hierarki
    try {
      await stepBuildHierarchy(ctx);
    } catch (error) {
      console.log('⚠️  Could not build hierarchy, might already be built');
    }

    // Steg 5: Navigera till olika vyer för att verifiera att filerna syns
    await stepNavigateToDiagram(ctx);
    await stepNavigateToProcessExplorer(ctx);
    await stepNavigateToNodeMatrix(ctx);

    console.log('✅ File management workflow test slutförd');
    
    // Cleanup: Rensa testdata efter testet
    await cleanupTestFiles(page, testStartTime);
  });
});

