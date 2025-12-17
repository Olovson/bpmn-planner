# E2E Test - Nästa steg

**Datum:** 2025-01-XX  
**Status:** E2E_BR001 och E2E_BR006 är kompletta, kvalitetsvalidering på plats

---

## ✅ Vad vi har nu

1. **E2E_BR001** - En sökande, Bostadsrätt (Happy Path) - ✅ Komplett
2. **E2E_BR006** - Två sökande, Bostadsrätt (Happy Path) - ✅ Komplett
3. **Kvalitetsvalidering** - BPMN → Scenarios mapping, Mock-kvalitet - ✅ På plats
4. **Mock-responser** - 31 API:er mockade för happy path - ✅ På plats

---

## 🎯 Föreslagna nästa steg (prioriterade)

### Prioritet 1: Förbättra befintliga scenarion med mer detaljer

**Syfte:** Göra E2E_BR001 och E2E_BR006 mer kompletta och realistiska, även om informationen är spekulativ.

**Vad som kan förbättras:**

1. **Förbättra mock-responser med mer realistiska fält**
   - Lägg till fler fält i mock-responser baserat på logiska antaganden
   - T.ex. timestamps, IDs, metadata som troligen behövs
   - **Värde:** Ger mer realistiska tester, även om exakta fält kan skilja sig

2. **Förbättra UI-interaktioner med mer detaljer**
   - Utöka UI-interaktioner med fler steg baserat på Feature Goals
   - Lägg till verifieringar och assertions
   - **Värde:** Ger mer komplett test-spec, även om exakta IDs kan skilja sig

3. **Förbättra backend states med mer detaljer**
   - Utöka backend states med fler fält baserat på logiska antaganden
   - T.ex. status-historik, metadata, relations-ID:n
   - **Värde:** Ger mer komplett bild av vad som förväntas, även om strukturen kan skilja sig

**Implementering:**
- Analysera Feature Goals för att hitta fler detaljer
- Utöka mock-responser steg för steg
- Förbättra UI-interaktioner med fler steg
- Uppdatera backend states med fler fält

**Tidsåtgång:** 2-3 timmar per scenario

---

### Prioritet 2: Skapa error path-scenarion

**Syfte:** Skapa scenarion för felhantering, även om API-responser är spekulativa.

**Vad som kan skapas:**

1. **E2E_BR002: Application avvisad (pre-screen)**
   - Scenario där pre-screen DMN returnerar REJECTED
   - Mock-responser med 400/403 errors
   - **Värde:** Testar felhantering, även om exakta error-codes kan skilja sig

2. **E2E_BR003: KYC avvisad**
   - Scenario där KYC/AML screening hittar problem
   - Mock-responser med KYC-status = REJECTED
   - **Värde:** Testar KYC-felhantering, även om exakta fält kan skilja sig

3. **E2E_BR004: Credit Decision avvisad**
   - Scenario där credit decision returnerar REJECTED
   - Mock-responser med rejection-reason
   - **Värde:** Testar credit decision-felhantering, även om exakta strukturer kan skilja sig

**Implementering:**
- Analysera BPMN-filer för error paths
- Skapa nya scenarion baserat på error paths
- Skapa mock-responser för error-scenarion (spekulativa men logiska)
- Uppdatera Playwright-tester för error paths

**Tidsåtgång:** 3-4 timmar per scenario

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
- Utöka valideringssidan med UserTask-validering
- Utöka valideringssidan med BusinessRuleTask-validering
- Visa resultat i valideringssidan

**Tidsåtgång:** 2-3 timmar

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

**Implementering:**
- Analysera BPMN-filer för alternative paths
- Skapa nya scenarion baserat på alternative paths
- Skapa mock-responser för alternative paths (spekulativa men logiska)
- Uppdatera Playwright-tester för alternative paths

**Tidsåtgång:** 3-4 timmar per scenario

---

## Rekommendation: Börja med Prioritet 1

**Varför:**
- Bygger vidare på befintliga scenarion (E2E_BR001, E2E_BR006)
- Ger omedelbar förbättring av test-kvalitet
- Skapar mer komplett test-spec för test lead
- Även om informationen är spekulativ, ger det en bättre startpunkt

**Nästa konkreta steg:**
1. Analysera Feature Goals för att hitta fler detaljer för E2E_BR001
2. Utöka mock-responser med fler realistiska fält
3. Förbättra UI-interaktioner med fler steg
4. Uppdatera backend states med fler fält

---

## Balansering: Spekulativt men värdefullt

**Filosofi:**
- Vi spekulerar i API-responser, testscenarion, UI etc. eftersom vi måste starta med något
- Detta ger test lead en startpunkt, även om exakta implementationer kan skilja sig
- När faktiska implementationer finns, kan test lead justera och förbättra

**Vad som är värdefullt:**
- ✅ BPMN-struktur och testscenarion (validerat)
- ✅ Identifiering av vad som behöver testas (validerat)
- ✅ Spekulativa mock-responser (ger startpunkt)
- ✅ Spekulativa UI-interaktioner (ger startpunkt)
- ✅ Spekulativa backend states (ger startpunkt)

**Vad som behöver justeras senare:**
- ⚠️ API-endpoints (kan skilja sig)
- ⚠️ Mock-response-strukturer (kan skilja sig)
- ⚠️ UI-locator IDs (kan skilja sig)
- ⚠️ Backend state-strukturer (kan skilja sig)

---

## Nästa steg: Välj prioritet

Vilket område vill du prioritera?

1. **Förbättra befintliga scenarion** (mer detaljer, bättre mock-responser)
2. **Skapa error path-scenarion** (felhantering)
3. **Förbättra kvalitetsvalidering** (UserTasks, BusinessRuleTasks)
4. **Skapa alternative path-scenarion** (appeal, manual review)
5. **Något annat?**
