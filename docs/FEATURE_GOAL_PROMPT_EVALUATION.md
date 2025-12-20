# Evaluering: Feature Goal Prompt - Förbättringsmöjligheter

## Översikt

Denna evaluering analyserar Feature Goal-delen av `feature_epic_prompt.md` (v1.5.0) och jämför med Epic-delen för att identifiera förbättringsmöjligheter, särskilt baserat på vad som gjorts för Epic (Service Tasks/User Tasks).

---

## Nuvarande Status för Feature Goal Prompt

### Styrkor ✅

1. **Tydlig struktur och formatkrav**
   - Exakt JSON-schema specificerat
   - Tydliga formatkrav för dependencies
   - Bra exempel på JSON-output

2. **Affärsspråk-fokus**
   - Tydliga instruktioner om att undvika teknisk BPMN-terminologi
   - Bra exempel på bra vs dåligt språk
   - Konsekventa instruktioner genom hela prompten

3. **Kontextanvändning**
   - Tydlig instruktion om `processContext` och `currentNodeContext`
   - Specifik instruktion om `childrenDocumentation` för Feature Goals
   - Tydliggör vad som händer när information saknas

4. **Prioritering när instruktioner konfliktar**
   - Tydlig hierarki av prioriteter
   - Hjälper Claude att fatta rätt beslut vid konflikter

5. **Few-shot examples**
   - Komplett exempel på Feature Goal JSON-output
   - Visar bra praxis och struktur

---

## Jämförelse med Epic Prompt

### Vad Epic Prompten Har Som Feature Goal Saknar

#### 1. **Mer Detaljerade Instruktioner för User Stories** ⚠️
**Epic har:**
- Tydlig struktur för user stories (id, role, goal, value, acceptanceCriteria)
- Specifika instruktioner om roller för User Tasks vs Service Tasks
- Tydliga exempel på acceptanskriterier
- Instruktioner om antal (3-6 user stories, 2-4 acceptanskriterier per story)
- Tydliggör att acceptanskriterier ska vara affärsnära och testbara

**Feature Goal saknar:**
- Feature Goal har inte userStories-fält (vilket är korrekt), men prompten skulle kunna ha tydligare instruktioner om hur epics ska beskrivas i `epics`-fältet

#### 2. **Mer Specifika Exempel för Olika Nodtyper** ⚠️
**Epic har:**
- Separata exempel för User Task och Service Task
- Visar skillnader i hur innehållet ska anpassas baserat på nodtyp

**Feature Goal har:**
- Endast ett exempel (generiskt Feature Goal)
- Kunde ha exempel för olika typer av Feature Goals (t.ex. datainsamling, riskbedömning, beslut)

#### 3. **Tydligare Instruktioner om Edge Cases** ⚠️
**Epic har:**
- Tydliggör vad som händer när `interactions` ska utelämnas för Service Tasks
- Tydliggör skillnader mellan User Tasks och Service Tasks

**Feature Goal har:**
- Tydliggör att `epics` kan vara tom array `[]`
- Men kunde ha mer specifika instruktioner om edge cases (t.ex. Feature Goals utan epics, Feature Goals med många epics)

#### 4. **Mer Detaljerade Instruktioner om Kontextanvändning** ⚠️
**Epic har:**
- Tydliggör hur `currentNodeContext.flows.incoming` ska användas för prerequisites
- Tydliggör hur `currentNodeContext.flows` ska användas för flowSteps

**Feature Goal har:**
- Tydliggör att `childrenDocumentation` ska användas, men kunde vara mer specifik om HUR den ska användas för olika fält

---

## Identifierade Förbättringsmöjligheter

### Högsta Prioritet 🔴

#### 1. **Förbättra Instruktioner för `epics`-fältet**
**Problem:**
- Nuvarande instruktioner är ganska generiska
- Saknar tydlig vägledning om hur epics ska beskrivas baserat på child nodes
- Saknar exempel på olika typer av epics

**Förslag:**
- Lägg till mer detaljerade instruktioner om hur `currentNodeContext.children` ska användas
- Lägg till exempel på olika typer av epics (User Task-epics, Service Task-epics, Business Rule-epics)
- Tydliggör att epic-description ska vara affärsnära och beskriva epicens roll i flödet

**Exempel på förbättring:**
```markdown
### epics

**Syfte:** Lista de viktigaste epics som ingår i Feature Goalet.

**Innehåll (`epics`):**
- 2–5 objekt med fälten:
  - `id`: kort ID (t.ex. `"E1"`, `"E2"`).
  - `name`: epic-namn (använd child node-namnet eller skapa ett beskrivande namn).
  - `description`: 1–2 meningar om epicens roll i flödet (använd affärsspråk, beskriv VAD epiken gör, inte HUR den är strukturerad).
  - `team`: vilket team som typiskt äger epiken (generellt namn, t.ex. `"Risk & Kredit"`, `"Data & Analys"`).
- **OBS:** Om Feature Goalet har inga epics, använd tom array `[]`.
- Använd `currentNodeContext.children` för att identifiera epics.
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att skapa mer precisa beskrivningar av epics.

**Exempel på bra epic-description:**
- ✅ Bra: "Hämtar och sammanställer intern kund- och engagemangsdata från bankens system för kreditbedömning."
- ❌ Dåligt: "UserTask som anropar API för att hämta kunddata."

**Exempel på olika typer av epics:**
- User Task-epic: `{ "id": "E1", "name": "Ansökningsformulär", "description": "Möjliggör att kunder kan fylla i ansökningsinformation via webbgränssnitt.", "team": "Kundupplevelse" }`
- Service Task-epic: `{ "id": "E2", "name": "Extern datainsamling", "description": "Hämtar automatiskt kunddata från externa källor som kreditupplysningar och folkbokföringsregister.", "team": "Data & Analys" }`
- Business Rule-epic: `{ "id": "E3", "name": "Kreditvärdighetsbedömning", "description": "Utvärderar kundens kreditvärdighet baserat på insamlad data och bankens kreditpolicy.", "team": "Risk & Kredit" }`
```

#### 2. **Förbättra Instruktioner för `childrenDocumentation`-användning**
**Problem:**
- Nuvarande instruktioner är ganska generiska
- Saknar tydlig vägledning om HUR `childrenDocumentation` ska användas för olika fält

**Förslag:**
- Lägg till mer specifika instruktioner om hur `childrenDocumentation` ska användas för varje fält
- Lägg till exempel på hur information från child nodes ska aggregeras

**Exempel på förbättring:**
```markdown
**Viktigt om `childrenDocumentation`:**
- Om `currentNodeContext.childrenDocumentation` finns, använd den för att:
  - **summary**: Aggregera vad child nodes gör för att skapa en mer precis sammanfattning av Feature Goalet
  - **effectGoals**: Identifiera konkreta effektmål baserat på vad child nodes gör (t.ex. om child nodes automatiskt hämtar data, effektmålet kan vara "Minskar manuellt arbete")
  - **flowSteps**: Skapa mer precisa flowSteps som reflekterar det faktiska flödet genom child nodes (använd child nodes flowSteps som inspiration)
  - **dependencies**: Identifiera dependencies baserat på vad child nodes behöver (agregera dependencies från child nodes)
  - **relatedItems**: Identifiera relaterade items baserat på child nodes relaterade items
- Referera INTE direkt till child node-namn i texten, men använd deras funktionalitet för att skapa bättre dokumentation.
- Om `childrenDocumentation` saknas: Generera dokumentation baserat på nodens namn, typ och kontext, utan att referera till child nodes.
```

#### 3. **Lägg till Fler Exempel för Olika Typer av Feature Goals**
**Problem:**
- Endast ett exempel (generiskt Feature Goal)
- Kunde ha exempel för olika typer av Feature Goals

**Förslag:**
- Lägg till exempel för olika typer av Feature Goals (t.ex. datainsamling, riskbedömning, beslut)
- Visa hur innehållet anpassas baserat på Feature Goal-typ

---

### Medel Prioritet 🟡

#### 4. **Förbättra Instruktioner för `scopeIncluded` och `scopeExcluded`**
**Problem:**
- Nuvarande instruktioner är ganska generiska
- Saknar exempel på olika typer av scope

**Förslag:**
- Lägg till mer specifika exempel på scope
- Tydliggör hur scope ska relateras till child nodes

#### 5. **Förbättra Instruktioner för `dependencies`**
**Problem:**
- Nuvarande instruktioner är bra, men kunde ha fler exempel
- Saknar tydlig vägledning om hur dependencies ska identifieras från child nodes

**Förslag:**
- Lägg till fler exempel på dependencies
- Tydliggör hur dependencies ska aggregeras från child nodes

#### 6. **Förbättra Instruktioner för `relatedItems`**
**Problem:**
- Nuvarande instruktioner är bra, men kunde ha fler exempel
- Saknar tydlig vägledning om hur relatedItems ska identifieras

**Förslag:**
- Lägg till fler exempel på relatedItems
- Tydliggör hur relatedItems ska identifieras från kontext

---

### Lägre Prioritet 🟢

#### 7. **Lägg till Checklist i Slutet av Prompten**
**Förslag:**
- Lägg till en kort checklista med viktigaste punkterna för Feature Goal-generering
- Hjälper Claude att hålla fokus på viktigaste aspekterna

#### 8. **Förbättra Instruktioner om Längd och Detaljnivå**
**Förslag:**
- Tydliggör hur längd ska anpassas baserat på Feature Goal-komplexitet
- Ge exempel på när längre vs kortare listor är lämpliga

---

## Specifika Förbättringar per Fält

### summary
**Nuvarande status:** ✅ Bra
**Förbättringsmöjligheter:**
- Kunde ha mer specifika exempel på hur `childrenDocumentation` ska användas
- Kunde ha exempel för olika typer av Feature Goals

### effectGoals
**Nuvarande status:** ✅ Bra
**Förbättringsmöjligheter:**
- Kunde ha mer specifika exempel på hur `childrenDocumentation` ska användas
- Kunde ha exempel för olika typer av effektmål

### scopeIncluded / scopeExcluded
**Nuvarande status:** ⚠️ Kan förbättras
**Förbättringsmöjligheter:**
- Lägg till fler exempel på scope
- Tydliggör hur scope ska relateras till child nodes

### epics
**Nuvarande status:** ⚠️ Kan förbättras (HÖGSTA PRIORITET)
**Förbättringsmöjligheter:**
- Mer detaljerade instruktioner om hur epics ska beskrivas
- Exempel på olika typer av epics
- Tydliggör hur `childrenDocumentation` ska användas

### flowSteps
**Nuvarande status:** ✅ Bra
**Förbättringsmöjligheter:**
- Kunde ha mer specifika exempel på hur `childrenDocumentation` ska användas
- Kunde ha exempel för olika typer av Feature Goals

### dependencies
**Nuvarande status:** ✅ Bra
**Förbättringsmöjligheter:**
- Kunde ha fler exempel
- Tydliggör hur dependencies ska aggregeras från child nodes

### relatedItems
**Nuvarande status:** ✅ Bra
**Förbättringsmöjligheter:**
- Kunde ha fler exempel
- Tydliggör hur relatedItems ska identifieras från kontext

---

## Rekommenderade Åtgärder

### Omedelbart (Högsta Prioritet)
1. ✅ **Förbättra instruktioner för `epics`-fältet**
   - Lägg till mer detaljerade instruktioner
   - Lägg till exempel på olika typer av epics
   - Tydliggör hur `childrenDocumentation` ska användas

2. ✅ **Förbättra instruktioner för `childrenDocumentation`-användning**
   - Lägg till mer specifika instruktioner per fält
   - Lägg till exempel på hur information ska aggregeras

3. ✅ **Lägg till fler exempel för olika typer av Feature Goals**
   - Exempel för datainsamling, riskbedömning, beslut
   - Visa hur innehållet anpassas baserat på Feature Goal-typ

### Kort sikt (Medel Prioritet)
4. **Förbättra instruktioner för `scopeIncluded` och `scopeExcluded`**
5. **Förbättra instruktioner för `dependencies`**
6. **Förbättra instruktioner för `relatedItems`**

### Lång sikt (Lägre Prioritet)
7. **Lägg till checklist i slutet av prompten**
8. **Förbättra instruktioner om längd och detaljnivå**

---

## Slutsats

**Nuvarande bedömning: 7.5/10**

Feature Goal-prompten är **bra** men har förbättringsmöjligheter, särskilt:
- Mer detaljerade instruktioner för `epics`-fältet
- Tydligare vägledning om hur `childrenDocumentation` ska användas
- Fler exempel för olika typer av Feature Goals

**Största styrkor:**
- Tydlig struktur och formatkrav
- Bra affärsspråk-fokus
- Tydlig kontextanvändning
- Prioritering när instruktioner konfliktar

**Största förbättringsmöjligheter:**
- Mer detaljerade instruktioner för `epics`-fältet
- Tydligare vägledning om `childrenDocumentation`-användning
- Fler exempel för olika typer av Feature Goals

**Rekommendation:**
- Implementera de högsta prioritetsförbättringarna (epics, childrenDocumentation, fler exempel)
- Testa med faktiska BPMN-filer och iterera baserat på resultat
- Övervaka valideringsfel och använd dem för att förbättra prompten
