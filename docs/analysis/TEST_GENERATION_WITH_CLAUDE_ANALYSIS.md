# Analys: Testgenerering MED Claude för Högre Kvalitet

## 🎯 Syfte

Analysera hur vi kan använda Claude för att generera högkvalitativa test scenarios baserat på:
1. **Befintlig dokumentation** (Epic/Feature Goal med user stories)
2. **BPMN-processflöde** (struktur, paths, error events)
3. **Kombinationen** av båda för bättre kontext

---

## 📊 Vad Vi Har Av Information

### 1. Befintlig Dokumentation (Claude-genererad)

**Vad vi har:**
- ✅ **User stories** med acceptanskriterier (strukturerad JSON)
- ✅ **Given/When/Then** format från Feature Goals
- ✅ **Beskrivning av processflöde** i dokumentationen
- ✅ **Dependencies** och prerequisites
- ✅ **Implementation mapping** (men "hittepå" enligt användaren)

**Exempel:**
```json
{
  "userStories": [
    {
      "id": "US-1",
      "role": "Kund",
      "goal": "skapa ansökan",
      "value": "jag kan ansöka om lån",
      "acceptanceCriteria": [
        "Systemet ska validera att alla obligatoriska fält är ifyllda",
        "Systemet ska visa tydliga felmeddelanden om fält saknas"
      ]
    }
  ],
  "flowSteps": [
    "Kunden öppnar sidan och ser sammanfattad ansöknings- och kundinformation",
    "Systemet visar formulär eller val baserat på föregående steg",
    "Kunden fyller i eller bekräftar uppgifter och skickar vidare",
    "Systemet validerar uppgifterna och uppdaterar processen"
  ]
}
```

---

### 2. BPMN-processflöde (faktisk struktur)

**Vad vi har:**
- ✅ **Nodtyper:** `ServiceTask`, `BusinessRuleTask`, `UserTask`, `CallActivity`, `Gateway`
- ✅ **Nodnamn:** `"Fetch party information"`, `"Screen party"`
- ✅ **Sequence flows:** Vet ordning (start → task1 → task2 → end)
- ✅ **Gateway conditions:** `"Party rejected?"` med `"Yes"` och `"No"` paths
- ✅ **Error events:** `"Party rejected"` med error code
- ✅ **DataStoreReferences:** `"Internal systems"`, `"Core System"`

**Exempel:**
```typescript
{
  root: {
    id: "fetch-party-information",
    type: "ServiceTask",
    name: "Fetch party information",
    children: [
      { id: "screen-party", type: "BusinessRuleTask", name: "Screen party" },
      { id: "is-party-rejected", type: "Gateway", name: "Party rejected?" },
      { id: "fetch-engagements", type: "ServiceTask", name: "Fetch engagements" }
    ]
  }
}
```

---

## 🎯 Vad Claude Kan Göra För Högre Kvalitet

### 1. Analysera User Stories för Bättre Kategorisering

**Nuvarande (deterministisk):**
- Kategoriserar baserat på keywords: "fel" → error-case
- Kan vara felaktig: "Systemet ska validera fel" → felaktigt error-case

**Med Claude:**
- Analyserar semantik: Förstår kontexten
- Identifierar edge cases som kanske saknas
- Föreslår ytterligare test scenarios baserat på acceptanskriterier

**Exempel:**
```
Input: User story med acceptanskriterier
Claude analyserar:
- "Systemet ska validera att alla obligatoriska fält är ifyllda"
  → Detta är happy-path (validering är normal funktionalitet)
- "Systemet ska visa tydliga felmeddelanden om fält saknas"
  → Detta är error-case (felhantering)

Output: 
- Kategorisering: happy-path (huvudscenario)
- Ytterligare scenario: error-case för saknade fält
```

---

### 2. Generera Mer Konkreta Steg för Process Flow

**Nuvarande (deterministisk):**
- Generiska steg: "Systemet exekverar: Fetch party information"
- Saknar detaljer: Vad händer faktiskt?

**Med Claude:**
- Analyserar BPMN-struktur + dokumentation
- Genererar mer konkreta steg baserat på kontext
- Identifierar dependencies och prerequisites

**Exempel:**
```
Input: BPMN-processgraf + dokumentation
Claude analyserar:
- Nod: "Fetch party information" (ServiceTask)
- Dokumentation: "Systemet hämtar part-information från Internal systems data store"
- Sequence flow: Kommer efter "Start", före "Screen party"

Output:
- Action: "Systemet hämtar part-information från Internal systems data store"
- Expected Result: "Part-information är hämtad och innehåller ID, personlig information och kundhistorik"
- Prerequisites: "Parties är identifierade"
- Dependencies: "Tillgång till Internal systems data store"
```

---

### 3. Identifiera Edge Cases och Error Paths

**Nuvarande (deterministisk):**
- Identifierar error paths från error events
- Men saknar analys av vad som kan gå fel

**Med Claude:**
- Analyserar processflöde för potentiella edge cases
- Identifierar scenarion som kanske saknas i dokumentation
- Föreslår ytterligare test scenarios

**Exempel:**
```
Input: BPMN-processgraf med gateway "Party rejected?"
Claude analyserar:
- Gateway har två paths: "Yes" och "No"
- "Yes" path leder till error event
- Dokumentation nämner "Om informationen inte kan hämtas, visas ett felmeddelande"

Output:
- Happy path scenario: Party godkänns → fortsätter till nästa steg
- Error path scenario: Party avvisas → error event triggas
- Edge case scenario: Part-information saknas → felhantering
```

---

### 4. Kombinera Dokumentation + BPMN för Bättre Kontext

**Nuvarande (separat):**
- User stories från dokumentation
- Process flow från BPMN
- Ingen integration

**Med Claude:**
- Kombinerar dokumentation + BPMN för full kontext
- Genererar scenarios som reflekterar både dokumentation och processflöde
- Identifierar gaps (vad som finns i BPMN men inte i dokumentation)

**Exempel:**
```
Input: 
- Dokumentation: User story om "skapa ansökan"
- BPMN: Processflöde med "Register applicant" → "Validate application" → "Confirm application"

Claude analyserar:
- User story fokuserar på "skapa ansökan"
- BPMN visar tre steg: Register → Validate → Confirm
- Gap: User story nämner inte Validate-steg

Output:
- Scenario 1: Baserat på user story (skapa ansökan)
- Scenario 2: Baserat på BPMN-processflöde (Register → Validate → Confirm)
- Scenario 3: Edge case för Validate-steg (saknas i user story)
```

---

## 🎯 Designförslag: Testgenerering MED Claude

### Översikt

```
┌─────────────────────────────────────────────────────────────┐
│              Befintlig Dokumentation (HTML/Storage)           │
│  - Epic dokumentation med user stories                       │
│  - Feature Goal dokumentation med user stories               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 1: Extrahera User Stories (Deterministisk)      │
│  - Läser från dokumentation                                   │
│  - Parserar HTML för att hitta user stories                  │
│  - Strukturerar data                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BPMN Process Graph                         │
│  - Byggs från BPMN-filer                                     │
│  - Sequence flows, nodtyper, error events                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 2: Bygg Kontext för Claude                      │
│  - Kombinerar user stories + BPMN-processflöde                │
│  - Bygger kontext-payload för Claude                         │
│  - Inkluderar dokumentation + BPMN-struktur                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 3: Anropa Claude för Analys                     │
│  - Skickar kontext till Claude                               │
│  - Claude analyserar och genererar test scenarios            │
│  - Returnerar strukturerad JSON med scenarios                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 4: Spara Scenarios                              │
│  - Validerar Claude-output                                   │
│  - Konverterar till TestScenario-format                     │
│  - Sparar till node_planned_scenarios                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Detaljerad Design

### Steg 1: Extrahera User Stories (Deterministisk)

**Samma som nu:**
- Läser från dokumentation
- Parserar HTML
- Extraherar strukturerad data

**Output:**
```typescript
{
  userStories: [
    {
      id: "US-1",
      role: "Kund",
      goal: "skapa ansökan",
      value: "jag kan ansöka om lån",
      acceptanceCriteria: [...]
    }
  ],
  documentation: {
    summary: "...",
    flowSteps: [...],
    dependencies: [...]
  }
}
```

---

### Steg 2: Bygg BPMN-processgraf (Deterministisk)

**Samma som nu:**
- Bygger graf från BPMN-filer
- Identifierar paths
- Extraherar error events

**Output:**
```typescript
{
  processGraph: {
    root: { ... },
    paths: [
      { nodes: [...], type: "happy-path" },
      { nodes: [...], type: "error-path" }
    ],
    errorEvents: [...]
  }
}
```

---

### Steg 3: Bygg Kontext för Claude

**Ny funktionalitet:**
- Kombinerar user stories + BPMN-processflöde
- Bygger kontext-payload för Claude
- Inkluderar dokumentation + BPMN-struktur

**Kontext-payload:**
```typescript
{
  nodeContext: {
    bpmnFile: "mortgage-se-application.bpmn",
    elementId: "application",
    nodeType: "userTask",
    nodeName: "Application"
  },
  documentation: {
    userStories: [...],
    summary: "...",
    flowSteps: [...],
    dependencies: [...]
  },
  bpmnProcessFlow: {
    paths: [
      {
        type: "happy-path",
        nodes: [
          { id: "start", type: "event", name: "Start" },
          { id: "application", type: "userTask", name: "Application" },
          { id: "end", type: "event", name: "End" }
        ]
      }
    ],
    errorEvents: [...],
    gateways: [...]
  }
}
```

---

### Steg 4: Anropa Claude för Analys

**Ny funktionalitet:**
- Skickar kontext till Claude
- Claude analyserar och genererar test scenarios
- Returnerar strukturerad JSON

**Claude-prompt (ny):**
- Analysera user stories + BPMN-processflöde
- Generera test scenarios med:
  - Korrekt kategorisering (happy-path/error-case/edge-case)
  - Konkreta steg baserat på processflöde
  - Edge cases som kanske saknas
  - Prioritering baserat på risk

**Claude-output:**
```json
{
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "Happy Path: Skapa ansökan",
      "description": "Kunden skapar ansökan genom att fylla i formulär och skicka in",
      "category": "happy-path",
      "priority": "P1",
      "steps": [
        {
          "order": 1,
          "action": "Kunden öppnar ansökningsformuläret",
          "expectedResult": "Formuläret visas med alla obligatoriska fält"
        },
        {
          "order": 2,
          "action": "Kunden fyller i personuppgifter och önskat lånebelopp",
          "expectedResult": "Alla fält är ifyllda och validerade"
        },
        {
          "order": 3,
          "action": "Kunden skickar in ansökan",
          "expectedResult": "Ansökan är mottagen och bekräftelse visas"
        }
      ],
      "acceptanceCriteria": [
        "Systemet validerar att alla obligatoriska fält är ifyllda",
        "Systemet visar tydliga felmeddelanden om fält saknas"
      ],
      "edgeCases": [
        "Ansökan med maximalt lånebelopp",
        "Ansökan med minimalt lånebelopp"
      ]
    },
    {
      "id": "scenario-2",
      "name": "Error Case: Ogiltiga fält",
      "description": "Kunden försöker skicka in ansökan med ogiltiga eller saknade fält",
      "category": "error-case",
      "priority": "P0",
      "steps": [...]
    }
  ]
}
```

---

### Steg 5: Validera och Spara

**Ny funktionalitet:**
- Validerar Claude-output mot schema
- Konverterar till TestScenario-format
- Sparar till databasen

---

## 🎯 Fördelar Med Claude

### 1. Högre Kvalitet

**Deterministisk:**
- Kategorisering baserat på keywords (kan vara felaktig)
- Generiska steg ("Systemet exekverar X")

**Med Claude:**
- Semantisk analys (förstår kontexten)
- Konkreta steg baserat på dokumentation + BPMN
- Identifierar edge cases

---

### 2. Bättre Integration

**Deterministisk:**
- User stories och process flow är separata
- Ingen integration

**Med Claude:**
- Kombinerar dokumentation + BPMN
- Identifierar gaps
- Genererar scenarios som reflekterar båda

---

### 3. Mer Konkreta Steg

**Deterministisk:**
- "Systemet exekverar: Fetch party information"
- Saknar detaljer

**Med Claude:**
- "Systemet hämtar part-information från Internal systems data store"
- "Part-information innehåller ID, personlig information och kundhistorik"
- Baserat på dokumentation + BPMN-struktur

---

## ⚠️ Nackdelar Med Claude

### 1. Kostnad
- Claude API-anrop kostar pengar
- Många noder = många anrop = hög kostnad

### 2. Hastighet
- API-anrop tar tid
- Kan vara långsamt för många noder

### 3. Pålitlighet
- API kan vara nere
- Rate limits
- Fel i output (måste valideras)

---

## 💡 Hybrid-Approach (Rekommendation)

### Kombinera Deterministic + Claude

**Steg 1: Deterministic (snabb, kostnadsfri)**
- Extrahera user stories
- Bygg BPMN-processgraf
- Identifiera paths

**Steg 2: Claude (hög kvalitet)**
- Analysera user stories + BPMN för bättre kategorisering
- Generera konkreta steg
- Identifiera edge cases

**Steg 3: Deterministic (strukturering)**
- Validera Claude-output
- Konvertera till TestScenario-format
- Spara till databasen

---

## 🎯 Rekommendation

### Använd Claude För:

1. **Analys av User Stories** (hög värde)
   - Bättre kategorisering (inte bara keywords)
   - Identifiera edge cases
   - Föreslå ytterligare scenarios

2. **Generera Konkreta Steg** (hög värde)
   - Baserat på dokumentation + BPMN
   - Mer detaljerade än generiska steg
   - Inkluderar prerequisites och dependencies

3. **Identifiera Gaps** (medel värde)
   - Vad som finns i BPMN men inte i dokumentation
   - Vad som finns i dokumentation men inte i BPMN
   - Föreslå ytterligare test scenarios

### Använd Deterministic För:

1. **Strukturering** (snabb, kostnadsfri)
   - Extrahera user stories
   - Bygg BPMN-processgraf
   - Validera och spara

2. **Fallback** (om Claude misslyckas)
   - Deterministic generering som backup
   - Lägre kvalitet, men fungerar

---

**Datum:** 2025-12-22
**Status:** Analys klar - redo för designförslag





