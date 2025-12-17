# E2E Test Validation Status

**Datum:** 2025-01-XX  
**Syfte:** Tydlig översikt över vad som är validerat mot faktiska källor vs vad som behöver valideras när projektet startar

**Viktigt:** Eftersom vi inte har faktiska API:er eller Swagger-dokumentation ännu, är nästan allt baserat på antaganden från BPMN-filer och Feature Goals. Detta är ändå värdefullt som en **startpunkt** för test lead.

---

## Valideringsstatus

### ✅ VALIDERAT (Baserat på faktiska källor)

#### BPMN-struktur och flöden
- **Status:** ✅ **VALIDERAT**
- **Källa:** Faktiska BPMN-filer (`mortgage.bpmn`, `mortgage-se-application.bpmn`, etc.)
- **Vad som är validerat:**
  - BPMN-noder (ServiceTasks, UserTasks, CallActivities)
  - BPMN-node-ID:n
  - Process-hierarki och call activities
  - Sequence flows och gateway-beslut
- **Användning:** Test lead kan lita på att testscenarion följer faktiska BPMN-flöden

#### Testscenarion och struktur
- **Status:** ✅ **VALIDERAT**
- **Källa:** BPMN-filer + Feature Goals
- **Vad som är validerat:**
  - Teststeg baserat på faktiska BPMN-noder
  - Subprocess-ordning baserat på BPMN-hierarki
  - Gateway-beslut baserat på BPMN-conditions
- **Användning:** Test lead kan använda testscenarion som blueprint

#### UI-interaktioner från Feature Goals
- **Status:** ✅ **VALIDERAT** (om Feature Goals är korrekta)
- **Källa:** Feature Goal HTML-filer (`mortgage-application-v2.html`, etc.)
- **Vad som är validerat:**
  - Page IDs, Locator IDs, Actions från UI Flow-tabeller
  - User stories och acceptance criteria
- **Användning:** Test lead kan använda UI-interaktioner om Feature Goals är uppdaterade
- **⚠️ Varning:** Om Feature Goals är inaktuella, behöver UI-interaktioner valideras mot faktisk UI

---

### ⚠️ BASERAT PÅ ANTAGANDEN (Behöver valideras när API:er/UI finns)

**Viktigt:** Eftersom vi inte har faktiska API:er eller Swagger-dokumentation ännu, är följande baserat på antaganden från BPMN-filer och Feature Goals. Detta ger ändå en **värdefull startpunkt** för test lead.

#### API-endpoints och strukturer
- **Status:** ⚠️ **BASERAT PÅ ANTAGANDEN - BEHÖVER VALIDERAS**
- **Källa:** BPMN ServiceTask-namn + Feature Goals + logiska antaganden
- **Vad som är antaganden:**
  - API-endpoints är gissade baserat på ServiceTask-namn (t.ex. `fetch-party-information` → `/api/party/information`)
  - HTTP-metoder är gissade baserat på operation-typ (GET för fetch, POST för create/update)
  - Request/response-strukturer är gissade baserat på backend states
- **Vad test lead behöver göra:**
  1. **Första steget:** Identifiera faktiska API-endpoints när backend är tillgänglig
  2. **Andra steget:** Validera mot faktiska API-responser
  3. **Tredje steget:** Uppdatera mock-responser för att matcha verklighet
- **Värde:** Ger en startpunkt - test lead vet vilka API:er som behövs (baserat på BPMN ServiceTasks), även om endpoints kan skilja sig

#### Mock-responser
- **Status:** ⚠️ **BASERAT PÅ ANTAGANDEN - BEHÖVER VALIDERAS**
- **Källa:** Backend states från scenarios (som också är antaganden)
- **Vad som är antaganden:**
  - Response-strukturer är gissade baserat på backend states
  - Response-värden är gissade för happy path
  - Endast happy path mockad (inga fel-scenarion)
- **Vad test lead behöver göra:**
  1. **Första steget:** Hämta faktiska API-responser när backend är tillgänglig
  2. **Andra steget:** Uppdatera mock-responser för att matcha verklighet
  3. **Tredje steget:** Lägg till fel-scenarion (400, 500 errors)
- **Värde:** Ger en startpunkt - test lead vet vilka fält som troligen behövs (baserat på backend states), även om strukturen kan skilja sig

#### Backend states
- **Status:** ⚠️ **BASERAT PÅ ANTAGANDEN - BEHÖVER VALIDERAS**
- **Källa:** Feature Goals + logiska antaganden om vad som behöver sparas
- **Vad som är antaganden:**
  - Entity-strukturer är gissade (t.ex. `Application.status` vs `application.status`)
  - Fältnamn är gissade baserat på Feature Goals
  - Faktiska värden är gissade för happy path
- **Vad test lead behöver göra:**
  1. **Första steget:** Identifiera faktiska backend-entities när backend är tillgänglig
  2. **Andra steget:** Validera mot faktiska databas-scheman
  3. **Tredje steget:** Uppdatera backend states om de skiljer sig
- **Värde:** Ger en startpunkt - test lead vet vilka states som troligen behövs (baserat på processflödet), även om strukturen kan skilja sig

#### UI-komponenter och locators
- **Status:** ⚠️ **BASERAT PÅ FEATURE GOALS - BEHÖVER VALIDERAS**
- **Källa:** Feature Goal HTML-filer (kan vara inaktuella eller fel)
- **Vad som är antaganden:**
  - Page IDs och Locator IDs är från Feature Goals (kan ha ändrats)
  - UI-struktur är från Feature Goals (kan ha ändrats)
  - Actions och flows är från Feature Goals (kan ha ändrats)
- **Vad test lead behöver göra:**
  1. **Första steget:** Validera mot faktisk UI-implementation när UI är tillgänglig
  2. **Andra steget:** Uppdatera Page IDs och Locator IDs om de skiljer sig
  3. **Tredje steget:** Validera att UI-flöden stämmer
- **Värde:** Ger en startpunkt - test lead vet vilka UI-steg som behövs (baserat på UserTasks), även om IDs kan skilja sig

---

## Startpunkt för test lead

### Vad du HAR (validerat och användbart)

1. **BPMN-struktur och testscenarion** ✅
   - Du vet exakt vilka processer som finns
   - Du vet vilka steg som behöver testas (baserat på BPMN-noder)
   - Du vet i vilken ordning saker ska hända (baserat på sequence flows)
   - **Användning:** Använd detta som blueprint för dina tester

2. **Identifiering av vad som behöver testas** ✅
   - Du vet vilka ServiceTasks som finns (→ vilka API:er som behövs)
   - Du vet vilka UserTasks som finns (→ vilka UI-steg som behövs)
   - Du vet vilka BusinessRuleTasks som finns (→ vilka DMN-beslut som behövs)
   - **Användning:** Använd detta för att planera dina tester

3. **Struktur och dokumentation** ✅
   - Du har en tydlig struktur för testscenarion
   - Du har dokumentation av vad som ska testas
   - Du har en startpunkt för mock-responser
   - **Användning:** Använd detta som grund för att bygga dina tester

### Vad du BEHÖVER validera (när backend/UI finns)

**Prioritering:**
1. **Kritiskt (första veckan):**
   - Identifiera faktiska API-endpoints
   - Hämta faktiska API-responser
   - Uppdatera mock-responser

2. **Viktigt (andra veckan):**
   - Validera backend states
   - Validera UI-komponenter
   - Uppdatera UI-interaktioner

3. **Nice to have (tredje veckan):**
   - Lägg till fel-scenarion
   - Förbättra mock-responser
   - Optimera tester

### Praktisk guide: Hur använda detta som startpunkt

#### Steg 1: Använd BPMN-struktur som blueprint
```
1. Öppna E2eTestsOverviewPage.tsx
2. Titta på bankProjectTestSteps för E2E_BR001
3. För varje steg, identifiera:
   - Vilken BPMN-nod det handlar om
   - Vilken typ av nod (ServiceTask, UserTask, etc.)
   - Vad som behöver testas
```

#### Steg 2: Identifiera faktiska API-endpoints
```
1. När backend är tillgänglig, identifiera faktiska endpoints
2. Jämför med dokumenterade endpoints i bankProjectTestSteps
3. Uppdatera apiCall-fält i E2eTestsOverviewPage.tsx
4. Uppdatera mock-responser i mortgageE2eMocks.ts
```

#### Steg 3: Validera och uppdatera mock-responser
```
1. Hämta faktiska API-responser för happy path
2. Jämför med mock-responser i mortgageE2eMocks.ts
3. Uppdatera mock-responser för att matcha verklighet
4. Testa att Playwright-tester fungerar
```

#### Steg 4: Validera UI-komponenter
```
1. Öppna faktisk UI
2. Verifiera Page IDs och Locator IDs
3. Uppdatera uiInteraction-fält i E2eTestsOverviewPage.tsx
4. Testa att UI-tester fungerar
```

---

## Markeringar i koden

### I `mortgageE2eMocks.ts`
```typescript
// ⚠️ [UNVALIDATED] - Behöver valideras mot faktiska API-responser
await page.route('**/api/party/information', async (route: Route) => {
  // ...
});
```

### I `E2eTestsOverviewPage.tsx`
```typescript
{
  apiCall: 'GET /api/party/information [UNVALIDATED]', // ⚠️ Behöver valideras
  backendState: 'Application.status = "COMPLETE" [UNVALIDATED]', // ⚠️ Behöver valideras
  uiInteraction: 'Navigate: application-start [UNVALIDATED]', // ⚠️ Behöver valideras om Feature Goals är inaktuella
}
```

---

## Rekommendationer

### För test lead
1. **Börja med validerat:** Använd BPMN-struktur och testscenarion som blueprint
2. **Validera kritiskt:** Fokusera på att validera API-endpoints och mock-responser först
3. **Iterativt:** Validera och uppdatera steg för steg, inte allt på en gång
4. **Dokumentera:** Uppdatera denna fil när ni validerat något

### För utvecklingsteam
1. **Prioritera:** Validera API-kontrakt och backend states först (kritiskt för tester)
2. **Dokumentera:** Uppdatera Feature Goals om UI har ändrats
3. **Kommunikera:** Informera test lead om ändringar i API:er eller UI

---

## Statusöversikt

| Område | Status | Källa | Värde för test lead | Behöver valideras? |
|--------|--------|-------|---------------------|-------------------|
| BPMN-struktur | ✅ Validerat | BPMN-filer | 🟢 Hög - Använd som blueprint | ❌ Nej |
| Testscenarion | ✅ Validerat | BPMN + Feature Goals | 🟢 Hög - Använd som blueprint | ❌ Nej |
| API-endpoints | ⚠️ Antaganden | BPMN-namn + logik | 🟡 Medium - Ger startpunkt | ✅ Ja (kritiskt) |
| Mock-responser | ⚠️ Antaganden | Backend states (antaganden) | 🟡 Medium - Ger startpunkt | ✅ Ja (kritiskt) |
| Backend states | ⚠️ Antaganden | Feature Goals + logik | 🟡 Medium - Ger startpunkt | ✅ Ja (viktigt) |
| UI-interaktioner | ⚠️ Feature Goals | Feature Goals | 🟡 Medium - Ger startpunkt | ✅ Ja (om Feature Goals är inaktuella) |

---

## Slutsats och rekommendationer

### Vad som är värdefullt nu (använd direkt)

1. **BPMN-struktur och testscenarion** 🟢
   - Ger en solid blueprint för vad som behöver testas
   - Visar exakt vilka steg som behövs (baserat på faktiska BPMN-noder)
   - Visar i vilken ordning saker ska hända
   - **Användning:** Använd detta som grund för dina tester

2. **Identifiering av vad som behöver testas** 🟢
   - Du vet vilka ServiceTasks som finns → vilka API:er som behövs
   - Du vet vilka UserTasks som finns → vilka UI-steg som behövs
   - Du vet vilka BusinessRuleTasks som finns → vilka DMN-beslut som behövs
   - **Användning:** Använd detta för att planera dina tester

3. **Struktur och dokumentation** 🟢
   - Tydlig struktur för testscenarion
   - Dokumentation av vad som ska testas
   - Startpunkt för mock-responser
   - **Användning:** Använd detta som grund för att bygga dina tester

### Vad som behöver valideras (när backend/UI finns)

**Prioritering:**
1. **Kritiskt (första veckan):**
   - Identifiera faktiska API-endpoints
   - Hämta faktiska API-responser
   - Uppdatera mock-responser

2. **Viktigt (andra veckan):**
   - Validera backend states
   - Validera UI-komponenter
   - Uppdatera UI-interaktioner

### Rekommendation för test lead

**Använd detta som en startpunkt, inte som färdig produkt:**

1. **Börja med BPMN-struktur:**
   - Använd testscenarion som blueprint
   - Identifiera vad som behöver testas
   - Planera dina tester baserat på BPMN-struktur

2. **Validera kritiskt:**
   - När backend är tillgänglig, identifiera faktiska API-endpoints
   - Hämta faktiska API-responser
   - Uppdatera mock-responser för att matcha verklighet

3. **Iterativt:**
   - Validera och uppdatera steg för steg
   - Börja med happy path
   - Lägg till fel-scenarion senare

**Detta kommer spara tid jämfört med att börja från scratch, men kräver validering för att vara användbart.**

