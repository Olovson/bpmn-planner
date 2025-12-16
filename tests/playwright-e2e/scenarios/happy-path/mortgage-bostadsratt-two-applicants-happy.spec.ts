import { test, expect } from '@playwright/test';
import {
  openProcessExplorer,
  assertProcessTreeVisible,
  assertBpmnNodeExists,
  assertMultipleBpmnNodesExist,
} from '../../utils/processTestUtils';
import { setupE2eBr001Mocks } from '../../fixtures/mortgageE2eMocks';
import {
  ApplicationUiHelpers,
  MortgageCommitmentUiHelpers,
  KycUiHelpers,
  OfferUiHelpers,
  SigningUiHelpers,
} from '../../utils/uiInteractionHelpers';

/**
 * E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt (Happy Path, medsökare)
 *
 * Detta test implementerar E2E-scenariot med två sökande baserat på bankProjectTestSteps
 * för E2E_BR006 i E2eTestsOverviewPage.tsx. Strukturen är identisk med E2E_BR001 men
 * med fokus på multi-instance (flera stakeholders/hushåll, KYC per person osv.).
 *
 * Kopplat till Feature Goals (samma processer som E2E_BR001 men med S2/multi-instance där relevant):
 * - mortgage-application-v2.html (S2 – två sökande)
 * - mortgage-mortgage-commitment-v2.html (S1)
 * - mortgage-object-valuation-v2.html (S2 - bostadsrätt)
 * - mortgage-se-object-information-v2.html (S2 - bostadsrätt)
 * - mortgage-se-credit-evaluation-v2.html (S1/S2 – multi-instance stakeholders/households)
 * - mortgage-kyc-v2.html (S1/S2 – multi-instance KYC)
 * - mortgage-se-credit-decision-v2.html (S1)
 * - mortgage-offer-v2.html (S1)
 * - mortgage-se-document-generation-v2.html (S1)
 * - mortgage-se-signing-v2.html (S1 – två signees)
 * - mortgage-se-disbursement-v2.html (S1)
 *
 * Given:
 * - Två personer (huvudansökande + medsökare) köper sin första gemensamma bostadsrätt
 * - Båda är godkända vid pre-screening
 * - Bostadsrätten uppfyller alla kriterier (värde, föreningsskuld, LTV, plats)
 * - INGEN befintlig fastighet att sälja
 *
 * When:
 * - Application körs med multi-instance för hushåll och stakeholders (båda fyller i sin ekonomi)
 * - Mortgage Commitment godkänns automatiskt
 * - Object Valuation hämtar bostadsrättsvärdering
 * - Credit Evaluation kör multi-instance för båda stakeholders och hushåll
 * - KYC körs per stakeholder och godkänns automatiskt via självdeklaration
 * - Credit Decision godkänner
 * - Kundparet accepterar Offer
 * - Document Generation genererar dokument
 * - Båda signerar digitalt (multi-instance i Signing)
 * - Disbursement genomförs
 *
 * Then:
 * - Hela processen från Application till Disbursement slutförs utan fel för två sökande
 * - Alla DMN-beslut returnerar APPROVED
 * - Alla gateway-beslut går genom happy path
 * - Utbetalning är slutförd och dokument är arkiverade
 */

test.describe('E2E-BR-006: Två sökande - Bostadsrätt godkänd automatiskt (Playwright)', () => {
  test('E2E_BR006 – komplett flöde för två sökande från Application till Disbursement', async ({ page }) => {
    const ctx = { page };

    // ============================================
    // SETUP: Mocka alla API-anrop för happy path
    // (vi återanvänder samma mocks som för E2E_BR001 – skillnaden ligger i tolkningen av svaren)
    // ============================================
    await setupE2eBr001Mocks(page, {
      applicationId: 'test-application-006',
      customerId: 'test-customer-primary-001',
      objectId: 'test-object-001',
    });

    // ============================================
    // SETUP: Öppna Process Explorer
    // ============================================
    await openProcessExplorer(ctx);
    await assertProcessTreeVisible(ctx);
    await expect(page).toHaveTitle(/BPMN Planner/i);

    // ============================================
    // STEG 1: Application (CallActivity, multi-instance)
    // ============================================
    test.step('Steg 1: Application - Två sökande fyller i komplett ansökan (multi-instance)', async () => {
      await assertBpmnNodeExists(ctx, [/application/i], { strict: false });

      const applicationComponents = [
        { name: 'internal-data-gathering', patterns: [/internal data gathering|intern datainsamling/i] },
        { name: 'household', patterns: [/household|hushåll/i] },
        { name: 'stakeholder', patterns: [/stakeholder/i] },
        { name: 'object', patterns: [/object|objekt/i] },
        { name: 'confirm-application', patterns: [/confirm application|bekräfta ansökan/i] },
      ];

      await assertMultipleBpmnNodesExist(ctx, applicationComponents);

      // UI-interaktioner (för två sökande, multi-instance) – aktiveras när riktig UI finns:
      // await ApplicationUiHelpers.completeApplicationFlowForTwoApplicants(ctx);

      // TODO: När API/Backend finns: verifiera att Application.stakeholders.length = 2 osv.
    });

    // ============================================
    // STEG 2: Is purchase? (Gateway)
    // ============================================
    test.step('Steg 2: Is purchase? - Gateway avgör att detta är ett köp, inte refinansiering', async () => {
      await assertBpmnNodeExists(ctx, [/is-purchase|is purchase/i], { strict: false });
      // TODO: Verifiera gateway-beslut när process-engine finns (is-purchase = Yes)
    });

    // ============================================
    // STEG 3: Mortgage Commitment (CallActivity)
    // ============================================
    test.step('Steg 3: Mortgage Commitment - Systemet godkänner och kundparet fattar beslut', async () => {
      await assertBpmnNodeExists(ctx, [/mortgage commitment|mortgage-commitment/i], { strict: false });

      const mortgageCommitmentComponents = [
        { name: 'credit-evaluation-1', patterns: [/credit evaluation|kreditevaluering/i] },
        { name: 'decide-mortgage-commitment', patterns: [/decide.*mortgage commitment|beslut.*mortgage commitment/i] },
        { name: 'object-information', patterns: [/object information|objektinformation/i] },
      ];

      await assertMultipleBpmnNodesExist(ctx, mortgageCommitmentComponents);

      // UI-interaktion – samma flöde som E2E_BR001, men implicit för två sökande:
      // await MortgageCommitmentUiHelpers.completeMortgageCommitmentFlow(ctx);
    });

    // ============================================
    // STEG 4: Object Valuation (CallActivity)
    // ============================================
    test.step('Steg 4: Object Valuation - Systemet hämtar bostadsrättsvärdering', async () => {
      await assertBpmnNodeExists(ctx, [/object valuation|object-valuation|objektvärdering/i], { strict: false });
      // TODO: När API finns: verifiera att värdering matchar mocks
    });

    // ============================================
    // STEG 5: Credit Evaluation (CallActivity, multi-instance stakeholders/households)
    // ============================================
    test.step(
      'Steg 5: Credit Evaluation - Systemet utvärderar kredit automatiskt för två sökande (multi-instance)',
      async () => {
        await assertBpmnNodeExists(ctx, [/credit evaluation|credit-evaluation|kreditevaluering/i], {
          strict: false,
        });

        // TODO: När backend/process-engine finns: verifiera att båda stakeholders/hushåll ingår i utvärderingen
      },
    );

    // ============================================
    // STEG 6: Is automatically approved? (Gateway)
    // ============================================
    test.step(
      'Steg 6: Is automatically approved? - Gateway avgör att lånet kan godkännas automatiskt',
      async () => {
        await assertBpmnNodeExists(ctx, [/is-automatically-approved|automatically approved/i], {
          strict: false,
        });
        // TODO: Verifiera gateway-beslut när process-engine finns (Yes)
      },
    );

    // ============================================
    // STEG 7: KYC (CallActivity, multi-instance per stakeholder)
    // ============================================
    test.step(
      'Steg 7: KYC - Systemet genomför KYC-screening automatiskt för båda sökande med självdeklaration',
      async () => {
        await assertBpmnNodeExists(ctx, [/kyc/i], { strict: false });

        // UI-interaktioner för två sökande (aktiveras när UI finns):
        // await KycUiHelpers.completeKycFlowForTwoApplicants(ctx);
      },
    );

    // ============================================
    // STEG 8: Credit Decision (CallActivity)
    // ============================================
    test.step('Steg 8: Credit Decision - Systemet fattar kreditbeslut för två sökande', async () => {
      await assertBpmnNodeExists(ctx, [/credit decision|credit-decision|kreditbeslut/i], { strict: false });
      // TODO: Verifiera backend state när API finns (CreditDecision.status = "APPROVED")
    });

    // ============================================
    // STEG 9: Is credit approved? (Gateway)
    // ============================================
    test.step(
      'Steg 9: Is credit approved? - Gateway bekräftar att kredit är godkänd för lånet med två sökande',
      async () => {
        await assertBpmnNodeExists(ctx, [/is-credit-approved|credit approved/i], { strict: false });
      },
    );

    // ============================================
    // STEG 10: Offer (CallActivity)
    // ============================================
    test.step(
      'Steg 10: Offer - Systemet förbereder erbjudande och kundparet accepterar',
      async () => {
        await assertBpmnNodeExists(ctx, [/offer/i], { strict: false });

        // UI-interaktioner (kan återanvända OfferUiHelpers när UI är klart):
        // await OfferUiHelpers.completeOfferFlow(ctx);
      },
    );

    // ============================================
    // STEG 11: Document Generation (CallActivity)
    // ============================================
    test.step('Steg 11: Document Generation - Systemet genererar lånedokument', async () => {
      await assertBpmnNodeExists(ctx, [/document generation|document-generation/i], { strict: false });
    });

    // ============================================
    // STEG 12: Signing (CallActivity, multi-instance per signee)
    // ============================================
    test.step(
      'Steg 12: Signing - Båda sökande signerar dokument digitalt (multi-instance per signee)',
      async () => {
        await assertBpmnNodeExists(ctx, [/signing/i], { strict: false });

        // UI-interaktioner för två sökande:
        // await SigningUiHelpers.completeSigningFlowForTwoApplicants(ctx);
      },
    );

    // ============================================
    // STEG 13: Disbursement (CallActivity)
    // ============================================
    test.step('Steg 13: Disbursement - Systemet genomför utbetalning och arkiverar dokument', async () => {
      await assertBpmnNodeExists(ctx, [/disbursement/i], { strict: false });
    });

    // ============================================
    // STEG 14: Needs collateral registration? (Gateway)
    // ============================================
    test.step(
      'Steg 14: Needs collateral registration? - Gateway avgör att ingen säkerhetsregistrering behövs',
      async () => {
        await assertBpmnNodeExists(ctx, [/needs-collateral-registration|collateral registration/i], {
          strict: false,
        });
      },
    );
  });
});


