# Jämförelse: Vad Borde Genereras vs Vad Som Faktiskt Genereras

## Datum: 2025-12-30

## Sammanfattning

Det finns en **stor mismatch** mellan dokumentationen och faktisk implementation. Dokumentationen beskriver en gammal version av modellen som inte längre används.

---

## Vad Dokumentationen Säger (`FEATURE_GOAL_TEMPLATE_CONTENT.md`)

Dokumentationen beskriver följande fält:

1. ✅ `summary` - 3-5 meningar
2. ❌ `effectGoals` - 3-5 strängar om effektmål
3. ❌ `scopeIncluded` - 4-7 strängar om omfattning
4. ❌ `scopeExcluded` - 2-3 strängar om avgränsningar
5. ❌ `epics` - 2-5 objekt om ingående epics
6. ✅ `flowSteps` - 4-8 strängar om flödessteg
7. ✅ `dependencies` - 3-6 formaterade strängar (optional)
8. ❌ `relatedItems` - 2-4 strängar om relaterade items
9. ❌ `userStories` - **SAKNAS I DOKUMENTATIONEN!**

**Status:** ❌ Dokumentationen är **FELAKTIG** - den beskriver en gammal version som inte längre används.

---

## Vad TypeScript-modellen Har (`FeatureGoalDocModel`)

```typescript
export interface FeatureGoalDocModel {
  summary: string;                    // ✅ Required
  flowSteps: string[];                 // ✅ Required
  dependencies?: string[];            // ⚠️ Optional
  userStories: Array<{                 // ✅ Required
    id: string;
    role: 'Kund' | 'Handläggare' | 'Processägare';
    goal: string;
    value: string;
    acceptanceCriteria: string[];
  }>;
}
```

**Status:** ✅ Modellen är enkel och fokuserad.

---

## Vad JSON Schema Kräver (`buildFeatureGoalJsonSchema`)

**Required fields:**
- ✅ `summary` (string)
- ✅ `flowSteps` (array of strings)
- ✅ `userStories` (array of objects)

**Optional fields:**
- ⚠️ `dependencies` (array of strings)

**Status:** ✅ Schema matchar TypeScript-modellen.

---

## Vad Prompten Instruerar (`feature_epic_prompt.md`)

**Obligatoriska fält (rad 172):**
- ✅ `summary`
- ✅ `flowSteps`
- ✅ `userStories` (minst 3-6 user stories)

**Valfria fält (rad 178):**
- ⚠️ `dependencies` (valfritt men rekommenderat)

**Exempel i prompten (rad 189-229):**
- ✅ `summary`
- ✅ `flowSteps`
- ✅ `dependencies`
- ✅ `userStories`

**Status:** ✅ Prompt matchar modellen, MEN:
- ❌ Prompten nämner `effectGoals` i exempel (rad 136) - detta är förvirrande eftersom fältet inte finns i modellen!

---

## Vad Template Renderar (`buildFeatureGoalDocHtmlFromModel`)

**Vad som faktiskt renderas:**
1. ✅ Header-sektion (badge + h1 + metadata)
2. ✅ Sammanfattning (`summary`) - om det finns
3. ✅ Funktionellt flöde (`flowSteps`) - om det finns
4. ✅ Beroenden (`dependencies`) - om det finns
5. ✅ User Stories (`userStories`) - **NU ALLTID VISAS** (efter fix)

**Status:** ✅ Template matchar modellen.

---

## Vad Som Saknas (Enligt Dokumentationen)

Följande fält finns i dokumentationen men **INTE** i koden:

1. ❌ **`effectGoals`** - 3-5 strängar om effektmål
2. ❌ **`scopeIncluded`** - 4-7 strängar om omfattning
3. ❌ **`scopeExcluded`** - 2-3 strängar om avgränsningar
4. ❌ **`epics`** - 2-5 objekt om ingående epics
5. ❌ **`relatedItems`** - 2-4 strängar om relaterade items

**Fråga:** Borde dessa fält läggas till, eller är dokumentationen bara felaktig?

---

## Vad Som Borde Genereras (Enligt Nuvarande Modell)

### Obligatoriska Fält:

1. ✅ **`summary`** - 3-5 meningar om syfte och värde
   - **Status:** ✅ Genereras och renderas
   - **Problem:** Om tom, visas inte (template check: `summaryText ?`)

2. ✅ **`flowSteps`** - 4-8 strängar om flödessteg
   - **Status:** ✅ Genereras och renderas
   - **Problem:** Om tom, visas inte (template check: `flowSteps.length > 0`)

3. ✅ **`userStories`** - 3-6 user stories med acceptanskriterier
   - **Status:** ✅ Genereras och renderas
   - **Problem:** ✅ **FIXAT** - Nu visas alltid (med varning om tom)

### Valfria Fält:

4. ⚠️ **`dependencies`** - 3-6 formaterade strängar
   - **Status:** ✅ Genereras och renderas (om det finns)
   - **Problem:** Om tom, visas inte (template check: `dependencies.length > 0`)

---

## Identifierade Problem

### Problem 1: Dokumentationen är Felaktig

**Orsak:**
- `FEATURE_GOAL_TEMPLATE_CONTENT.md` beskriver en gammal version av modellen
- Den nämner fält som inte finns i koden (`effectGoals`, `scopeIncluded`, `scopeExcluded`, `epics`, `relatedItems`)
- Den saknar `userStories` som är ett required field!

**Lösning:**
- Uppdatera dokumentationen för att matcha faktisk implementation
- Ta bort referenser till fält som inte finns
- Lägg till `userStories` i dokumentationen

### Problem 2: Template Visar Inte Alla Fält Om De Är Tomma

**Orsak:**
- Template använder conditional rendering (`summaryText ?`, `flowSteps.length > 0`, etc.)
- Om LLM inte genererar ett fält, visas det inte alls
- Detta gör det svårt att se vad som saknas

**Lösning:**
- ✅ **FIXAT för `userStories`** - Nu visas alltid med varning om tom
- Överväg att göra samma för `summary` och `flowSteps` (men de är required, så de borde alltid genereras)

### Problem 3: Prompten Nämner `effectGoals` i Exempel

**Orsak:**
- Prompten nämner `effectGoals` i exempel (rad 136), men fältet finns inte i modellen
- Detta kan förvirra LLM

**Lösning:**
- Ta bort referenser till `effectGoals` från prompten
- Se till att alla exempel matchar faktisk modell

---

## Rekommendationer

### Kortsiktigt (Fixar Nuvarande Problem):

1. ✅ **Fix User Stories-visning** - Gjort! Nu visas alltid med varning om tom
2. ⏳ **Uppdatera Dokumentation** - Uppdatera `FEATURE_GOAL_TEMPLATE_CONTENT.md` för att matcha faktisk implementation
3. ⏳ **Rensa Prompt** - Ta bort referenser till `effectGoals` från prompten

### Långsiktigt (Förbättringar):

1. **Överväg att lägga till saknade fält:**
   - Om `effectGoals`, `scopeIncluded`, `scopeExcluded`, `epics`, `relatedItems` behövs
   - Lägg till dem i modellen, schema, template och prompt
   - **MEN:** Detta skulle göra modellen mycket mer komplex

2. **Förbättra Validering:**
   - Se till att LLM alltid genererar required fields
   - Lägg till warnings om optional fields saknas (om de är rekommenderade)

3. **Förbättra Template:**
   - Överväg att alltid visa sektioner (även om tomma) för bättre transparens
   - Lägg till tydliga varningar om required fields saknas

---

## Slutsats

**Nuvarande modell är enkel och fokuserad:**
- ✅ `summary` - Sammanfattning
- ✅ `flowSteps` - Funktionellt flöde
- ✅ `dependencies` - Beroenden (optional)
- ✅ `userStories` - User stories med acceptanskriterier

**Dokumentationen är felaktig och beskriver en gammal version.**

**Nästa steg:**
1. Uppdatera dokumentationen för att matcha faktisk implementation
2. Rensa prompten från referenser till fält som inte finns
3. Testa att alla required fields faktiskt genereras av LLM




