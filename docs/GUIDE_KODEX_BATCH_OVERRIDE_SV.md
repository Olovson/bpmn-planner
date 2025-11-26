# Guide: Använda Codex för att batch-generera dokumentation

Denna guide förklarar steg-för-steg hur du använder Codex (AI-assistenten i Cursor) för att automatiskt fylla i dokumentationsöverskridanden (overrides) för många noder på en gång.

## Vad är detta?

Du har redan ett system där:
- **ChatGPT API** kan generera dokumentation för BPMN-noder
- **Override-filer** (`.doc.ts`) kan användas för att anpassa dokumentationen per nod
- Många override-filer har `TODO`-platshållare som behöver fyllas i

Detta system låter dig använda **Codex** (AI-assistenten) för att batch-fylla i alla dessa `TODO`-fält automatiskt, med samma prompts och logik som ChatGPT använder.

## Förutsättningar

- Du har override-filer i `src/data/node-docs/` med `TODO`-platshållare
- Du vet vilka filer eller BPMN-filer du vill bearbeta

## Steg 1: Välj vad du vill generera

Du kan välja att generera innehåll för:

**Alternativ A:** Alla override-filer i en mapp
```
Exempel: Alla epics i src/data/node-docs/epic/
```

**Alternativ B:** Alla override-filer för en specifik BPMN-fil
```
Exempel: Alla noder i mortgage-se-application.bpmn
```

## Steg 2: Be Codex att hitta filerna

Öppna Cursor och skriv till Codex (i chat-fönstret):

```
Hitta alla override-filer för epic-noder i mortgage-se-application.bpmn
```

eller

```
Hitta alla override-filer i mappen src/data/node-docs/epic/
```

Codex kommer att använda funktionen `findOverrideFiles()` för att hitta relevanta filer.

## Steg 3: Be Codex att generera innehåll

När Codex har hittat filerna, säg:

```
Använd batch override generation helper för att:
1. Läsa varje override-fil
2. Hämta rätt prompt från prompts/llm/ (samma som ChatGPT använder)
3. Generera JSON-innehåll enligt promptens instruktioner
4. Uppdatera filerna - ersätt bara TODO-platshållare, behåll befintligt innehåll
```

## Steg 4: Codex gör jobbet

Codex kommer att:

1. **Läsa varje fil** och extrahera:
   - `bpmnFile` (t.ex. `mortgage-se-application.bpmn`)
   - `elementId` (t.ex. `household`)
   - `docType` (t.ex. `feature-goal` eller `epic`)

2. **Hämta rätt prompt** från `prompts/llm/`:
   - `feature_epic_prompt.md` för Feature Goals och Epics
   - `dmn_businessrule_prompt.md` för Business Rules

3. **Generera innehåll** enligt promptens instruktioner:
   - Läser prompten (som innehåller detaljerade instruktioner på svenska)
   - Genererar JSON-objekt som matchar modellen (FeatureGoalDocModel, EpicDocModel, etc.)
   - Följer alla regler i prompten (t.ex. svenska text, formell bankton, etc.)

4. **Uppdatera filerna**:
   - Ersätter `'TODO'` med genererat innehåll
   - Ersätter tomma arrayer `[]` med genererade listor
   - **Behåller** allt innehåll som redan finns (inte TODO)

## Konkret exempel

Låt oss säga att du har en fil:
`src/data/node-docs/feature-goal/mortgage-se-application.household.doc.ts`

Med innehåll:
```typescript
export const overrides: FeatureGoalDocOverrides = {
  summary: 'TODO',
  effectGoals: ['TODO'],
  scopeIncluded: ['TODO'],
  // ... fler TODO-fält
};
```

**Vad du säger till Codex:**

```
Använd codexBatchOverrideHelper för att batch-generera innehåll för alla 
feature-goal override-filer i mortgage-se-application.bpmn.

För varje fil:
1. Använd parseOverrideFileContext() för att läsa filen
2. Använd getCodexGenerationInstructions() för att få prompten
3. Generera JSON enligt promptens instruktioner (på svenska, formell bankton)
4. Använd mapLlmResponseToOverrides() för att konvertera till override-format
5. Uppdatera filen - ersätt TODO med genererat innehåll, behåll allt annat
```

**Vad Codex gör:**

1. Läser filen och ser att det är en `feature-goal` för `household`-noden
2. Hämtar `feature_epic_prompt.md` och läser instruktionerna
3. Genererar JSON med:
   ```json
   {
     "summary": "Detta Feature Goal möjliggör...",
     "effectGoals": ["Automatisera...", "Förbättra...", ...],
     "scopeIncluded": ["Ingår: ...", "Ingår: ...", ...],
     ...
   }
   ```
4. Konverterar till override-format och uppdaterar filen:
   ```typescript
   export const overrides: FeatureGoalDocOverrides = {
     summary: 'Detta Feature Goal möjliggör...',
     effectGoals: ['Automatisera...', 'Förbättra...', ...],
     scopeIncluded: ['Ingår: ...', 'Ingår: ...', ...],
     // ... resten av fälten
   };
   ```

## Viktiga regler

### ✅ Gör detta:
- Ersätt bara `'TODO'` och tomma arrayer `[]`
- Behåll allt innehåll som redan finns
- Följ promptens instruktioner (svenska, formell ton, etc.)
- Använd samma prompts som ChatGPT (via `getPromptForDocType()`)

### ❌ Gör INTE detta:
- Överskriv innehåll som redan finns (inte TODO)
- Ändra filstrukturen (imports, exports, NODE CONTEXT-kommentarer)
- Använd andra prompts än de i `prompts/llm/`
- Generera innehåll på engelska (ska vara svenska)

## Felsökning

### "Codex hittar inte filerna"
- Kontrollera att sökvägen är korrekt
- Använd absoluta sökvägar om relativa inte fungerar
- Se till att filerna faktiskt finns i `src/data/node-docs/`

### "Codex genererar fel innehåll"
- Se till att Codex använder `getCodexGenerationInstructions()` för att få rätt prompt
- Kontrollera att prompten från `prompts/llm/` används (inte någon annan)
- Verifiera att Codex följer promptens instruktioner (t.ex. svenska, JSON-format)

### "Filer blir korrupta"
- Codex ska bara uppdatera `overrides`-objektet
- Behåll allt annat (imports, exports, kommentarer) oförändrat
- Om något går fel, använd git för att återställa

## Ytterligare tips

### Batch-generera för specifik typ
```
Generera innehåll för alla epic-override-filer i src/data/node-docs/epic/
```

### Batch-generera för specifik BPMN-fil
```
Generera innehåll för alla override-filer relaterade till 
mortgage-se-application.bpmn
```

### Generera bara för tomma filer
```
Hitta alla override-filer där summary är 'TODO' och generera innehåll
```

## Var hittar jag koden?

- **Helper-funktioner**: `src/lib/codexBatchOverrideHelper.ts`
- **Delad logik**: `src/lib/llmDocumentationShared.ts`
- **Prompts**: `prompts/llm/feature_epic_prompt.md` och `prompts/llm/dmn_businessrule_prompt.md`
- **Override-filer**: `src/data/node-docs/{docType}/`

## Nästa steg

1. **Testa med en fil först**: Be Codex att generera innehåll för en enda fil
2. **Granska resultatet**: Kontrollera att innehållet ser bra ut
3. **Batch-generera**: När du är nöjd, be Codex att göra samma sak för alla filer

## Exempel-dialog med Codex

**Du:**
```
Hitta alla override-filer för epic-noder i mortgage-se-application.bpmn
```

**Codex:**
```
Jag hittade 3 epic-override-filer:
- src/data/node-docs/epic/mortgage-se-application.confirm-application.doc.ts
- src/data/node-docs/epic/mortgage-se-application.household.doc.ts
- src/data/node-docs/epic/mortgage-se-application.stakeholder.doc.ts
```

**Du:**
```
Använd codexBatchOverrideHelper för att generera innehåll för alla dessa filer.
Ersätt bara TODO-platshållare, behåll allt annat innehåll.
```

**Codex:**
```
Jag kommer att:
1. Läsa varje fil och extrahera node-kontext
2. Hämta rätt prompt från prompts/llm/feature_epic_prompt.md
3. Generera JSON enligt promptens instruktioner
4. Uppdatera filerna med genererat innehåll

Börjar med confirm-application...
```

Och så vidare! Codex gör resten automatiskt.

