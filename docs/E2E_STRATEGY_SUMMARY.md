# Strategi för E2E-scenario validering - Sammanfattning

**Datum:** 2025-01-XX  
**Status:** Strategi definierad, implementation pågår

---

## Problem

Varje E2E-scenario behöver:
- **Ca 20 subprocesser** (call activities) som går genom hela flödet
- **Väldigt många detaljer** kopplade till varje steg (BPMN-noder, UI-interaktioner, API-anrop, DMN-beslut, assertions, backend-tillstånd)
- **Validering mot faktiska BPMN-filer** för att säkerställa att inget saknas
- **Rekursiv analys** av subprocesser (subprocesser kan ha sina egna subprocesser)

---

## Lösning: Systematisk validering per E2E-scenario

### 1. Skapade strategi-dokument
**Fil:** `docs/E2E_VALIDATION_STRATEGY.md`

Innehåller:
- Steg-för-steg metod för att validera varje E2E-scenario
- Rekursiv analys av subprocesser
- Extraktion av alla BPMN-noder
- Mappning till Feature Goals
- Valideringschecklista

### 2. Skapade analysscript
**Fil:** `scripts/analyze-e2e-scenario.ts`

Scriptet:
- ✅ Läser BPMN-filer rekursivt
- ✅ Extraherar alla call activities, UserTasks, ServiceTasks, BusinessRuleTasks, gateways
- ✅ Bygger körordning baserat på sequence flows
- ✅ Använder `bpmn-map.json` för att hitta rätt BPMN-filer
- ⏳ Behöver förbättras för att hantera gateways och happy path-flöden

**Exempel på output:**
```
=== Körordning för köp happy path ===
1. CallActivity: Application (application)

=== Rekursiv analys av CallActivities ===
📁 application: Application Mortgage (mortgage-se-application.bpmn)
  1. CallActivity: Internal data gathering (internal-data-gathering)
    📁 internal-data-gathering: (mortgage-se-internal-data-gathering.bpmn)
      1. ServiceTask: Fetch party information (fetch-party-information)
      2. BusinessRuleTask: Screen party (screen-party)
      3. Gateway: Party rejected? (is-party-rejected)
      4. ServiceTask: Fetch engagements (fetch-engagements)
  2. CallActivity: Object (object)
    📁 object: (mortgage-se-object.bpmn)
      1. Gateway: Purposes? (purposes)
      2. Gateway: Skip step? (skip-register-source-of-equity)
      3. UserTask: Register source of equity (register-source-of-equity)
```

### 3. Tog bort ovaliderade detaljer
**Fil:** `src/pages/E2eTestsOverviewPage.tsx`

- ✅ Tog bort alla `bankProjectTestSteps` och `subprocessSteps` som inte var korrekt validerade
- ✅ Behöll grundstrukturen för scenarionna (id, name, priority, summary, given/when/then)
- ✅ Lade till tomma arrays (`bankProjectTestSteps: []`, `subprocessSteps: []`) som ska fyllas i stegvis

---

## Nästa steg: Validera E2E_BR001

### Steg 1: Förbättra analysscriptet
- [ ] Hantera gateways och välj rätt väg för happy path
- [ ] Extrahera alla noder i rätt ordning (inklusive gateways, events)
- [ ] Generera JSON-struktur som kan användas för att uppdatera E2eTestsOverviewPage.tsx

### Steg 2: Analysera E2E_BR001 komplett
- [ ] Kör scriptet för E2E_BR001
- [ ] Verifiera att alla call activities från `mortgage.bpmn` är inkluderade
- [ ] Verifiera att alla subprocesser är rekursivt analyserade
- [ ] Identifiera alla gateways och välj rätt väg för happy path
- [ ] Räkna totalt antal subprocesser (ska vara ca 20)

### Steg 3: Mappa till Feature Goals
- [ ] För varje subprocess, identifiera Feature Goal-fil
- [ ] Extrahera Given/When/Then från Feature Goal
- [ ] Extrahera UI Flow-steg (om tillgängligt)
- [ ] Extrahera User Stories

### Steg 4: Skapa komplett struktur
- [ ] Skapa `subprocessSteps`-array med ca 20 steg
- [ ] Skapa `bankProjectTestSteps`-array med alla BPMN-noder i detalj
- [ ] Validera mot BPMN-filer (ingen nod saknas)
- [ ] Uppdatera E2eTestsOverviewPage.tsx

### Steg 5: Validering
- [ ] Alla call activities från `mortgage.bpmn` är inkluderade
- [ ] Alla subprocesser är rekursivt analyserade
- [ ] Alla gateways har rätt väg (happy path)
- [ ] Alla UserTasks har UI-interaktioner
- [ ] Alla ServiceTasks har API-anrop
- [ ] Alla BusinessRuleTasks har DMN-beslut
- [ ] Körordning är korrekt (baserat på sequence flows)

---

## Verktyg

### 1. Analysscript
```bash
npx tsx scripts/analyze-e2e-scenario.ts E2E_BR001
```

### 2. BPMN-map
`bpmn-map.json` innehåller mappning mellan call activities och BPMN-filer.

### 3. Feature Goals
`public/local-content/feature-goals/*.html` innehåller Given/When/Then för varje testscenario.

---

## Exempel: E2E_BR001 (Köp Happy Path)

**Förväntad struktur:**

### Root process: mortgage.bpmn
1. `application` → mortgage-se-application.bpmn
2. `is-purchase?` (gateway) → Yes
3. `mortgage-commitment` → mortgage-se-mortgage-commitment.bpmn
4. `object-valuation` → mortgage-se-object-valuation.bpmn
5. `credit-evaluation` → mortgage-se-credit-evaluation.bpmn
6. `is-automatically-approved?` (gateway) → Yes
7. `kyc` → mortgage-se-kyc.bpmn
8. `credit-decision` → mortgage-se-credit-decision.bpmn
9. `is-credit-approved?` (gateway) → Yes
10. `offer` → mortgage-se-offer.bpmn
11. `document-generation` → mortgage-se-document-generation.bpmn
12. `signing` → mortgage-se-signing.bpmn
13. `disbursement` → mortgage-se-disbursement.bpmn
14. `needs-collateral-registration?` (gateway) → No
15. Done

**Varje subprocess har sina egna subprocesser:**
- `mortgage-se-application.bpmn` har: internal-data-gathering, stakeholder, household, object
- `mortgage-se-mortgage-commitment.bpmn` har: credit-evaluation-1, object-information, credit-evaluation-2, documentation-assessment
- etc.

**Totalt antal subprocesser:** Ca 20-25 (beroende på hur man räknar)

---

## Status

✅ Strategi definierad  
✅ Analysscript skapat  
✅ Ovaliderade detaljer borttagna  
⏳ Validering av E2E_BR001 pågår  
⏳ Förbättring av scriptet för gateways behövs

