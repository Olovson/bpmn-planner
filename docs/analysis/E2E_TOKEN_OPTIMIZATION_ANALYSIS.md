# Objektiv Analys: Varför 10k Tokens? Hur Löser Vi Detta?

**Datum:** 2025-01-XX  
**Syfte:** Analysera varför E2E-scenario generering kräver 10k tokens och föreslå bättre lösningar

---

## 🔍 Vad Skickas Till LLM?

### 1. System Prompt (E2E Scenario Prompt)
- **Storlek:** ~487 rader markdown
- **Innehåll:**
  - Långa instruktioner om affärsspråk
  - Många exempel (bra vs dåligt)
  - Detaljerade instruktioner för varje fält
  - Regler och kvalitetskrav
- **Uppskattad tokens:** ~2000-3000 tokens

### 2. User Prompt (JSON med Feature Goal-dokumentation)
- **Struktur:**
  ```json
  {
    "path": { ... },
    "featureGoals": [
      {
        "callActivityId": "...",
        "bpmnFile": "...",
        "summary": "...",           // Kan vara lång
        "flowSteps": [...],         // Array med många steg
        "userStories": [...],       // Array med många user stories
        "dependencies": [...],      // Array
        "subprocesses": [...],      // Array
        "serviceTasks": [...],      // Array
        "userTasks": [...],         // Array
        "businessRules": [...]      // Array
      },
      // ... fler Feature Goals
    ],
    "processInfo": { ... }
  }
  ```

### 3. Problem: Vi Skickar ALL Dokumentation

**För en path med 3 Feature Goals:**
- Varje Feature Goal kan ha:
  - 10-20 flowSteps
  - 3-5 userStories (varje med 5-10 acceptanceCriteria)
  - 5-10 subprocesses
  - 5-10 serviceTasks
  - 5-10 userTasks
  - 3-5 businessRules

**Totalt:** ~5000-8000 tokens bara i Feature Goal-dokumentation!

---

## 💡 Varför Är Detta Ett Problem?

### 1. **Vi Skickar För Mycket Data**
- LLM behöver INTE hela Feature Goal-dokumentationen
- LLM behöver bara:
  - Feature Goal-namn
  - Kort sammanfattning
  - Viktigaste stegen (inte alla flowSteps)
  - Viktigaste user stories (inte alla)

### 2. **Prompten Är För Lång**
- 487 rader är för mycket
- Många exempel som upprepas
- Många instruktioner som kan förenklas

### 3. **Vi Genererar För Mycket Output**
- E2E-scenario innehåller:
  - Root-level given/when/then
  - bankProjectTestSteps (en per Feature Goal)
  - subprocessSteps (en per Feature Goal med given/when/then + summaries)
- Detta kräver många tokens att generera

---

## ✅ Bättre Lösningar

### Lösning 1: Förenkla Input (Minska User Prompt)

**Istället för att skicka hela Feature Goal-dokumentationen:**

```typescript
// NU (skickar allt):
featureGoals: [
  {
    callActivityId: "application",
    summary: "...",
    flowSteps: ["step1", "step2", ..., "step20"],  // ALLA steg
    userStories: [
      { id: "us1", role: "...", goal: "...", acceptanceCriteria: [...] },
      // ... fler
    ],
    // ... allt annat
  }
]

// BÄTTRE (skickar bara det viktiga):
featureGoals: [
  {
    callActivityId: "application",
    name: "Application",
    summary: "...",  // Kort sammanfattning
    keySteps: ["step1", "step2", "step3"],  // Bara 3-5 viktigaste stegen
    keyUserStories: [
      { goal: "...", keyCriteria: "..." }  // Bara viktigaste
    ],
    // Ta bort: subprocesses, serviceTasks, userTasks, businessRules (kan genereras från BPMN)
  }
]
```

**Fördelar:**
- Minskar user prompt från ~5000-8000 tokens till ~1000-2000 tokens
- LLM får ändå det den behöver
- Snabbare och billigare

### Lösning 2: Förenkla System Prompt

**Istället för 487 rader:**

```markdown
# E2E Scenario Generation

Generera ett E2E-scenario baserat på:
- Path genom processen (Feature Goals i ordning)
- Kort Feature Goal-information

## Output Format
JSON med:
- id, name, priority, type, iteration
- summary, given, when, then (root-level)
- bankProjectTestSteps (en per Feature Goal)
- subprocessSteps (en per Feature Goal)

## Regler
- Använd affärsspråk
- Inkludera Feature Goal-namn
- Var konkret men inte teknisk
```

**Fördelar:**
- Minskar system prompt från ~2000-3000 tokens till ~500-800 tokens
- Tydligare instruktioner
- Mindre risk för konflikter

### Lösning 3: Dela Upp Genereringen

**Istället för att generera allt på en gång:**

1. **Generera root-level given/when/then** (liten prompt, ~500 tokens)
2. **Generera bankProjectTestSteps** (en per Feature Goal, ~300 tokens per)
3. **Generera subprocessSteps** (en per Feature Goal, ~500 tokens per)

**Fördelar:**
- Mindre tokens per anrop
- Bättre kontroll
- Kan cacha mellanliggande resultat
- Kan parallellisera

### Lösning 4: Använd Template-baserad Generering

**Istället för att låta LLM generera allt:**

1. **Bygg template från BPMN-struktur:**
   - Feature Goal-namn → action/assertion templates
   - Gateway-conditions → given templates
   - Flow graph → when templates

2. **Använd LLM för att fylla i templates:**
   - Mindre tokens (bara fyll i, inte generera struktur)

**Fördelar:**
- Mycket mindre tokens
- Mer förutsägbart
- Snabbare

---

## 🎯 Rekommenderad Approach

### Kortsiktigt (För att få det att fungera nu)

1. **Förenkla Input:**
   - Skicka bara `callActivityId`, `name`, `summary`, `keySteps` (3-5 steg), `keyUserStories` (1-2 viktigaste)
   - Ta bort: `subprocesses`, `serviceTasks`, `userTasks`, `businessRules` (kan genereras från BPMN om nödvändigt)

2. **Förenkla System Prompt:**
   - Reducera från 487 rader till ~200 rader
   - Ta bort upprepade exempel
   - Fokusera på viktigaste instruktionerna

3. **Öka maxTokens:**
   - Från 900 till 2000-3000 (för säkerhets skull)

**Förväntad minskning:**
- System prompt: 2000-3000 → 500-800 tokens (-70%)
- User prompt: 5000-8000 → 1000-2000 tokens (-75%)
- **Totalt: 7000-11000 → 1500-2800 tokens (-75%)**

### Långsiktigt (För hållbarhet)

1. **Dela upp genereringen:**
   - Root-level först
   - Sedan bankProjectTestSteps
   - Sedan subprocessSteps

2. **Använd template-baserad generering:**
   - Bygg templates från BPMN
   - Använd LLM för att fylla i

3. **Cacha resultat:**
   - Spara mellanliggande resultat
   - Återanvänd när möjligt

---

## 📊 Jämförelse

| Approach | System Prompt | User Prompt | Output | Totalt | Kostnad |
|----------|---------------|-------------|--------|--------|---------|
| **Nuvarande** | 2000-3000 | 5000-8000 | 2000-3000 | 9000-14000 | Hög |
| **Förenklad Input** | 2000-3000 | 1000-2000 | 2000-3000 | 5000-8000 | Medel |
| **Förenklad Prompt** | 500-800 | 1000-2000 | 2000-3000 | 3500-5800 | Medel |
| **Båda** | 500-800 | 1000-2000 | 2000-3000 | 3500-5800 | Medel |
| **Dela Upp** | 500-800 | 500-1000 | 500-1000 | 1500-2800 | Låg |
| **Template** | 200-400 | 300-600 | 500-1000 | 1000-2000 | Mycket låg |

---

## ✅ Nästa Steg

1. **Omedelbart:** Förenkla input (skicka bara viktigaste Feature Goal-data)
2. **Kortsiktigt:** Förenkla system prompt (reducera från 487 rader)
3. **Långsiktigt:** Överväg att dela upp genereringen eller använda templates




