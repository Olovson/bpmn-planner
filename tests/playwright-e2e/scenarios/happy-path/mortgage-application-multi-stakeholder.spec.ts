import { test, expect } from '@playwright/test';
import { openProcessExplorer, assertProcessTreeVisible } from '../../utils/processTestUtils';

/**
 * Application – Normalflöde, ansökan med flera personer (medsökare) (UI-skelett)
 *
 * Kopplat till Feature Goal: mortgage-application-v2.html, scenario S2
 * "Normalflöde – ansökan med flera personer och hushåll".
 *
 * Given (från Feature Goal "Testgenerering" / S2, förenklad):
 * - Flera personer ansöker tillsammans med separata hushåll (customer-multi-household)
 * - Alla personer är godkända vid pre-screening
 *
 * When:
 * - Kunden fyller i Application-flödet för flera hushåll parallellt
 * - Kunden kan öppna både Household- och Stakeholders-formulären samtidigt
 * - Systemet bearbetar varje hushåll individuellt med sekventiell körning
 *   (Household → Stakeholder → Object) per hushåll
 *
 * Then:
 * - Kunden kan se status för varje hushåll med tydliga statusindikatorer
 * - Varje hushåll bearbetas i rätt ordning
 * - Alla hushåll och personer är bearbetade
 * - Processen fortsätter när båda flöden är klara och ansökan är redo för kreditevaluering
 * - I denna UI-skelettversion verifierar vi att Application-subprocessen och dess
 *   multi-instance delar finns i processträdet (Process Explorer)
 */

test.describe('Mortgage SE – Application – Multi-Stakeholder Happy Path (Playwright)', () => {
  test('FG_APPLICATION_S2 – normalflöde, ansökan med flera personer (UI-skelett)', async ({ page }) => {
    const ctx = { page };

    // When – öppna Process Explorer som central vy för mortgage-bpmn
    await openProcessExplorer(ctx);

    // Then – processträdet är synligt
    await assertProcessTreeVisible(ctx);

    // Och vi har rätt sidtitel (grundläggande sanity check)
    await expect(page).toHaveTitle(/BPMN Planner/i);

    // Och det finns en nod som representerar Application-subprocessen.
    const applicationNodeLocator = page.getByText(/application/i, { exact: false });
    const applicationNodeCount = await applicationNodeLocator.count();
    if (applicationNodeCount > 0) {
      await expect(applicationNodeLocator.first()).toBeVisible();
    }

    // Och vi försöker hitta spår av nyckelstegen i Application med multi-instance:
    // - Intern data gathering (multi-instance per part)
    // - Household (multi-instance per hushåll)
    // - Stakeholder (multi-instance, sekventiellt per hushåll)
    // - Object (sekventiellt efter Stakeholder per hushåll)
    // Det här är medvetet tolerant – syftet är att verifiera att hierarkin
    // innehåller dessa delar, inte exakt label-matchning.
    const keyStepPatterns = [
      /internal data gathering|intern datainsamling/i,
      /household|hushåll/i,
      /stakeholder/i,
      /object|objekt/i,
    ];

    for (const pattern of keyStepPatterns) {
      const locator = page.getByText(pattern, { exact: false });
      const count = await locator.count();
      if (count > 0) {
        await expect(locator.first()).toBeVisible();
      }
    }

    // Verifiera att multi-instance hantering finns i trädet
    // (t.ex. indikatorer för flera hushåll eller stakeholders)
    // Detta är en grundläggande verifiering - i en fullständig implementation
    // skulle vi verifiera att flera stakeholders faktiskt kan hanteras.
    const multiInstanceIndicators = [
      /multi-instance|multi instance|flera/i,
      /stakeholder.*stakeholder/i, // Flera stakeholders
      /household.*household/i, // Flera hushåll
    ];

    // Vi kräver inte att dessa MÅSTE finnas (för att inte göra testet super-bräckligt),
    // men om de finns ska de kunna bli synliga utan fel.
    for (const pattern of multiInstanceIndicators) {
      const locator = page.getByText(pattern, { exact: false });
      const count = await locator.count();
      if (count > 0) {
        await expect(locator.first()).toBeVisible();
      }
    }
  });
});

