# Strategi för återkommande Feature Goals

## Problem

Ett feature goal kan återkomma flera gånger i samma process eller i olika processer. När detta händer är det ofta pga att:
1. **Ny information har tillkommit** - t.ex. uppdaterad dokumentation, ändrade villkor, eller nya objektdata
2. **Olika kontexter** - samma process anropas från olika ställen med olika syften
3. **Loop-mekanismer** - processen loopar tillbaka för att hantera ändringar

## Exempel på återkommande Feature Goals

### 1. Credit Decision
Anropas i flera kontexter:
- **Huvudprocessen (mortgage.bpmn)**: `credit-decision` - efter KYC, initialt kreditbeslut
- **Offer-processen (mortgage-se-offer.bpmn)**: `credit-decision` - för ändringar i erbjudandet efter "Perform advanced underwriting"
- **Offer-processen (mortgage-se-offer.bpmn)**: `sales-contract-credit-decision` - för köpekontrakt-ändringar efter "sales-contract-advanced-underwriting"

### 2. Credit Evaluation
Anropas i flera kontexter:
- **Mortgage Commitment (mortgage-se-mortgage-commitment.bpmn)**: `credit-evaluation-1` - initial kreditevaluering
- **Mortgage Commitment (mortgage-se-mortgage-commitment.bpmn)**: `credit-evaluation-2` - efter att villkor har ändrats
- **Object Control (mortgage-se-object-control.bpmn)**: `credit-evaluation-2` - efter objektändringar
- **Manual Credit Evaluation (mortgage-se-manual-credit-evaluation.bpmn)**: `Activity_1gzlxx4` - efter uppdaterad dokumentation

### 3. Documentation Assessment
Anropas i flera kontexter:
- **Offer-processen (mortgage-se-offer.bpmn)**: `documentation-assessment` - för köpekontrakt-bedömning

## Lösningsstrategi

### Princip 1: En huvuddokumentation per Feature Goal
Varje feature goal ska ha **en huvuddokumentation** som beskriver:
- **Vad processen gör** (generell funktionalitet)
- **Hur processen fungerar** (processflöde, aktiviteter, gateways)
- **Vad som krävs för att processen ska starta** (generella input-krav)
- **Vad processen producerar** (generella output)

**Varför:** Detta säkerställer att läsaren förstår processens grundläggande funktionalitet innan de läser om specifika användningsfall.

### Princip 2: Kontextspecifik dokumentation
När samma feature goal anropas i olika kontexter, ska dokumentationen innehålla:

#### A. Sektion: "Anropningskontexter" (i Beskrivning)
En sektion som listar alla ställen där feature goalet anropas, med:
- **Var det anropas från** (vilken process, vilken call activity)
- **När det anropas** (vilka förutsättningar, vilka events)
- **Varför det anropas igen** (vilken ny information har tillkommit, vilket syfte)
- **Vad som är annorlunda** (vilka specifika input-variabler, vilka specifika output-variabler)

**Varför:** Detta ger läsaren en översikt över alla användningsfall och hjälper dem att hitta rätt kontext.

#### B. Kontextspecifika sektioner i Input/Output
I "Processteg - Input" och "Processteg - Output" sektionerna:
- **Generella krav** först (vad som alltid krävs)
- **Kontextspecifika krav** sedan (vad som är specifikt för varje anropningskontext)

**Varför:** Detta gör det tydligt vad som alltid krävs vs vad som är specifikt för varje kontext.

#### C. Kontextspecifik processbeskrivning
I "Beskrivning" sektionen:
- **Generell beskrivning** först (vad processen gör)
- **Kontextspecifika exempel** sedan (hur processen används i olika kontexter)

**Varför:** Detta hjälper läsaren att förstå både den generella funktionaliteten och specifika användningsfall.

### Princip 3: Dokumentationsstruktur

```html
<section class="doc-section">
  <details open>
    <summary>Beskrivning av FGoal</summary>
    <div class="section-content">
      <!-- Generell beskrivning -->
      <p>[Vad processen gör generellt]</p>
      
      <!-- Kontextspecifika exempel -->
      <h3>Anropningskontexter</h3>
      <p>Denna process anropas från flera ställen:</p>
      <ul>
        <li><strong>Kontext 1:</strong> [Beskrivning av första kontexten]</li>
        <li><strong>Kontext 2:</strong> [Beskrivning av andra kontexten]</li>
      </ul>
    </div>
  </details>
</section>

<section class="doc-section">
  <details>
    <summary>Processteg - Input</summary>
    <div class="section-content">
      <!-- Generella krav -->
      <p>Processen startar när:</p>
      <ul>
        <li><strong>Generellt krav 1:</strong> [Beskrivning]</li>
        <li><strong>Generellt krav 2:</strong> [Beskrivning]</li>
      </ul>
      
      <!-- Kontextspecifika krav -->
      <h3>Kontextspecifika input-krav</h3>
      <ul>
        <li><strong>Kontext 1 - [Namn]:</strong> [Specifika krav för denna kontext]</li>
        <li><strong>Kontext 2 - [Namn]:</strong> [Specifika krav för denna kontext]</li>
      </ul>
    </div>
  </details>
</section>
```

### Princip 4: Identifiering av återkommande Feature Goals

För att identifiera återkommande feature goals:

**Metod 1: Automatisk analys (REKOMMENDERAS)**
```bash
npx tsx scripts/analyze-reused-feature-goals.ts
```
Detta genererar `docs/feature-goals/REUSED_FEATURE_GOALS_ANALYSIS.md` med alla återkommande feature goals och deras anropningskontexter.

**Metod 2: Manuell sökning**
1. **Sök i bpmn-map.json** efter samma `subprocess_bpmn_file` i flera `call_activities`
2. **Sök i BPMN-filerna** efter samma call activity ID eller calledElement
3. **Analysera processflödet** för att förstå varför processen anropas igen

**Varför:** Automatisk analys säkerställer att inga återkommande feature goals missas.

### Princip 5: Dokumentationskvalitet

När ett feature goal återkommer, säkerställ att dokumentationen:
- ✅ **Tydligt skiljer** mellan generell funktionalitet och kontextspecifik användning
- ✅ **Förklarar varför** processen anropas igen (vilken ny information)
- ✅ **Beskriver vad som är annorlunda** i varje kontext
- ✅ **Identifierar alla anropningsställen** tydligt
- ✅ **Förklarar flödet** från varje anropningsställe

## Exempel: Credit Decision

### Huvuddokumentation
`mortgage-se-credit-decision-sales-contract-credit-decision-v2.html` dokumenterar specifikt sales-contract-kontexten, men vi behöver också en huvuddokumentation som täcker alla kontexter.

### Förslag på struktur:

```html
<section class="doc-section">
  <details open>
    <summary>Beskrivning av FGoal</summary>
    <div class="section-content">
      <p>Credit decision är en manuell beslutsprocess där ansökningar bedöms och godkänns eller avvisas baserat på kreditkriterier.</p>
      
      <h3>Anropningskontexter</h3>
      <p>Denna process anropas från flera ställen i Mortgage-processen:</p>
      <ul>
        <li><strong>Huvudprocessen (mortgage.bpmn):</strong> Efter KYC-processen, för initialt kreditbeslut när ansökan är komplett</li>
        <li><strong>Offer-processen (mortgage-se-offer.bpmn):</strong> Efter "Perform advanced underwriting" när kunden begärt ändringar i erbjudandet</li>
        <li><strong>Offer-processen - Sales Contract (mortgage-se-offer.bpmn):</strong> Efter "sales-contract-advanced-underwriting" när kunden begärt ändringar via köpekontrakt</li>
      </ul>
    </div>
  </details>
</section>
```

## Implementation

### Steg 1: Identifiera återkommande Feature Goals
Kör analysscriptet:
```bash
npx tsx scripts/analyze-reused-feature-goals.ts
```

Detta genererar `docs/feature-goals/REUSED_FEATURE_GOALS_ANALYSIS.md` med alla återkommande feature goals.

**Eller sök manuellt:**
- Öppna `bpmn-map.json`
- Sök efter samma `subprocess_bpmn_file` i flera `call_activities`
- Om samma fil finns i flera ställen: Detta är ett återkommande feature goal

### Steg 2: Uppdatera dokumentation
För varje återkommande feature goal:

1. **Beskrivning av FGoal:**
   - Generell beskrivning först
   - Lägg till "Anropningskontexter" sektion som listar alla anropningsställen
   - För varje kontext: Förklara var, när, varför och vad som är annorlunda

2. **Processteg - Input:**
   - Generella krav först
   - Lägg till "Kontextspecifika input-krav" sektion
   - För varje kontext: Förklara vilken ny information som har tillkommit

3. **Processteg - Output:**
   - Generella resultat först
   - Lägg till "Kontextspecifika output-resultat" sektion
   - För varje kontext: Förklara hur resultatet används

4. **BPMN - Process:**
   - Generellt processflöde först
   - Lägg till "Anropningsställen" sektion
   - För varje anropningsställe: Förklara hur processen anropas

**Använd mallen:** Se `REUSED_FEATURE_GOAL_TEMPLATE.md` för exakt struktur.

### Steg 3: Validera
Kontrollera att dokumentationen tydligt förklarar:
- ✅ Vad processen gör generellt
- ✅ Var den anropas från (alla anropningsställen)
- ✅ Varför den anropas igen (vilken ny information har tillkommit)
- ✅ Vad som är annorlunda i varje kontext (specifika input/output-variabler)
- ✅ Hur resultatet används i varje kontext

## Checklista för återkommande Feature Goals

När du förbättrar dokumentation för ett återkommande feature goal:

- [ ] Identifierat alla anropningsställen i BPMN-filerna
- [ ] Dokumenterat generell funktionalitet tydligt
- [ ] Listat alla anropningskontexter i Beskrivning-sektionen
- [ ] Förklarat varför processen anropas igen i varje kontext
- [ ] Beskrivit vad som är annorlunda i varje kontext
- [ ] Uppdaterat Input-sektionen med kontextspecifika krav
- [ ] Uppdaterat Output-sektionen med kontextspecifika resultat
- [ ] Uppdaterat BPMN - Process med alla anropningsställen
- [ ] Säkerställt att dokumentationen är tydlig och lätt att förstå

