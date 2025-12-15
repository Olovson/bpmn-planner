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
 * Enkel “assert” att ett processträd faktiskt är renderat i vyn.
 * Detta motsvarar ett väldigt grundläggande “Then”-steg:
 * - "Then process-trädet för mortgage är synligt i UI".
 */
export async function assertProcessTreeVisible(ctx: UiProcessContext) {
  const { page } = ctx;

  // ProcessTreeD3 renderar en SVG-baserad trädvy; vi letar efter minst ett <svg>-element.
  const svg = await page.locator('svg').first();
  await svg.waitFor({ state: 'visible' });
}


