import type { Page, Route } from '@playwright/test';

/**
 * Hypotes-baserade mock-responser för Mortgage Credit Decision-relaterade anrop.
 *
 * Dessa används för att kunna skriva “E2E-liknande” scenarier utan att vi har
 * riktiga integrationer bakom bpmn-diagrammen. Allt nedan är dokumenterade
 * antaganden som kan justeras när verkliga API:er definieras.
 */

export interface CreditDecisionMockOptions {
  /**
   * Tänkta process-variabler som påverkar beslutet.
   * Dessa speglar typiska DMN-/business rule inputs (inkomst, belåningsgrad etc).
   */
  decisionVariables?: Record<string, unknown>;
}

/**
 * Happy path: ansökan blir godkänd.
 *
 * I dagsläget har vi inga faktiska endpoints för kreditbeslut i bpmn-planner-appen,
 * så vi förbereder en route-hook som kan aktiveras när vi väl har tydliga URL:er.
 */
export async function setupCreditDecisionApprovedMock(page: Page, _options?: CreditDecisionMockOptions) {
  // OBS: URL-mönstret är medvetet generiskt och bör skärpas när riktiga endpoints finns.
  await page.route('**/credit-decision/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        decision: 'APPROVED',
        decisionReason: 'Hypotetiskt godkänd enligt Feature Goal-scenario',
      }),
    });
  });
}


