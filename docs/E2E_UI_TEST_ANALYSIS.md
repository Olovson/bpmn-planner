# Analys: Vad ska UI-tester faktiskt testa?

**Datum:** 2025-01-XX  
**Syfte:** Analysera skillnaden mellan vad våra UI-tester gör nu vs vad de borde göra

---

## Problem: Vi testar BPMN-processen istället för användarupplevelsen

### Vad vi gör nu (fel fokus):

1. **Vi testar BPMN-noder (CallActivities, Gateways, etc.)**
   - `test.step('Steg 1: Application (CallActivity)')` - verifierar att Application-noden finns i processträdet
   - `assertBpmnNodeExists(ctx, [/application/i])` - verifierar BPMN-struktur
   - `assertMultipleBpmnNodesExist(ctx, applicationComponents)` - verifierar subprocesser i BPMN

2. **Vi följer BPMN-processens struktur**
   - Varje `bankProjectTestStep` mappar till en BPMN-nod (CallActivity, Gateway, etc.)
   - UI-interaktioner är inbäddade i CallActivity-steg, men följer BPMN-processens flöde

3. **Vi verifierar processmotorns ansvar**
   - CallActivities, Gateways, ServiceTasks - detta hanteras av BPMN-processmotorn
   - Vi testar att processen "går igenom" istället för att testa vad användaren gör

---

## Vad vi borde göra (rätt fokus):

### BPMN-processmotorn hanterar:
- ✅ **CallActivities** - anropar subprocesser automatiskt
- ✅ **Gateways** - fattar beslut baserat på data/regler
- ✅ **ServiceTasks** - anropar API:er automatiskt
- ✅ **BusinessRuleTasks** - kör DMN-beslut automatiskt
- ✅ **Sequence Flows** - styr flödet mellan noder

### UI-tester borde testa:
- ✅ **User Tasks** - vad kunden/handläggaren faktiskt gör i UI:t
- ✅ **Användarupplevelsen** - kan användaren utföra sina uppgifter?
- ✅ **UI-funktionalitet** - fungerar formulär, knappar, navigation?

---

## User Tasks i E2E_BR001 (vad UI-tester borde fokusera på):

### Från Application subprocess:
1. **`register-household-economy-information`** (UserTask)
   - Kunden fyller i hushållsekonomi
   - **UI-test:** Kan kunden fylla i formuläret och spara?

2. **`consent-to-credit-check`** (UserTask) - hoppas över i happy path
   - Kunden ger samtycke till kreditupplysning
   - **UI-test:** Kan kunden ge samtycke? (för scenarion där gateway = No)

3. **`register-personal-economy-information`** (UserTask)
   - Kunden fyller i personlig ekonomi
   - **UI-test:** Kan kunden fylla i formuläret och spara?

4. **`confirm-application`** (UserTask)
   - Kunden bekräftar ansökan
   - **UI-test:** Kan kunden granska sammanfattning och bekräfta?

### Från Mortgage Commitment subprocess:
5. **`decide-mortgage-commitment`** (UserTask)
   - Kunden fattar beslut om mortgage commitment
   - **UI-test:** Kan kunden se information och fatta beslut?

### Från KYC subprocess:
6. **`submit-self-declaration`** (UserTask)
   - Kunden fyller i självdeklaration
   - **UI-test:** Kan kunden fylla i självdeklaration och skicka?

### Från Offer subprocess:
7. **`decide-offer`** (UserTask)
   - Kunden accepterar/avvisar erbjudande
   - **UI-test:** Kan kunden granska erbjudande och acceptera?

### Från Signing subprocess:
8. **Digital signing** (UserTask via subprocess)
   - Kunden signerar dokument digitalt
   - **UI-test:** Kan kunden signera dokument?

---

## Skillnaden i praktiken:

### Nuvarande approach (fel):
```typescript
test.step('Steg 1: Application (CallActivity)', async () => {
  // Verifierar BPMN-struktur
  await assertBpmnNodeExists(ctx, [/application/i]);
  await assertMultipleBpmnNodesExist(ctx, applicationComponents);
  
  // UI-interaktioner är inbäddade i CallActivity-steg
  // Men vi testar fortfarande processen, inte användaren
});
```

### Rätt approach (borde vara):
```typescript
test.step('User Task: register-household-economy-information', async () => {
  // Testar vad kunden gör, inte BPMN-processen
  await navigateToHouseholdForm(ctx);
  await fillHouseholdEconomyForm(ctx, testData);
  await submitForm(ctx);
  await verifySuccessMessage(ctx);
  // Verifierar att användaren kan utföra uppgiften
});

test.step('User Task: confirm-application', async () => {
  // Testar användarupplevelsen
  await navigateToConfirmationPage(ctx);
  await verifySummaryData(ctx, expectedData);
  await clickConfirmButton(ctx);
  await verifyApplicationConfirmed(ctx);
});
```

---

## Varför detta är viktigt:

1. **Separation of Concerns:**
   - BPMN-processmotorn testas separat (integration/unit tests)
   - UI-tester testar användarupplevelsen

2. **Riktig testning:**
   - UI-tester verifierar att användaren kan utföra sina uppgifter
   - Processmotorn verifierar att processen körs korrekt

3. **Underhållbarhet:**
   - Om BPMN-processen ändras, behöver inte UI-testerna ändras (om User Tasks är desamma)
   - UI-tester fokuserar på användarupplevelsen, inte processstrukturen

---

## Rekommendation:

**UI-tester ska:**
- ✅ Fokusera på User Tasks (vad användaren gör)
- ✅ Testa användarupplevelsen (kan användaren utföra uppgiften?)
- ✅ Verifiera UI-funktionalitet (formulär, knappar, navigation)

**UI-tester ska INTE:**
- ❌ Testa BPMN-processstruktur (CallActivities, Gateways, etc.)
- ❌ Verifiera att processmotorn kör processen korrekt
- ❌ Följa BPMN-processens sekvens (det gör processmotorn)

**BPMN-processmotorn testas separat:**
- Integration tests för processmotorn
- Unit tests för DMN-beslut
- API tests för ServiceTasks

---

## Nästa steg:

1. **Omstrukturera E2E_BR001** att fokusera på User Tasks istället för BPMN-noder
2. **Skapa separata tester** för BPMN-processmotorn (integration tests)
3. **Uppdatera dokumentation** för att klargöra skillnaden

