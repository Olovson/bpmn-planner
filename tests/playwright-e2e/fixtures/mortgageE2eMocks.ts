import type { Page, Route } from '@playwright/test';

/**
 * Mock-responser för E2E_BR001-scenariot (En sökande - Bostadsrätt godkänd automatiskt).
 *
 * Dessa mocks används för att simulera alla API-anrop som behövs för det kompletta
 * E2E-flödet från Application till Disbursement. Alla mocks är konfigurerade för
 * happy path-scenariot.
 *
 * Källa: bankProjectTestSteps från E2eTestsOverviewPage.tsx
 *
 * ⚠️ BASERAT PÅ ANTAGANDEN:
 * - Alla API-endpoints är gissade baserat på BPMN ServiceTask-namn
 * - Alla response-strukturer är gissade baserat på backend states (som också är antaganden)
 * - Backend states är baserade på Feature Goals + logiska antaganden
 *
 * **Värde:** Ger en startpunkt för test lead - visar vilka API:er som troligen behövs
 * och vilka fält som troligen behövs, även om exakta endpoints och strukturer kan skilja sig.
 *
 * **När backend är tillgänglig:**
 * 1. Identifiera faktiska API-endpoints
 * 2. Hämta faktiska API-responser
 * 3. Uppdatera mock-responser för att matcha verklighet
 *
 * Se: docs/E2E_VALIDATION_STATUS.md för detaljerad valideringsstatus och startpunkt-guide
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
  // ⚠️ [UNVALIDATED] - Behöver valideras mot faktiska API-responser
  await page.route('**/api/party/information', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        partyId: customerId,
        status: 'ACTIVE',
        preScreenResult: 'APPROVED',
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        updatedAt: now,
        version: 1,
        source: 'INTERNAL_SYSTEM',
        relatedApplicationId: applicationId,
      }),
    });
  });

  await page.route('**/api/party/engagements', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        partyId: customerId,
        engagements: [],
        // Förbättringar: timestamps, metadata
        fetchedAt: now,
        totalCount: 0,
        version: 1,
      }),
    });
  });

  await page.route('**/api/stakeholder/personal-information', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stakeholderId: customerId,
        personalInformation: {
          status: 'APPROVED',
          age: 35,
          isCoApplicant: false,
          // Förbättringar: mer detaljerad information
          firstName: 'Test',
          lastName: 'Customer',
          personalNumber: '198501011234',
          email: 'test.customer@example.com',
          phoneNumber: '+46701234567',
        },
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        updatedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/valuation/property', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        objectId,
        valuationComplete: true,
        value: 2_500_000,
        // Förbättringar: mer detaljerad värdering
        currency: 'SEK',
        valuationMethod: 'AUTOMATED',
        valuationDate: now,
        propertyType: 'BOSTADSRATT',
        area: 75, // m²
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        updatedAt: now,
        applicationId,
        valuationId: `valuation-${objectId}`,
        version: 1,
      }),
    });
  });

  await page.route('**/api/application/kalp', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        maxLoanAmount: 2_200_000, // Högre än ansökt belopp för happy path
        kalpCalculated: true,
        // Förbättringar: mer detaljerad KALP-information
        requestedAmount: 2_000_000,
        ltvRatio: 80, // %
        loanToIncomeRatio: 4.5,
        // Förbättringar: timestamps, metadata
        calculatedAt: now,
        calculationId: `kalp-${applicationId}`,
        version: 1,
      }),
    });
  });

  await page.route('**/api/application/fetch-credit-information', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        creditInformationFetched: true,
        // Backend state: Application.status = "COMPLETE", Application.readyForEvaluation = true, Application.allDataCollected = true
        status: 'COMPLETE',
        readyForEvaluation: true,
        allDataCollected: true,
        stakeholders: [
          {
            stakeholderId: customerId,
            creditScore: 750,
            creditInformation: 'GOOD',
            // Förbättringar: mer detaljerad kreditinformation
            creditBureau: 'UC',
            creditReportDate: now,
            hasActiveLoans: false,
            totalDebt: 0,
          },
        ],
        // Backend state: Application.households.length >= 1, Application.objects.length = 1
        households: [
          {
            householdId: 'test-household-001',
            // Minimal household data för att uppfylla length >= 1
          },
        ],
        objects: [
          {
            objectId,
            // Minimal object data för att uppfylla length = 1
          },
        ],
        // Förbättringar: timestamps, metadata
        createdAt: now, // Backend state: Application.createdAt = timestamp
        fetchedAt: now,
        updatedAt: now,
        version: 1,
      }),
    });
  });

  // ============================================
  // Mortgage Commitment API Mocks
  // ============================================
  await page.route('**/api/object/brf-information', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        objectId,
        brfNumber: 'BRF-12345',
        associationDebt: 3000, // SEK/m², < 5000 för happy path
        approved: true,
        // Förbättringar: mer detaljerad BRF-information
        associationName: 'Test Bostadsrättsförening',
        associationType: 'BOSTADSRATT',
        totalUnits: 50,
        yearBuilt: 2010,
        // Förbättringar: timestamps, metadata, relations
        fetchedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/mortgage-commitment/decision', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'APPROVED',
        wonBiddingRound: true,
        objectApproved: true,
        termsChanged: false,
        decision: 'Won bidding round / Interested in object',
        // Förbättringar: mer detaljerad commitment-information
        commitmentId: `commitment-${applicationId}`,
        decisionDate: now,
        decisionBy: customerId,
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        updatedAt: now,
        applicationId,
        objectId,
        version: 1,
      }),
    });
  });

  // ============================================
  // Object Valuation API Mocks
  // ============================================
  await page.route(`**/api/valuation/bostadsratt/${objectId}`, async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // Backend state: Object.valuation.complete = true, Object.valuation.value >= 1500000
        valuation: {
          complete: true,
          value: 2_500_000, // >= 1.5M SEK för happy path
          currency: 'SEK',
          valuationMethod: 'AUTOMATED',
          valuationDate: now,
        },
        propertyType: 'bostadsrätt',
        objectId,
        // Förbättringar: mer detaljerad objektinformation
        address: 'Testgatan 123, 123 45 Stockholm',
        area: 75, // m²
        rooms: 3,
        // Förbättringar: timestamps, metadata, relations
        fetchedAt: now,
        applicationId,
        valuationId: `valuation-bostadsratt-${objectId}`,
        version: 1,
      }),
    });
  });

  // ============================================
  // Credit Evaluation API Mocks
  // ============================================
  await page.route('**/api/pricing/price', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        price: {
          interestRate: 3.5,
          monthlyPayment: 12000,
          // Förbättringar: mer detaljerad pricing-information
          annualPercentageRate: 3.7,
          totalCost: 4_320_000, // total kostnad över 30 år
          effectiveRate: 3.5,
        },
        // Förbättringar: timestamps, metadata
        calculatedAt: now,
        priceId: `price-${applicationId}`,
        version: 1,
      }),
    });
  });

  await page.route('**/api/stacc/affordability', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        householdId: 'household-001',
        affordability: {
          maxLoanAmount: 2_200_000,
          approved: true,
          // Förbättringar: mer detaljerad affordability-information
          monthlyIncome: 50_000,
          monthlyExpenses: 30_000,
          disposableIncome: 20_000,
          affordabilityRatio: 0.24, // 24% av disponibel inkomst
        },
        // Förbättringar: timestamps, metadata
        calculatedAt: now,
        calculationId: `affordability-${applicationId}`,
        version: 1,
      }),
    });
  });

  await page.route('**/api/credit/personal-information', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stakeholderId: customerId,
        creditInformation: {
          creditScore: 750,
          status: 'GOOD',
          updated: true,
          // Förbättringar: mer detaljerad kreditinformation
          creditBureau: 'UC',
          creditReportDate: now,
          hasActiveLoans: false,
          totalDebt: 0,
          paymentHistory: 'EXCELLENT',
          creditUtilization: 0.1,
        },
        // Förbättringar: timestamps, metadata, relations
        fetchedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/risk/classification', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        riskClassification: 'LOW',
        riskScore: 25, // < 50 för happy path
        // Förbättringar: mer detaljerad risk-information
        riskFactors: [],
        riskLevel: 'LOW',
        requiresManualReview: false,
        // Förbättringar: timestamps, metadata
        classifiedAt: now,
        classificationId: `risk-${applicationId}`,
        version: 1,
      }),
    });
  });

  await page.route('**/api/credit-evaluation', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'APPROVED',
        automaticallyApproved: true,
        applicationId,
        // Förbättringar: mer detaljerad evaluation-information
        evaluationId: `evaluation-${applicationId}`,
        evaluationDate: now,
        riskLevel: 'LOW',
        approvalReason: 'AUTOMATIC_APPROVAL',
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        updatedAt: now,
        version: 1,
      }),
    });
  });

  // ============================================
  // KYC API Mocks
  // ============================================
  await page.route(`**/api/kyc/${customerId}`, async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        customerId,
        questionsNeeded: true, // För ny kund
        // Backend state: KYC.status = "APPROVED" (efter evaluate-kyc-aml)
        // Initial status är IN_PROGRESS, uppdateras till APPROVED efter evaluate-kyc-aml
        status: 'IN_PROGRESS',
        // Förbättringar: timestamps, metadata, relations
        fetchedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/kyc/aml-risk-score', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        amlRiskScore: 15, // < 30 för happy path
        customerId,
        // Förbättringar: mer detaljerad AML-risk-information
        riskLevel: 'LOW',
        riskFactors: [],
        // Förbättringar: timestamps, metadata, relations
        calculatedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/kyc/sanctions-pep-screening', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pepMatch: false,
        sanctionsMatch: false,
        customerId,
        // Förbättringar: mer detaljerad screening-information
        screeningDate: now,
        screeningSource: 'INTERNAL_DATABASE',
        // Förbättringar: timestamps, metadata, relations
        screenedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/dmn/evaluate-kyc-aml', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        decision: 'APPROVED',
        needsReview: false,
        customerId,
        // Backend state: KYC.status = "APPROVED", KYC.needsReview = false, KYC.amlRiskScore < 30, KYC.pepMatch = false, KYC.sanctionsMatch = false, KYC.selfDeclarationSubmitted = true
        status: 'APPROVED',
        amlRiskScore: 15, // < 30 för happy path
        pepMatch: false,
        sanctionsMatch: false,
        selfDeclarationSubmitted: true,
        // Förbättringar: mer detaljerad evaluation-information
        evaluationId: `kyc-eval-${customerId}`,
        evaluationMethod: 'AUTOMATED',
        evaluationReason: 'LOW_RISK',
        // Förbättringar: timestamps, metadata, relations
        evaluatedAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  // ============================================
  // Credit Decision API Mocks
  // ============================================
  await page.route('**/api/credit-decision', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'APPROVED',
        decision: 'APPROVED',
        applicationId,
        // Backend state: CreditDecision.status = "APPROVED", CreditDecision.approved = true
        approved: true,
        // Förbättringar: mer detaljerad decision-information
        decisionId: `decision-${applicationId}`,
        decisionDate: now,
        decisionType: 'AUTOMATIC',
        decisionReason: 'LOW_RISK',
        // Förbättringar: timestamps, metadata
        createdAt: now,
        updatedAt: now,
        version: 1,
      }),
    });
  });

  // ============================================
  // Offer API Mocks
  // ============================================
  await page.route(`**/api/offer/${applicationId}`, async (route: Route) => {
    const now = new Date().toISOString();
    const offerValidUntil = new Date();
    offerValidUntil.setMonth(offerValidUntil.getMonth() + 3); // 3 månader framåt
    const disbursementDate = new Date();
    disbursementDate.setMonth(disbursementDate.getMonth() + 6); // 6 månader framåt
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        loanAmount: 2_000_000,
        accountNumber: '1234567890',
        dates: {
          offerValidUntil: offerValidUntil.toISOString().split('T')[0],
          disbursementDate: disbursementDate.toISOString().split('T')[0],
        },
        // Backend state: Offer.contractAssessed = true, Offer.loanAmount = validated, Offer.accountNumber = validated, Offer.dates = validated
        contractAssessed: true,
        // Förbättringar: mer detaljerad offer-information
        offerId: `offer-${applicationId}`,
        interestRate: 3.5,
        monthlyPayment: 12000,
        loanTerm: 30, // år
        // Förbättringar: timestamps, metadata
        createdAt: now,
        updatedAt: now,
        version: 1,
      }),
    });
  });

  await page.route('**/api/offer/accept', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ACCEPTED',
        decision: 'ACCEPT',
        applicationId,
        // Backend state: Offer.status = "ACCEPTED", Offer.decision = "ACCEPT", Offer.contractAssessed = true, Offer.loanAmount = validated, Offer.accountNumber = validated, Offer.dates = validated
        contractAssessed: true,
        loanAmount: 'validated',
        accountNumber: 'validated',
        dates: 'validated',
        // Förbättringar: mer detaljerad accept-information
        acceptedAt: now,
        acceptedBy: customerId,
        offerId: `offer-${applicationId}`,
        // Förbättringar: timestamps, metadata
        createdAt: now,
        updatedAt: now,
        version: 1,
      }),
    });
  });

  // ============================================
  // Document Generation API Mocks
  // ============================================
  await page.route('**/api/document-generation/prepare-loan', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        loanPrepared: true,
        loanParts: [
          {
            partId: 'part-1',
            amount: 2_000_000,
            // Förbättringar: mer detaljerad loan part-information
            interestRate: 3.5,
            term: 30, // år
            type: 'PRIMARY',
          },
        ],
        // Förbättringar: timestamps, metadata
        preparedAt: now,
        preparationId: `prepare-${applicationId}`,
        version: 1,
      }),
    });
  });

  await page.route('**/api/document-generation/generate-documents', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'COMPLETE',
        // Backend state: DocumentGeneration.status = "COMPLETE", DocumentGeneration.documents.length > 0
        documents: [
          {
            id: 'doc-1',
            type: 'loan-agreement',
            name: 'Låneavtal.pdf',
            // Förbättringar: mer detaljerad dokumentinformation
            size: 245678, // bytes
            mimeType: 'application/pdf',
            generatedAt: now,
            version: 1,
          },
          {
            id: 'doc-2',
            type: 'terms',
            name: 'Villkor.pdf',
            size: 123456,
            mimeType: 'application/pdf',
            generatedAt: now,
            version: 1,
          },
        ],
        applicationId,
        // Förbättringar: timestamps, metadata
        generatedAt: now,
        documentGenerationId: `doc-gen-${applicationId}`,
        totalDocuments: 2,
        version: 1,
      }),
    });
  });

  // ============================================
  // Signing API Mocks
  // ============================================
  await page.route('**/api/signing/upload-document', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        documentId: 'uploaded-doc-1',
        status: 'UPLOADED',
        // Förbättringar: mer detaljerad upload-information
        fileName: 'loan-agreement.pdf',
        fileSize: 245678, // bytes
        mimeType: 'application/pdf',
        uploadedAt: now,
        // Förbättringar: timestamps, metadata, relations
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/signing/create-sign-order', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signOrderId: 'sign-order-1',
        status: 'CREATED',
        // Förbättringar: mer detaljerad sign order-information
        documentId: 'uploaded-doc-1',
        signeeId: customerId,
        signingProvider: 'BANKID',
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/signing/digital-signature', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signatureType: 'PADES',
        status: 'SIGNED',
        signOrderId: 'sign-order-1',
        // Förbättringar: mer detaljerad signature-information
        signedAt: now,
        signedBy: customerId,
        signatureId: 'signature-1',
        certificateSerialNumber: 'CERT-12345',
        // Förbättringar: timestamps, metadata, relations
        applicationId,
        version: 1,
      }),
    });
  });

  await page.route('**/api/signing/store-signed-document', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // Backend state: Signing.status = "COMPLETE", Signing.allDocumentsSigned = true, Signing.method = "DIGITAL", Signing.signatureType = "PADES", Signing.allSignOrdersComplete = true
        status: 'COMPLETE',
        documentId: 'signed-doc-1',
        allDocumentsSigned: true,
        method: 'DIGITAL',
        signatureType: 'PADES',
        allSignOrdersComplete: true,
        // Förbättringar: mer detaljerad signing-information
        signedDocuments: [
          {
            documentId: 'signed-doc-1',
            signedAt: now,
            signedBy: customerId,
            signatureType: 'PADES',
          },
        ],
        // Förbättringar: timestamps, metadata, relations
        storedAt: now,
        applicationId,
        signingId: `signing-${applicationId}`,
        version: 1,
      }),
    });
  });

  // ============================================
  // Disbursement API Mocks
  // ============================================
  await page.route('**/api/disbursement/handle', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        disbursementStatus: 'INITIATED',
        disbursementId: 'disbursement-001',
        // Backend state: Disbursement.status = "COMPLETE" (efter archive-documents)
        status: 'INITIATED', // Uppdateras till "COMPLETE" efter archive-documents
        // Förbättringar: mer detaljerad disbursement-information
        amount: 2_000_000,
        currency: 'SEK',
        targetAccount: '1234567890',
        initiatedAt: now,
        // Förbättringar: timestamps, metadata
        createdAt: now,
        version: 1,
      }),
    });
  });

  await page.route('**/api/disbursement/archive-documents', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // Backend state: Disbursement.status = "COMPLETE", Disbursement.documentsArchived = true
        status: 'COMPLETE',
        documentsArchived: true,
        applicationId,
        archivedDocuments: [
          {
            id: 'doc-1',
            archived: true,
            archivedAt: now,
            archiveLocation: 'ARCHIVE-001',
          },
          {
            id: 'doc-2',
            archived: true,
            archivedAt: now,
            archiveLocation: 'ARCHIVE-001',
          },
        ],
        // Förbättringar: mer detaljerad archive-information
        totalArchived: 2,
        archiveLocation: 'ARCHIVE-001',
        // Förbättringar: timestamps, metadata
        archivedAt: now,
        disbursementId: `disbursement-${applicationId}`,
        version: 1,
      }),
    });
  });

  // ============================================
  // Collateral Registration API Mocks
  // ============================================
  await page.route('**/api/collateral-registration/distribute-notice', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        objectId,
        status: 'DISTRIBUTED',
        noticeDistributed: true,
        propertyType: 'BOSTADSRATT',
        brfNumber: 'BRF-12345',
        distributedAt: now,
        // Förbättringar: mer detaljerad distribution-information
        distributionMethod: 'EMAIL',
        distributionRecipient: 'brf@example.com',
        noticeId: `notice-${applicationId}`,
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        version: 1,
      }),
    });
  });

  await page.route('**/api/collateral-registration/verify', async (route: Route) => {
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applicationId,
        objectId,
        status: 'VERIFIED',
        verified: true,
        propertyType: 'BOSTADSRATT',
        verifiedAt: now,
        collateralRegistrationId: 'collateral-reg-001',
        // Backend state: CollateralRegistration.status = "VERIFIED", CollateralRegistration.propertyType = "BOSTADSRATT", CollateralRegistration.distributed = true, CollateralRegistration.verified = true
        distributed: true,
        // Förbättringar: mer detaljerad verification-information
        verifiedBy: 'BRF',
        verificationMethod: 'AUTOMATED',
        verificationReference: 'VER-12345',
        // Förbättringar: timestamps, metadata, relations
        createdAt: now,
        updatedAt: now,
        version: 1,
      }),
    });
  });
}

