# Versionslösning - Implementeringsstatus

> **Uppdaterat:** Efter analys har vi beslutat att behålla bara BPMN-fil versionering.
> Per-element artefakt-versionering är arkiverad (se `docs/VERSIONING_FINAL_DECISION.md`).

## ✅ Genomförda ändringar

### 1. Global versionshantering
- ✅ **VersionSelectionProvider** - Global context för versionsval
- ✅ **VersionSelector** - UI-komponent för att välja version på files-sidan
- ✅ **VersionIndicator** - Global indikator i header som visar aktiv version
- ✅ **useVersionSelection** - Hook för att komma åt vald version i hela appen

### 2. BPMN-fil versionering
- ✅ **parseBpmnFile** - Uppdaterad för att acceptera `versionHash` parameter
- ✅ **loadBpmnXml** - Uppdaterad för att använda `getBpmnXmlFromVersion` när version hash finns
- ✅ **getBpmnFileUrl** - Uppdaterad för att returnera XML från vald version som data URL
- ✅ **BpmnViewer** - Uppdaterad för att ladda vald version av BPMN-filer
- ✅ **DocViewer** - Uppdaterad för att leta efter dokumentation med vald version-hash

### 3. Process Graph/Tree versionering
- ✅ **buildBpmnProcessGraph** - Uppdaterad för att acceptera `versionHashes` Map
- ✅ **parseAllBpmnFiles** - Uppdaterad för att acceptera `versionHashes` Map
- ✅ **useProcessGraph** - Uppdaterad för att använda `useVersionSelection`
- ✅ **useProcessTree** - Uppdaterad för att använda `useVersionSelection`

### 4. Artefakt-generering
- ✅ **BpmnFileManager.handleGenerateArtifacts** - Uppdaterad för att använda `getVersionHashForFile` istället för `getCurrentVersionHash`
- ✅ **buildDocStoragePaths** - Uppdaterad för att stödja per-nod artefakt-versionering (elementId, artifactVersionHash)

### 5. Per-nod artefakt-versionering
- ❌ **Arkiverad** - Efter analys beslutat att inte implementera (för komplext)
- 📦 Migration och kod flyttad till `archived/` mappar
- ✅ **Node-docs overrides** används istället för manuella förbättringar

## ⏳ Återstående arbete

### 1. Uppdatera buildBpmnProcessGraph anrop
- ⏳ **bpmnGenerators.ts** - `generateAllFromBpmnWithGraph` anropar `buildBpmnProcessGraph` utan version hashes
- ⏳ **DocViewer.tsx** - Anropar `buildBpmnProcessGraph` utan version hashes
- ⏳ **debugDataLoader.ts** - Använder `parseBpmnFile` utan version hashes

**Lösning**: Skicka med `getVersionHashForFile` som parameter eller använda `useVersionSelection` där möjligt.

### 2. Per-nod artefakt-versionering (UI och integration)
- ⏳ **UI för att generera/uppdatera dokumentation för specifik nod**
  - Knapp i DocViewer för att "Regenerera dokumentation för denna nod"
  - Dialog för att välja om man vill skapa ny version eller uppdatera befintlig
  - Möjlighet att ange change summary
  
- ⏳ **Uppdatera artefakt-generering för att spara per-nod versioner**
  - När dokumentation genereras för en specifik nod, spara i `artifact_versions` tabell
  - Uppdatera `buildDocStoragePaths` anrop för att inkludera `elementId` och `artifactVersionHash`
  
- ⏳ **Uppdatera DocViewer för att hitta per-nod versionerade artefakter**
  - Leta efter artefakter med per-nod version-hash i sökvägen
  - Prioritera per-nod versionerade artefakter över BPMN-versionerade

### 3. Versionshistorik-UI
- ⏳ **Skapa `/bpmn-versions/:fileName` sida**
  - Visa lista över alla versioner för en BPMN-fil
  - Visa diff mellan versioner
  - Möjlighet att "återställa" till tidigare version
  - Visa vilka artefakter som är kopplade till varje version

- ⏳ **Per-nod versionshistorik i DocViewer**
  - Visa alla versioner av dokumentation för en specifik nod
  - Möjlighet att välja vilken version som ska visas
  - Visa diff mellan versioner

### 4. Varningar och indikatorer
- ⏳ **Varningar när artefakter är kopplade till äldre versioner**
  - Visa varning i UI när artefakt genererades från äldre BPMN-version
  - Föreslå att regenerera artefakten

- ⏳ **Versionsinformation i artefakt-visning**
  - Visa vilken BPMN-version artefakten genererades från
  - Visa per-nod version om det finns
  - Visa när artefakten genererades

### 5. Testning
- ⏳ **Testa versionsval fungerar i hela appen**
  - Verifiera att BpmnViewer visar rätt version
  - Verifiera att DocViewer visar rätt version
  - Verifiera att Process Tree/Graph använder rätt version
  - Verifiera att artefakt-generering använder rätt version

## Databas-migration

Kör följande för att skapa `artifact_versions` tabell:

```bash
npm run supabase:ensure-schema
```

Detta kommer att köra migrationen `20251202000000_create_artifact_versions.sql`.

## Nästa steg (prioriterat)

1. **Uppdatera buildBpmnProcessGraph anrop** - Se till att alla anrop skickar med version hashes
2. **Implementera UI för per-nod generering** - Lägg till knapp i DocViewer för att regenerera dokumentation
3. **Integrera per-nod versionering i artefakt-generering** - Spara per-nod versioner när dokumentation genereras
4. **Uppdatera DocViewer för per-nod versioner** - Leta efter och visa per-nod versionerade artefakter
5. **Skapa versionshistorik-UI** - Sida för att se alla versioner och diffar

