# BPMN Planner: Guide för Test Lead

## Välkommen!

Denna guide är skriven specifikt för dig som test lead och förklarar hur BPMN Planner fungerar och hur du kan ta de genererade test scripts vidare till ditt reella projekt.

---

## ⚠️ Viktigt: Realistiska Förväntningar

**BPMN Planner har begränsad data** - vi har bara BPMN-filerna att utgå från.

**Vad du faktiskt får med bara BPMN-filer**:
- ✅ Basic teststruktur
- ✅ 1 scenario per nod ("Happy path")
- ✅ Default metadata (persona: 'unknown', riskLevel: 'P1')
- ✅ TODO-markörer för vad som saknas
- ❌ **Inga riktiga routes/endpoints** (måste läggas till manuellt)
- ❌ **Inga UI locators** (måste läggas till manuellt)
- ❌ **Ingen testdata** (måste läggas till manuellt)
- ❌ **Ingen uiFlow** (måste läggas till manuellt)

**Med LLM (ChatGPT/Ollama)** får du bättre scenario-beskrivningar, men **fortfarande inga riktiga routes/locators/testdata**.

**Bottom line**: BPMN Planner ger dig en **bra startpunkt**, men du måste **komplettera betydligt** i ditt projekt. Det är **inte** "plug and play".

---

## Vad är BPMN Planner?

**BPMN Planner** är ett verktyg som:
- Läser BPMN-filer (samma som ditt projekt använder)
- Genererar dokumentation, test scenarios och test scripts
- Skapar en struktur som kan exporteras och användas i ditt reella projekt

**Viktigt**: BPMN Planner genererar **starter scripts** - de behöver kompletteras med riktiga routes, UI locators och testdata i ditt projekt.

---

## Hur BPMN Planner Fungerar

### 1. BPMN-filer som Input

BPMN Planner använder **samma BPMN-filer** som ditt projekt:
- `mortgage-se-application.bpmn`
- `mortgage-se-internal-data-gathering.bpmn`
- etc.

Dessa filer beskriver processerna som ska testas.

**Viktigt**: BPMN-filerna innehåller **endast processstruktur** (noder, flöden, hierarki). De innehåller **INTE**:
- Riktiga routes/endpoints
- UI locators
- Testdata
- Detaljerad scenario-beskrivning

### 2. Generering av Test Scenarios

BPMN Planner analyserar BPMN-filerna och genererar test scenarios, men **mängden data varierar**:

#### Med LLM (ChatGPT/Ollama) - Om aktiverat
- **Rikare scenarios** med beskrivningar
- **Grundläggande metadata** kan genereras (persona, riskLevel, etc.)
- **Kostar pengar** (ChatGPT) eller kräver lokal LLM (Ollama)

#### Utan LLM (Lokal generering)
- **Begränsade scenarios**: Bara grundläggande "Happy path" per nod
- **Minimal metadata**: Defaultvärden (t.ex. persona: 'unknown', riskLevel: 'P1')
- **Ingen uiFlow**: Navigationssteg saknas
- **Ingen dataProfileId**: Testdata-referenser saknas

**Realitet**: Med bara BPMN-filer får du **mycket begränsad data**. För rikare scenarios behöver du:
- Aktivera LLM (kostar eller kräver setup)
- Manuellt lägga till scenario metadata
- Använda design-scenarion från `testMapping.ts` (statiskt, begränsat)

### 3. Generering av Test Scripts

BPMN Planner genererar **export-ready test scripts** i Playwright-format, men:

**Vad du faktiskt får**:
- ✅ Korrekt teststruktur
- ✅ BPMN-metadata som kommentarer
- ✅ Tydliga TODO-markörer för vad som behöver kompletteras
- ⚠️ Smart defaults (inferred routes/endpoints) - **bara gissningar från nodnamn**
- ❌ **Inga riktiga routes/endpoints** (måste läggas till manuellt)
- ❌ **Inga riktiga UI locators** (måste läggas till manuellt)
- ❌ **Ingen testdata** (måste läggas till manuellt)

**Realitet**: Test scripts är **starter scripts** med mycket TODO-markörer. De behöver kompletteras betydligt i ditt projekt.

### 4. Export till Ditt Projekt

Test scripts kan exporteras och tas till ditt reella projekt där de **måste kompletteras** med:
- Riktiga routes/endpoints (saknas helt)
- Riktiga UI locators (saknas helt)
- Riktiga testdata fixtures (saknas helt)
- Eventuell uiFlow (saknas om LLM inte används)

---

## Vad Du Får från BPMN Planner

### 1. Test Scenarios

**Realitet**: Med bara BPMN-filer får du **mycket begränsade scenarios**:

#### Med LLM aktiverat:
- ✅ 2-3 scenarios per nod (happy path, error, edge case)
- ✅ Beskrivningar och förväntade resultat
- ⚠️ Grundläggande metadata (persona, riskLevel) - kan vara generiska
- ❌ uiFlow saknas ofta (kräver manuell input eller rikare LLM-prompt)

#### Utan LLM (bara BPMN):
- ⚠️ **Bara 1 scenario per nod**: "Happy path" (automatiskt genererat)
- ⚠️ **Minimal beskrivning**: "Automatiskt genererat scenario baserat på nodens testskelett"
- ⚠️ **Default metadata**: persona: 'unknown', riskLevel: 'P1', assertionType: 'functional'
- ❌ **Ingen uiFlow**: Navigationssteg saknas helt
- ❌ **Ingen dataProfileId**: Testdata-referenser saknas

**Exempel scenario (utan LLM)**:
```typescript
{
  id: 'fetch-party-information-auto',
  name: 'Happy path – Fetch party information',
  description: 'Automatiskt genererat scenario baserat på nodens testskelett.',
  persona: 'unknown',  // Default
  riskLevel: 'P1',      // Default
  assertionType: 'functional',  // Default
  uiFlow: undefined,    // Saknas
  dataProfileId: undefined  // Saknas
}
```

**Exempel scenario (med LLM)** - Bättre, men fortfarande begränsat:
```typescript
{
  id: 'EPIC-S1',
  name: 'Normalflöde med komplett underlag',
  persona: 'customer',  // Kan vara korrekt, men inte alltid
  riskLevel: 'P0',
  assertionType: 'functional',
  uiFlow: undefined,  // Ofta saknas även med LLM
  dataProfileId: undefined  // Saknas
}
```

### 2. Export-Ready Test Scripts

**Realitet**: Test scripts är **mycket basic** med många TODO-markörer.

**Exempel export-ready test (utan LLM - bara BPMN)**:
```typescript
// ============================================
// EXPORT-READY TEST - Generated by BPMN Planner
// BPMN File: mortgage-se-application.bpmn
// Node ID: confirm-application
// Scenario: confirm-application-auto - Happy path – Confirm application
// Persona: unknown, Risk Level: P1
// ============================================

import { test, expect } from '@playwright/test';

test.describe('P1 - Confirm Application - Happy Path', () => {
  test('Happy path – Confirm application', async ({ page }) => {
    // Test body based on scenario: Automatiskt genererat scenario baserat på nodens testskelett.
    // ⚠️ TODO (Complete Environment): Add navigation steps
    // Suggested route (inferred): /confirm-application
    await page.goto('/confirm-application'); // ⚠️ TODO: Update with actual route
    
    // ⚠️ TODO (Complete Environment): Add test steps based on scenario
    // Scenario description: Automatiskt genererat scenario baserat på nodens testskelett.
    
    // Assertions based on scenario outcome
    // Expected outcome: [saknas - scenario har ingen outcome]
    // ⚠️ TODO (Complete Environment): Add assertions based on scenario outcome
  });
});
```

**Exempel export-ready test (med LLM - bättre, men fortfarande begränsat)**:
```typescript
// ============================================
// EXPORT-READY TEST - Generated by BPMN Planner
// BPMN File: mortgage-se-application.bpmn
// Node ID: confirm-application
// Scenario: EPIC-S1 - Normalflöde med komplett underlag
// Persona: customer, Risk Level: P0
// ============================================

import { test, expect } from '@playwright/test';

test.describe('P0 - Confirm Application - Happy Path', () => {
  test('Normalflöde med komplett underlag', async ({ page }) => {
    // Setup: Login as customer
    // ⚠️ TODO (Complete Environment): Update login route and selectors
    await page.goto('/login'); // ⚠️ TODO: Update with actual login route
    await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
    await page.fill('#password', 'password123'); // ⚠️ TODO: Use real test password
    await page.click('#login-btn'); // ⚠️ TODO: Verify login button selector
    
    // Test body based on scenario: Kunden eller handläggaren har lämnat kompletta uppgifter
    // ⚠️ TODO (Complete Environment): Add navigation steps
    // Suggested route (inferred): /confirm-application
    await page.goto('/confirm-application'); // ⚠️ TODO: Update with actual route
    
    // ⚠️ TODO (Complete Environment): Add test steps based on scenario
    // Scenario description: Kunden eller handläggaren har lämnat kompletta uppgifter
    
    // Assertions based on scenario outcome
    // Expected outcome: Epiken kan slutföras utan manuella avvikelser
    await expect(page.locator('.success-message, .confirmation')).toBeVisible();
    // ⚠️ TODO (Complete Environment): Verify actual success message locator
  });
});
```

**Viktigt**: Även med LLM saknas:
- ❌ Riktiga routes (bara gissningar från nodnamn)
- ❌ Riktiga UI locators (bara placeholders)
- ❌ Testdata (saknas helt)
- ❌ uiFlow (ofta saknas även med LLM)

### 3. BPMN Metadata

Varje test innehåller BPMN-metadata som kommentarer:
- BPMN-fil
- Node ID
- Node typ
- Scenario information
- Persona, riskLevel, etc.

Detta gör det enkelt att spåra varje test tillbaka till BPMN-processen.

---

## Hur Du Tar Detta Vidare i Ditt Projekt

### Steg 1: Exportera Test Scripts

1. Öppna BPMN Planner
2. Gå till `/test-scripts` eller `/node-tests`
3. Klicka på "Export Tests for Complete Environment"
4. Välj format (Playwright)
5. Exportera till filer

### Steg 2: Importera till Ditt Projekt

```bash
# Kopiera exporterade test scripts
cp bpmn-planner/exports/tests/* tests/fictional-app/

# Kopiera export manifest
cp bpmn-planner/exports/export-manifest.json .
```

### Steg 3: Komplettera Test Scripts

Se `docs/COMPLETING_TESTS_IN_COMPLETE_ENVIRONMENT.md` för detaljerad guide.

**Kort checklist**:
- [ ] Uppdatera routes/endpoints med riktiga URLs
- [ ] Uppdatera UI locators med riktiga selektorer
- [ ] Lägg till testdata fixtures
- [ ] Verifiera assertions
- [ ] Kör tester och fixa eventuella problem

**Exempel transformation**:

**Före** (Export-ready):
```typescript
await page.goto('/login'); // ⚠️ TODO: Update with actual login route
await page.fill('#email', 'customer@example.com'); // ⚠️ TODO: Use real test credentials
```

**Efter** (Komplett):
```typescript
import { testData } from '../fixtures/mortgage-test-data';

await page.goto('https://mortgage-app.example.com/login');
await page.fill('[data-testid="email-input"]', testData.customer.email);
await page.fill('[data-testid="password-input"]', testData.customer.password);
```

### Steg 4: Validera och Kör

```bash
# Kompilera
npm run type-check

# Kör tester
npm test

# Kör specifik test
npx playwright test tests/fictional-app/confirm-application-EPIC-S1.spec.ts
```

---

## Vad Krävs för Rikare Data?

### Med Bara BPMN-filer (Minimal Data)

**Du får**:
- ✅ BPMN-struktur (noder, hierarki, flöden)
- ✅ Basic test scenarios (1 per nod, "Happy path")
- ✅ Default metadata (persona: 'unknown', riskLevel: 'P1')
- ✅ Teststruktur med TODO-markörer

**Du får INTE**:
- ❌ Riktiga routes/endpoints
- ❌ UI locators
- ❌ Testdata
- ❌ uiFlow (navigationssteg)
- ❌ Rikare scenario-beskrivningar

### För Rikare Data - Dina Alternativ

#### 1. Aktivera LLM (ChatGPT/Ollama)
- **Kostnad**: ChatGPT kostar pengar, Ollama kräver lokal setup
- **Vad du får**: Rikare scenario-beskrivningar, bättre metadata
- **Vad du fortfarande saknar**: Riktiga routes, locators, testdata, uiFlow

#### 2. Manuell Input
- **Lägg till scenario metadata** i BPMN Planner (persona, riskLevel, uiFlow, etc.)
- **Tidskrävande**: Måste göras för varje nod/scenario
- **Vad du får**: Exakt vad du lägger in

#### 3. Design-scenarion (testMapping.ts)
- **Statisk konfiguration**: Manuellt definierade scenarios i kod
- **Begränsat**: Bara för noder som har entries
- **Vad du får**: Fördefinierade scenarios för specifika noder

### Realistiska Förväntningar

**Med bara BPMN-filer**:
- Du får **starter scripts** med mycket TODO-markörer
- Du måste **komplettera betydligt** i ditt projekt
- Det är **inte** "plug and play" - det kräver manuellt arbete

**Med LLM**:
- Du får **bättre starter scripts** med rikare beskrivningar
- Du måste **fortfarande komplettera** routes, locators, testdata
- Det är **fortfarande inte** "plug and play"

**Bottom line**: BPMN Planner ger dig en **bra startpunkt**, men du måste **komplettera betydligt** i ditt projekt.

---

## Viktiga Koncept

### 1. Starter vs. Complete Environment

**BPMN Planner** = Starter environment
- Genererar grundläggande test scripts
- Inkluderar BPMN-metadata och struktur
- Har tydliga TODO-markörer

**Ditt Projekt** = Complete environment
- Kompletterar scripts med riktiga routes/locators/data
- Kör och validerar tester
- Itererar baserat på resultat

### 2. BPMN-filer som Single Source of Truth

BPMN-filerna är **single source of truth**:
- BPMN Planner läser dem och genererar test scenarios
- Ditt projekt använder samma BPMN-filer
- När BPMN-filer uppdateras → regenerera test scenarios

### 3. Test Context: Fictional App vs. BPMN Planner

**Viktigt**: Test scripts från BPMN Planner testar **den fiktiva appen** (mortgage systemet), inte BPMN Planner själv.

- **FICTIONAL_APP**: Den app som BPMN-filerna beskriver (t.ex. mortgage system)
- **BPMN_PLANNER**: Verktyget vi bygger (BPMN Planner)

Test scripts är alltid för FICTIONAL_APP.

---

## Workflow: Från BPMN till Körbara Tester

```
1. BPMN-filer
   ↓
2. BPMN Planner analyserar och genererar:
   - Test scenarios (med metadata)
   - Export-ready test scripts
   ↓
3. Exportera från BPMN Planner
   ↓
4. Importera till ditt projekt
   ↓
5. Komplettera med:
   - Riktiga routes/endpoints
   - Riktiga UI locators
   - Riktiga testdata
   ↓
6. Kör och validera tester
   ↓
7. Iterera baserat på resultat
```

---

## Dokumentation och Guider

### För Export och Completion

- **`docs/EXPORT_TO_COMPLETE_ENVIRONMENT.md`** - Steg-för-steg guide för export
- **`docs/COMPLETING_TESTS_IN_COMPLETE_ENVIRONMENT.md`** - Detaljerad guide för att komplettera scripts
- **`docs/STARTER_VS_COMPLETE_ENVIRONMENT.md`** - Fullständig plan för starter vs. complete environment

### För Test Context

- **`docs/TWO_APP_CONTEXTS.md`** - Förklarar skillnaden mellan FICTIONAL_APP och BPMN_PLANNER
- **`docs/USING_TEST_CONTEXT_SAFEGUARDS.md`** - Hur man använder safeguards för att undvika kontextförvirring

### För Test Scenarios

- **`docs/FROM_BPMN_TO_REAL_TESTS_ANALYSIS.md`** - Analys av hur BPMN mappas till tester
- **`docs/RISK_ANALYSIS_AND_MITIGATION.md`** - Riskanalys och mitigering
- **`docs/PRAGMATIC_IMPLEMENTATION_PLAN.md`** - Implementeringsplan

---

## FAQ

### Q: Kan jag använda BPMN-filerna direkt i mitt projekt?

**A**: Ja! BPMN-filerna är samma i både BPMN Planner och ditt projekt. BPMN Planner genererar bara test scenarios och starter scripts baserat på dem.

### Q: Vad händer om BPMN-filerna ändras?

**A**: Regenerera test scenarios i BPMN Planner och exportera igen. Dina kompletterade scripts behålls (de skrivs inte över), men du får nya scenarios för ändrade/nya noder.

### Q: Kan jag redigera test scenarios i BPMN Planner?

**A**: Delvis. Du kan uppdatera scenario metadata (persona, riskLevel, etc.) via override-filer eller LLM-regenerering, men det kräver manuellt arbete. uiFlow och dataProfileId saknas ofta och måste läggas till manuellt.

### Q: Hur ofta ska jag exportera?

**A**: 
- **När BPMN-filer ändras** → Regenerera och exportera
- **När nya noder läggs till** → Regenerera och exportera
- **När scenario metadata uppdateras** → Exportera igen

### Q: Kan jag använda flera BPMN-filer?

**A**: Ja! BPMN Planner stödjer flera BPMN-filer och genererar test scenarios för alla. Exportera alla samtidigt eller selektivt.

### Q: Vad är skillnaden mellan export-ready och kompletta scripts?

**A**: 
- **Export-ready**: Har struktur, metadata, TODO-markörer (från BPMN Planner)
- **Kompletta**: Har riktiga routes, locators, testdata (i ditt projekt)

### Q: Vad får jag faktiskt med bara BPMN-filer (utan LLM)?

**A**: 
- ✅ 1 basic scenario per nod ("Happy path")
- ✅ Default metadata (persona: 'unknown', riskLevel: 'P1')
- ✅ Teststruktur med TODO-markörer
- ✅ BPMN-metadata som kommentarer
- ❌ Inga riktiga routes/endpoints
- ❌ Inga UI locators
- ❌ Ingen testdata
- ❌ Ingen uiFlow

**Bottom line**: Du får en **starter struktur** som kräver **betydlig komplettering** i ditt projekt.

### Q: Förbättras det med LLM?

**A**: 
- ✅ Bättre scenario-beskrivningar (2-3 scenarios per nod)
- ✅ Bättre metadata (persona, riskLevel kan vara mer korrekt)
- ⚠️ Fortfarande inga riktiga routes/locators/testdata
- ⚠️ uiFlow saknas ofta även med LLM

**Bottom line**: LLM ger **bättre starter scripts**, men du måste **fortfarande komplettera betydligt**.

---

## Nästa Steg

1. **Förstå vad du faktiskt får**: Läs denna guide noggrant - med bara BPMN-filer får du begränsad data
2. **Välj strategi**: 
   - Bara BPMN → Basic starter scripts (kräver mycket manuellt arbete)
   - Med LLM → Bättre starter scripts (kräver fortfarande manuellt arbete)
3. **Läs export-guiden**: `docs/EXPORT_TO_COMPLETE_ENVIRONMENT.md`
4. **Läs completion-guiden**: `docs/COMPLETING_TESTS_IN_COMPLETE_ENVIRONMENT.md` - **viktig!** Detta är där det mesta arbetet sker
5. **Exportera test scripts** från BPMN Planner
6. **Importera till ditt projekt**
7. **Komplettera scripts** - **Detta är huvudarbetet**:
   - Lägg till riktiga routes/endpoints
   - Lägg till riktiga UI locators
   - Lägg till testdata fixtures
   - Komplettera uiFlow om det saknas
   - Verifiera assertions
8. **Kör och validera** tester
9. **Iterera** baserat på resultat

---

## Support

Om du har frågor eller behöver hjälp:
- Se dokumentationen i `docs/`-mappen
- Kontakta utvecklingsteamet
- Kolla main README: `README.md`

---

**Lycka till med testgenereringen!** 🚀

