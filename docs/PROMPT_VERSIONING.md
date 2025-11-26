# Prompt Versionering

## Översikt

När prompt-mallarna (`prompts/llm/*.md`) uppdateras, behöver vi kunna identifiera vilka override-filer som genererades med gamla versioner och behöver uppdateras.

## Hur det fungerar

### 1. Versionering av prompts

Varje prompt-fil har en version-kommentar överst:

```markdown
<!-- PROMPT VERSION: 1.0.0 -->
```

När du uppdaterar en prompt, öka versionen:
- `1.0.0` → `1.1.0` (mindre ändringar)
- `1.0.0` → `2.0.0` (stora ändringar)

### 2. Versionering i override-filer

När Codex genererar innehåll, läggs en kommentar till i varje fil:

```typescript
/**
 * NODE CONTEXT
 * bpmnFile: mortgage-se-application.bpmn
 * elementId: household
 * type: feature-goal
 */

/**
 * PROMPT VERSION: 1.0.0
 * Genererad: 2024-11-26
 */

export const overrides: FeatureGoalDocOverrides = {
  // ...
};
```

### 3. Kontrollera versioner

Kör:

```bash
npm run check:prompt-versions
```

Detta visar:
- Vilka filer använder gamla prompt-versioner
- Vilka filer saknar version (genererade före versionering)

### 4. Uppdatera filer med nya versioner

När du uppdaterat en prompt:

1. **Kontrollera vilka filer som behöver uppdateras:**
   ```bash
   npm run check:prompt-versions
   ```

2. **Re-generera innehåll:**
   ```bash
   npm run codex:batch:auto
   ```
   
   Detta kommer att:
   - Hitta filer med gamla versioner
   - Re-generera innehåll med nya prompt-versioner
   - Uppdatera prompt-version kommentaren

## Workflow när du uppdaterar en prompt

### Steg 1: Uppdatera prompt-versionen

Öppna prompt-filen (t.ex. `prompts/llm/feature_epic_prompt.md`) och öka versionen:

```markdown
<!-- PROMPT VERSION: 1.1.0 -->
```

### Steg 2: Gör dina ändringar

Uppdatera prompt-innehållet enligt dina behov.

### Steg 3: Kontrollera vilka filer som påverkas

```bash
npm run check:prompt-versions
```

### Steg 4: Re-generera innehåll

```bash
npm run codex:batch:auto
```

Säg till Codex:
```
Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.
VIKTIGT: Skriv ALDRIG över befintligt innehåll - ersätt bara 'TODO', tomma arrayer [], eller tomma strängar ''.
Fortsätt från fil 1 till sista filen utan att stoppa eller fråga.
```

**OBS:** Codex kommer bara att uppdatera filer som faktiskt behöver uppdateras (har TODO eller gamla versioner).

## Automatisk versionering

Om ingen version hittas i prompt-filen, används filens ändringsdatum som hash:
- `auto-abc12345` (baserat på mtime)

Detta säkerställer att ändringar i prompt-filen automatiskt detekteras.

## Tips

- **Öka versionen** när du gör ändringar som påverkar output-strukturen
- **Kontrollera versioner regelbundet** efter större prompt-ändringar
- **Re-generera** filer med gamla versioner för att säkerställa konsistens

