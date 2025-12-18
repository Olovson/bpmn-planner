# Innehållskvalitetsanalys - Förbättringar för Systembyggande

**Datum:** 2025-01-27  
**Syfte:** Identifiera vad som faktiskt saknas i dokumentationen och vad som ger bäst effekt för att bygga det faktiska systemet

---

## 📊 Faktisk Status (Grundlig Analys)

### ✅ Vad som FINNS (och är bra)

**Feature Goals (CallActivities):**
- ✅ Omfattande affärslogik, effekt, user stories
- ✅ Tekniska krav (timeout, retry, error codes) - **FINNS**
- ✅ Implementation Mapping (routes/endpoints) - **FINNS**
- ✅ UI Flow-tabeller - **FINNS** (men ofullständiga, se nedan)

**Epics (UserTasks, ServiceTasks, BusinessRuleTasks):**
- ✅ Detaljerad affärslogik, inputs/outputs, funktionellt flöde
- ✅ API-dokumentation med endpoints, request/response, felkoder - **FINNS**
- ✅ Externa API:er dokumenterade - **FINNS**
- ✅ Timeout och retry nämns - **FINNS**
- ✅ Felhantering dokumenterad - **FINNS**

**E2E Test Scenarios:**
- ✅ Mycket detaljerade UI-interaktioner med page IDs, locator IDs
- ✅ Exakta API-anrop med HTTP-metoder
- ✅ Backend states dokumenterade
- ✅ DMN-beslut dokumenterade

### ❌ Vad som SAKNAS eller är OFULLSTÄNDIGT (baserat på faktisk analys)

**1. UI Flow-tabeller i Feature Goals (KRITISKT) ⭐⭐⭐**
- **Problem:** Många UI Flow-tabeller har TODO eller saknar specifika locator IDs
- **Exempel:** `consent-to-credit-check` saknar specifika page IDs och locator IDs
- **Effekt:** Utvecklare måste gissa eller fråga om UI-locators
- **Bevis:** `docs/E2E_MISSING_USER_STORIES.md` dokumenterar detta

**2. Implementation Mapping - ofullständigt (HÖG PRIORITET) ⭐⭐**
- **Problem:** Vissa aktiviteter saknas i Implementation Mapping (t.ex. KALP, Screen KALP, gateways)
- **Exempel:** `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` identifierar saknade aktiviteter
- **Effekt:** Utvecklare vet inte vilka routes/endpoints som ska användas
- **Bevis:** Dokumenterat i `TEST_SCENARIOS_ANALYSIS.md`

**3. JSON Schemas för API-kontrakt (MEDEL PRIORITET) ⭐**
- **Problem:** Request/Response finns i textformat men saknar strukturerade JSON schemas
- **Exempel:** `{ "personnummer": "string", "applicationId": "uuid" }` finns men inte som JSON Schema
- **Effekt:** Utvecklare kan inte generera TypeScript-typer automatiskt
- **Värde:** Nice-to-have, men inte blockerande

**4. UI/UX-specifikationer för UserTasks (MEDEL PRIORITET) ⭐**
- **Problem:** Routes nämns men inte detaljerade komponenter/formulär/validering
- **Exempel:** `consent-to-credit-check` nämner routes men saknar form field specs
- **Effekt:** Frontend-utvecklare måste gissa formulärstruktur
- **Värde:** Viktigt för frontend, men E2E-scenarion täcker mycket redan

**5. Testdata-värden (LÅG PRIORITET)**
- **Problem:** Testdata-referenser finns men saknar konkreta värden
- **Exempel:** "customer-standard" refereras men värden saknas
- **Effekt:** Testare måste skapa testdata manuellt
- **Värde:** Viktigt för tester, men inte blockerande för implementation

---

## 🎯 Prioriterade Förbättringar (Högsta Effekt)

### 1. Teknisk Implementation-dokumentation för alla Leaf Nodes (KRITISKT) ⭐⭐⭐

**Problem:**
- UI Flow-tabeller i Feature Goals har TODO eller saknar specifika locator IDs
- Page IDs är generiska eller saknas
- Data Profile-referenser saknar konkreta värden
- **Bevis:** `docs/E2E_MISSING_USER_STORIES.md` dokumenterar detta för flera user tasks

**Vad som behövs:**
1. **Specifika Page IDs**
   - Exakta routes (t.ex. `/application/stakeholder/consent` istället för generiska)
   - Navigation paths mellan sidor

2. **Specifika Locator IDs**
   - Formulärfält (t.ex. `input-consent-checkbox`, `btn-submit-consent`)
   - UI-element (t.ex. `success-message-consent`, `error-message-consent`)
   - Navigation (t.ex. `nav-next-step`, `nav-back`)

3. **Data Profile-värden**
   - Konkreta testdata-värden (inte bara referenser)
   - Exempel: `{ "consentToCreditCheck": true, "consentDate": "2025-01-27" }`

4. **UI States**
   - Loading states
   - Success states
   - Error states
   - Validation states

**Effekt:**
- **Högsta prioritet** - Frontend-utvecklare kan direkt implementera UI utan att gissa
- Testare kan skriva Playwright-tester direkt
- Minskar frågor och iterationer
- **Bevis:** `docs/README_FOR_TESTLEAD.md` nämner att "Inga riktiga routes/endpoints" och "Inga UI locators" är huvudproblemen

**Exempel på vad som saknas:**
```
Service Task: fetch-party-information
- API: GET /api/party/information
- Request Schema: { personnummer: string, applicationId: uuid }
- Response Schema: { partyInformation: {...}, status: string }
- Timeout: 5 sekunder
- Retry: 3 försök med exponential backoff (1s, 2s, 4s)
- Felkoder: 400, 404, 500, 503
- Externa system: SPAR/Skatteverket, Core Banking System
```

---

### 2. Komplettera Implementation Mapping (HÖG PRIORITET) ⭐⭐

**Problem:**
- Vissa aktiviteter saknas i Implementation Mapping-tabellen
- Gateways saknas (t.ex. KALP OK gateway, Skip step gateway)
- Vissa ServiceTasks saknas (t.ex. KALP, Fetch credit information)
- **Bevis:** `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` identifierar specifika saknade aktiviteter

**Vad som behövs:**
1. **Saknade ServiceTasks**
   - KALP service task: `/api/application/kalp` (POST)
   - Fetch credit information: `/api/application/fetch-credit-information` (POST)
   - Timeout-värden och retry-strategi

2. **Saknade Gateways**
   - KALP OK gateway (logisk gateway, behöver dokumenteras)
   - Skip step gateway (logisk gateway)
   - Sammanför flöden gateway (logisk gateway)

3. **Saknade DMN-anrop**
   - Screen KALP DMN: `/api/dmn/screen-kalp` (POST)
   - Timeout-värden för DMN-evaluering

4. **Timeout boundary events**
   - Timeout boundary event på "Confirm application" (30 dagar)
   - Vad som händer vid timeout

**Effekt:**
- Utvecklare vet exakt vilka endpoints som ska användas
- Inga gissningar om routes/endpoints
- Komplett bild av alla integrationer
- **Bevis:** `docs/README_FOR_TESTLEAD.md` nämner att "Inga riktiga routes/endpoints" är ett huvudproblem

---

### 3. JSON Schemas för API-kontrakt (MEDEL PRIORITET) ⭐

**Problem:**
- Request/Response finns i textformat men saknar strukturerade JSON schemas
- Utvecklare kan inte generera TypeScript-typer automatiskt
- Valideringsregler är oklara (required, format, min/max)

**Vad som behövs:**
1. **JSON Schema för ServiceTask API-anrop**
   - Request schema med tydliga fält och typer
   - Response schema med tydliga fält och typer
   - Valideringsregler (required, format, min/max, enum)
   - Exempel på request/response

2. **Form Data Schemas för UserTasks**
   - Form field schemas
   - Validation rules (client-side och server-side)
   - Field types och constraints

**Effekt:**
- Utvecklare kan generera TypeScript-typer från schemas
- API-kontrakt kan valideras automatiskt
- Minska integration-fel genom tydliga kontrakt
- **Värde:** Nice-to-have, men inte blockerande (textformat fungerar också)

---

### 4. UI/UX-specifikationer för UserTasks (MEDEL PRIORITET) ⭐

**Problem:**
- Routes nämns men inte detaljerade komponenter/formulär/validering
- Formulärstruktur är oklar
- Valideringsregler saknas eller är ofullständiga

**Vad som behövs:**
1. **Formulär-specifikationer**
   - Form fields med typer och constraints
   - Validation rules (client-side och server-side)
   - Error messages per fält
   - UI component props

2. **UI States**
   - Loading states
   - Success states
   - Error states
   - Validation states

**Effekt:**
- Frontend-utvecklare kan direkt implementera formulär
- Tydlig validering minskar buggar
- **Värde:** Viktigt för frontend, men E2E-scenarion täcker mycket redan

---

### 5. Data Models och Databas-scheman (LÅG PRIORITET)

**Problem:**
- Databas-scheman saknas
- Data models är inte dokumenterade
- Relationer mellan entiteter är oklara

**Vad som behövs:**
1. **Databas-scheman**
   - Tabeller och kolumner
   - Relationer mellan tabeller
   - Index och constraints
   - Data types

2. **Data models**
   - Entiteter och deras relationer
   - Dataflöden
   - State transitions

**Effekt:**
- Bättre förståelse för datastruktur
- Identifiera data-dependencies
- Planera för databas-ändringar

---

## 📋 Rekommenderad Implementeringsordning (Baserat på Faktisk Analys)

### Fas 1: Komplettera UI Flow-tabeller (2-3 veckor) ⭐⭐⭐
1. Gå igenom alla Feature Goals och identifiera TODO i UI Flow-tabeller
2. Lägg till specifika Page IDs (routes)
3. Lägg till specifika Locator IDs (formulärfält, knappar, meddelanden)
4. Lägg till konkreta Data Profile-värden
5. Dokumentera UI States (loading, success, error)

**Prioritet:** KRITISKT - Ger direkt värde för frontend-utveckling och testning
**Bevis:** `docs/E2E_MISSING_USER_STORIES.md` och `docs/README_FOR_TESTLEAD.md` identifierar detta som huvudproblem

### Fas 2: Komplettera Implementation Mapping (1-2 veckor) ⭐⭐
1. Identifiera saknade aktiviteter (KALP, Screen KALP, Fetch credit information)
2. Lägg till saknade ServiceTasks i Implementation Mapping
3. Dokumentera gateways (KALP OK, Skip step, etc.)
4. Lägg till timeout boundary events

**Prioritet:** HÖG - Utvecklare vet exakt vilka endpoints som ska användas
**Bevis:** `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` identifierar specifika saknade aktiviteter

### Fas 3: Teknisk Implementation-detaljer (1 vecka)
1. Standardisera timeout-värden
2. Dokumentera retry-strategier
3. Förbättra felhantering-dokumentation

**Prioritet:** MEDEL - Förbättrar robusthet

### Fas 4: UI/UX-specifikationer (1 vecka) ⭐
1. Skapa formulär-specifikationer för UserTasks
2. Dokumentera validation rules
3. Lägg till UI state-dokumentation

**Prioritet:** MEDEL - Viktigt för frontend, men E2E-scenarion täcker mycket redan

---

## 🔍 Exempel på Vad Som Behövs

### Exempel 1: Service Task - fetch-party-information

**Nuvarande dokumentation:**
- Finns i Epic-dokumentationen men fokuserar på affärslogik
- API-anrop nämns men saknar detaljer
- Teknisk information saknas

**Förbättrad dokumentation behöver:**
```markdown
## API-kontrakt

### Endpoint
- **URL:** `GET /api/party/information`
- **Method:** GET
- **Authentication:** OAuth 2.0 Bearer token

### Request
```json
{
  "personnummer": "string (required, format: YYYYMMDD-XXXX)",
  "applicationId": "uuid (required)",
  "kundnummer": "string (optional)"
}
```

### Response (200 OK)
```json
{
  "partyInformation": {
    "namn": "string",
    "adress": {
      "gata": "string",
      "postnummer": "string",
      "ort": "string"
    },
    "kontaktuppgifter": {
      "telefon": "string",
      "email": "string"
    }
  },
  "status": "success",
  "metadata": {
    "datakälla": "SPAR",
    "timestamp": "ISO8601"
  }
}
```

### Error Responses
- **400 Bad Request:** Invalid personnummer format
- **404 Not Found:** Personnummer not found
- **500 Internal Server Error:** System error
- **503 Service Unavailable:** External system unavailable

### Timeout och Performance
- **Request Timeout:** 5 sekunder
- **External API Timeout:** 3 sekunder
- **P95 Response Time:** < 200ms
- **P99 Response Time:** < 500ms

### Retry-strategi
- **Antal försök:** 3
- **Exponential Backoff:** 1s, 2s, 4s
- **Retry på:** 500, 503
- **Ingen retry på:** 400, 404

### Externa system
- **SPAR/Skatteverket**
  - API: `/api/part/{identifier}`
  - Version: v1.0
  - Rate Limit: 100 requests/minut
  - SLA: 99.9% uptime
  - Kontakt: api-support@skatteverket.se

- **Core Banking System**
  - API: `/api/customers/{kundnummer}`
  - Version: v2.1
  - Rate Limit: 200 requests/minut
  - SLA: 99.95% uptime
  - Kontakt: core-banking-team@bank.se
```

### Exempel 2: User Task - consent-to-credit-check

**Nuvarande dokumentation:**
- Finns i Epic-dokumentationen men fokuserar på affärslogik
- UI-flöde nämns men saknar tekniska detaljer
- Formulär och validering saknas

**Förbättrad dokumentation behöver:**
```markdown
## UI/UX-specifikation

### Routes
- **Path:** `/application/stakeholder/consent-to-credit-check`
- **Route Component:** `ConsentToCreditCheckPage`
- **Navigation:** Från `/application/stakeholder` via "Nästa steg"-knapp

### Formulär
- **Component:** `ConsentToCreditCheckForm`
- **Fields:**
  - `consentToCreditCheck` (boolean, required)
  - `consentDate` (date, auto-filled on consent)
  - `stakeholderId` (uuid, hidden, from context)

### Validation Rules
- **Client-side:**
  - `consentToCreditCheck` måste vara `true` för att fortsätta
  - Formulär kan inte submittas utan consent
- **Server-side:**
  - `stakeholderId` måste existera i databasen
  - Consent måste sparas med timestamp

### UI States
- **Initial:** Formulär visas med checkbox
- **Loading:** Spinner när consent sparas
- **Success:** Bekräftelsemeddelande och navigation till nästa steg
- **Error:** Felmeddelande och möjlighet att försöka igen

### Timeout
- **User Task Timeout:** 30 dagar (kund kan ta sin tid)
- **Form Submission Timeout:** 30 sekunder
```

### Exempel 3: Business Rule Task - pre-screen-party

**Nuvarande dokumentation:**
- DMN-beslut nämns men teknisk integration saknas
- Input/output är oklart

**Förbättrad dokumentation behöver:**
```markdown
## DMN-integration

### DMN Tabell
- **DMN File:** `pre-screen-party.dmn`
- **Decision ID:** `preScreenPartyDecision`
- **DMN Engine:** Camunda DMN Engine v1.3

### Input Schema
```json
{
  "age": "number (required, >= 18)",
  "hasValidId": "boolean (required)",
  "hasSwedishResidency": "boolean (required)",
  "applicationType": "string (required, enum: ['PURCHASE', 'REFINANCE'])"
}
```

### Output Schema
```json
{
  "decision": "string (enum: ['APPROVED', 'REJECTED', 'MANUAL_REVIEW'])",
  "reason": "string (optional)",
  "riskLevel": "string (enum: ['LOW', 'MEDIUM', 'HIGH'])"
}
```

### Timeout
- **DMN Evaluation Timeout:** 10 sekunder
- **Retry:** Ingen retry (DMN är deterministisk)

### Error Handling
- **DMN Engine Error:** Logga fel och returnera MANUAL_REVIEW
- **Timeout:** Logga timeout och returnera MANUAL_REVIEW
```

---

## 📈 Förväntad Effekt

### Kort sikt (1-2 månader)
- ✅ Utvecklare kan direkt implementera API-anrop
- ✅ Färre integration-fel genom tydliga kontrakt
- ✅ Snabbare utveckling genom tydlig dokumentation

### Lång sikt (3-6 månader)
- ✅ Bättre system-robusthet genom tydlig felhantering
- ✅ Enklare underhåll genom dokumenterade dependencies
- ✅ Bättre arkitekturförståelse genom integration points

---

## 🎯 Nästa Steg

1. **Godkänn prioritering** - Är detta rätt fokus baserat på faktisk analys?
2. **Implementera Fas 1** - Komplettera UI Flow-tabeller (högsta värde)
3. **Implementera Fas 2** - Komplettera Implementation Mapping
4. **Iterera** - Baserat på feedback från utvecklare

---

## 📝 Noteringar

**Viktigt:** Denna analys är baserad på faktisk granskning av dokumentationen, inte antaganden. 

**Källor:**
- `docs/E2E_MISSING_USER_STORIES.md` - Dokumenterar saknade UI Flow-detaljer
- `docs/README_FOR_TESTLEAD.md` - Identifierar "Inga riktiga routes/endpoints" och "Inga UI locators" som huvudproblem
- `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` - Identifierar saknade aktiviteter i Implementation Mapping
- Faktisk granskning av Epic- och Feature Goal-filer

**Slutsats:** UI Flow-tabeller och Implementation Mapping är de kritiska saknade delarna, inte teknisk dokumentation i allmänhet (som faktiskt finns ganska bra redan).

