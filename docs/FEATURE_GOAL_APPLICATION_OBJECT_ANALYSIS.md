# Analys: Hur Förbättrad Prompt Hanterar Application → Object → Object Information

## Hierarki-struktur

```
Application (Feature Goal)
  └─ Object (Feature Goal)
      └─ Object information (Feature Goal)
          ├─ Fetch fastighets-information (Service Task)
          ├─ Fetch bostadsrätts-information (Service Task)
          ├─ Fetch BRF-information (Service Task)
          ├─ Screen fastighet (Business Rule)
          └─ Screen bostadsrätt (Business Rule)
```

## Vad Skickas till LLM för "Object information"?

### 1. processContext
- `phase`: Sannolikt "Datainsamling" eller "Riskbedömning"
- `lane`: Sannolikt "System" eller "Handläggare"
- `keyNodes`: ["Object information", "Object", "Application"]

### 2. currentNodeContext
- `hierarchy`: 
  - `trail`: ["Application Process", "Object", "Object information"]
  - `pathLabel`: "Application Process > Object > Object information"
  - `depthFromRoot`: 2 (Application = 0, Object = 1, Object information = 2)
  - `featureGoalAncestor`: "Object"
- `parents`: ["Object", "Application"]
- `siblings`: Andra noder i Object-processen (t.ex. "Register loan details", "Valuate bostad")
- `children`: Direkta children (Fetch fastighets-information, Fetch bostadsrätts-information, etc.)
- `descendantNodes`: Alla descendant nodes rekursivt (alla Service Tasks och Business Rules)
- `flows`: Incoming från "Register loan details", outgoing till "Objects accepted?" gateway

### 3. childrenDocumentation (REKURSIVT SAMLAD)
**Viktigt:** Systemet samlar dokumentation rekursivt från alla descendant nodes, inklusive leaf nodes.

**För Object information skulle detta inkludera:**
- Dokumentation från "Fetch fastighets-information" (Service Task)
  - `summary`: "Hämtar fastighetsinformation från externa källor..."
  - `flowSteps`: ["Systemet identifierar objekttyp...", "Systemet hämtar data..."]
  - `inputs`: ["Objekttyp", "Objekt-ID"]
  - `outputs`: ["Fastighetsinformation", "Värdering"]
- Dokumentation från "Fetch bostadsrätts-information" (Service Task)
  - `summary`: "Hämtar bostadsrättsinformation från externa källor..."
  - `flowSteps`: ["Systemet identifierar bostadsrättstyp...", "Systemet hämtar data..."]
- Dokumentation från "Screen fastighet" (Business Rule)
  - `summary`: "Utvärderar fastighet mot affärsregler..."
  - `decisionLogic`: "Om LTV > 85%, avslå..."
- Dokumentation från "Screen bostadsrätt" (Business Rule)
  - `summary`: "Utvärderar bostadsrätt mot affärsregler..."
  - `decisionLogic`: "Om BRF-skuld > 50% av värde, avslå..."

**Begränsningar:**
- Max 40 items totalt (för att undvika token overflow)
- Prioriterar: 1) Direkta children (subprocesser), 2) Leaf nodes (tasks/epics), 3) Övriga
- Scenarios begränsas till max 3 per node

---

## Hur Förbättrad Prompt (v1.6.0) Skulle Hantera Detta

### ✅ Styrkor med Förbättrad Prompt

#### 1. **Tydligare Instruktioner för `childrenDocumentation`-användning**
**För summary:**
- Prompten instruerar: "Aggregera vad child nodes gör för att skapa en mer precis sammanfattning"
- Claude skulle kunna aggregera:
  - "Fetch fastighets-information" + "Fetch bostadsrätts-information" → "Hämtar objektinformation från externa källor baserat på objekttyp"
  - "Screen fastighet" + "Screen bostadsrätt" → "Screenar objektet mot affärsregler"
- **Resultat:** Mer precis summary som "Object information hämtar objektinformation från externa källor baserat på objekttyp (småhus eller bostadsrätt) och screenar objektet mot affärsregler för att avgöra om det är godkänt."

**För effectGoals:**
- Prompten instruerar: "Identifiera konkreta effektmål baserat på vad child nodes gör"
- Claude skulle kunna identifiera:
  - Om child nodes automatiskt hämtar data → "Minskar manuellt arbete genom automatisering av datainsamling"
  - Om child nodes validerar data → "Förbättrar kvaliteten på kreditbedömningar genom systematisk validering"
- **Resultat:** Konkreta effektmål baserat på faktisk funktionalitet

**För flowSteps:**
- Prompten instruerar: "Använd child nodes flowSteps som inspiration, men aggregera dem till Feature Goal-nivå"
- Claude skulle kunna aggregera:
  - "Systemet identifierar objekttyp" + "Systemet hämtar data baserat på typ" → "Systemet identifierar objekttyp och hämtar relevant information från externa källor"
  - "Systemet screenar objektet" → "Systemet screenar objektet mot affärsregler"
- **Resultat:** Mer precisa flowSteps som reflekterar det faktiska flödet

**För dependencies:**
- Prompten instruerar: "Agregera dependencies från child nodes och ta bort dupliceringar"
- Claude skulle kunna agregera:
  - "Fetch fastighets-information" behöver "Fastighetsregister"
  - "Fetch bostadsrätts-information" behöver "Bostadsrättsregister"
  - "Screen fastighet" behöver "Regelmotor för fastighet"
  - "Screen bostadsrätt" behöver "Regelmotor för bostadsrätt"
- **Resultat:** Komplett lista med dependencies utan dupliceringar

**För epics:**
- Prompten instruerar: "Använd `childrenDocumentation` för att skapa mer precisa epic-descriptions baserat på vad child nodes faktiskt gör"
- Claude skulle kunna skapa:
  - Epic för "Fetch fastighets-information": "Hämtar fastighetsinformation från externa källor baserat på objekttyp"
  - Epic för "Screen fastighet": "Utvärderar fastighet mot affärsregler för att avgöra om den är godkänd"
- **Resultat:** Mer precisa epic-descriptions som reflekterar faktisk funktionalitet

#### 2. **Förbättrade Instruktioner för `epics`-fältet**
**Exempel på olika typer av epics:**
- Prompten innehåller nu exempel på User Task-epics, Service Task-epics, och Business Rule-epics
- Claude skulle kunna identifiera:
  - Service Task-epics: "Fetch fastighets-information", "Fetch bostadsrätts-information"
  - Business Rule-epics: "Screen fastighet", "Screen bostadsrätt"
- **Resultat:** Mer korrekta epic-typer och team-tilldelningar

**Team-tilldelning:**
- Prompten instruerar: "Service Tasks: Ofta 'Data & Analys', 'Integration', 'Backend'"
- Prompten instruerar: "Business Rules: Ofta 'Risk & Kredit', 'Compliance', 'Policy'"
- Claude skulle kunna tilldela:
  - Service Task-epics → "Data & Analys"
  - Business Rule-epics → "Risk & Kredit"
- **Resultat:** Mer korrekta team-tilldelningar

#### 3. **Fler Exempel för Olika Typer av Feature Goals**
- Prompten innehåller nu exempel på "Riskbedömning"-Feature Goal
- Detta ger Claude bättre referens för hur Feature Goals ska struktureras
- **Resultat:** Mer konsekvent struktur och innehåll

---

## Potentiella Utmaningar

### 1. **Komplexitet med Många Child Nodes** ⚠️
**Problem:**
- Object information har många child nodes (5+ Service Tasks och Business Rules)
- `childrenDocumentation` kan bli stor (max 40 items, men fortfarande mycket)
- Claude kan ha svårt att prioritera vilken kontext som är viktigast

**Sannolikhet:** Medium (25-35% risk)

**Hur prompten hanterar det:**
- Prompten instruerar: "Använd child nodes flowSteps som inspiration, men aggregera dem till Feature Goal-nivå"
- Prompten instruerar: "Agregera dependencies från child nodes och ta bort dupliceringar"
- **Men:** Instruktionerna är fortfarande ganska generiska och kan vara svåra att följa när det finns mycket kontext

**Förbättringsförslag:**
- Lägg till mer specifika instruktioner om hur man aggregerar när det finns många child nodes
- Tydliggör att Claude ska fokusera på huvudfunktionalitet, inte alla detaljer

### 2. **Balans mellan Detaljnivå och Översikt** ⚠️
**Problem:**
- Feature Goal-nivå ska vara översiktlig, inte detaljerad
- Men `childrenDocumentation` innehåller detaljerad information från child nodes
- Claude kan ha svårt att balansera detaljnivå

**Sannolikhet:** Medium (20-30% risk)

**Hur prompten hanterar det:**
- Prompten instruerar: "Aggregera vad child nodes gör för att skapa en mer precis sammanfattning"
- Prompten instruerar: "Använd child nodes flowSteps som inspiration, men aggregera dem till Feature Goal-nivå"
- **Men:** Instruktionerna är fortfarande ganska generiska

**Förbättringsförslag:**
- Lägg till mer specifika instruktioner om detaljnivå (t.ex. "Beskriv VAD som händer, inte HUR det implementeras")
- Tydliggör att Feature Goal-nivå ska vara översiktlig, inte detaljerad

### 3. **Identifiering av Epic-typer** ⚠️
**Problem:**
- Claude behöver identifiera vilken typ av epic varje child node är
- Om child node är en Service Task, epic ska beskrivas som Service Task-epic
- Om child node är en Business Rule, epic ska beskrivas som Business Rule-epic

**Sannolikhet:** Low-Medium (15-25% risk)

**Hur prompten hanterar det:**
- Prompten innehåller nu exempel på olika typer av epics
- Prompten instruerar: "Använd `currentNodeContext.children` för att identifiera epics"
- **Men:** Instruktionerna är fortfarande ganska generiska

**Förbättringsförslag:**
- Lägg till mer specifika instruktioner om hur man identifierar epic-typer baserat på child node-typ
- Tydliggör att epic-typ ska matcha child node-typ

---

## Förväntade Resultat

### Scenarier där Claude kommer presterar mycket bra (90%+ sannolikhet):
1. **Summary** - Tydliga instruktioner om aggregering ger bra resultat
2. **EffectGoals** - Tydliga instruktioner om identifiering ger bra resultat
3. **Dependencies** - Tydliga instruktioner om aggregering och duplicering ger bra resultat
4. **Formatkrav** - Exakt format specificerat ger bra resultat

### Scenarier där Claude kan ha svårigheter (65-75% sannolikhet):
1. **Epics-fältet** - Kan generera generiska beskrivningar om instruktionerna inte följs korrekt
2. **FlowSteps** - Kan ha svårt att aggregera många child nodes flowSteps till Feature Goal-nivå
3. **Balans mellan detaljnivå och översikt** - Kan bli för detaljerad eller för generisk

### Scenarier där validering kommer fånga upp fel:
1. **JSON-syntaxfel** - Validering fångar upp dessa
2. **Saknade obligatoriska fält** - Validering fångar upp dessa
3. **Felaktiga datatyper** - Validering fångar upp dessa
4. **Felaktigt dependencies-format** - Validering fångar upp dessa

---

## Specifik Bedömning för Object Information

### Summary
**Förväntad kvalitet:** 85-90% sannolikhet för bra kvalitet
- Tydliga instruktioner om aggregering
- `childrenDocumentation` innehåller bra information om vad child nodes gör
- **Potentiellt problem:** Kan bli för detaljerad om Claude inte följer instruktionerna om aggregering

### EffectGoals
**Förväntad kvalitet:** 80-85% sannolikhet för bra kvalitet
- Tydliga instruktioner om identifiering
- `childrenDocumentation` innehåller bra information om effektmål
- **Potentiellt problem:** Kan missa konkreta effektmål om instruktionerna inte följs korrekt

### Epics
**Förväntad kvalitet:** 75-80% sannolikhet för bra kvalitet
- Förbättrade instruktioner och exempel
- `childrenDocumentation` innehåller bra information om child nodes
- **Potentiellt problem:** Kan generera generiska beskrivningar om instruktionerna inte följs korrekt
- **Potentiellt problem:** Kan ha svårt att identifiera rätt epic-typ (Service Task vs Business Rule)

### FlowSteps
**Förväntad kvalitet:** 75-85% sannolikhet för bra kvalitet
- Tydliga instruktioner om aggregering
- `childrenDocumentation` innehåller bra information om flowSteps
- **Potentiellt problem:** Kan ha svårt att aggregera många child nodes flowSteps till Feature Goal-nivå
- **Potentiellt problem:** Kan bli för detaljerad eller för generisk

### Dependencies
**Förväntad kvalitet:** 90-95% sannolikhet för korrekt format
- Exakt format specificerat
- Tydliga instruktioner om aggregering och duplicering
- **Potentiellt problem:** Kan missa dependencies om kontext är ofullständig

### RelatedItems
**Förväntad kvalitet:** 80-85% sannolikhet för bra kvalitet
- Tydliga instruktioner
- Bra exempel
- **Potentiellt problem:** Kan missa relaterade items om kontext är ofullständig

---

## Slutsats

**Överlag bedömning för Object information: 8-8.5/10**

Den förbättrade prompten (v1.6.0) skulle generera **bra innehåll** för Object information Feature Goal, med vissa reservationer:

**Största styrkor:**
- Tydligare instruktioner för `childrenDocumentation`-användning per fält
- Förbättrade instruktioner för `epics`-fältet med exempel
- Fler exempel för olika typer av Feature Goals
- Tydlig aggregering av information från child nodes

**Största risker:**
- Komplexitet med många child nodes kan överväldiga Claude
- Balans mellan detaljnivå och översikt kan vara svår
- Epic-typer kan vara svåra att identifiera korrekt

**Förväntad kvalitet:**
- **Enkla fält** (summary, dependencies): 85-95% sannolikhet för bra kvalitet
- **Medelkomplexa fält** (effectGoals, relatedItems): 80-85% sannolikhet för bra kvalitet
- **Komplexa fält** (epics, flowSteps): 75-80% sannolikhet för bra kvalitet

**Rekommendation:**
- Den förbättrade prompten är **bra nog** för att generera bra innehåll för Object information
- Ytterligare förbättringar kan göras för att hantera komplexitet med många child nodes
- Testa med faktiska BPMN-filer och iterera baserat på resultat
