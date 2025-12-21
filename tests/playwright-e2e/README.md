# Playwright E2E-tester

## Översikt

Detta katalog innehåller Playwright E2E-tester för BPMN Planner-applikationen. Testerna täcker kritiska användarflöden och UI-komponenter.

## Testfiler

### Kritiska UI-tester (Fas 1)

- **`bpmn-file-manager.spec.ts`** - Testar BpmnFileManager-sidan (filhantering, hierarki-byggnad, generering)
- **`process-explorer.spec.ts`** - Testar Process Explorer-sidan (trädvisualisering, nod-interaktion)
- **`doc-viewer.spec.ts`** - Testar Doc Viewer-sidan (dokumentationsvisning, länkar, version selection)
- **`full-generation-flow.spec.ts`** - Testar komplett genereringsflöde (upload → hierarki → generering)

### Viktiga funktioner (Fas 2)

- **`node-matrix.spec.ts`** - Testar Node Matrix-sidan (listvy, filter, sortering)
- **`timeline-page.spec.ts`** - Testar Timeline-sidan (Gantt-chart, filter, datum-redigering)

### Befintliga tester

- **`file-upload-versioning.spec.ts`** - Testar fil-upload och versioning
- **`claude-generation.spec.ts`** - Testar Claude-generering för application-processen

### Kör testet

```bash
# Kör testet (headless)
npm run test:claude:generation

# Kör testet med visuell browser (headed)
npm run test:claude:generation:headed
```

### Förutsättningar

1. **Appen måste köra** - Testet startar automatiskt appen via `webServer` i `playwright.config.ts`
2. **Supabase måste vara igång** - BPMN-filer måste finnas i storage
3. **Claude API-nyckel** - `VITE_ANTHROPIC_API_KEY` måste vara satt i `.env.local`
4. **LLM måste vara aktiverat** - `VITE_USE_LLM=true` (sätts automatiskt av npm-scriptet)

### Vad testet gör

1. Öppnar appen och navigerar till BPMN File Manager
2. Väljer "mortgage-se-application.bpmn"
3. Aktiverar Claude (moln-LLM) som genereringsläge
4. Verifierar att template-version-väljaren är dold (Claude använder alltid v2)
5. Klickar på "Generera artefakter för vald fil"
6. Väntar på att genereringen är klar (kan ta 1-3 minuter)
7. Navigerar till Doc Viewer för application
8. Verifierar att dokumentation genererades och kan visas

### Timeout

Testet har en timeout på 3 minuter (180 sekunder) för genereringen, vilket borde räcka för de flesta fall.

### Debugging

Om testet misslyckas:

1. Kör med `--headed` för att se vad som händer
2. Kolla console-loggarna i Playwright
3. Verifiera att Claude API-nyckeln är korrekt
4. Kontrollera att Supabase körs och har BPMN-filer

