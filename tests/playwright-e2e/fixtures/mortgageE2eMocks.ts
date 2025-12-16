import type { Page, Route } from '@playwright/test';

/**
 * Mock-responser för E2E_BR001-scenariot (En sökande - Bostadsrätt godkänd automatiskt).
 *
 * Dessa mocks används för att simulera alla API-anrop som behövs för det kompletta
 * E2E-flödet från Application till Disbursement. Alla mocks är konfigurerade för
 * happy path-scenariot.
 *
 * Källa: bankProjectTestSteps från E2eTestsOverviewPage.tsx
 */

export interface E2eMockOptions {
  /**
   * Application ID som används i flera API-anrop
   */
  applicationId?: string;
  /**
   * Customer ID som används i KYC-anrop
   */
  customerId?: string;
  /**
   * Object ID som används i valuation-anrop
   */
  objectId?: string;
}

/**
 * Sätter upp alla mocks för E2E_BR001 happy path-scenariot.
 */
export async function setupE2eBr001Mocks(page: Page, options: E2eMockOptions = {}) {
  const {
    applicationId = 'test-application-001',
    customerId = 'test-customer-001',
    objectId = 'test-object-001',
  } = options;

  // ============================================
  // Application API Mocks (Internal Data Gathering, Stakeholder, Object)
  // ============================================
  await page.route('**/api/party/information', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        partyId: customerId,
        status: 'ACTIVE',
        preScreenResult: 'APPROVED',
      }),
    });
  });

  await page.route('**/api/party/engagements', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        partyId: customerId,
        engagements: [],
      }),
    });
  });

  await page.route('**/api/stakeholder/personal-information', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stakeholderId: customerId,
        personalInformation: {
          status: 'APPROVED',
          age: 35,
          isCoApplicant: false,
        },
      }),
    });
  });

  await page.route('**/api/valuation/property', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        objectId,
        valuationComplete: true,
        value: 2_500_000,
      }),
    });
  });

  await page.route('**/api/application/kalp', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        maxLoanAmount: 2_200_000, // Högre än ansökt belopp för happy path
        kalpCalculated: true,
      }),
    });
  });

  await page.route('**/api/application/fetch-credit-information', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        creditInformationFetched: true,
        stakeholders: [
          {
            stakeholderId: customerId,
            creditScore: 750,
            creditInformation: 'GOOD',
          },
        ],
      }),
    });
  });

  // ============================================
  // Mortgage Commitment API Mocks
  // ============================================
  await page.route('**/api/object/brf-information', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        objectId,
        brfNumber: 'BRF-12345',
        associationDebt: 3000, // SEK/m², < 5000 för happy path
        approved: true,
      }),
    });
  });

  await page.route('**/api/mortgage-commitment/decision', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'APPROVED',
        wonBiddingRound: true,
        objectApproved: true,
        termsChanged: false,
        decision: 'Won bidding round / Interested in object',
      }),
    });
  });

  // ============================================
  // Object Valuation API Mocks
  // ============================================
  await page.route(`**/api/valuation/bostadsratt/${objectId}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        complete: true,
        value: 2_500_000, // >= 1.5M SEK för happy path
        propertyType: 'bostadsrätt',
        objectId,
      }),
    });
  });

  // ============================================
  // Credit Evaluation API Mocks
  // ============================================
  await page.route('**/api/pricing/price', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        price: {
          interestRate: 3.5,
          monthlyPayment: 12000,
        },
      }),
    });
  });

  await page.route('**/api/stacc/affordability', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        householdId: 'household-001',
        affordability: {
          maxLoanAmount: 2_200_000,
          approved: true,
        },
      }),
    });
  });

  await page.route('**/api/credit/personal-information', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stakeholderId: customerId,
        creditInformation: {
          creditScore: 750,
          status: 'GOOD',
          updated: true,
        },
      }),
    });
  });

  await page.route('**/api/risk/classification', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        riskClassification: 'LOW',
        riskScore: 25, // < 50 för happy path
      }),
    });
  });

  await page.route('**/api/credit-evaluation', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'APPROVED',
        automaticallyApproved: true,
        applicationId,
      }),
    });
  });

  // ============================================
  // KYC API Mocks
  // ============================================
  await page.route(`**/api/kyc/${customerId}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        customerId,
        questionsNeeded: true, // För ny kund
        status: 'IN_PROGRESS',
      }),
    });
  });

  await page.route('**/api/kyc/aml-risk-score', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        amlRiskScore: 15, // < 30 för happy path
        customerId,
      }),
    });
  });

  await page.route('**/api/kyc/sanctions-pep-screening', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pepMatch: false,
        sanctionsMatch: false,
        customerId,
      }),
    });
  });

  await page.route('**/api/dmn/evaluate-kyc-aml', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        decision: 'APPROVED',
        needsReview: false,
        customerId,
      }),
    });
  });

  // ============================================
  // Credit Decision API Mocks
  // ============================================
  await page.route('**/api/credit-decision', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'APPROVED',
        decision: 'APPROVED',
        applicationId,
      }),
    });
  });

  // ============================================
  // Offer API Mocks
  // ============================================
  await page.route(`**/api/offer/${applicationId}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        loanAmount: 2_000_000,
        accountNumber: '1234567890',
        dates: {
          offerValidUntil: '2025-12-31',
          disbursementDate: '2025-06-01',
        },
        contractAssessed: true,
      }),
    });
  });

  await page.route('**/api/offer/accept', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ACCEPTED',
        decision: 'ACCEPT',
        applicationId,
      }),
    });
  });

  // ============================================
  // Document Generation API Mocks
  // ============================================
  await page.route('**/api/document-generation/prepare-loan', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        loanPrepared: true,
        loanParts: [
          { partId: 'part-1', amount: 2_000_000 },
        ],
      }),
    });
  });

  await page.route('**/api/document-generation/generate-documents', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'COMPLETE',
        documents: [
          { id: 'doc-1', type: 'loan-agreement', name: 'Låneavtal.pdf' },
          { id: 'doc-2', type: 'terms', name: 'Villkor.pdf' },
        ],
        applicationId,
      }),
    });
  });

  // ============================================
  // Signing API Mocks
  // ============================================
  await page.route('**/api/signing/upload-document', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        documentId: 'uploaded-doc-1',
        status: 'UPLOADED',
      }),
    });
  });

  await page.route('**/api/signing/create-sign-order', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signOrderId: 'sign-order-1',
        status: 'CREATED',
      }),
    });
  });

  await page.route('**/api/signing/digital-signature', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signatureType: 'PADES',
        status: 'SIGNED',
        signOrderId: 'sign-order-1',
      }),
    });
  });

  await page.route('**/api/signing/store-signed-document', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'STORED',
        documentId: 'signed-doc-1',
      }),
    });
  });

  // ============================================
  // Disbursement API Mocks
  // ============================================
  await page.route('**/api/disbursement/handle', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        disbursementStatus: 'INITIATED',
        disbursementId: 'disbursement-001',
      }),
    });
  });

  await page.route('**/api/disbursement/archive-documents', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'COMPLETE',
        documentsArchived: true,
        applicationId,
        archivedDocuments: [
          { id: 'doc-1', archived: true },
          { id: 'doc-2', archived: true },
        ],
      }),
    });
  });
}

