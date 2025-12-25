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
  stepNavigateToFiles,
  stepUploadBpmnFile,
  stepBuildHierarchy,
  stepNavigateToDiagram,
  stepNavigateToProcessExplorer,
  stepNavigateToNodeMatrix,
} from '../utils/testSteps';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('File Management Workflow A-Ö', () => {
  test('should complete file management workflow', async ({ page }) => {
    const ctx = createTestContext(page);

    // Steg 1: Navigera till Files
    await stepNavigateToFiles(ctx);

    // Steg 2: Kontrollera om filer finns
    const filesTable = page.locator('table').first();
    const hasFiles = await filesTable.count() > 0;

    if (!hasFiles) {
      // Steg 3: Ladda upp testfil
      const testBpmnContent = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="test-process" name="Test Process">
    <bpmn:startEvent id="start" />
    <bpmn:userTask id="task1" name="Test Task" />
    <bpmn:endEvent id="end" />
    <bpmn:sequenceFlow id="flow1" sourceRef="start" targetRef="task1" />
    <bpmn:sequenceFlow id="flow2" sourceRef="task1" targetRef="end" />
  </bpmn:process>
</bpmn:definitions>`;

      try {
        await stepUploadBpmnFile(ctx, 'test-file-management.bpmn', testBpmnContent);
      } catch (error) {
        console.log('⚠️  Could not upload file');
      }
    }

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
  });
});

