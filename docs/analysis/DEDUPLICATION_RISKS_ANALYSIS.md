# Analys: Risker med Deduplicering

## Problemställning

Användaren ifrågasätter om deduplicering är säker och hur den ska implementeras. Detta är en viktig fråga om kvalitet vs. optimering.

## Analys av Varje Optimering

### 1. Deduplicera User Stories

**Nuvarande Situation:**
- Varje epic har sina egna user stories med unika ID:n (t.ex. "US-1", "US-2", etc.)
- User stories från olika epics kan ha liknande mål/värden men är **inte identiska**
- User stories samlas från alla epics i file-level docs

**Risker:**
1. **Falska Positiver**: Två user stories kan se lika ut men ha olika kontext
   - Exempel: "Få komplett data" från Epic 1 (partsdata) vs. Epic 2 (engagemang)
   - De ser lika ut men är faktiskt olika

2. **Normalisering Problem**: 
   - "Få komplett data automatiskt" vs. "Få komplett data" → samma eller olika?
   - "Spara tid" vs. "Spara tid genom automatisering" → samma eller olika?

3. **Acceptance Criteria Jämförelse**:
   - Två user stories kan ha samma goal/value men olika acceptance criteria
   - Bör de räknas som identiska?

**Implementeringsmetod:**
```typescript
// Problem: Hur jämför vi user stories?
function areUserStoriesIdentical(story1, story2) {
  // Alternativ 1: Exakt match (mycket strikt)
  return story1.goal === story2.goal && 
         story1.value === story2.value &&
         JSON.stringify(story1.acceptanceCriteria) === JSON.stringify(story2.acceptanceCriteria);
  // Problem: Mycket sällan att två stories är exakt identiska

  // Alternativ 2: Normaliserad match (farlig)
  const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalize(story1.goal) === normalize(story2.goal) &&
         normalize(story1.value) === normalize(story2.value);
  // Problem: Kan ta bort legitima olika stories

  // Alternativ 3: Fuzzy match (mycket farlig)
  // Använd string similarity (Levenshtein distance)
  // Problem: Kan ta bort stories som är lika men olika
}
```

**Slutsats:**
- **HÖG RISK** för att ta bort legitima user stories
- User stories från olika epics är sällan exakt identiska
- Bättre: **SKIPPA** denna optimering eller bara deduplicera exakt identiska (mycket sällsynt)

### 2. Deduplicera FlowSteps

**Nuvarande Situation:**
- FlowSteps har format: "Epic 1: Systemet hämtar data från Internal systems"
- FlowSteps från olika epics kan ha liknande actions men olika kontext

**Risker:**
1. **Förlust av Node-kontext**:
   - "Epic 1: Systemet hämtar partsdata" vs. "Epic 2: Systemet hämtar engagemang"
   - Om vi tar bort "Epic 1:" och "Epic 2:", förlorar vi viktig information

2. **Gruppering Problem**:
   - Om vi grupperar "Systemet hämtar data (Epic 1, Epic 2)", förlorar vi:
     - Vilken typ av data (partsdata vs. engagemang)
     - Ordningen (Epic 1 kommer före Epic 2)

3. **Regex/Pattern Matching**:
   - Svårt att identifiera "liknande" steps utan att förlora information
   - Regex kan matcha för brett eller för smalt

**Implementeringsmetod:**
```typescript
// Problem: Hur grupperar vi flowSteps?
function groupSimilarFlowSteps(steps) {
  // Alternativ 1: Ta bort node-kontext och jämför action
  const action = step.replace(/^[^:]+:\s*/i, ''); // "Epic 1: X" → "X"
  // Problem: Förlorar viktig kontext

  // Alternativ 2: Jämför bara första N ord
  const prefix = step.split(' ').slice(0, 4).join(' ');
  // Problem: Kan gruppera olika steps

  // Alternativ 3: Exakt match (mycket strikt)
  // Problem: Mycket sällan att två steps är exakt identiska
}
```

**Slutsats:**
- **MEDEL RISK** för att förlora information
- FlowSteps är ofta unika även om de ser lika ut
- Bättre: **SKIPPA** denna optimering eller bara deduplicera exakt identiska (mycket sällsynt)

### 3. Aggregera Dependencies

**Nuvarande Situation:**
- Dependencies har format: "Input: Personnummer", "Output: Partsinformation", "System: Internal systems"
- Dependencies är ofta repetitiva (samma input/output från flera epics)

**Risker:**
1. **Kategorisering Problem**:
   - "Input: Personnummer" → klar kategori
   - "System: Internal systems" → klar kategori
   - Men: "Process: Ansökan måste vara initierad" → är detta "process" eller "input"?
   - "Regelmotor: pre-screen-party-dmn" → är detta "system" eller "process"?

2. **Regex/Pattern Matching**:
   - Relativt säkert för "Input:", "Output:", "System:" prefix
   - Men kan missa dependencies utan prefix

**Implementeringsmetod:**
```typescript
// Relativt säkert: Kategorisera baserat på prefix
function categorizeDependency(dep) {
  if (dep.toLowerCase().startsWith('input:')) {
    return { type: 'input', value: dep.replace(/^input:\s*/i, '') };
  }
  if (dep.toLowerCase().startsWith('output:')) {
    return { type: 'output', value: dep.replace(/^output:\s*/i, '') };
  }
  if (dep.toLowerCase().includes('system') || dep.toLowerCase().includes('databas')) {
    return { type: 'system', value: dep };
  }
  // Problem: Vad gör vi med dependencies utan tydlig kategori?
}
```

**Slutsats:**
- **LÅG RISK** - Dependencies är ofta repetitiva och kategorisering är relativt säkert
- Bästa optimeringen av de tre
- Bör implementeras med försiktighet (behåll dependencies utan tydlig kategori som de är)

## Rekommendation

### Alternativ 1: Bara Dependencies (Säkrast)

**Implementera endast:**
- `aggregateDependencies()` - Kategorisera och deduplicera dependencies

**Fördelar:**
- Låg risk för kvalitetsförlust
- Dependencies är ofta repetitiva
- Kategorisering är relativt säkert

**Nackdelar:**
- Mindre token-minskning (~5-10% istället för 15-20%)

### Alternativ 2: Konservativ Deduplicering (Mellanväg)

**Implementera:**
- `aggregateDependencies()` - Kategorisera och deduplicera
- `deduplicateUserStories()` - Bara exakt identiska (mycket strikt)
- `deduplicateFlowSteps()` - Bara exakt identiska (mycket strikt)

**Fördelar:**
- Behåller all viktig information
- Tar bort endast exakt duplicerade items (sällsynt men kan hända)

**Nackdelar:**
- Mycket liten token-minskning (~2-5%)

### Alternativ 3: Ingen Optimering (Säkrast)

**Implementera ingenting:**
- Behåll all data som den är
- Med 4-10 epics är token-användningen hanterbar (~25k-34k tokens)

**Fördelar:**
- Ingen risk för kvalitetsförlust
- Enklare att underhålla
- Inga edge cases att hantera

**Nackdelar:**
- Ingen token-minskning
- Men: Med 4-10 epics är detta acceptabelt

## Implementeringsmetod

### Regex vs. String Matching

**För Dependencies (Rekommenderat):**
```typescript
// Använd enkel string matching (inte regex om inte nödvändigt)
function categorizeDependency(dep: string): { type: string; value: string } | null {
  const normalized = dep.trim();
  
  // Exakt prefix-match (säkrast)
  if (normalized.toLowerCase().startsWith('input:')) {
    return { type: 'input', value: normalized.replace(/^input:\s*/i, '').trim() };
  }
  if (normalized.toLowerCase().startsWith('output:')) {
    return { type: 'output', value: normalized.replace(/^output:\s*/i, '').trim() };
  }
  if (normalized.toLowerCase().startsWith('system:')) {
    return { type: 'system', value: normalized.replace(/^system:\s*/i, '').trim() };
  }
  
  // Fallback: Behåll som den är (säkrast)
  return { type: 'other', value: normalized };
}
```

**För User Stories (Om implementerat):**
```typescript
// Använd exakt match (mycket strikt)
function areUserStoriesIdentical(
  story1: UserStory,
  story2: UserStory
): boolean {
  // Exakt match på alla fält (mycket strikt)
  return (
    story1.role === story2.role &&
    story1.goal.trim() === story2.goal.trim() &&
    story1.value.trim() === story2.value.trim() &&
    JSON.stringify(story1.acceptanceCriteria.sort()) === 
    JSON.stringify(story2.acceptanceCriteria.sort())
  );
}
```

**För FlowSteps (Om implementerat):**
```typescript
// Använd exakt match (mycket strikt)
function areFlowStepsIdentical(step1: string, step2: string): boolean {
  return step1.trim() === step2.trim();
}
```

## Slutsats

**Min Rekommendation:**

1. **Börja med bara Dependencies** (Alternativ 1)
   - Låg risk, bra token-minskning (~5-10%)
   - Relativt enkel implementering

2. **Om mer optimering behövs senare:**
   - Implementera konservativ deduplicering (Alternativ 2)
   - Bara exakt identiska items tas bort

3. **Om kvalitet är viktigast:**
   - Skippa optimering helt (Alternativ 3)
   - Med 4-10 epics är token-användningen hanterbar

**Implementeringsmetod:**
- Använd enkel string matching (inte regex om inte nödvändigt)
- Var strikt (exakt match) istället för fuzzy match
- Behåll items som inte matchar tydliga mönster som de är


