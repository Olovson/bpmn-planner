# Analys: Varför Genereras Två Typer av Feature Goal-dokumentation?

## Problemformulering

Systemet genererar två typer av Feature Goal-dokumentation:
1. **CallActivity Feature Goals** (hierarchical naming): `feature-goals/{parent}-{elementId}.html`
2. **Process Feature Goals** (non-hierarchical): `feature-goals/{baseName}.html`

**Fråga:** Varför gör vi detta och behövs det verkligen?

---

## Nuvarande Implementation

### 1. CallActivity Feature Goals (Hierarchical)

**När genereras:**
- För varje `callActivity` i parent-filen som har en `subprocessFile`
- Genereras i `bpmnGenerators.ts` rad 2146-2200+

**Namngivning:**
- Hierarchical format: `feature-goals/{parentBaseName}-{elementId}.html`
- Exempel: `feature-goals/mortgage-se-application-internal-data-gathering.html`
- Använder `getFeatureGoalDocFileKey(subprocessFile, elementId, undefined, parentBpmnFile)`

**Syfte (enligt kod):**
- Dokumentera callActivity från **parent-processens perspektiv**
- Instans-specifik dokumentation för varje callActivity-anrop
- Kommentar i rad 2194-2200: "Om subprocess-filen redan genererat Feature Goal → skapa instans-specifik dokumentation"

**Kontext:**
- Använder `parentBpmnFile` för hierarchical naming
- Inkluderar parent-processens kontext i dokumentationen
- Beskriver callActivity's roll i parent-processen

---

### 2. Process Feature Goals (Non-hierarchical)

**När genereras:**
- För process-noden i subprocess-filer (inte root)
- Genereras i `bpmnGenerators.ts` rad 2581-2592
- Genereras även om `nodesInFile.length === 0` (tomma subprocess-filer)

**Namngivning:**
- Non-hierarchical format: `feature-goals/{baseName}.html`
- Exempel: `feature-goals/mortgage-se-application.html`
- Använder `getFeatureGoalDocFileKey(file, fileBaseName, undefined, undefined)` - **ingen parent**

**Syfte (enligt kod):**
- Dokumentera subprocess-processen från **subprocess-filens perspektiv**
- Kommentar i rad 2514: "Subprocesser har redan Feature Goal-dokumentation som täcker processen"
- Kommentar i rad 2566-2568: "Feature Goal-generering för subprocess-filer måste köras även om nodesInFile.length === 0"

**Kontext:**
- Ingen parent-kontext (standalone dokumentation)
- Beskriver subprocess-processen i isolering
- Används när subprocess-filen refereras direkt (inte via callActivity)

---

## Historisk Kontext

Från `scripts/feature-goals-summary.md`:
- Systemet genererade tidigare felaktigt Feature Goals för tasks (51 filer borttagna)
- Systemet genererade tidigare Feature Goal för root process (1 fil borttagen)
- **26 subprocess process nodes** har Feature Goals (non-hierarchical)
- **23 call activities** har Feature Goals (hierarchical)
- **21 call activities** saknar Feature Goals

Detta tyder på att:
1. Process Feature Goals var det ursprungliga sättet att dokumentera subprocesser
2. CallActivity Feature Goals lades till senare för att hantera instans-specifik dokumentation

---

## Teoretisk Motivering

### Scenario 1: En subprocess används på flera ställen

**Exempel:** `mortgage-se-application.bpmn` anropas från:
- `mortgage.bpmn` via callActivity `application`
- Potentiellt från andra filer i framtiden

**Process Feature Goal:**
- En "base" dokumentation för subprocessen
- Beskriver subprocessen i isolering
- Oavsett var den anropas från

**CallActivity Feature Goal:**
- Instans-specifik dokumentation för varje anrop
- Beskriver callActivity's roll i parent-processen
- Kan ha olika kontext beroende på parent-processen

**Fördel:** Olika perspektiv för olika användningsfall

---

### Scenario 2: En subprocess används bara på ett ställe

**Exempel:** `mortgage-se-internal-data-gathering.bpmn` anropas bara från:
- `mortgage-se-application.bpmn` via callActivity `internal-data-gathering`

**Process Feature Goal:**
- `feature-goals/mortgage-se-internal-data-gathering.html`
- Beskriver subprocessen i isolering

**CallActivity Feature Goal:**
- `feature-goals/mortgage-se-application-internal-data-gathering.html`
- Beskriver callActivity's roll i application-processen

**Problem:** Dubbel dokumentation för samma sak?

---

## Problem med Nuvarande Approach

### 1. Dubbel Dokumentation

**Problem:**
- För subprocesser som bara används på ett ställe genereras både Process Feature Goal och CallActivity Feature Goal
- Båda dokumenterar i princip samma sak (subprocessen)
- Ökar underhållsarbete och förvirring

**Exempel:**
- Process Feature Goal: `feature-goals/mortgage-se-application.html`
- CallActivity Feature Goal: `feature-goals/mortgage-application.html` (eller `mortgage-se-application-application.html`)
- Båda dokumenterar samma subprocess, men från olika perspektiv

---

### 2. Namngivningskonflikt

**Problem:**
- Process Feature Goal: `feature-goals/mortgage-se-application.html`
- CallActivity Feature Goal: Om elementId är `application` och parent är `mortgage`, kan det bli `feature-goals/mortgage-application.html` eller `feature-goals/mortgage-se-application.html`
- Risk för namnkonflikt eller förvirring

**Exempel från kod:**
- `getFeatureGoalDocFileKey` har logik för att undvika repetition (rad 58-64, 77-90)
- Men det kan fortfarande bli konflikter

---

### 3. Komplexitet i UI

**Problem:**
- Node Matrix måste kolla båda typerna för att visa länkar
- `useAllBpmnNodes.ts` måste hantera båda typerna
- `DocViewer` måste kunna hitta båda typerna
- Ökar komplexitet och risk för buggar

**Exempel:**
- Just nu saknades Process Feature Goal-länkar i Node Matrix (fixat i denna session)
- Ytterligare komplexitet i `getDocumentationUrl()` och `getFeatureGoalDocStoragePaths()`

---

### 4. Oklart Syfte

**Problem:**
- Det är oklart när Process Feature Goals ska användas vs CallActivity Feature Goals
- Kommentarer i koden säger olika saker:
  - Rad 2194: "Om subprocess-filen redan genererat Feature Goal → skapa instans-specifik dokumentation"
  - Rad 2514: "Subprocesser har redan Feature Goal-dokumentation som täcker processen"
- Men vad betyder detta i praktiken?

---

## Alternativa Approaches

### Alternativ 1: Bara CallActivity Feature Goals

**Approach:**
- Ta bort Process Feature Goals helt
- Använd bara CallActivity Feature Goals (hierarchical naming)
- För subprocesser som inte anropas via callActivity: generera inte Feature Goal

**Fördelar:**
- Enklare modell
- En Feature Goal per callActivity (tydlig mapping)
- Ingen dubbel dokumentation

**Nackdelar:**
- Subprocesser som inte anropas via callActivity får ingen dokumentation
- Om en subprocess anropas från flera ställen, får den flera Feature Goals (men det är faktiskt korrekt - olika perspektiv)

---

### Alternativ 2: Bara Process Feature Goals

**Approach:**
- Ta bort CallActivity Feature Goals helt
- Använd bara Process Feature Goals (non-hierarchical naming)
- Alla subprocesser får en Feature Goal (oavsett hur många gånger de anropas)

**Fördelar:**
- Enklare modell
- En Feature Goal per subprocess (tydlig mapping)
- Ingen dubbel dokumentation

**Nackdelar:**
- Förlorar parent-processens kontext
- Om en subprocess anropas från flera ställen med olika kontext, kan dokumentationen bli generisk
- CallActivities i Node Matrix måste länka till Process Feature Goal (inte instans-specifik)

---

### Alternativ 3: Hybrid (Nuvarande, men Förbättrad)

**Approach:**
- Behåll båda typerna, men gör syftet tydligare:
  - **Process Feature Goal:** Base dokumentation för subprocessen (genereras en gång per subprocess-fil)
  - **CallActivity Feature Goal:** Instans-specifik dokumentation (genereras för varje callActivity, refererar till Process Feature Goal)

**Fördelar:**
- Olika perspektiv för olika användningsfall
- Process Feature Goal kan vara "base" dokumentation
- CallActivity Feature Goal kan vara "instans-specifik" dokumentation

**Nackdelar:**
- Fortfarande komplexitet
- Kräver tydlig dokumentation om när vad används
- Risk för dubbel dokumentation

---

## Rekommendation

### Kort sikt: Behåll Båda, Men Förtydliga

**Anledning:**
- Process Feature Goals finns redan i Storage
- CallActivity Feature Goals finns redan i Storage
- Att ta bort en typ kräver migrering av befintlig dokumentation

**Åtgärder:**
1. **Dokumentera tydligt när vad används:**
   - Process Feature Goal: Base dokumentation för subprocessen (genereras en gång)
   - CallActivity Feature Goal: Instans-specifik dokumentation (genereras för varje callActivity)

2. **Förbättra UI:**
   - Node Matrix: Visa Process Feature Goal-länk för callActivities (redan fixat)
   - DocViewer: Visa båda typerna om de finns

3. **Förhindra dubbelgenerering:**
   - Om Process Feature Goal redan finns, använd den som base
   - CallActivity Feature Goal kan referera till Process Feature Goal

---

### Lång sikt: Överväg Konsolidering

**Alternativ A: Bara CallActivity Feature Goals**
- Ta bort Process Feature Goals
- Migrera Process Feature Goals till CallActivity Feature Goals
- Enklare modell, tydligare mapping

**Alternativ B: Bara Process Feature Goals**
- Ta bort CallActivity Feature Goals
- Migrera CallActivity Feature Goals till Process Feature Goals
- Enklare modell, men förlorar parent-kontext

**Rekommendation:** **Alternativ A (Bara CallActivity Feature Goals)**
- CallActivity Feature Goals har parent-kontext (mer värdefullt)
- Tydligare mapping: en Feature Goal per callActivity
- Process Feature Goals kan ersättas med "file-level documentation" för subprocesser

---

## Slutsats

**Nuvarande situation:**
- Systemet genererar båda typerna av historiska skäl
- Process Feature Goals var det ursprungliga sättet
- CallActivity Feature Goals lades till senare för instans-specifik dokumentation
- Båda typerna har sina syften, men skapar komplexitet

**Behövs det?**
- **Kort sikt:** Ja, båda behövs för att inte bryta befintlig dokumentation
- **Lång sikt:** Nej, en typ räcker (rekommenderar CallActivity Feature Goals)

**Nästa steg:**
1. Dokumentera tydligt när vad används
2. Förbättra UI för att hantera båda typerna
3. Planera migrering till en typ (lång sikt)

