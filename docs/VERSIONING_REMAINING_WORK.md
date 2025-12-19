# Återstående arbete för versionslösningen

## 1. Uppdatera parseBpmnFile och relaterade funktioner

### Problem
- `parseBpmnFile` laddar alltid nuvarande version från storage
- `buildBpmnProcessGraph` och `buildProcessGraph` använder `parseBpmnFile` som inte respekterar vald version
- `useProcessTree` och `useProcessGraph` använder `parseBpmnFile` som inte respekterar vald version

### Lösning
- Uppdatera `parseBpmnFile` för att acceptera `versionHash` som parameter
- Uppdatera `loadBpmnXml` för att använda `getBpmnFileUrl` med version hash
- Uppdatera alla anrop till `parseBpmnFile` för att skicka med version hash från `useVersionSelection`

## 2. Uppdatera artefakt-generering

### Problem
- Artefakt-generering använder `currentVersionHash` men borde använda vald version från `useVersionSelection`
- Om användaren har valt en äldre version, ska artefakter genereras för den versionen

### Lösning
- Uppdatera `handleGenerateArtifacts` i `BpmnFileManager.tsx` för att använda `getVersionHashForFile` istället för `getCurrentVersionHash`
- Se till att alla artefakter sparas med rätt version-hash i sökvägen

## 3. Per-nod/subprocess artefakt-versionering

### ❌ Beslutat att inte implementera

Efter analys har vi beslutat att **inte implementera** per-element artefakt-versionering.

**Anledningar:**
- För komplext för det värde det ger
- Användningsfall täcks redan av node-docs overrides
- Ökar UI-komplexitet betydligt
- Risk för inkonsistens mellan BPMN-version och artefakt-version

**Alternativ:**
- Använd **node-docs overrides** för manuella förbättringar av specifika noder
- Se `src/data/node-docs/README.md` för dokumentation

**Arkiverade filer:**
- `supabase/migrations/archived/20251202000000_create_artifact_versions.sql.archived`
- `src/lib/archived/artifactVersioning.ts.archived`

## 4. Versionshistorik-UI

### Problem
- Ingen UI för att se alla versioner av en BPMN-fil
- Ingen UI för att se alla versioner av en artefakt per nod
- Ingen möjlighet att återställa till tidigare version

### Lösning
- Skapa `/bpmn-versions/:fileName` sida
- Visa lista över alla versioner för en fil
- Visa diff mellan versioner
- Möjlighet att "återställa" till tidigare version
- Visa vilka artefakter som är kopplade till varje version
- Lägg till per-nod versionshistorik i DocViewer

## 5. Varningar och indikatorer

### Problem
- Ingen varning när artefakter är kopplade till äldre versioner
- Ingen indikator på vilken version en artefakt genererades från

### Lösning
- Lägg till varningar i UI när artefakter är kopplade till äldre versioner
- Visa versionsinformation i artefakt-visning
- Lägg till indikatorer för när artefakter behöver regenereras

