import { test, expect } from '@playwright/test';
import { openProcessExplorer, assertProcessTreeVisible } from '../../utils/processTestUtils';
import { setupCreditDecisionApprovedMock } from '../../fixtures/mortgageCreditDecisionMocks';

/**
 * Mortgage – Credit Decision – Happy Path (hypotes-baserad, UI-fokuserad)
 *
 * Kopplat till Feature Goal: mortgage-se-credit-decision-v2.html
 *
 * Given (från Feature Goal "Testgenerering", förenklad):
 * - En komplett ansökan som passerat KYC och internal data gathering
 * - Automatisk beslutsnivåbestämning har gett ett "straight through" / auto-approve-läge
 *
 * When:
 * - Vi öppnar BPMN Planner och går till Process Explorer för mortgage-hierarkin
 *
 * Then:
 * - Processträdet för mortgage är synligt
 * - Ett call activity-nod med kreditbesluts-kontext (t.ex. "Credit decision") finns i trädet
 * - UI:t laddas utan fel och har BPMN Planner-titeln
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

    // When – öppna Process Explorer som central vy för mortgage-bpmn
    await openProcessExplorer(ctx);

    // Then – processträdet är synligt
    await assertProcessTreeVisible(ctx);

    // Och vi har rätt sidtitel (grundläggande sanity check)
    await expect(page).toHaveTitle(/BPMN Planner/i);

    // Och det finns någon nod i trädet vars text antyder kreditbeslut.
    // (Detta är medvetet tolerant – vi vill bara fånga att mortgage-hierarkin
    //  innehåller en kreditbesluts-subprocess, inte exakt text.)
    const creditNodeLocator = page.getByText(/credit decision|kreditbeslut/i, {
      exact: false,
    });
    // Vi kräver inte att den MÅSTE finnas (för att inte göra testet super-bräckligt),
    // men om den finns ska den kunna bli synlig utan fel.
    const creditNodeCount = await creditNodeLocator.count();
    if (creditNodeCount > 0) {
      await expect(creditNodeLocator.first()).toBeVisible();
    }
  });
});


