# Analys: Vad behövs från File-level Docs för E2E-generering?

## Nuvarande Användning

### Vad skickas till Claude

Från file-level docs (`mortgage-se-internal-data-gathering.html`):
```typescript
{
  summary: string,           // ~200-500 tokens
  flowSteps: string[],      // ~2,000-5,000 tokens (50-100 steg)
  userStories: Array<{...}>, // ~4,000-8,000 tokens (20-40 stories)
  dependencies: string[]     // ~500-1,000 tokens (20-50 dependencies)
}
```

**Totalt: ~6,700-14,500 tokens** (för 4-10 epics)

### Vad används faktiskt i prompten?

**1. Summary**
- Används för: `subprocessStep.description` (kort beskrivning)
- Behov: **LÅG** - Bara en kort sammanfattning behövs
- Optimering: Behåll hela (kort ändå) eller sammanfatta till 1-2 meningar

**2. FlowSteps**
- Används för: 
  - `subprocessStep.when` - When-actions
  - `bankProjectTestStep.action` - Vad som händer
- Behov: **MEDEL** - Behöver viktigaste stegen i ordning
- Optimering: Behåll första 10-15 steg + sista 5 steg (behåll start/slut-kontext)

**3. UserStories**
- Används för:
  - `subprocessStep.then` - Then-assertions
  - `bankProjectTestStep.assertion` - Vad som verifieras
- Behov: **HÖG** - Behöver acceptanceCriteria för assertions
- Optimering: Behåll 1-2 user stories per roll, eller sammanfatta acceptanceCriteria

**4. Dependencies**
- Används för:
  - `subprocessStep.given` - Given-conditions
  - Kontext om prerequisites
- Behov: **LÅG** - Behöver bara viktigaste dependencies
- Optimering: Kategorisera och deduplicera (som vi diskuterade tidigare)

## Optimering Strategi

### Alternativ 1: Sammanfatta User Stories (Störst påverkan)

**Problem**: User stories tar mest plats (~4k-8k tokens)

**Lösning**: Sammanfatta till viktigaste acceptanceCriteria per roll

```typescript
// FÖRE (20-40 user stories = ~4,000-8,000 tokens)
userStories: [
  { role: "Handläggare", goal: "...", value: "...", acceptanceCriteria: ["AC1", "AC2", "AC3"] },
  { role: "Handläggare", goal: "...", value: "...", acceptanceCriteria: ["AC4", "AC5"] },
  ...
]

// EFTER (sammanfattad = ~500-1,000 tokens)
userStoriesSummary: {
  "Handläggare": {
    commonGoals: ["Få komplett data", "Få validerad data"],
    acceptanceCriteria: [
      "Systemet ska automatiskt hämta data",
      "Systemet ska validera data",
      "Systemet ska hantera fel",
      // ... top 10-15 mest vanliga acceptanceCriteria
    ]
  },
  "Kund": {
    commonGoals: ["Få snabb ansökan"],
    acceptanceCriteria: [
      "Systemet ska presentera data tydligt",
      // ... top 5-10 acceptanceCriteria
    ]
  }
}
```

**Token-minskning**: ~75-85% (från ~4k-8k till ~500-1k tokens)

### Alternativ 2: Begränsa FlowSteps (Medel påverkan)

**Problem**: FlowSteps kan vara många (~2k-5k tokens)

**Lösning**: Behåll viktigaste stegen (start, viktiga steg, slut)

```typescript
// FÖRE (50-100 flowSteps = ~2,000-5,000 tokens)
flowSteps: [
  "Epic 1: Systemet startar...",
  "Epic 1: Systemet hämtar partsdata...",
  "Epic 1: Systemet validerar data...",
  ... (50-100 steg totalt)
  "Epic 5: Systemet sparar resultat..."
]

// EFTER (begränsad = ~500-1,000 tokens)
flowSteps: [
  // Första 10 steg (start-kontext)
  "Epic 1: Systemet startar...",
  "Epic 1: Systemet hämtar partsdata...",
  ...
  // Sammanfattning av mellanliggande steg
  "... (flera mellanliggande steg: validering, pre-screening, etc.) ...",
  // Sista 5 steg (slut-kontext)
  "Epic 5: Systemet sparar resultat..."
]
```

**Token-minskning**: ~50-70% (från ~2k-5k till ~500-1k tokens)

### Alternativ 3: Kategorisera Dependencies (Låg påverkan)

**Problem**: Dependencies kan vara repetitiva (~500-1k tokens)

**Lösning**: Kategorisera och deduplicera

```typescript
// FÖRE (20-50 dependencies = ~500-1,000 tokens)
dependencies: [
  "Input: Personnummer",
  "Input: Personnummer", // Duplicerad
  "Output: Partsinformation",
  "System: Internal systems",
  ...
]

// EFTER (kategoriserad = ~200-300 tokens)
dependencies: {
  inputs: ["Personnummer", "Kundnummer", "Ansökningsdata"],
  outputs: ["Partsinformation", "Pre-screening resultat"],
  systems: ["Internal systems", "Core System", "UC-integration"]
}
```

**Token-minskning**: ~60-70% (från ~500-1k till ~200-300 tokens)

## Rekommenderad Optimering

### Kombinera Alternativ 1 + 2 + 3

**För 5 epics (typiskt):**
- FÖRE: ~8,500 tokens
- EFTER: ~1,700 tokens (summary: 200, flowSteps: 500, userStoriesSummary: 800, dependencies: 200)
- **Minskning: ~80%**

**För 10 epics (största):**
- FÖRE: ~17,000 tokens
- EFTER: ~3,000 tokens (summary: 300, flowSteps: 1,000, userStoriesSummary: 1,500, dependencies: 200)
- **Minskning: ~82%**

### Implementering

**Steg 1: Sammanfatta User Stories**
- Gruppera per roll
- Extrahera top 10-15 acceptanceCriteria per roll
- Behåll commonGoals (top 3-5 per roll)

**Steg 2: Begränsa FlowSteps**
- Behåll första 10-15 steg
- Behåll sista 5 steg
- Lägg till "... (flera mellanliggande steg) ..." om det finns många steg

**Steg 3: Kategorisera Dependencies**
- Kategorisera baserat på prefix (Input:, Output:, System:)
- Deduplicera

## Kvalitetsbevarande

### Vad behålls?

1. **Summary**: Behålls helt (kort ändå)
2. **FlowSteps**: Behålls start/slut + viktigaste steg (tillräckligt för when-actions)
3. **UserStories**: Behålls viktigaste acceptanceCriteria (tillräckligt för then-assertions)
4. **Dependencies**: Behålls alla (kategoriserade, inte förlorade)

### Vad förloras?

1. **FlowSteps**: Mellanting steg (men kan infereras från start/slut)
2. **UserStories**: Individuella user stories (men acceptanceCriteria behålls)
3. **Dependencies**: Duplicerade (men all unik information behålls)

### Riskbedömning

- **LÅG RISK**: Summary och Dependencies (behålls nästan helt)
- **MEDEL RISK**: FlowSteps (behåller start/slut, förlorar mellanting)
- **HÖG RISK**: UserStories (förlorar individuella stories, behåller acceptanceCriteria)

**Mitigering**: Testa att genererade E2E-scenarios fortfarande är korrekta efter optimering

## Implementeringsplan

### Funktion: `optimizeFileLevelDocForE2E()`

```typescript
function optimizeFileLevelDocForE2E(doc: FileLevelDoc): OptimizedFileLevelDoc {
  return {
    summary: doc.summary, // Behåll helt (kort ändå)
    flowSteps: limitFlowSteps(doc.flowSteps, 15, 5), // Första 15 + sista 5
    userStoriesSummary: summarizeUserStories(doc.userStories), // Sammanfattad per roll
    dependencies: categorizeDependencies(doc.dependencies), // Kategoriserad
  };
}
```

### Funktion: `summarizeUserStories()`

```typescript
function summarizeUserStories(stories: UserStory[]): UserStoriesSummary {
  // Gruppera per roll
  // Extrahera top acceptanceCriteria per roll
  // Behåll commonGoals
}
```

### Funktion: `limitFlowSteps()`

```typescript
function limitFlowSteps(steps: string[], firstN: number, lastM: number): string[] {
  if (steps.length <= firstN + lastM) return steps;
  return [
    ...steps.slice(0, firstN),
    '... (flera mellanliggande steg) ...',
    ...steps.slice(-lastM),
  ];
}
```

## Slutsats

**Rekommendation**: Implementera Alternativ 1 + 2 + 3
- Token-minskning: ~80%
- Kvalitet: Behåller all viktig information
- Risk: Låg-medel (testa efter implementering)

**Prioritering**:
1. Sammanfatta User Stories (störst påverkan, ~75-85% minskning)
2. Begränsa FlowSteps (medel påverkan, ~50-70% minskning)
3. Kategorisera Dependencies (låg påverkan, ~60-70% minskning)

