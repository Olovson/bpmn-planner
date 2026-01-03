# Vad händer när subprocess-filer saknas under testgenerering?

## Översikt

När en subprocess-fil saknas (t.ex. `mortgage-se-object.bpmn` saknas men `application` callActivity i `mortgage.bpmn` försöker anropa den), hanteras detta på olika sätt beroende på vilket steg i testgenereringen som påverkas.

## E2E-scenario-generering

### Vad händer:

1. **Systemet försöker hitta subprocess-filen:**
   - Först från `parseResult.subprocesses` (från BPMN-filen)
   - Sedan från `bpmn-map.json` (om det finns)
   - Om ingen hittas, blir `subprocessFile = undefined`

2. **Systemet försöker ladda Feature Goal-dokumentation:**
   - Om `subprocessFile` är `undefined`, kommer `getCurrentVersionHash(subprocessFile)` att returnera `null`
   - Då returnerar `loadFeatureGoalDocFromStorage` `null`
   - CallActivity läggs till i `missingFeatureGoals`

3. **Partiell dokumentation tillåts:**
   - Om **minst en Feature Goal** i path har dokumentation, genereras E2E-scenario ändå
   - Systemet varnar: `"Partial documentation for path X → Y. Missing docs for: object. Generating scenario with 2 of 3 Feature Goals."`
   - E2E-scenario genereras **utan** `subprocessStep` för callActivities som saknar dokumentation

4. **Om alla Feature Goals saknar dokumentation:**
   - Path hoppas över helt
   - Inget E2E-scenario genereras för den path

### Exempel:

Om `mortgage-se-application.bpmn` har callActivities:
- `internal-data-gathering` (har dokumentation) ✓
- `household` (har dokumentation) ✓
- `object` (saknar BPMN-fil) ✗
- `stakeholder` (saknar BPMN-fil) ✗

**Resultat:**
- E2E-scenario genereras med `subprocessStep` för `internal-data-gathering` och `household`
- Inga `subprocessStep` för `object` eller `stakeholder`
- Varning: `"Partial documentation for path... Missing docs for: object, stakeholder. Generating scenario with 2 of 4 Feature Goals."`

## Feature Goal-test-generering

### Vad händer:

1. **Feature Goal-tester extraheras från E2E-scenarios:**
   - Systemet går igenom alla `subprocessStep` i E2E-scenarios
   - För varje `subprocessStep` skapas en Feature Goal-test

2. **Om `subprocessStep` saknas i E2E-scenario:**
   - Ingen Feature Goal-test genereras för den callActivity
   - Detta är korrekt beteende - om subprocess-filen saknas, kan vi inte generera Feature Goal-tester

3. **Om `subprocessStep` finns men saknar `given/when/then`:**
   - Feature Goal-test genereras ändå (med `given/when/then` från Feature Goal-dokumentation om tillgänglig)
   - Men om Feature Goal-dokumentation också saknas, kommer testet att sakna `given/when/then`

### Exempel:

Om E2E-scenario har:
- `subprocessStep` för `internal-data-gathering` ✓
- `subprocessStep` för `household` ✓
- Inget `subprocessStep` för `object` ✗ (saknades i E2E-generering)
- Inget `subprocessStep` för `stakeholder` ✗ (saknades i E2E-generering)

**Resultat:**
- Feature Goal-test genereras för `internal-data-gathering`
- Feature Goal-test genereras för `household`
- Inga Feature Goal-tester genereras för `object` eller `stakeholder`

## Sammanfattning

| Situation | E2E-scenario | Feature Goal-test |
|-----------|--------------|-------------------|
| Subprocess-fil saknas | Genereras med partiell dokumentation (om minst en Feature Goal har dokumentation) | Genereras INTE (eftersom `subprocessStep` saknas i E2E-scenario) |
| Subprocess-fil finns men dokumentation saknas | Genereras med partiell dokumentation (om minst en Feature Goal har dokumentation) | Genereras INTE (eftersom dokumentation saknas) |
| Subprocess-fil finns och dokumentation finns | Genereras normalt | Genereras normalt |

## Rekommendationer

1. **För att få kompletta E2E-scenarios:**
   - Ladda upp alla subprocess-filer som refereras i BPMN-filerna
   - Generera dokumentation för alla subprocess-filer

2. **För att få Feature Goal-tester för alla callActivities:**
   - Se till att subprocess-filen finns
   - Se till att dokumentation genererats för subprocess-filen
   - Se till att E2E-scenario genererades framgångsrikt (med `subprocessStep` för callActivity)

3. **Om vissa subprocess-filer saknas:**
   - Systemet kommer fortfarande att generera E2E-scenarios och Feature Goal-tester för callActivities som har dokumentation
   - Du kommer att se varningar i konsolen om vilka Feature Goals som saknar dokumentation
   - Du kan senare lägga till saknade subprocess-filer och regenerera för att få kompletta testscenarios

## Debugging

För att se vad som händer, öppna konsolen (F12) och leta efter:
- `[e2eScenarioGenerator] Could not find subprocess file for Feature Goal {featureGoalId}`
- `[e2eScenarioGenerator] Partial documentation for path... Missing docs for: {missingFeatureGoals}`
- `[e2eScenarioGenerator] No documentation loaded for path... Missing: {missingFeatureGoals}`

Dessa meddelanden visar vilka callActivities som saknar subprocess-filer eller dokumentation.

