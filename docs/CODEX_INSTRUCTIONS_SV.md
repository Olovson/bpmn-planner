# 📋 Instruktioner för Codex: Batch-Generera Override-Innehåll

## ⚠️ Viktigt för Codex

Codex i Cursor kan **INTE** importera TypeScript-moduler direkt. Använd dessa instruktioner istället för att försöka använda helper-funktionerna programmatiskt.

---

## Steg 1: Hitta filer att bearbeta

Kör detta i terminalen:

```bash
npm run batch-overrides
```

Detta visar:
- Alla filer med TODO-platshållare
- Statistik
- En lista över filer att bearbeta

---

## Steg 2: För varje fil - Gör detta

### A. Läsa filen

Öppna filen och läs:
1. **NODE CONTEXT-kommentaren** (överst i filen):
   ```
   bpmnFile: mortgage-se-application.bpmn
   elementId: household
   type: feature-goal
   ```

2. **Befintligt innehåll** - Se vad som redan finns (behåll detta!)

3. **TODO-platshållare** - Dessa ska ersättas

### B. Hämta rätt prompt

Baserat på `type` i NODE CONTEXT:
- `feature-goal` → Läs `prompts/llm/feature_epic_prompt.md`
- `epic` → Läs `prompts/llm/feature_epic_prompt.md`
- `business-rule` → Läs `prompts/llm/dmn_businessrule_prompt.md`

**VIKTIGT:** Använd EXAKT samma prompt som ChatGPT använder!

### C. Generera innehåll

Följ promptens instruktioner för att generera JSON:

1. **Läs prompten** - Den innehåller detaljerade instruktioner på svenska
2. **Generera JSON** enligt modellen som prompten beskriver:
   - Feature Goal → `FeatureGoalDocModel`
   - Epic → `EpicDocModel`
   - Business Rule → `BusinessRuleDocModel`
3. **Följ alla regler** i prompten:
   - Svenska text
   - Formell bankton
   - En punkt per array-element
   - Inga HTML-taggar
   - etc.

### D. Konvertera till override-format

JSON-modellen ska konverteras till override-format:

**Regler:**
- ✅ Inkludera bara fält som har innehåll (inte tomma)
- ✅ Ersätt `'TODO'` med genererat innehåll
- ✅ Ersätt tomma arrayer `[]` med genererade listor
- ❌ Överskriv INTE befintligt innehåll (som inte är TODO)

**Exempel:**

Om JSON-modellen är:
```json
{
  "summary": "Detta Feature Goal...",
  "effectGoals": ["Mål 1", "Mål 2"],
  "scopeIncluded": ["Ingår: ...", "Ingår: ..."]
}
```

Och filen har:
```typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'TODO',
  effectGoals: ['TODO'],
  scopeIncluded: ['TODO'],
  // ... fler fält
};
```

Uppdatera till:
```typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'Detta Feature Goal...',
  effectGoals: ['Mål 1', 'Mål 2'],
  scopeIncluded: ['Ingår: ...', 'Ingår: ...'],
  // ... fler fält (behåll befintligt innehåll som inte är TODO)
};
```

### E. Uppdatera filen

1. **Behåll allt** som inte är TODO:
   - Imports
   - Exports
   - NODE CONTEXT-kommentaren
   - Befintligt innehåll (som inte är TODO)

2. **Ersätt bara**:
   - `'TODO'` → Genererat innehåll
   - `['TODO']` → Genererade listor
   - `[]` → Genererade listor (om de var tomma)

3. **Spara filen**

---

## Steg 3: Batch-bearbetning

För många filer (200+), bearbeta i batchar:

### Metod 1: Efter varje fil
```
Bearbeta en fil i taget. När en fil är klar, gå vidare till nästa.
```

### Metod 2: I batchar om 20-30 filer
```
Bearbeta filerna i batchar om 25 filer åt gången.
När en batch är klar, kontrollera resultatet innan du fortsätter.
```

### Metod 3: Per typ
```
Börja med alla epic-filer först.
När alla epics är klara, gå vidare till feature-goals.
Sedan business-rules.
```

---

## Steg 4: Checkpoint (om Codex kraschar)

Om Codex kraschar mitt i processen:

1. **Kör:**
   ```bash
   npm run batch-overrides:resume
   ```

2. **Detta visar** vilka filer som redan är klara

3. **Bearbeta bara** filer som INTE är i checkpoint

4. **Uppdatera checkpoint** efter varje batch:
   - Öppna `.codex-batch-checkpoint.json`
   - Lägg till klara filer i `completed`-arrayen:
   ```json
   {
     "completed": [
       "src/data/node-docs/epic/file1.doc.ts",
       "src/data/node-docs/epic/file2.doc.ts"
     ]
   }
   ```

---

## Exempel: Komplett workflow

### Fil att bearbeta:
`src/data/node-docs/feature-goal/mortgage-se-application.household.doc.ts`

### 1. Läsa NODE CONTEXT:
```
bpmnFile: mortgage-se-application.bpmn
elementId: household
type: feature-goal
```

### 2. Hämta prompt:
Läs `prompts/llm/feature_epic_prompt.md`

### 3. Generera JSON:
Enligt prompten, generera ett `FeatureGoalDocModel` JSON-objekt.

### 4. Uppdatera filen:
Ersätt TODO-platshållare med genererat innehåll.

### 5. Spara och gå vidare till nästa fil.

---

## Viktiga regler att följa

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

## Felsökning

### "Jag vet inte vilken prompt att använda"
- Kolla `type` i NODE CONTEXT-kommentaren
- `feature-goal` eller `epic` → `feature_epic_prompt.md`
- `business-rule` → `dmn_businessrule_prompt.md`

### "Jag vet inte vilken modell att generera"
- Läs prompten - den beskriver exakt vilken JSON-struktur som krävs
- Feature Goal → `FeatureGoalDocModel` (beskrivs i prompten)
- Epic → `EpicDocModel` (beskrivs i prompten)
- Business Rule → `BusinessRuleDocModel` (beskrivs i prompten)

### "Hur vet jag vad som är TODO?"
- Sök efter `'TODO'` eller `"TODO"` i filen
- Tomma arrayer `[]` ska också fyllas i
- Tomma strängar `''` ska också fyllas i

---

## Checklista per fil

- [ ] Läst NODE CONTEXT-kommentaren
- [ ] Hämtat rätt prompt från `prompts/llm/`
- [ ] Genererat JSON enligt promptens instruktioner
- [ ] Konverterat till override-format
- [ ] Ersatt bara TODO-platshållare
- [ ] Behållit allt annat innehåll
- [ ] Sparat filen
- [ ] Uppdaterat checkpoint (om batch-bearbetning)

---

## Tips

1. **Börja med en fil** för att testa att allt fungerar
2. **Kontrollera resultatet** innan du fortsätter med fler
3. **Använd git** för att se vad som ändrats: `git diff src/data/node-docs/`
4. **Bearbeta i batchar** om det är många filer
5. **Uppdatera checkpoint** regelbundet

