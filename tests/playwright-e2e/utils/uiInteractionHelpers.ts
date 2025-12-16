import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helper-funktioner för UI-interaktioner i E2E-tester.
 *
 * Dessa funktioner är strukturerade för att matcha uiInteraction-strängarna
 * från bankProjectTestSteps i E2eTestsOverviewPage.tsx. De kan användas när
 * UI-routes och formulär är klara.
 *
 * Alla funktioner är dokumenterade med page IDs och locator IDs från Feature Goals.
 */

export interface UiInteractionContext {
  page: Page;
}

/**
 * Navigerar till en specifik route.
 * @param ctx - UI context
 * @param route - Route att navigera till (t.ex. '/#/application/start')
 */
export async function navigateTo(ctx: UiInteractionContext, route: string) {
  const { page } = ctx;
  await page.goto(route);
  // Vänta på att sidan är laddad
  await page.waitForLoadState('networkidle');
}

/**
 * Fyller i ett formulärfält.
 * @param ctx - UI context
 * @param locatorId - Locator ID för fältet (t.ex. 'input-personal-income')
 * @param value - Värde att fylla i
 */
export async function fillField(ctx: UiInteractionContext, locatorId: string, value: string) {
  const { page } = ctx;
  const field = page.locator(`[data-testid="${locatorId}"], #${locatorId}, [name="${locatorId}"]`).first();
  await field.fill(value);
}

/**
 * Klickar på en knapp.
 * @param ctx - UI context
 * @param locatorId - Locator ID för knappen (t.ex. 'btn-submit-personal-economy')
 */
export async function clickButton(ctx: UiInteractionContext, locatorId: string) {
  const { page } = ctx;
  const button = page.locator(`[data-testid="${locatorId}"], #${locatorId}, button:has-text("${locatorId}")`).first();
  await button.click();
}

/**
 * Verifierar att ett element är synligt.
 * @param ctx - UI context
 * @param locatorId - Locator ID för elementet
 */
export async function verifyElementVisible(ctx: UiInteractionContext, locatorId: string) {
  const { page } = ctx;
  const element = page.locator(`[data-testid="${locatorId}"], #${locatorId}`).first();
  await expect(element).toBeVisible();
}

/**
 * Verifierar att ett meddelande innehåller specifik text.
 * @param ctx - UI context
 * @param messageText - Text att söka efter
 */
export async function verifySuccessMessage(ctx: UiInteractionContext, messageText?: string) {
  const { page } = ctx;
  const message = page.locator('[data-testid="success-message"], .success-message, [role="alert"]').first();
  await expect(message).toBeVisible();
  if (messageText) {
    await expect(message).toContainText(messageText);
  }
}

/**
 * Väljer ett alternativ i en dropdown.
 * @param ctx - UI context
 * @param locatorId - Locator ID för dropdown
 * @param value - Värde att välja
 */
export async function selectOption(ctx: UiInteractionContext, locatorId: string, value: string) {
  const { page } = ctx;
  const select = page.locator(`[data-testid="${locatorId}"], #${locatorId}, select[name="${locatorId}"]`).first();
  await select.selectOption(value);
}

/**
 * Application UI-interaktioner
 * Källa: bankProjectTestSteps[0].uiInteraction
 * 
 * Komplett flöde enligt uiInteraction-sträng:
 * Navigate: application-start → internal-data-gathering (vänta på auto-fetch) 
 * → Verify: pre-screen-result-approved → Navigate: household → register-household-economy 
 * → Fill: expenses → Navigate: stakeholders → stakeholder → Gateway: has-consented-to-credit-check = Yes 
 * → Navigate: fetch-personal-information → Verify: screen-personal-information approved 
 * → Navigate: register-personal-economy-information → Fill: income/expenses 
 * → Navigate: object → Select: property-type → Fill: valuation 
 * → Navigate: confirm-application → Verify: summary-all-data → Click: confirm
 */
export const ApplicationUiHelpers = {
  /**
   * Steg 1: Navigerar till application-start och väntar på internal-data-gathering
   */
  async navigateToStart(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/application/start');
    // Navigate: internal-data-gathering (vänta på auto-fetch från interna system)
    // TODO: Vänta på att internal-data-gathering är klar (t.ex. via API-response eller UI-indikator)
  },

  /**
   * Steg 2: Verifierar pre-screen-result-approved (Pre-screen Party DMN = APPROVED)
   */
  async verifyPreScreenApproved(ctx: UiInteractionContext) {
    await verifyElementVisible(ctx, 'pre-screen-result-approved');
    // TODO: Verifiera att DMN-resultat är APPROVED (t.ex. via API-response eller UI-text)
  },

  /**
   * Steg 3: Navigerar till household och verifierar att registrering behövs
   */
  async navigateToHousehold(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/application/household');
    // Verify: skip-step-gateway = No (registrering behövs)
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Steg 4: Fyller i household economy information
   */
  async fillHouseholdEconomy(ctx: UiInteractionContext, data: {
    expensesCarsLoans?: string;
    expensesChildren?: string;
    expensesChildSupport?: string;
    expensesOther?: string;
    incomesChildSupport?: string;
    incomesOther?: string;
  }) {
    await navigateTo(ctx, '/#/application/household/register');
    
    if (data.expensesCarsLoans) await fillField(ctx, 'expenses-cars-loans', data.expensesCarsLoans);
    if (data.expensesChildren) await fillField(ctx, 'expenses-children', data.expensesChildren);
    if (data.expensesChildSupport) await fillField(ctx, 'expenses-child-support', data.expensesChildSupport);
    if (data.expensesOther) await fillField(ctx, 'expenses-other', data.expensesOther);
    if (data.incomesChildSupport) await fillField(ctx, 'incomes-child-support', data.incomesChildSupport);
    if (data.incomesOther) await fillField(ctx, 'incomes-other', data.incomesOther);
    
    await clickButton(ctx, 'submit-button');
    await verifySuccessMessage(ctx);
  },

  /**
   * Steg 5: Navigerar till stakeholders → stakeholder
   * Gateway: has-consented-to-credit-check = Yes (för happy path, hoppar över consent-to-credit-check)
   */
  async navigateToStakeholder(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/application/stakeholders');
    await navigateTo(ctx, '/#/application/stakeholder');
    // Gateway: has-consented-to-credit-check = Yes (happy path, hoppar över consent)
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Steg 6: Väntar på fetch-personal-information och verifierar att det är approved
   */
  async verifyPersonalInformationApproved(ctx: UiInteractionContext) {
    // Navigate: fetch-personal-information (vänta på auto-fetch)
    // TODO: Vänta på att fetch-personal-information är klar
    await verifyElementVisible(ctx, 'screen-personal-information');
    // Gateway: is-personal-information-rejected = No
    // Gateway: skip-register-personal-economy-information = No (för happy path, registrera ekonomi)
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Steg 7: Fyller i personal economy information för stakeholder
   */
  async fillPersonalEconomy(ctx: UiInteractionContext, data: {
    income?: string;
    expenses?: string;
  }) {
    await navigateTo(ctx, '/#/application/stakeholder/personal-economy');
    
    if (data.income) await fillField(ctx, 'input-personal-income', data.income);
    if (data.expenses) await fillField(ctx, 'input-personal-expenses', data.expenses);
    
    await clickButton(ctx, 'btn-submit-personal-economy');
    await verifySuccessMessage(ctx);
  },

  /**
   * Steg 8: Navigerar till object och fyller i objektinformation (bostadsrätt)
   */
  async fillObjectInformation(ctx: UiInteractionContext, data: {
    propertyType?: string;
    valuation?: string;
  }) {
    await navigateTo(ctx, '/#/application/object');
    
    if (data.propertyType) await selectOption(ctx, 'select-property-type', data.propertyType);
    if (data.valuation) await fillField(ctx, 'input-property-valuation', data.valuation);
    
    await clickButton(ctx, 'btn-submit-object');
    // Verify: evaluate-property-approved (Evaluate Bostadsrätt DMN = APPROVED)
    await verifyElementVisible(ctx, 'evaluate-property-approved');
  },

  /**
   * Steg 9: Bekräftar ansökan
   */
  async confirmApplication(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/application/confirm');
    // Verify: summary-all-data (visar intern data, hushåll, stakeholder, objekt)
    await verifyElementVisible(ctx, 'summary-all-data');
    await clickButton(ctx, 'btn-confirm-application');
    await verifySuccessMessage(ctx, 'ansökan bekräftad');
  },

  /**
   * Komplett Application-flöde (alla steg i rätt ordning)
   */
  async completeApplicationFlow(ctx: UiInteractionContext, data: {
    household?: {
      expensesCarsLoans?: string;
      expensesChildren?: string;
      expensesChildSupport?: string;
      expensesOther?: string;
      incomesChildSupport?: string;
      incomesOther?: string;
    };
    personalEconomy?: {
      income?: string;
      expenses?: string;
    };
    object?: {
      propertyType?: string;
      valuation?: string;
    };
  }) {
    await this.navigateToStart(ctx);
    await this.verifyPreScreenApproved(ctx);
    await this.navigateToHousehold(ctx);
    if (data.household) {
      await this.fillHouseholdEconomy(ctx, data.household);
    }
    await this.navigateToStakeholder(ctx);
    await this.verifyPersonalInformationApproved(ctx);
    if (data.personalEconomy) {
      await this.fillPersonalEconomy(ctx, data.personalEconomy);
    }
    if (data.object) {
      await this.fillObjectInformation(ctx, data.object);
    }
    await this.confirmApplication(ctx);
  },
};

/**
 * Mortgage Commitment UI-interaktioner
 * Källa: bankProjectTestSteps[2].uiInteraction
 * 
 * Komplett flöde enligt uiInteraction-sträng:
 * Navigate: decide-on-mortgage-commitment → Verify: credit-evaluation-1 approved, is-mortgage-commitment-approved = Yes 
 * → Fill: decision → Click: submit → Verify: confirmation
 */
export const MortgageCommitmentUiHelpers = {
  /**
   * Steg 1: Navigerar till decide-on-mortgage-commitment
   */
  async navigateToDecide(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/mortgage-commitment/decide');
  },

  /**
   * Steg 2: Verifierar att credit-evaluation-1 är approved och is-mortgage-commitment-approved = Yes
   */
  async verifyPreConditions(ctx: UiInteractionContext) {
    await verifyElementVisible(ctx, 'credit-evaluation-1');
    // TODO: Verifiera att credit-evaluation-1 är approved (t.ex. via API-response eller UI-text)
    // Verify: is-mortgage-commitment-approved = Yes
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Steg 3: Fattar mortgage commitment beslut
   */
  async decideMortgageCommitment(ctx: UiInteractionContext, decision: string) {
    await fillField(ctx, 'input-mortgage-commitment-decision', decision);
    await clickButton(ctx, 'btn-submit-mortgage-commitment');
    await verifyElementVisible(ctx, 'decide-on-mortgage-commitment-confirmation');
    await verifySuccessMessage(ctx);
  },

  /**
   * Komplett Mortgage Commitment-flöde (alla steg i rätt ordning)
   */
  async completeMortgageCommitmentFlow(ctx: UiInteractionContext, decision: string = 'Won bidding round / Interested in object') {
    await this.navigateToDecide(ctx);
    await this.verifyPreConditions(ctx);
    await this.decideMortgageCommitment(ctx, decision);
  },
};

/**
 * KYC UI-interaktioner
 * Källa: bankProjectTestSteps[6].uiInteraction
 * 
 * Komplett flöde enligt uiInteraction-sträng:
 * Navigate: kyc-start → submit-self-declaration → Fill: pep-status, source-of-funds, purpose 
 * → Click: submit → Verify: fetch-kyc, kyc-questions-needed = Yes, fetch-aml-kyc-risk, 
 * fetch-screening-and-sanctions, assess-kyc-aml, gateway-needs-review-no, success-message-kyc-approved
 */
export const KycUiHelpers = {
  /**
   * Steg 1: Navigerar till KYC-start
   */
  async navigateToStart(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/kyc-start');
  },

  /**
   * Steg 2: Navigerar till submit-self-declaration
   */
  async navigateToSelfDeclaration(ctx: UiInteractionContext) {
    // Navigate: submit-self-declaration
    // TODO: Navigera till rätt route när UI är klart (t.ex. '/#/kyc/self-declaration')
    await verifyElementVisible(ctx, 'submit-self-declaration');
  },

  /**
   * Steg 3: Fyller i självdeklaration
   */
  async fillSelfDeclaration(ctx: UiInteractionContext, data: {
    pepStatus?: string;
    sourceOfFunds?: string;
    purposeOfTransaction?: string;
  }) {
    if (data.pepStatus) await fillField(ctx, 'input-pep-status', data.pepStatus);
    if (data.sourceOfFunds) await fillField(ctx, 'input-source-of-funds', data.sourceOfFunds);
    if (data.purposeOfTransaction) await fillField(ctx, 'input-purpose-of-transaction', data.purposeOfTransaction);
    
    await clickButton(ctx, 'btn-submit-declaration');
  },

  /**
   * Steg 4: Verifierar KYC-processen (efter submit)
   */
  async verifyKycProcess(ctx: UiInteractionContext) {
    // Verify: fetch-kyc (GET /api/kyc/{customerId})
    // Verify: kyc-questions-needed = Yes (för ny kund)
    // TODO: Verifiera API-response eller UI-text
    // Verify: fetch-aml-kyc-risk (api-aml-risk-score <30)
    // Verify: fetch-screening-and-sanctions (api-sanctions-pep-screening, no match)
    // Verify: assess-kyc-aml (dmn-evaluate-kyc-aml-approved)
    // Verify: gateway-needs-review-no
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
    await verifyElementVisible(ctx, 'success-message-kyc-approved');
    await verifySuccessMessage(ctx, 'kyc-approved');
  },

  /**
   * Komplett KYC-flöde (alla steg i rätt ordning)
   */
  async completeKycFlow(ctx: UiInteractionContext, data: {
    pepStatus?: string;
    sourceOfFunds?: string;
    purposeOfTransaction?: string;
  }) {
    await this.navigateToStart(ctx);
    await this.navigateToSelfDeclaration(ctx);
    await this.fillSelfDeclaration(ctx, data);
    await this.verifyKycProcess(ctx);
  },
};

/**
 * Offer UI-interaktioner
 * Källa: bankProjectTestSteps[9].uiInteraction
 * 
 * Komplett flöde enligt uiInteraction-sträng:
 * Navigate: offer-start → Gateway: sales-contract-assessed = Yes (hoppar över kontraktuppladdning) 
 * → Navigate: decide-offer → Review: offer-details → Click: accept → Verify: offer-decision gateway = "Accept offer"
 */
export const OfferUiHelpers = {
  /**
   * Steg 1: Navigerar till offer-start
   */
  async navigateToStart(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/offer-start');
  },

  /**
   * Steg 2: Verifierar att sales-contract-assessed = Yes (för happy path)
   */
  async verifySalesContractAssessed(ctx: UiInteractionContext) {
    // Gateway: sales-contract-assessed = Yes (för happy path, kontrakt är redan bedömt, hoppar över kontraktuppladdning)
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Steg 3: Navigerar till decide-offer (user task)
   */
  async navigateToDecideOffer(ctx: UiInteractionContext) {
    // Navigate: decide-offer (user task)
    // TODO: Navigera till rätt route när UI är klart (t.ex. '/#/offer/decide')
    await verifyElementVisible(ctx, 'decide-offer');
  },

  /**
   * Steg 4: Granskar offer-details (validera lånebelopp, kontonummer, datum)
   */
  async reviewOfferDetails(ctx: UiInteractionContext) {
    await verifyElementVisible(ctx, 'offer-details');
    // TODO: Verifiera att lånebelopp, kontonummer och datum är korrekta
  },

  /**
   * Steg 5: Accepterar erbjudande
   */
  async acceptOffer(ctx: UiInteractionContext) {
    await clickButton(ctx, 'offer-decision-accept');
    // Verify: offer-decision gateway = "Accept offer"
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Komplett Offer-flöde (alla steg i rätt ordning)
   */
  async completeOfferFlow(ctx: UiInteractionContext) {
    await this.navigateToStart(ctx);
    await this.verifySalesContractAssessed(ctx);
    await this.navigateToDecideOffer(ctx);
    await this.reviewOfferDetails(ctx);
    await this.acceptOffer(ctx);
  },
};

/**
 * Signing UI-interaktioner
 * Källa: bankProjectTestSteps[11].uiInteraction
 * 
 * Komplett flöde enligt uiInteraction-sträng:
 * Navigate: signing-start → Gateway: signing-methods = Digital 
 * → Navigate: per-digital-document-package (multi-instance) 
 * → Service: upload-document, create-sign-order 
 * → Navigate: per-signee (multi-instance) 
 * → Event: notify-sign 
 * → Navigate: per-sign-order (multi-instance) 
 * → Sign: digital-signature (PADES) 
 * → Service: store-signed-document 
 * → Verify: signing-completed success
 */
export const SigningUiHelpers = {
  /**
   * Steg 1: Navigerar till signing-start
   */
  async navigateToStart(ctx: UiInteractionContext) {
    await navigateTo(ctx, '/#/signing-start');
  },

  /**
   * Steg 2: Verifierar att signing-methods = Digital (inclusive gateway, för happy path)
   */
  async verifySigningMethodDigital(ctx: UiInteractionContext) {
    // Gateway: signing-methods = Digital (inclusive gateway, för happy path)
    // TODO: Verifiera gateway-beslut när process-engine är tillgänglig
  },

  /**
   * Steg 3: Hanterar per-digital-document-package (multi-instance subprocess per dokumentpaket)
   */
  async handleDocumentPackages(ctx: UiInteractionContext) {
    // Navigate: per-digital-document-package (multi-instance subprocess per dokumentpaket)
    // Service: upload-document (laddar upp till Signing provider datastore)
    // Service: create-sign-order (skapar signeringsorder)
    // TODO: Implementera när UI är klart för multi-instance subprocesser
    await verifyElementVisible(ctx, 'per-digital-document-package');
  },

  /**
   * Steg 4: Hanterar per-signee (multi-instance subprocess per signatär)
   */
  async handleSignees(ctx: UiInteractionContext) {
    // Navigate: per-signee (multi-instance subprocess per signatär)
    // Event: notify-sign (intermediate throw event)
    // TODO: Implementera när UI är klart för multi-instance subprocesser
    await verifyElementVisible(ctx, 'per-signee');
  },

  /**
   * Steg 5: Hanterar per-sign-order (multi-instance subprocess per signeringsorder)
   */
  async handleSignOrders(ctx: UiInteractionContext) {
    // Navigate: per-sign-order (multi-instance subprocess per signeringsorder)
    // Sign: digital-signature (PADES - vi antar allt är PADES i SE)
    // TODO: Implementera när UI är klart för multi-instance subprocesser
    await verifyElementVisible(ctx, 'per-sign-order');
    await verifyElementVisible(ctx, 'digital-signature');
  },

  /**
   * Steg 6: Verifierar att signering är slutförd
   */
  async verifySigningCompleted(ctx: UiInteractionContext) {
    // Service: store-signed-document
    // Verify: signing-completed success
    await verifyElementVisible(ctx, 'signing-completed');
    await verifySuccessMessage(ctx, 'signing-completed');
  },

  /**
   * Komplett Signing-flöde (alla steg i rätt ordning)
   */
  async completeSigningFlow(ctx: UiInteractionContext) {
    await this.navigateToStart(ctx);
    await this.verifySigningMethodDigital(ctx);
    await this.handleDocumentPackages(ctx);
    await this.handleSignees(ctx);
    await this.handleSignOrders(ctx);
    await this.verifySigningCompleted(ctx);
  },
};

