# Innehåll i Epic- och Feature Goal-mallarna

## JSON Schema - Required Fields

### Epic JSON Schema (`buildEpicJsonSchema`)
```typescript
required: [
  'summary',           // ✅ Obligatoriskt
  'prerequisites',     // ✅ Obligatoriskt
  'flowSteps',         // ✅ Obligatoriskt
  'userStories',       // ✅ Obligatoriskt
  'implementationNotes', // ✅ Obligatoriskt
]

optional: [
  'interactions',      // ⚪ Optional - primärt för User Tasks
  'dependencies',      // ⚪ Optional
]
```

### Feature Goal JSON Schema (`buildFeatureGoalJsonSchema`)
```typescript
required: [
  'summary',           // ✅ Obligatoriskt
  'effectGoals',       // ✅ Obligatoriskt
  'scopeIncluded',     // ✅ Obligatoriskt
  'scopeExcluded',     // ✅ Obligatoriskt
  'epics',             // ✅ Obligatoriskt
  'flowSteps',         // ✅ Obligatoriskt
  'dependencies',      // ✅ Obligatoriskt
  'relatedItems',      // ✅ Obligatoriskt
  'prerequisites',     // ✅ Obligatoriskt (fixat nyligen)
  'implementationNotes', // ✅ Obligatoriskt (fixat nyligen)
]

optional: [
  'userStories',       // ⚪ Optional
]
```

---

## TypeScript Types

### EpicDocModel (`epicDocTypes.ts`)
```typescript
export interface EpicDocModel {
  summary: string;                    // ✅ Required
  prerequisites: string[];             // ✅ Required
  flowSteps: string[];                 // ✅ Required
  interactions?: string[];              // ⚪ Optional - primärt för User Tasks
  dependencies?: string[];              // ⚪ Optional
  userStories: EpicUserStory[];         // ✅ Required (3-6 user stories)
  implementationNotes: string[];       // ✅ Required
}

export interface EpicUserStory {
  id: string;
  role: string;                        // "Kund", "Handläggare", "System", etc.
  goal: string;                        // Vad vill rollen uppnå?
  value: string;                       // Varför är det värdefullt?
  acceptanceCriteria: string[];         // Konkreta krav (2-4 per story)
}
```

### FeatureGoalDocModel (`featureGoalLlmTypes.ts`)
```typescript
export interface FeatureGoalDocModel {
  summary: string;                     // ✅ Required
  effectGoals: string[];                // ✅ Required
  scopeIncluded: string[];              // ✅ Required
  scopeExcluded: string[];              // ✅ Required
  epics: {                              // ✅ Required
    id: string;
    name: string;
    description: string;
    team: string;
  }[];
  flowSteps: string[];                 // ✅ Required
  dependencies: string[];               // ✅ Required
  relatedItems: string[];              // ✅ Required
  prerequisites: string[];             // ✅ Required (fixat nyligen)
  implementationNotes: string[];       // ✅ Required (fixat nyligen)
  userStories?: Array<{                // ⚪ Optional
    id: string;
    role: string;
    goal: string;
    value: string;
    acceptanceCriteria: string[];      // 2-4 acceptanskriterier per user story
  }>;
}
```

---

## Jämförelse - Vad finns i varje mall?

### Fält som finns i BÅDA mallarna:
| Fält | Epic | Feature Goal |
|------|------|--------------|
| `summary` | ✅ Required | ✅ Required |
| `prerequisites` | ✅ Required | ✅ Required |
| `flowSteps` | ✅ Required | ✅ Required |
| `dependencies` | ⚪ Optional | ✅ Required |
| `implementationNotes` | ✅ Required | ✅ Required |
| `userStories` | ✅ Required | ⚪ Optional |

### Fält som bara finns i Epic:
- `interactions` (⚪ Optional) - primärt för User Tasks

### Fält som bara finns i Feature Goal:
- `effectGoals` (✅ Required) - effektmål på affärsnivå
- `scopeIncluded` (✅ Required) - vad som ingår
- `scopeExcluded` (✅ Required) - vad som inte ingår
- `epics` (✅ Required) - lista över ingående epics
- `relatedItems` (✅ Required) - relaterade items

---

## Skillnader i struktur

### Epic fokuserar på:
1. **Prerequisites** - vad som måste vara klart innan
2. **FlowSteps** - steg-för-steg flöde
3. **UserStories** - användarcentrerade stories (alltid krävs)
4. **ImplementationNotes** - tekniska noteringar
5. **Interactions** - användarinteraktioner (optional, primärt för User Tasks)

### Feature Goal fokuserar på:
1. **EffectGoals** - affärsmål och värde
2. **Scope** - vad som ingår/ingår inte (scopeIncluded/scopeExcluded)
3. **Epics** - lista över ingående epics
4. **FlowSteps** - översiktligt flöde på Feature Goal-nivå
5. **Dependencies** - beroenden (alltid krävs, till skillnad från Epic)
6. **RelatedItems** - relaterade feature goals/epics
7. **Prerequisites** - förutsättningar (nu required)
8. **ImplementationNotes** - tekniska noteringar (nu required)
9. **UserStories** - optional (till skillnad från Epic där det är required)

---

## Sammanfattning

### Epic Mall:
- **5 required fält**: summary, prerequisites, flowSteps, userStories, implementationNotes
- **2 optional fält**: interactions, dependencies
- **Fokus**: Detaljerad implementation med user stories

### Feature Goal Mall:
- **10 required fält**: summary, effectGoals, scopeIncluded, scopeExcluded, epics, flowSteps, dependencies, relatedItems, prerequisites, implementationNotes
- **1 optional fält**: userStories
- **Fokus**: Översiktlig affärsbeskrivning med scope och effektmål

### Viktiga skillnader:
1. **Feature Goal har fler required fält** (10 vs 5)
2. **Epic kräver alltid userStories**, Feature Goal har det som optional
3. **Feature Goal har scope-fält** (scopeIncluded/scopeExcluded) som Epic saknar
4. **Feature Goal har effectGoals** som Epic saknar
5. **Feature Goal har epics-lista** som Epic saknar
6. **Feature Goal har relatedItems** som Epic saknar
7. **Epic har interactions** som Feature Goal saknar
8. **Dependencies är required i Feature Goal** men optional i Epic

