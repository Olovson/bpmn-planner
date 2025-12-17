# E2E Test - Nästa steg (Uppdaterad)

**Datum:** 2025-01-XX  
**Status:** Prioritet 1 klar, redo för nästa steg

---

## ✅ Vad vi har åstadkommit (Prioritet 1)

1. **Mock-responser förbättrade** ✅
   - Timestamps, metadata, relations-ID:n tillagda
   - 31 API:er mockade med mer detaljerade fält
   - Alla ServiceTasks har mocks

2. **UI-interaktioner förbättrade** ✅
   - Fler verifieringar och assertions tillagda
   - Mer detaljerade steg för Mortgage Commitment, KYC, Offer, Signing
   - Loading-indikatorer och status-visningar dokumenterade

3. **Backend states förbättrade** ✅
   - Timestamps, metadata, relations-ID:n tillagda
   - Mer detaljerade fält baserat på logiska antaganden
   - Konsistent struktur för alla subprocesser

4. **SubprocessSteps förbättrade** ✅
   - `given/when/then` utökade med specifika API-anrop och returnerade värden
   - Detaljerade backend states med timestamps, metadata, relations-ID:n
   - Mer detaljerade UI-steg där relevant
   - **Syns nu på test-coverage-sidan!**

---

## 🎯 Föreslagna nästa steg (prioriterade)

### Prioritet 2: Skapa error path-scenarion

**Syfte:** Skapa scenarion för felhantering, även om API-responser är spekulativa.

**Vad som kan skapas:**

1. **E2E_BR002: Application avvisad (pre-screen)**
   - Scenario där pre-screen DMN returnerar REJECTED
   - Mock-responser med 400/403 errors eller REJECTED status
   - **Värde:** Testar felhantering vid pre-screening, även om exakta error-codes kan skilja sig
   - **BPMN-flöde:** Application → Pre-screen Party DMN = REJECTED → Application rejected end event

2. **E2E_BR003: KYC avvisad**
   - Scenario där KYC/AML screening hittar problem (hög risk, PEP-match, etc.)
   - Mock-responser med KYC-status = REJECTED eller needsReview = true
   - **Värde:** Testar KYC-felhantering, även om exakta fält kan skilja sig
   - **BPMN-flöde:** KYC → Evaluate KYC/AML DMN = REJECTED → KYC rejected end event

3. **E2E_BR004: Credit Decision avvisad**
   - Scenario där credit decision returnerar REJECTED
   - Mock-responser med rejection-reason
   - **Värde:** Testar credit decision-felhantering, även om exakta strukturer kan skilja sig
   - **BPMN-flöde:** Credit Decision → Decision = REJECTED → Application rejected end event

**Implementering:**
- Analysera BPMN-filer för error paths (boundary events, error end events)
- Skapa nya scenarion baserat på error paths
- Skapa mock-responser för error-scenarion (spekulativa men logiska)
- Uppdatera Playwright-tester för error paths (eller skapa nya)
- Lägg till i `E2eTestsOverviewPage.tsx`

**Tidsåtgång:** 3-4 timmar per scenario

**Fördelar:**
- Ger test coverage för felhantering
- Testar att systemet hanterar fel korrekt
- Ger test lead en startpunkt för error path-tester

---

### Prioritet 3: Förbättra kvalitetsvalidering

**Syfte:** Utöka valideringssidan med fler kontroller, även om informationen är spekulativ.

**Vad som kan förbättras:**

1. **Validera UserTasks → UI Flow mapping**
   - Extrahera UserTasks från BPMN-filer
   - Jämför med `uiInteraction` i `bankProjectTestSteps`
   - Identifiera UserTasks som saknar UI-interaktioner
   - **Värde:** Säkerställer att alla UserTasks har UI-flöden dokumenterade

2. **Validera BusinessRuleTasks → DMN mapping**
   - Extrahera BusinessRuleTasks från BPMN-filer
   - Jämför med `dmnDecision` i `bankProjectTestSteps`
   - Identifiera BusinessRuleTasks som saknar DMN-beslut
   - **Värde:** Säkerställer att alla DMN-beslut är dokumenterade

**Implementering:**
- Utöka `E2eQualityValidationPage.tsx` med UserTask-validering
- Utöka `E2eQualityValidationPage.tsx` med BusinessRuleTask-validering
- Visa resultat i valideringssidan

**Tidsåtgång:** 2-3 timmar

**Fördelar:**
- Automatisk validering av att allt är dokumenterat
- Identifierar brister i dokumentationen
- Förbättrar kvaliteten på befintliga scenarion

---

### Prioritet 4: Skapa alternative path-scenarion

**Syfte:** Skapa scenarion för alternativa flöden, även om implementationen är spekulativ.

**Vad som kan skapas:**

1. **E2E_BR007: Appeal-flöde**
   - Scenario där kunden överklagar ett avslag
   - Mock-responser för appeal-processen
   - **Värde:** Testar appeal-flödet, även om exakta API:er kan skilja sig

2. **E2E_BR008: Manual Credit Evaluation**
   - Scenario där credit evaluation kräver manuell granskning
   - Mock-responser för manual review
   - **Värde:** Testar manual review-flödet, även om exakta strukturer kan skilja sig

**Tidsåtgång:** 3-4 timmar per scenario

---

## Rekommendation: Börja med Prioritet 2

**Varför:**
- Ger test coverage för felhantering (viktigt för produktion)
- Bygger vidare på befintliga scenarion (använder samma struktur)
- Ger test lead en startpunkt för error path-tester
- Även om informationen är spekulativ, ger det en bättre startpunkt

**Nästa konkreta steg för Prioritet 2:**
1. Analysera BPMN-filer för error paths (boundary events, error end events)
2. Identifiera de viktigaste error-scenarion (Application rejected, KYC rejected, Credit Decision rejected)
3. Skapa E2E_BR002: Application avvisad (pre-screen)
4. Skapa mock-responser för error-scenariot
5. Lägg till i `E2eTestsOverviewPage.tsx`
6. Upprepa för E2E_BR003 och E2E_BR004

---

## Alternativ: Prioritet 3 (Förbättra kvalitetsvalidering)

Om du vill förbättra kvaliteten på befintliga scenarion först:

1. Utöka `E2eQualityValidationPage.tsx` med UserTask-validering
2. Utöka `E2eQualityValidationPage.tsx` med BusinessRuleTask-validering
3. Visa resultat i valideringssidan
4. Identifiera och åtgärda brister i dokumentationen

**Fördel:** Ger omedelbar feedback på kvaliteten av befintliga scenarion

---

## Beslut

Vilket område vill du prioritera?

1. **Prioritet 2: Skapa error path-scenarion** (felhantering) - Rekommenderat
2. **Prioritet 3: Förbättra kvalitetsvalidering** (UserTasks, BusinessRuleTasks)
3. **Prioritet 4: Skapa alternative path-scenarion** (appeal, manual review)
4. **Något annat?**

