# 🎯 Super Enkel Guide för Codex: Batch-Generera Override-Innehåll

## ⚠️ Viktigt: Codex kan INTE importera TypeScript-moduler

Använd denna guide istället. Allt du behöver är att läsa filer och följa instruktionerna.

---

## Steg 1: Hitta filer att bearbeta

Kör i terminalen:
```bash
npm run batch-overrides
```

Detta visar en lista över alla filer med TODO-platshållare.

---

## Steg 2: För varje fil - Gör detta

### 1. Öppna filen och läs NODE CONTEXT

I början av varje `.doc.ts`-fil finns en kommentar:
```
/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-application.bpmn
 * elementId: household
 * type: feature-goal
 */
```

**Notera:**
- `bpmnFile`: Vilken BPMN-fil noden tillhör
- `elementId`: Nodens ID
- `type`: `feature-goal`, `epic`, eller `business-rule`

### 2. Hämta rätt prompt-fil

Baserat på `type`:
- `feature-goal` → Läs `prompts/llm/feature_epic_prompt.md`
- `epic` → Läs `prompts/llm/feature_epic_prompt.md`  
- `business-rule` → Läs `prompts/llm/dmn_businessrule_prompt.md`

**Öppna prompt-filen och läs den!** Den innehåller alla instruktioner du behöver.

### 3. Generera JSON enligt prompten

Följ promptens instruktioner exakt:
- Generera ett JSON-objekt
- Följ modellen som prompten beskriver
- Använd svenska text
- Formell bankton
- En punkt per array-element
- Inga HTML-taggar

**Exempel för Feature Goal:**
```json
{
  "summary": "Detta Feature Goal möjliggör...",
  "effectGoals": ["Automatisera manuellt arbete", "Förbättra kreditbedömningar"],
  "scopeIncluded": ["Ingår: Digital ansökan", "Ingår: Preliminär bedömning"],
  "scopeExcluded": ["Ingår inte: Manuella undantag"],
  "flowSteps": ["Kunden ansöker...", "Systemet validerar...", ...],
  ...
}
```

### 4. Uppdatera filen

I override-filen, ersätt:
- `'TODO'` → Genererat innehåll
- `['TODO']` → Genererade listor
- `[]` → Genererade listor (om de var tomma)

**VIKTIGT:**
- ✅ Ersätt BARA TODO-platshållare
- ✅ Behåll allt annat innehåll
- ✅ Behåll imports, exports, kommentarer

**Exempel:**

**Före:**
```typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'TODO',
  effectGoals: ['TODO'],
  scopeIncluded: ['TODO'],
};
```

**Efter:**
```typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'Detta Feature Goal möjliggör...',
  effectGoals: ['Automatisera manuellt arbete', 'Förbättra kreditbedömningar'],
  scopeIncluded: ['Ingår: Digital ansökan', 'Ingår: Preliminär bedömning'],
};
```

### 5. Spara filen

Spara och gå vidare till nästa fil.

---

## Steg 3: Batch-bearbetning

För många filer, bearbeta i batchar:

**Säg till Codex:**
```
Bearbeta filerna i batchar om 20-25 filer åt gången.
När en batch är klar, kontrollera resultatet innan du fortsätter.
```

Eller:
```
Börja med alla epic-filer först.
När alla epics är klara, gå vidare till feature-goals.
```

---

## Steg 4: Om Codex kraschar

### Återuppta från checkpoint

1. Kör:
   ```bash
   npm run batch-overrides:resume
   ```

2. Detta visar vilka filer som redan är klara

3. Bearbeta bara filer som INTE är i listan

### Uppdatera checkpoint manuellt

Efter varje batch, öppna `.codex-batch-checkpoint.json` och lägg till klara filer:

```json
{
  "completed": [
    "src/data/node-docs/epic/file1.doc.ts",
    "src/data/node-docs/epic/file2.doc.ts"
  ]
}
```

---

## Komplett exempel

### Fil: `src/data/node-docs/feature-goal/mortgage-se-application.household.doc.ts`

1. **Läs NODE CONTEXT:**
   - `bpmnFile: mortgage-se-application.bpmn`
   - `elementId: household`
   - `type: feature-goal`

2. **Hämta prompt:**
   - Läs `prompts/llm/feature_epic_prompt.md`

3. **Generera JSON:**
   - Följ promptens instruktioner för Feature Goal
   - Generera ett `FeatureGoalDocModel` JSON-objekt

4. **Uppdatera filen:**
   - Ersätt alla `'TODO'` med genererat innehåll
   - Ersätt `['TODO']` med genererade listor
   - Behåll allt annat

5. **Spara och gå vidare**

---

## Checklista per fil

- [ ] Läst NODE CONTEXT-kommentaren
- [ ] Hämtat rätt prompt från `prompts/llm/`
- [ ] Läsit prompten och förstått instruktionerna
- [ ] Genererat JSON enligt prompten
- [ ] Uppdaterat filen (ersatt bara TODO)
- [ ] Behållit allt annat innehåll
- [ ] Sparat filen

---

## Viktiga regler

### ✅ Gör detta:
- Använd EXAKT samma prompts som ChatGPT (`prompts/llm/*.md`)
- Följ promptens instruktioner exakt
- Generera på svenska med formell bankton
- Ersätt bara TODO-platshållare
- Behåll allt annat innehåll

### ❌ Gör INTE detta:
- Överskriv befintligt innehåll (som inte är TODO)
- Ändra filstrukturen (imports, exports, kommentarer)
- Använd andra prompts än de i `prompts/llm/`
- Generera på engelska
- Lägga till HTML-taggar i textfält

---

## Tips

1. **Börja med en fil** för att testa
2. **Kontrollera resultatet** innan du fortsätter
3. **Använd git** för att se ändringar: `git diff src/data/node-docs/`
4. **Bearbeta i batchar** om det är många filer
5. **Uppdatera checkpoint** regelbundet

---

## Snabbkommando

```bash
# 1. Hitta filer
npm run batch-overrides

# 2. Kopiera instruktionen → Klistra in i Codex

# 3. Om Codex kraschar:
npm run batch-overrides:resume
```

**Klart!** 🚀

