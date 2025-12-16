# Metodik för att systematiskt identifiera alla ServiceTasks i E2E-tester

## Problem

Vi missade flera uppenbara ServiceTasks när vi skapade E2E_BR001, vilket ledde till ofullständig dokumentation av API-anrop.

## Rotorsak

1. **Manuell analys var ofullständig**: Vi förlitade oss på manuell läsning av BPMN-filer och dokumentation, vilket ledde till att ServiceTasks i subprocesser missades.

2. **Ingen systematisk verifiering**: Vi hade ingen metodik för att verifiera att alla ServiceTasks var dokumenterade.

## Lösning: Systematisk extraktion och validering

### Steg 1: Extrahera alla ServiceTasks från BPMN-filer

Använd scriptet `scripts/extract-all-servicetasks.ts` för att systematiskt extrahera alla ServiceTasks från alla BPMN-filer som används i ett E2E-scenario.

```bash
npx tsx scripts/extract-all-servicetasks.ts E2E_BR001
```

Detta genererar en fil `docs/E2E_BR001_SERVICETASKS.md` med alla ServiceTasks.

### Steg 2: Mappa ServiceTasks till E2E-steg

För varje ServiceTask, identifiera:
1. **Vilket E2E-steg** den tillhör (vilken CallActivity/subprocess)
2. **Vilket API-anrop** den gör (från Feature Goals eller BPMN-dokumentation)
3. **Om den är dokumenterad** i `E2eTestsOverviewPage.tsx`

### Steg 3: Verifiera mot Feature Goals

För varje ServiceTask, kontrollera Feature Goal-filen för att hitta:
- API-endpoint
- HTTP-metod
- Request/response-struktur
- Timeout och retry-logik

### Steg 4: Uppdatera E2E-dokumentation

Lägg till alla saknade ServiceTasks i `apiCall`-fältet för rätt steg i `E2eTestsOverviewPage.tsx`.

## Checklista för nästa E2E-scenario

När du skapar ett nytt E2E-scenario:

- [ ] Kör `extract-all-servicetasks.ts` för att extrahera alla ServiceTasks
- [ ] Identifiera vilka BPMN-filer som används i scenariot
- [ ] För varje ServiceTask, hitta motsvarande API-anrop i Feature Goals
- [ ] Verifiera att alla ServiceTasks är dokumenterade i `apiCall`-fältet
- [ ] Skapa mocks för alla API-anrop i Playwright-testet
- [ ] Verifiera att alla ServiceTasks har korrekt `backendState`-assertion

## ServiceTasks i E2E_BR001 (24 totalt)

### Application (2)
- ✅ KALP (`Activity_0p3rqyp`)
- ✅ Fetch credit information (`fetch-credit-information`)

### Internal Data Gathering (2)
- ✅ Fetch party information (`fetch-party-information`)
- ✅ Fetch engagements (`fetch-engagements`)

### Object (1)
- ⚠️ Valuate bostad (`valuate-property`) - **Kontrollera om denna används i E2E_BR001**

### Stakeholder (1)
- ⚠️ Fetch personal information (`fetch-personal-information`) - **Kontrollera om denna används i E2E_BR001**

### Object Information (2)
- ⚠️ Fetch fastighets-information (`fetch-fastighets-information`) - **Används endast för småhus, inte bostadsrätt**
- ✅ Fetch BRF information (`fetch-brf-information`)

### Object Valuation (2)
- ⚠️ Fetch fastighets-valuation (`fetch-fastighets-valuation`) - **Används endast för småhus, inte bostadsrätt**
- ✅ Fetch bostadsrätts-valuation (`fetch-bostadsratts-valuation`)

### Credit Evaluation (4)
- ✅ Fetch price (`fetch-price`)
- ✅ Fetch risk classification (`fetch-risk-classification`)
- ✅ Calculate household affordabilty (`calculate-household-affordability`)
- ⚠️ Fetch credit information (`fetch-credit-information`) - **Kontrollera om denna är samma som i Application**

### KYC (3)
- ✅ Fetch KYC (`fetch-kyc`)
- ✅ Fetch AML / KYC risk score (`fetch-aml-kyc-risk`)
- ✅ Fetch sanctions and PEP (`fetch-screening-and-sanctions`)

### Document Generation (2)
- ✅ Generate Document (`generate-documents`)
- ✅ Prepare loan (`Activity_1qsvac1`)

### Signing (3)
- ✅ Store signed documents (`store-signed-document`)
- ✅ Upload document (`upload-document`)
- ✅ Create sign order (`create-signing-order`)

### Disbursement (2)
- ✅ Handle disbursement (`handle-disbursement`)
- ✅ Archive documents (`archive-documents`)

## Nästa steg

1. Verifiera att alla ServiceTasks som är relevanta för E2E_BR001 (happy path, bostadsrätt) är dokumenterade
2. Uppdatera `E2eTestsOverviewPage.tsx` med alla saknade ServiceTasks
3. Uppdatera Playwright-testet med mocks för alla API-anrop
4. Använd denna metodik för alla framtida E2E-scenarion

