# Förbättringar av Playwright-test för E2E_BR001

**Datum:** 2025-01-XX  
**Fil:** `tests/playwright-e2e/scenarios/happy-path/mortgage-bostadsratt-happy.spec.ts`

---

## Genomförda förbättringar

### 1. Strukturerad test-arkitektur

Testet är nu uppdelat i **14 test.step() sektioner** som motsvarar varje steg i `bankProjectTestSteps`:

1. **Application** - Kunden fyller i komplett ansökan
2. **Is purchase?** - Gateway avgör om ansökan är för köp
3. **Mortgage Commitment** - Systemet godkänner och kund fattar beslut
4. **Object Valuation** - Systemet hämtar bostadsrättsvärdering
5. **Credit Evaluation** - Systemet utvärderar kredit automatiskt
6. **Is automatically approved?** - Gateway avgör om ansökan kan godkännas automatiskt
7. **KYC** - Systemet genomför KYC-screening automatiskt med självdeklaration
8. **Credit Decision** - Systemet fattar kreditbeslut
9. **Is credit approved?** - Gateway avgör om kredit är godkänd
10. **Offer** - Systemet förbereder erbjudande och kunden accepterar
11. **Document Generation** - Systemet genererar lånedokument
12. **Signing** - Kunden signerar dokument digitalt
13. **Disbursement** - Systemet genomför utbetalning och arkiverar dokument
14. **Needs collateral registration?** - Gateway avgör om säkerhetsregistrering behövs

### 2. Dokumentation per steg

Varje steg innehåller:
- **Kommentarer** som beskriver vad som ska hända
- **UI-interaktioner** dokumenterade med page IDs och locator IDs (från `bankProjectTestSteps`)
- **API-anrop** dokumenterade med endpoints (från `bankProjectTestSteps`)
- **Assertions** dokumenterade med förväntade resultat (från `bankProjectTestSteps`)
- **Backend state** dokumenterat med förväntade värden (från `bankProjectTestSteps`)
- **TODO-kommentarer** för faktiska implementationer när UI/API är klara

### 3. Final Verification

Ett sista steg verifierar att:
- Alla huvudsteg finns i processträdet
- Gateway-beslut finns i trädet (happy path)
- Bostadsrätt-specifika element finns i trädet

---

## Genomförda förbättringar (2025-01-XX)

### UI-interaktioner - Komplett struktur

För varje steg med `uiInteraction` har vi nu skapat detaljerade helper-funktioner i `uiInteractionHelpers.ts`:

1. **Application (`ApplicationUiHelpers`):**
   - ✅ `navigateToStart()` - Navigerar till application-start och väntar på internal-data-gathering
   - ✅ `verifyPreScreenApproved()` - Verifierar pre-screen-result-approved
   - ✅ `navigateToHousehold()` - Navigerar till household och verifierar att registrering behövs
   - ✅ `fillHouseholdEconomy()` - Fyller i household economy information
   - ✅ `navigateToStakeholder()` - Navigerar till stakeholders → stakeholder
   - ✅ `verifyPersonalInformationApproved()` - Verifierar personal information approved
   - ✅ `fillPersonalEconomy()` - Fyller i personal economy information
   - ✅ `fillObjectInformation()` - Fyller i objektinformation (bostadsrätt)
   - ✅ `confirmApplication()` - Bekräftar ansökan
   - ✅ `completeApplicationFlow()` - Komplett Application-flöde (alla steg i rätt ordning)

2. **Mortgage Commitment (`MortgageCommitmentUiHelpers`):**
   - ✅ `navigateToDecide()` - Navigerar till decide-on-mortgage-commitment
   - ✅ `verifyPreConditions()` - Verifierar credit-evaluation-1 approved och is-mortgage-commitment-approved = Yes
   - ✅ `decideMortgageCommitment()` - Fattar mortgage commitment beslut
   - ✅ `completeMortgageCommitmentFlow()` - Komplett Mortgage Commitment-flöde

3. **KYC (`KycUiHelpers`):**
   - ✅ `navigateToStart()` - Navigerar till KYC-start
   - ✅ `navigateToSelfDeclaration()` - Navigerar till submit-self-declaration
   - ✅ `fillSelfDeclaration()` - Fyller i självdeklaration
   - ✅ `verifyKycProcess()` - Verifierar KYC-processen (efter submit)
   - ✅ `completeKycFlow()` - Komplett KYC-flöde

4. **Offer (`OfferUiHelpers`):**
   - ✅ `navigateToStart()` - Navigerar till offer-start
   - ✅ `verifySalesContractAssessed()` - Verifierar sales-contract-assessed = Yes
   - ✅ `navigateToDecideOffer()` - Navigerar till decide-offer
   - ✅ `reviewOfferDetails()` - Granskar offer-details
   - ✅ `acceptOffer()` - Accepterar erbjudande
   - ✅ `completeOfferFlow()` - Komplett Offer-flöde

5. **Signing (`SigningUiHelpers`):**
   - ✅ `navigateToStart()` - Navigerar till signing-start
   - ✅ `verifySigningMethodDigital()` - Verifierar signing-methods = Digital
   - ✅ `handleDocumentPackages()` - Hanterar per-digital-document-package (multi-instance)
   - ✅ `handleSignees()` - Hanterar per-signee (multi-instance)
   - ✅ `handleSignOrders()` - Hanterar per-sign-order (multi-instance)
   - ✅ `verifySigningCompleted()` - Verifierar att signering är slutförd
   - ✅ `completeSigningFlow()` - Komplett Signing-flöde

### Nästa steg för full implementation

Alla UI-interaktioner är nu strukturerade och redo att aktiveras när UI-routes och formulär är klara. Helper-funktionerna kan användas direkt i testet genom att avkommentera anropen i `mortgage-bostadsratt-happy.spec.ts`.

### API-anrop (TODO)

För varje steg med `apiCall` behöver vi implementera:

1. **Mockning eller verifiering av:**
   - `GET /api/valuation/bostadsratt/{objectId}`
   - `POST /api/credit-evaluation`
   - `GET /api/kyc/{customerId}`
   - `POST /api/kyc/aml-risk-score`
   - `POST /api/kyc/sanctions-pep-screening`
   - `POST /api/dmn/evaluate-kyc-aml`
   - `POST /api/credit-decision`
   - `GET /api/offer/{applicationId}`
   - `POST /api/offer/accept`
   - `POST /api/document-generation`
   - `POST /api/signing/upload-document`
   - `POST /api/signing/create-sign-order`
   - `POST /api/signing/digital-signature`
   - `POST /api/signing/store-signed-document`
   - `POST /api/disbursement`
   - `POST /api/mortgage-commitment/decision`

### Backend State Verification (TODO)

För varje steg med `backendState` behöver vi implementera:

1. **Verifiering av:**
   - Application.status = "COMPLETE"
   - MortgageCommitment.status = "APPROVED"
   - Object.valuation.complete = true
   - CreditEvaluation.status = "APPROVED"
   - KYC.status = "APPROVED"
   - CreditDecision.status = "APPROVED"
   - Offer.status = "ACCEPTED"
   - DocumentGeneration.status = "COMPLETE"
   - Signing.status = "COMPLETE"
   - Disbursement.status = "COMPLETE"

### Gateway-beslut (TODO)

För varje gateway behöver vi implementera:

1. **Verifiering av:**
   - is-purchase = Yes
   - is-automatically-approved = Yes
   - is-credit-approved = Yes
   - needs-collateral-registration = No

---

## Fördelar med den nya strukturen

1. **Tydlig mappning:** Varje teststeg mappar direkt till `bankProjectTestSteps`
2. **Lätt att implementera:** TODO-kommentarer visar exakt vad som behöver implementeras
3. **Dokumenterad:** Varje steg har kommentarer som förklarar vad som ska hända
4. **Testbar:** Testet kan köras redan nu (verifierar processträd) och kan förbättras stegvis
5. **Underhållbart:** När UI/API är klara, kan vi enkelt ersätta TODO-kommentarer med faktisk kod

---

## Status

✅ **Struktur klar** - Testet är strukturerat och dokumenterat  
⏳ **Implementation pending** - Faktiska UI-interaktioner och API-anrop väntar på att UI/API är klara

---

## Nästa steg

1. **Implementera UI-interaktioner** när formulär och routes är klara
2. **Mocka eller verifiera API-anrop** när endpoints är tillgängliga
3. **Verifiera backend state** när API är tillgängligt
4. **Verifiera gateway-beslut** när process-engine är tillgänglig

