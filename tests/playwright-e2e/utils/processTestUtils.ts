import type { Page } from '@playwright/test';

/**
 * Minimal util-helpers för Playwright-baserade, BPMN-/Feature Goal-drivna tester.
 *
 * Dessa helpers är medvetet UI-fokuserade (inte Camunda-processinstanser)
 * och ska fungera som brygga mellan:
 * - BPMN-scenarier (vilka noder/paths vi vill gå igenom)
 * - Feature Goal “Testgenerering” (Given-When-Then)
 * - Faktiska UI-steg i bpmn-planner-appen.
 *
 * All logik här ska vara tunn och deklarativ – ingen duplicerad produktionslogik.
 */

export interface UiProcessContext {
  page: Page;
}

/**
 * Navigerar till Process Explorer-vyn som är central för mortgage-flödet.
 * Använder HashRouter-pathen `#/process-explorer`.
 */
export async function openProcessExplorer(ctx: UiProcessContext) {
  const { page } = ctx;

  // Gå direkt till Process Explorer (HashRouter).
  await page.goto('/#/process-explorer');

  // Vänta tills minst någon form av root-container finns.
  await page.waitForSelector('.flex.min-h-screen.bg-background.overflow-hidden.pl-16', {
    state: 'attached',
  });
}

/**
 * Enkel "assert" att ett processträd faktiskt är renderat i vyn.
 * Detta motsvarar ett väldigt grundläggande "Then"-steg:
 * - "Then process-trädet för mortgage är synligt i UI".
 */
export async function assertProcessTreeVisible(ctx: UiProcessContext) {
  const { page } = ctx;

  // ProcessTreeD3 renderar en SVG-baserad trädvy; vi letar efter minst ett <svg>-element.
  const svg = await page.locator('svg').first();
  await svg.waitFor({ state: 'visible' });
}

/**
 * Verifierar att en BPMN-nod finns i processträdet (tolerant matchning).
 * Används för att verifiera att specifika process-steg finns i trädet.
 *
 * @param ctx - UI context
 * @param patterns - Array av regex-mönster eller strängar att söka efter
 * @param options - Optional: strict (kräv att alla patterns finns) eller optional (ingen krav)
 * @returns true om minst ett pattern hittades, annars false
 */
export async function assertBpmnNodeExists(
  ctx: UiProcessContext,
  patterns: (string | RegExp)[],
  options: { strict?: boolean } = { strict: false }
): Promise<boolean> {
  const { page } = ctx;
  let foundCount = 0;

  for (const pattern of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    const locator = page.getByText(regex, { exact: false });
    const count = await locator.count();

    if (count > 0) {
      foundCount++;
      await expect(locator.first()).toBeVisible();
    }
  }

  if (options.strict && foundCount < patterns.length) {
    throw new Error(
      `Expected all ${patterns.length} BPMN node patterns to be found, but only found ${foundCount}`
    );
  }

  return foundCount > 0;
}

/**
 * Verifierar att flera BPMN-noder finns i processträdet (tolerant matchning).
 * Används för att verifiera att alla huvudsteg i ett flöde finns i trädet.
 *
 * @param ctx - UI context
 * @param nodePatterns - Array av arrays med patterns per nod (varje nod kan ha flera alternativ)
 * @returns Map med nod-namn och om den hittades
 */
export async function assertMultipleBpmnNodesExist(
  ctx: UiProcessContext,
  nodePatterns: Array<{ name: string; patterns: (string | RegExp)[] }>
): Promise<Map<string, boolean>> {
  const { page } = ctx;
  const results = new Map<string, boolean>();

  for (const { name, patterns } of nodePatterns) {
    let found = false;

    for (const pattern of patterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
      const locator = page.getByText(regex, { exact: false });
      const count = await locator.count();

      if (count > 0) {
        found = true;
        await expect(locator.first()).toBeVisible();
        break; // Hittade minst ett matchande pattern för denna nod
      }
    }

    results.set(name, found);
  }

  return results;
}


