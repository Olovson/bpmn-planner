# E2E Test - Bästa vägen framåt

**Datum:** 2025-01-XX  
**Status:** Prioritet 1 och 3 klara, redo för nästa fas

---

## ✅ Vad vi har nu

### Kompletta komponenter
1. **E2E_BR001** - En sökande, Bostadsrätt (Happy Path) - ✅ Komplett
2. **E2E_BR006** - Två sökande, Bostadsrätt (Happy Path) - ✅ Komplett
3. **Kvalitetsvalidering** - ServiceTasks, UserTasks, BusinessRuleTasks - ✅ Komplett
4. **Mock-responser** - 31 API:er mockade för happy path - ✅ Komplett
5. **Test Coverage-sida** - Hierarkisk visning med testinfo - ✅ Komplett

### Förbättringar gjorda
- Mock-responser med timestamps, metadata, relations-ID:n
- UI-interaktioner med fler verifieringar
- Backend states med detaljerade fält
- SubprocessSteps synliga på test-coverage-sidan

---

## 🎯 Rekommenderad väg framåt

### **Fas 1: Använd kvalitetsvalideringen för att förbättra befintliga scenarion** (1-2 timmar)

**Syfte:** Säkerställa att E2E_BR001 och E2E_BR006 är så kompletta som möjligt innan vi skapar nya scenarion.

**Steg:**
1. **Kör kvalitetsvalideringen** på `/e2e-quality-validation`
2. **Identifiera brister:**
   - UserTasks som saknar UI-interaktioner
   - BusinessRuleTasks som saknar DMN-beslut
   - ServiceTasks som saknar API-anrop eller mocks
   - Subprocesser som saknar Given/When/Then
3. **Åtgärda kritiska brister:**
   - Lägg till saknade UI-interaktioner
   - Lägg till saknade DMN-beslut
   - Lägg till saknade API-anrop/mocks
   - Förbättra subprocessSteps där det behövs

**Fördelar:**
- Ger en solid grund att bygga på
- Förhindrar att sprida fel till nya scenarion
- Ger omedelbar feedback på kvalitet
- Tar bara 1-2 timmar

**Resultat:** E2E_BR001 och E2E_BR006 blir mer kompletta och validerade

---

### **Fas 2: Skapa error path-scenarion** (Prioritet 2) (9-12 timmar)

**Syfte:** Skapa test coverage för felhantering, vilket är kritiskt för produktion.

**Scenarion att skapa:**

1. **E2E_BR002: Application avvisad (pre-screen)** (3-4 timmar)
   - Pre-screen DMN returnerar REJECTED
   - Mock-responser med error status
   - BPMN-flöde: Application → Pre-screen Party DMN = REJECTED → Application rejected

2. **E2E_BR003: KYC avvisad** (3-4 timmar)
   - KYC/AML screening hittar problem (hög risk, PEP-match)
   - Mock-responser med KYC-status = REJECTED
   - BPMN-flöde: KYC → Evaluate KYC/AML DMN = REJECTED → KYC rejected

3. **E2E_BR004: Credit Decision avvisad** (3-4 timmar)
   - Credit decision returnerar REJECTED
   - Mock-responser med rejection-reason
   - BPMN-flöde: Credit Decision → Decision = REJECTED → Application rejected

**Implementering per scenario:**
- Analysera BPMN-filer för error paths
- Skapa scenario i `E2eTestsOverviewPage.tsx`
- Skapa mock-responser för error-scenariot
- Skapa Playwright-test (eller uppdatera befintlig)
- Validera med kvalitetsvalideringssidan

**Fördelar:**
- Ger test coverage för felhantering
- Testar att systemet hanterar fel korrekt
- Ger test lead en startpunkt för error path-tester
- Bygger på samma struktur som happy path-scenarion

---

### **Fas 3: Skapa alternative path-scenarion** (Prioritet 4) (6-8 timmar)

**Syfte:** Skapa test coverage för alternativa flöden.

**Scenarion att skapa:**

1. **E2E_BR007: Appeal-flöde** (3-4 timmar)
   - Kunden överklagar ett avslag
   - Mock-responser för appeal-processen

2. **E2E_BR008: Manual Credit Evaluation** (3-4 timmar)
   - Credit evaluation kräver manuell granskning
   - Mock-responser för manual review

---

## 📊 Prioriteringsmatris

| Fas | Aktivitet | Tid | Värde | Prioritet |
|-----|-----------|-----|-------|-----------|
| 1 | Förbättra befintliga scenarion | 1-2h | Hög | ⭐⭐⭐ |
| 2 | Error path-scenarion | 9-12h | Mycket hög | ⭐⭐⭐ |
| 3 | Alternative path-scenarion | 6-8h | Hög | ⭐⭐ |

---

## 🎯 Rekommendation: Börja med Fas 1

**Varför:**
1. **Snabb vinst** - Tar bara 1-2 timmar
2. **Förbättrar kvalitet** - Säkerställer att befintliga scenarion är kompletta
3. **Förhindrar spridning av fel** - Nya scenarion bygger på en solid grund
4. **Validerar verktyget** - Testar att kvalitetsvalideringen faktiskt fungerar

**Nästa steg efter Fas 1:**
- Gå direkt till Fas 2 (Error path-scenarion)
- Detta ger en balanserad test coverage (happy path + error paths)

---

## 🔄 Alternativ väg: Hoppa över Fas 1

Om du vill gå direkt till att skapa nya scenarion:

**Fördelar:**
- Snabbare expansion av test coverage
- Mer scenarion tillgängliga för test lead

**Nackdelar:**
- Risk för att sprida fel från befintliga scenarion
- Mindre validerade grund att bygga på
- Kan behöva återkomma och fixa brister senare

**Rekommendation:** Endast om tiden är mycket begränsad och du behöver fler scenarion snabbt.

---

## 📝 Konkreta nästa steg (Fas 1)

1. **Öppna kvalitetsvalideringssidan:**
   - Navigera till `/e2e-quality-validation`
   - Vänta på att valideringen körs

2. **Granska resultat:**
   - Kolla sammanfattningen för E2E_BR001 och E2E_BR006
   - Identifiera issues (errors, warnings, info)
   - Fokusera på kritiska brister (errors)

3. **Åtgärda brister:**
   - Lägg till saknade UI-interaktioner i `bankProjectTestSteps`
   - Lägg till saknade DMN-beslut i `bankProjectTestSteps`
   - Lägg till saknade API-anrop/mocks
   - Förbättra subprocessSteps där det behövs

4. **Validera igen:**
   - Kör kvalitetsvalideringen igen
   - Verifiera att issues är åtgärdade
   - Målsättning: 90%+ score för båda scenarion

---

## 🎯 Efter Fas 1: Fas 2 (Error path-scenarion)

När Fas 1 är klar, börja med:
1. **E2E_BR002: Application avvisad (pre-screen)**
2. **E2E_BR003: KYC avvisad**
3. **E2E_BR004: Credit Decision avvisad**

Varje scenario följer samma struktur som E2E_BR001, men med error paths och motsvarande mock-responser.

---

## Sammanfattning

**Bästa vägen framåt:**
1. ✅ **Fas 1** (1-2h): Använd kvalitetsvalideringen för att förbättra befintliga scenarion
2. ✅ **Fas 2** (9-12h): Skapa error path-scenarion
3. ✅ **Fas 3** (6-8h): Skapa alternative path-scenarion

**Total tid:** 16-22 timmar för komplett test coverage

**Rekommendation:** Börja med Fas 1 för att säkerställa kvalitet, sedan gå vidare till Fas 2.

