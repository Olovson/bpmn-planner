# Playwright E2E-tester

## Claude-generering Test

Testet `claude-generation.spec.ts` verifierar att Claude-generering fungerar korrekt för application-processen.

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

