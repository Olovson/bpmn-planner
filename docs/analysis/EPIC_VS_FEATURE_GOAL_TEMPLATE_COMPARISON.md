# Jämförelse: Epic vs Feature Goal Mallar

## Översikt
Detta dokument jämför strukturen i Epic- och Feature Goal-mallarna för att identifiera skillnader och potentiella mismatch-problem.

## JSON Schema - Required Fields

### Epic JSON Schema (`buildEpicJsonSchema`)
**Required fields:**
- `summary` ✅
- `prerequisites` ✅
- `flowSteps` ✅
- `userStories` ✅
- `implementationNotes` ✅

**Optional fields:**
- `interactions` (optional)
- `dependencies` (optional)

### Feature Goal JSON Schema (`buildFeatureGoalJsonSchema`)
**Required fields:**
- `summary` ✅
- `effectGoals` ✅
- `scopeIncluded` ✅
- `scopeExcluded` ✅
- `epics` ✅
- `flowSteps` ✅
- `dependencies` ✅
- `relatedItems` ✅

**Optional fields:**
- `prerequisites` (optional)
- `implementationNotes` (optional)
- `userStories` (optional)

## TypeScript Types

### EpicDocModel (`epicDocTypes.ts`)
```typescript
{
  summary: string;                    // REQUIRED
  prerequisites: string[];             // REQUIRED
  flowSteps: string[];                 // REQUIRED
  interactions?: string[];              // OPTIONAL
  dependencies?: string[];              // OPTIONAL
  userStories: EpicUserStory[];         // REQUIRED
  implementationNotes: string[];       // REQUIRED
}
```

### FeatureGoalDocModel (`featureGoalLlmTypes.ts`)
```typescript
{
  summary: string;                     // REQUIRED
  effectGoals: string[];                // REQUIRED
  scopeIncluded: string[];              // REQUIRED
  scopeExcluded: string[];              // REQUIRED
  epics: {...}[];                      // REQUIRED
  flowSteps: string[];                 // REQUIRED
  dependencies: string[];               // REQUIRED
  relatedItems: string[];              // REQUIRED
  prerequisites?: string[];             // OPTIONAL
  implementationNotes?: string[];       // OPTIONAL
  userStories?: {...}[];                // OPTIONAL
}
```

## Base Model Builders

### `buildEpicDocModelFromContext` (rad 1606)
Returnerar:
- `summary` ✅
- `prerequisites` ✅
- `flowSteps` ✅
- `interactions` ✅
- `dependencies` ✅
- `userStories` ✅
- `implementationNotes` ✅

### `buildFeatureGoalDocModelFromContext` (rad 429)
Returnerar:
- `summary` ✅
- `effectGoals` ✅
- `scopeIncluded` ✅
- `scopeExcluded` ✅
- `epics` ✅
- `flowSteps` ✅
- `dependencies` ✅
- `relatedItems` ✅
- `prerequisites` ✅ (optional i type, men alltid returneras)
- `implementationNotes` ✅ (optional i type, men alltid returneras)

## Identifierade Mismatch-problem

### 1. Prerequisites ⚠️ KRITISK MISMATCH
- **Epic**: `prerequisites` är **required** i JSON schema och type
- **Feature Goal**: `prerequisites` är **optional** i JSON schema och type, men:
  - **Alltid returneras** i `buildFeatureGoalDocModelFromContext`
  - **Markeras som OBLIGATORISKT** i prompten (rad 657: "⚠️ OBLIGATORISKT FÄLT - Måste alltid inkluderas!")

**Problem**: 
- Prompten säger att `prerequisites` är obligatoriskt för Feature Goals
- JSON schema säger att det är optional
- Om Claude följer JSON schema kan det generera utan `prerequisites`, vilket strider mot prompten
- Base model returnerar alltid `prerequisites`, så det finns en fallback, men det skapar inkonsistens

### 2. Implementation Notes ⚠️ KRITISK MISMATCH
- **Epic**: `implementationNotes` är **required** i JSON schema och type
- **Feature Goal**: `implementationNotes` är **optional** i JSON schema och type, men:
  - **Alltid returneras** i `buildFeatureGoalDocModelFromContext`
  - **Markeras som OBLIGATORISKT** i prompten (rad 672: "⚠️ OBLIGATORISKT FÄLT - Måste alltid inkluderas!")

**Problem**: 
- Prompten säger att `implementationNotes` är obligatoriskt för Feature Goals
- JSON schema säger att det är optional
- Om Claude följer JSON schema kan det generera utan `implementationNotes`, vilket strider mot prompten
- Base model returnerar alltid `implementationNotes`, så det finns en fallback, men det skapar inkonsistens

### 3. User Stories
- **Epic**: `userStories` är **required** i JSON schema och type
- **Feature Goal**: `userStories` är **optional** i JSON schema och type

**Problem**: Feature Goal kan genereras utan user stories, men Epic måste alltid ha dem.

### 4. Dependencies
- **Epic**: `dependencies` är **optional** i JSON schema och type
- **Feature Goal**: `dependencies` är **required** i JSON schema och type

**Problem**: Epic kan genereras utan dependencies, men Feature Goal måste alltid ha dem.

### 5. Fields som bara finns i Feature Goal
- `effectGoals` - finns INTE i Epic
- `scopeIncluded` - finns INTE i Epic
- `scopeExcluded` - finns INTE i Epic
- `epics` - finns INTE i Epic
- `relatedItems` - finns INTE i Epic

### 6. Fields som bara finns i Epic
- `interactions` - finns INTE i Feature Goal (men är optional)

## Rekommendationer

### För att synka mallarna:

1. **✅ Gör `prerequisites` required i Feature Goal** (HÖGSTA PRIORITET)
   - Prompten säger att det är obligatoriskt (rad 657)
   - Base model returnerar alltid det
   - Uppdatera `buildFeatureGoalJsonSchema()` required array (lägg till `prerequisites`)
   - Uppdatera `FeatureGoalDocModel` type (ta bort `?`)

2. **✅ Gör `implementationNotes` required i Feature Goal** (HÖGSTA PRIORITET)
   - Prompten säger att det är obligatoriskt (rad 672)
   - Base model returnerar alltid det
   - Uppdatera `buildFeatureGoalJsonSchema()` required array (lägg till `implementationNotes`)
   - Uppdatera `FeatureGoalDocModel` type (ta bort `?`)

3. **Överväg att göra `userStories` required i Feature Goal** om det ska matcha Epic
   - Uppdatera `buildFeatureGoalJsonSchema()` required array
   - Uppdatera `FeatureGoalDocModel` type (ta bort `?`)

4. **Överväg att göra `dependencies` required i Epic** om det ska matcha Feature Goal
   - Uppdatera `buildEpicJsonSchema()` required array
   - Uppdatera `EpicDocModel` type (ta bort `?`)

ELLER

5. **Gör `dependencies` optional i Feature Goal** om Epic inte alltid har dem
   - Uppdatera `buildFeatureGoalJsonSchema()` required array (ta bort från required)
   - Uppdatera `FeatureGoalDocModel` type (lägg till `?`)

## Nuvarande Status

### Epic Mall
- ✅ Alla required fields matchar TypeScript type
- ✅ Base model builder returnerar alla required fields
- ⚠️ `dependencies` är optional men kan vara viktigt

### Feature Goal Mall
- ✅ Alla required fields matchar TypeScript type
- ⚠️ `prerequisites` och `implementationNotes` returneras alltid i base model men är optional i schema/type
- ⚠️ `userStories` är optional men Epic har det som required
- ✅ `dependencies` är required (till skillnad från Epic)







