import { test, expect } from '@playwright/test';
import { openProcessExplorer, assertProcessTreeVisible } from '../../utils/processTestUtils';
import { setupCreditDecisionApprovedMock } from '../../fixtures/mortgageCreditDecisionMocks';

/**
 * Mortgage – Credit Decision – Happy Path (hypotes-baserad)
 *
 * Detta är en första Playwright-pilot som:
 * - Startar bpmn-planner-appen via dev-servern (se playwright.config.ts)
 * - Navigerar till Process Explorer-vyn där mortgage-trädet visualiseras
 * - Förbereder en mock för ett hypotetiskt kreditbesluts-API
 *
 * I nuvarande läge verifierar testet endast att processträdet syns.
 * När vi kopplar på mer detaljerad BPMN-/Feature Goal-mappning kan vi:
 * - Binda Given/When/Then från Feature Goal “Testgenerering” till konkreta UI-steg
 * - Göra asserts på vilka noder/paths som är synliga i trädet för det valda scenariot
 */

test.describe('Mortgage SE – Credit Decision – Happy Path (Playwright)', () => {
  test('FG_CREDIT_DECISION_TC01 – approved happy path (UI-skelett)', async ({ page }) => {
    // Arrange – sätt upp hypotes-baserad mock för kreditbeslut
    await setupCreditDecisionApprovedMock(page, {
      decisionVariables: {
        // Här kan vi senare stoppa in data som kommer från BPMN/Feature Goal-scenarier
        loanAmount: 3_500_000,
        propertyValue: 5_000_000,
      },
    });

    const ctx = { page };

    // Act – öppna Process Explorer som central vy för mortgage-bpmn
    await openProcessExplorer(ctx);

    // Assert – vi ser ett processträd (hypotes: mortgage-root med subprocesser)
    await assertProcessTreeVisible(ctx);

    // Minimal sanity check på sidans titel eller liknande kan läggas till vid behov.
    await expect(page).toHaveTitle(/BPMN Planner/i);
  });
});


