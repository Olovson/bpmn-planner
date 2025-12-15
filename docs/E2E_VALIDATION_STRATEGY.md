# Strategi för E2E-scenario validering och detaljering

**Genererad:** 2025-01-XX  
**Syfte:** Systematisk metod för att validera och etablera alla subprocesser och detaljer för varje E2E-scenario

---

## Problem

Varje E2E-scenario behöver:
- **Ca 20 subprocesser** (call activities) som går genom hela flödet
- **Väldigt många detaljer** kopplade till varje steg (BPMN-noder, UI-interaktioner, API-anrop, DMN-beslut, assertions, backend-tillstånd)
- **Validering mot faktiska BPMN-filer** för att säkerställa att inget saknas
- **Rekursiv analys** av subprocesser (subprocesser kan ha sina egna subprocesser)

---

## Strategi: Systematisk validering per E2E-scenario

### Steg 1: Identifiera huvudflöde i BPMN

För varje E2E-scenario:
1. Identifiera **root BPMN-fil** (t.ex. `mortgage.bpmn`)
2. Identifiera **exakt flöde** baserat på scenario (happy path, error path, etc.)
3. Följ **sequence flows** från start-event till end-event
4. Dokumentera **alla call activities** i exakt körordning

**Exempel för E2E_BR001 (Köp Happy Path):**
```
mortgage.bpmn:
1. application → mortgage-se-application.bpmn
2. is-purchase? (gateway) → Yes
3. mortgage-commitment → mortgage-se-mortgage-commitment.bpmn
4. object-valuation → mortgage-se-object-valuation.bpmn
5. credit-evaluation → mortgage-se-credit-evaluation.bpmn
6. is-automatically-approved? (gateway) → Yes
7. kyc → mortgage-se-kyc.bpmn
8. credit-decision → mortgage-se-credit-decision.bpmn
9. is-credit-approved? (gateway) → Yes
10. offer → mortgage-se-offer.bpmn
11. document-generation → mortgage-se-document-generation.bpmn
12. signing → mortgage-se-signing.bpmn
13. disbursement → mortgage-se-disbursement.bpmn
14. needs-collateral-registration? (gateway) → No
15. Done
```

### Steg 2: Rekursiv analys av subprocesser

För varje call activity, analysera dess subprocess BPMN-fil:

**Exempel: mortgage-se-mortgage-commitment.bpmn**
```
1. credit-evaluation-1 → mortgage-se-credit-evaluation.bpmn
2. is-mortgage-commitment-approved? (gateway) → Yes
3. mortgage-commitment-decision (UserTask)
4. is-object-evaluated? (gateway) → No
5. object-information → mortgage-se-object-information.bpmn
6. is-object-approved? (gateway) → Yes
7. has-terms-changed? (gateway) → No
8. won-bidding-round (UserTask)
9. Done
```

**Exempel: mortgage-se-application.bpmn**
```
1. internal-data-gathering → mortgage-se-internal-data-gathering.bpmn
2. stakeholder → mortgage-se-stakeholder.bpmn (multi-instance)
3. household → mortgage-se-household.bpmn
4. object → mortgage-se-object.bpmn
5. confirm-application (UserTask)
6. Done
```

### Steg 3: Extrahera alla BPMN-noder per subprocess

För varje subprocess, dokumentera:
- **Call Activities** (med deras subprocesser)
- **UserTasks** (UI-interaktioner)
- **ServiceTasks** (API-anrop)
- **BusinessRuleTasks** (DMN-beslut)
- **Gateways** (beslutspunkter)
- **Events** (start, end, boundary events)
- **Sequence flows** (flödesordning)

### Steg 4: Mappa till Feature Goals

För varje subprocess:
1. Identifiera **Feature Goal-fil** (t.ex. `mortgage-mortgage-commitment-v2.html`)
2. Identifiera **testscenario** (t.ex. S1 för happy path)
3. Extrahera **Given/When/Then** från Feature Goal
4. Extrahera **UI Flow** från Feature Goal (om tillgängligt)
5. Extrahera **User Stories** från Feature Goal

### Steg 5: Skapa komplett struktur

För varje E2E-scenario, skapa:

#### 5.1: `subprocessSteps` (i körordning)

Varje steg innehåller:
- `order`: Körordning (1, 2, 3, ...)
- `bpmnFile`: BPMN-fil där call activity finns
- `callActivityId`: ID för call activity
- `featureGoalFile`: Feature Goal-fil
- `description`: Kort beskrivning
- `hasPlaywrightSupport`: Om Playwright-test finns
- `given`: Given från Feature Goal
- `when`: When från Feature Goal
- `then`: Then från Feature Goal

#### 5.2: `bankProjectTestSteps` (alla BPMN-noder i detalj)

Varje steg innehåller:
- `bpmnNodeId`: ID från BPMN-fil
- `bpmnNodeType`: Typ (CallActivity, UserTask, ServiceTask, BusinessRuleTask, Gateway, etc.)
- `bpmnNodeName`: Namn från BPMN-fil
- `action`: Vad som händer (baserat på Feature Goal och BPMN-nodens syfte)
- `uiInteraction`: För UserTask: vad användaren gör i UI
- `apiCall`: För ServiceTask: vilket API som anropas
- `dmnDecision`: För BusinessRuleTask: vilket DMN-beslut som körs
- `assertion`: Vad som verifieras
- `backendState`: Förväntat backend-tillstånd efter teststeget

### Steg 6: Validering

För varje E2E-scenario:
1. **Verifiera att alla call activities är inkluderade** (jämför mot BPMN-filer)
2. **Verifiera att alla subprocesser är rekursivt analyserade** (inga saknade subprocesser)
3. **Verifiera att alla gateways har rätt väg** (happy path, error path, etc.)
4. **Verifiera att alla UserTasks har UI-interaktioner** (baserat på Feature Goals)
5. **Verifiera att alla ServiceTasks har API-anrop** (baserat på BPMN-nodens syfte)
6. **Verifiera att alla BusinessRuleTasks har DMN-beslut** (baserat på BPMN-nodens syfte)

---

## Implementeringsplan

### Fas 1: E2E_BR001 (En sökande - Bostadsrätt godkänd automatiskt)

**Prioritet:** P0 - HÖGST

**Arbetsgång:**
1. ✅ Identifiera huvudflöde i `mortgage.bpmn` för köp happy path
2. ⏳ Analysera varje call activity rekursivt:
   - `application` → `mortgage-se-application.bpmn`
   - `mortgage-commitment` → `mortgage-se-mortgage-commitment.bpmn`
   - `object-valuation` → `mortgage-se-object-valuation.bpmn`
   - `credit-evaluation` → `mortgage-se-credit-evaluation.bpmn`
   - `kyc` → `mortgage-se-kyc.bpmn`
   - `credit-decision` → `mortgage-se-credit-decision.bpmn`
   - `offer` → `mortgage-se-offer.bpmn`
   - `document-generation` → `mortgage-se-document-generation.bpmn`
   - `signing` → `mortgage-se-signing.bpmn`
   - `disbursement` → `mortgage-se-disbursement.bpmn`
3. ⏳ För varje subprocess, extrahera alla BPMN-noder
4. ⏳ Mappa till Feature Goals och extrahera Given/When/Then
5. ⏳ Skapa komplett `subprocessSteps`-array (ca 20 steg)
6. ⏳ Skapa komplett `bankProjectTestSteps`-array (ca 50-100 steg)
7. ⏳ Validera mot BPMN-filer (ingen nod saknas)

**Valideringschecklista:**
- [ ] Alla call activities från `mortgage.bpmn` är inkluderade
- [ ] Alla subprocesser från call activities är rekursivt analyserade
- [ ] Alla gateways har rätt väg (happy path)
- [ ] Alla UserTasks har UI-interaktioner
- [ ] Alla ServiceTasks har API-anrop
- [ ] Alla BusinessRuleTasks har DMN-beslut
- [ ] Alla Feature Goals är mappade
- [ ] Körordning är korrekt (baserat på sequence flows)

---

## Verktyg och metoder

### 1. BPMN-parser för automatisk extraktion

Skapa ett script som:
- Läser BPMN-filer rekursivt
- Extraherar alla call activities, UserTasks, ServiceTasks, BusinessRuleTasks, gateways
- Bygger en komplett graf över hela flödet
- Genererar en struktur som kan användas för validering

### 2. Feature Goal-parser

Skapa ett script som:
- Läser Feature Goal HTML-filer
- Extraherar Given/When/Then för varje testscenario
- Extraherar UI Flow-steg
- Extraherar User Stories

### 3. Valideringsscript

Skapa ett script som:
- Jämför E2E-scenario-struktur mot BPMN-filer
- Identifierar saknade noder
- Identifierar saknade subprocesser
- Genererar en valideringsrapport

---

## Nästa steg

1. **Börja med E2E_BR001** - det enklaste scenariot
2. **Analysera `mortgage.bpmn`** - identifiera exakt flöde för köp happy path
3. **Analysera varje subprocess rekursivt** - bygg komplett struktur
4. **Validera mot BPMN-filer** - säkerställ att inget saknas
5. **Uppdatera E2eTestsOverviewPage.tsx** - lägg till alla detaljer
6. **Repetera för nästa scenario** - när E2E_BR001 är komplett

