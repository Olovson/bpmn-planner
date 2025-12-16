# Nästa steg för E2E-scenarion

**Datum:** 2025-01-XX  
**Status:** E2E_BR001 är komplett och validerad

---

## ✅ Vad som är klart

### E2E_BR001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)

**Status:** ✅ **KOMPLETT OCH VALIDERAD**

1. ✅ **Validering slutförd** - Alla komponenter validerade mot BPMN-filer
2. ✅ **Komplett dokumentation** - 14 teststeg i `bankProjectTestSteps`, 10 subprocesser i `subprocessSteps`
3. ✅ **UI-interaktioner** - Alla user tasks har detaljerade UI-interaktioner
4. ✅ **Playwright-test** - Strukturerat test med 14 test.step() sektioner
5. ✅ **Feature Goals mappade** - Alla 10 Feature Goals är mappade

---

## 🎯 Rekommenderat nästa steg

### Alternativ 1: E2E-BR-006 - Två sökande (med medsökare) - Bostadsrätt godkänd automatiskt

**Prioritet:** **P0 - HÖGST**  
**Anledning:** Användaren nämnde specifikt att "en kund med en medsökare" är relevant

**Beskrivning:**
- Två personer köper bostadsrätt tillsammans (huvudansökande + medsökare)
- Bostadsrätten uppfyller alla kriterier automatiskt
- INGEN befintlig fastighet att sälja
- Multi-instance för stakeholders och hushåll

**Skillnader från E2E_BR001:**
- Multi-instance Application subprocess (flera stakeholders)
- Multi-instance KYC (en per stakeholder)
- Multi-instance Household (en per hushåll)
- Sekventiell körning per hushåll (Household → Stakeholder → Object)

**Arbetsgång:**
1. Identifiera huvudflöde i `mortgage.bpmn` (samma som E2E_BR001, men med multi-instance)
2. Analysera Application subprocess med multi-instance stakeholders
3. Analysera KYC subprocess med multi-instance
4. Mappa till Feature Goals (Application S2, KYC multi-instance scenarion)
5. Skapa komplett `bankProjectTestSteps` och `subprocessSteps`
6. Validera mot BPMN-filer
7. Förbättra Playwright-test

**Fördelar:**
- Bygger på E2E_BR001 (kan återanvända mycket)
- Testar multi-instance hantering (viktigt för bankprojektet)
- Användaren nämnde detta specifikt

---

### Alternativ 2: E2E-005 - Application avvisad (Error Path)

**Prioritet:** **P0**  
**Anledning:** Viktig error path, relativt enkelt att implementera

**Beskrivning:**
- Application-processen avvisas vid pre-screening eller internal data gathering
- Error event triggas
- Processen avslutas med error

**Skillnader från E2E_BR001:**
- Error path istället för happy path
- Boundary events triggas
- Processen avslutas tidigt

**Arbetsgång:**
1. Identifiera error paths i Application subprocess
2. Analysera boundary events (pre-screen-rejected, application-aborted)
3. Mappa till Feature Goals (error scenarion)
4. Skapa komplett `bankProjectTestSteps` och `subprocessSteps`
5. Validera mot BPMN-filer
6. Förbättra Playwright-test

**Fördelar:**
- Relativt enkelt (färre steg än happy path)
- Viktig error path för att testa felhantering
- Bygger på Application subprocess (redan känd)

---

### Alternativ 3: E2E-001 - Refinansiering Happy Path - En person (komplettera)

**Prioritet:** **P0**  
**Anledning:** Huvudflöde för refinansiering, delvis implementerad

**Beskrivning:**
- En person refinansierar befintligt lån
- INGEN köp-process (hoppar över mortgage-commitment, object-valuation)
- Går direkt från Application till Credit Evaluation

**Skillnader från E2E_BR001:**
- is-purchase = No (refinansiering)
- Hoppar över mortgage-commitment och object-valuation
- Resten är samma (KYC, Credit Decision, Offer, Signing, Disbursement)

**Arbetsgång:**
1. Identifiera huvudflöde i `mortgage.bpmn` (is-purchase = No)
2. Analysera subprocesser (Application, Credit Evaluation, KYC, etc.)
3. Mappa till Feature Goals
4. Skapa komplett `bankProjectTestSteps` och `subprocessSteps`
5. Validera mot BPMN-filer
6. Förbättra Playwright-test

**Fördelar:**
- Delvis implementerad (Application och Credit Decision finns)
- Enklare än köp (färre steg)
- Huvudflöde för refinansiering

---

## 📊 Jämförelse

| Scenario | Prioritet | Komplexitet | Bygger på E2E_BR001 | Användaren nämnde |
|----------|-----------|-------------|---------------------|-------------------|
| **E2E-BR-006** (Två sökande) | P0 | Medel | ✅ Ja | ✅ Ja |
| **E2E-005** (Application avvisad) | P0 | Låg | ⚠️ Delvis | ❌ Nej |
| **E2E-001** (Refinansiering) | P0 | Låg | ⚠️ Delvis | ❌ Nej |

---

## 🎯 Rekommendation

**Nästa steg: E2E-BR-006 - Två sökande (med medsökare)**

**Anledningar:**
1. ✅ **Användaren nämnde specifikt** att "en kund med en medsökare" är relevant
2. ✅ **Bygger på E2E_BR001** - kan återanvända mycket av strukturen
3. ✅ **Testar multi-instance** - viktigt för bankprojektet
4. ✅ **P0 prioritet** - kritiskt scenario
5. ✅ **Naturlig progression** - från en sökande till två sökande

**Arbetsgång:**
1. Identifiera huvudflöde i `mortgage.bpmn` (samma som E2E_BR001)
2. Analysera Application subprocess med multi-instance stakeholders
3. Analysera KYC subprocess med multi-instance
4. Mappa till Feature Goals (Application S2, KYC multi-instance)
5. Skapa komplett `bankProjectTestSteps` och `subprocessSteps`
6. Validera mot BPMN-filer
7. Förbättra Playwright-test

---

## 📝 Alternativ: Om vi vill fokusera på error paths först

Om vi istället vill fokusera på error paths för att få bättre testtäckning:

**Nästa steg: E2E-005 - Application avvisad**

**Anledningar:**
1. ✅ **Relativt enkelt** - färre steg än happy path
2. ✅ **Viktig error path** - testar felhantering
3. ✅ **P0 prioritet** - kritiskt scenario
4. ✅ **Bygger på Application** - redan känd subprocess

---

## 🚀 Nästa steg - Oavsett val

När vi har valt nästa scenario, följer vi samma process som för E2E_BR001:

1. **Identifiera huvudflöde** i BPMN-filer
2. **Analysera subprocesser** rekursivt
3. **Mappa till Feature Goals** och extrahera Given/When/Then
4. **Skapa komplett struktur** (`bankProjectTestSteps` och `subprocessSteps`)
5. **Validera mot BPMN-filer** (systematisk kontroll)
6. **Förbättra Playwright-test** med faktiska teststeg

---

## 📋 Checklista för nästa scenario

- [ ] Identifiera huvudflöde i BPMN-filer
- [ ] Analysera alla subprocesser rekursivt
- [ ] Mappa till Feature Goals
- [ ] Skapa `bankProjectTestSteps` (alla BPMN-noder)
- [ ] Skapa `subprocessSteps` (alla call activities)
- [ ] Detaljera UI-interaktioner för user tasks
- [ ] Validera mot BPMN-filer
- [ ] Förbättra Playwright-test
- [ ] Dokumentera saknade user stories (om några)

---

## 💡 Tips

- **Återanvänd struktur** från E2E_BR001 där möjligt
- **Fokusera på skillnader** - vad är annorlunda jämfört med E2E_BR001?
- **Var noggrann med multi-instance** - detta är nytt för E2E-BR-006
- **Validera systematiskt** - använd samma valideringsprocess som för E2E_BR001

