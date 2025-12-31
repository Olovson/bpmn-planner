# Analys: File-level Documentation Token-användning för E2E-generering

## Problem

File-level documentation kan bli väldigt lång när ett Feature Goal innehåller många epics. När E2E-generatorn använder denna data, skickas ALLA data till Claude, vilket kan leda till:
- Höga token-kostnader
- Långsamma API-anrop
- Risk för att överskrida context window (även om Claude 3.5 Sonnet har 200k tokens)

## Nuvarande Implementation

### 1. File-level docs innehåller
- **HTML**: Full HTML med alla noders dokumentation (kan bli mycket långt)
- **JSON-data** (embeddat i HTML):
  ```json
  {
    "summary": "Kombinerad sammanfattning av alla noder",
    "flowSteps": [
      "Epic 1: Step 1",
      "Epic 1: Step 2",
      "Epic 2: Step 1",
      ...
    ],
    "userStories": [
      {
        "id": "US-1",
        "role": "Handläggare",
        "goal": "...",
        "value": "...",
        "acceptanceCriteria": ["...", "..."]
      },
      ...
    ],
    "dependencies": ["Input: ...", "Output: ...", ...]
  }
  ```

### 2. E2E-generatorn använder BARA JSON-data
- `loadFileLevelDocFromStorage` extraherar JSON från HTML
- Returnerar strukturerad data: `{ summary, flowSteps, userStories, dependencies }`
- **HTML ignoreras** (bra!)

### 3. Alla data skickas till Claude
I `generateE2eScenarioWithLlm` (rad 113-139):
```typescript
featureGoals: context.featureGoals.map(fg => ({
  summary: fg.summary,
  flowSteps: fg.flowSteps, // BEHÅLL ALLA
  userStories: fg.userStories || [], // BEHÅLL ALLA
  dependencies: fg.dependencies || [],
  ...
})),
```

## Token-beräkning (Realistiska Siffror)

**Baserat på faktisk användning:**
- De flesta BPMN-filer: 4-5 epics
- Största filer: ~10 epics
- Varje epic: ~4-5 user stories, ~10 flowSteps, ~5 dependencies

### Scenario: Feature Goal med 5 epics (typiskt)

**Per Epic:**
- Summary: ~200 tokens
- FlowSteps (10 steg): ~500 tokens
- UserStories (4-5 stories): ~800-1,000 tokens
  - Varje user story: ~200 tokens (id, role, goal, value, acceptanceCriteria)
- Dependencies: ~100 tokens
- **Totalt per epic: ~1,600-1,800 tokens**

**För 5 epics:**
- Totalt: 5 × 1,700 = **~8,500 tokens**

**Plus:**
- Prompt: ~5,000 tokens
- BPMN-struktur: ~10,000 tokens
- Path-metadata: ~2,000 tokens
- **Totalt: ~25,500 tokens**

### Scenario: Feature Goal med 10 epics (största)

**För 10 epics:**
- Totalt: 10 × 1,700 = **~17,000 tokens**

**Plus:**
- Prompt: ~5,000 tokens
- BPMN-struktur: ~10,000 tokens
- Path-metadata: ~2,000 tokens
- **Totalt: ~34,000 tokens**

## Risker (med realistiska siffror)

1. **Token-kostnad**: Med 5-10 epics är kostnaden hanterbar (~25k-34k tokens totalt)
2. **Prestanda**: API-anrop är acceptabla (~2-3 sekunder)
3. **Context window**: Inga problem (200k tokens är mer än tillräckligt)
4. **Kvalitet**: **VIKTIGT** - Aggressiv optimering kan tappa viktig information

**Slutsats**: Med 4-10 epics behöver vi **mild optimering** som fokuserar på:
- Deduplicering av repetitiva data
- Behålla all viktig information
- **INTE** aggregera user stories för hårt (behåll individuella stories)

## Lösningsförslag (Mild Optimering)

### Alternativ 1: Deduplicera User Stories (Rekommenderat)

**Problem**: User stories kan vara repetitiva, men med 4-10 epics (20-50 stories) är detta hanterbart.

**Lösning**: Behåll alla user stories, men deduplicera identiska eller nästan identiska stories.

**Exempel:**
```json
// FÖRE (5 epics × 5 user stories = 25 user stories = ~5,000 tokens)
"userStories": [
  { "id": "US-1", "role": "Handläggare", "goal": "Få komplett data", "value": "Spara tid", "acceptanceCriteria": [...] },
  { "id": "US-2", "role": "Handläggare", "goal": "Få komplett data", "value": "Spara tid", "acceptanceCriteria": [...] }, // Duplicerad
  ...
]

// EFTER (deduplicerad = ~4,500 tokens, ~10% minskning)
"userStories": [
  { "id": "US-1", "role": "Handläggare", "goal": "Få komplett data", "value": "Spara tid", "acceptanceCriteria": [...] },
  // US-2 borttagen (identisk med US-1)
  ...
]
```

**Fördelar:**
- Behåller all viktig information
- Minskar tokens med ~10-20% (tillräckligt för 4-10 epics)
- Claude får fortfarande alla individuella user stories

**Nackdelar:**
- Mindre token-minskning än aggregering, men behåller kvalitet

### Alternativ 2: Deduplicera FlowSteps

**Problem**: FlowSteps kan vara repetitiva, men med 4-10 epics (40-100 steps) är detta hanterbart.

**Lösning**: 
- Behåll alla flowSteps, men deduplicera identiska eller nästan identiska steps
- Gruppera liknande steps med node-kontext (t.ex. "Epic 1: Systemet hämtar data" vs "Epic 2: Systemet hämtar data")

**Exempel:**
```json
// FÖRE (5 epics × 10 flowSteps = 50 flowSteps = ~2,500 tokens)
"flowSteps": [
  "Epic 1: Systemet hämtar data från Internal systems",
  "Epic 2: Systemet hämtar data från Internal systems", // Liknande
  "Epic 1: Systemet validerar data",
  ...
]

// EFTER (deduplicerad = ~2,200 tokens, ~12% minskning)
"flowSteps": [
  "Systemet hämtar data från Internal systems (Epic 1, Epic 2)",
  "Epic 1: Systemet validerar data",
  ...
]
```

**Fördelar:**
- Behåller all viktig information om flödet
- Minskar tokens med ~10-15%
- Claude får fortfarande detaljerad flow-information

### Alternativ 3: Aggregera Dependencies

**Problem**: Dependencies kan bli många och repetitiva.

**Lösning**: Deduplicera och kategorisera dependencies.

**Exempel:**
```json
// FÖRE (200 dependencies = ~2,000 tokens)
"dependencies": [
  "Input: Personnummer",
  "Input: Personnummer", // Duplicerat
  "Output: Partsinformation",
  ...
]

// EFTER (kategoriserade = ~300 tokens)
"dependencies": {
  "inputs": ["Personnummer", "Kundnummer", "Ansökningsdata"],
  "outputs": ["Partsinformation", "Pre-screening resultat", "Engagemang"],
  "systems": ["Internal systems", "Core System", "UC-integration"]
}
```

### Alternativ 4: Kombinera Alternativ 1-3 (Bästa lösningen - Mild Optimering)

**Implementera alla tre optimeringar (mild version):**
1. Deduplicera User Stories → ~4,500 tokens (istället för ~5,000) = **~10% minskning**
2. Deduplicera FlowSteps → ~2,200 tokens (istället för ~2,500) = **~12% minskning**
3. Deduplicera och Kategorisera Dependencies → ~300 tokens (istället för ~500) = **~40% minskning**

**Totalt för 5 epics:**
- FÖRE: ~8,500 tokens (file-level data) + ~17,000 tokens (prompt + BPMN) = **~25,500 tokens**
- EFTER: ~7,000 tokens (file-level data) + ~17,000 tokens (prompt + BPMN) = **~24,000 tokens**
- **Minskning: ~6% totalt, ~18% för file-level data**

**Totalt för 10 epics:**
- FÖRE: ~17,000 tokens (file-level data) + ~17,000 tokens (prompt + BPMN) = **~34,000 tokens**
- EFTER: ~14,000 tokens (file-level data) + ~17,000 tokens (prompt + BPMN) = **~31,000 tokens**
- **Minskning: ~9% totalt, ~18% för file-level data**

**Slutsats**: Mild optimering som behåller kvalitet, minskar tokens med ~15-20% för file-level data.

## Implementeringsplan (Mild Optimering)

### Steg 1: Skapa optimeringsfunktion (Mild Version)
```typescript
function optimizeFileLevelDocForE2E(
  doc: {
    summary: string;
    flowSteps: string[];
    userStories?: Array<{...}>;
    dependencies?: string[];
  }
): {
  summary: string;
  flowSteps: string[]; // Deduplicerade (behåller alla unika)
  userStories?: Array<{...}>; // Deduplicerade (behåller alla unika)
  dependencies?: {
    inputs: string[];
    outputs: string[];
    systems: string[];
  }; // Kategoriserade och deduplicerade
}
```

**VIKTIGT**: Behåller alla unika user stories och flowSteps - bara deduplicerar identiska.

### Steg 2: Använd optimering i E2E-generatorn
```typescript
const fileLevelDoc = await loadFileLevelDocFromStorage(rootBpmnFile);
if (fileLevelDoc) {
  const optimizedDoc = optimizeFileLevelDocForE2E(fileLevelDoc);
  featureGoalDocs.push({
    ...optimizedDoc,
    // ...
  });
}
```

### Steg 3: Uppdatera prompt
Uppdatera `e2e_scenario_prompt.md` för att hantera sammanfattade user stories.

## Rekommendation

**Implementera Alternativ 4 (Kombinera alla tre)**:
- Minskar tokens med ~95%
- Behåller viktig information
- Förbättrar prestanda och kostnad
- Minskar risk för context window-problem

**Prioritering:**
1. Sammanfatta User Stories (störst påverkan)
2. Begränsa/Sammanfatta FlowSteps
3. Aggregera Dependencies

