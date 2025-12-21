# Två-lagers versionering - Arkitektur

## Översikt

Systemet använder en två-lagers versioneringsarkitektur för att hantera både BPMN-filer och deras artefakter (dokumentation och tester):

1. **BPMN-fil versionering** - Spårar versioner av BPMN-filer
2. **Per-element artefakt-versionering** - Spårar versioner av artefakter för specifika element (noder eller subprocesser)

## Lager 1: BPMN-fil versionering

### Tabell: `bpmn_file_versions`
- Spårar alla versioner av BPMN-filer
- Använder content-based hashing (SHA-256) för deduplicering
- Varje version har ett sekventiellt nummer (1, 2, 3...)
- Endast en version kan vara "current" per fil

### Exempel:
```
application.bpmn:
  - Version 1 (hash: abc123...) - Initial version
  - Version 2 (hash: def456...) - Added new task
  - Version 3 (hash: ghi789...) - Updated subprocess
```

## Lager 2: Per-element artefakt-versionering

### Tabell: `artifact_versions`
- Spårar versioner av artefakter (dokumentation eller tester) för specifika element
- Element kan vara:
  - **Noder**: UserTask, ServiceTask, BusinessRuleTask, etc.
  - **Subprocesser**: CallActivity (som refererar till en subprocess)
- Varje artefakt-version är kopplad till en BPMN-fil version (`bpmn_version_hash`)
- Varje element kan ha flera artefakt-versioner, oberoende av BPMN-filens version

### Exempel:
```
application.bpmn / Node "Object-information":
  - Artifact version 1 (generated from BPMN version 1)
  - Artifact version 2 (generated from BPMN version 2)
  - Artifact version 3 (generated from BPMN version 1) - Manually regenerated

application.bpmn / CallActivity "Validate-application":
  - Artifact version 1 (generated from BPMN version 1)
  - Artifact version 2 (generated from BPMN version 3)
  - Artifact version 3 (generated from BPMN version 2) - Manually regenerated
```

## Storage-struktur

### BPMN-versionerad artefakt (ingen per-element version):
```
docs/slow/chatgpt/application.bpmn/{bpmnVersionHash}/application-Object-information-v2.html
```

### Per-element versionerad artefakt:
```
docs/slow/chatgpt/application.bpmn/{bpmnVersionHash}/{elementId}/{artifactVersionHash}/application-Object-information-v2.html
```

Där:
- `bpmnVersionHash` = BPMN-filens version hash
- `elementId` = Element-ID (t.ex. "UserTask-123" eller "CallActivity-456")
- `artifactVersionHash` = Artefaktens version hash

## Användningsfall

### Scenario 1: BPMN-fil uppdateras
1. Användaren laddar upp ny version av `application.bpmn` (version 2)
2. Systemet skapar ny BPMN-version i `bpmn_file_versions`
3. Användaren genererar dokumentation för hela filen
4. Alla artefakter sparas med `bpmnVersionHash = version 2`

### Scenario 2: Regenerera dokumentation för specifik nod
1. Användaren väljer att regenerera dokumentation för noden "Object-information"
2. Systemet använder nuvarande BPMN-version (t.ex. version 2)
3. Systemet skapar ny artefakt-version i `artifact_versions`:
   - `bpmn_file = "application.bpmn"`
   - `element_id = "Object-information"`
   - `bpmn_version_hash = version 2 hash`
   - `version_number = 3` (om det redan fanns 2 versioner)
4. Artefakten sparas med per-element version-hash i sökvägen

### Scenario 3: Regenerera dokumentation för subprocess (CallActivity)
1. Användaren väljer att regenerera dokumentation för CallActivity "Validate-application"
2. Systemet använder nuvarande BPMN-version
3. Systemet skapar ny artefakt-version i `artifact_versions`:
   - `bpmn_file = "application.bpmn"`
   - `element_id = "CallActivity-Validate-application"` (CallActivity-ID)
   - `bpmn_version_hash = current version hash`
   - `version_number = next version`
4. Artefakten sparas med per-element version-hash i sökvägen

## Fördelar

1. **Flexibilitet**: Kan regenerera dokumentation för specifika element utan att påverka andra
2. **Historik**: Kan se alla versioner av dokumentation för ett element
3. **Spårbarhet**: Vet vilken BPMN-version som användes när varje artefakt genererades
4. **Oberoende**: Artefakt-versioner är oberoende av BPMN-filens version
5. **Deduplicering**: Samma innehåll = samma version (via content hash)

## Implementation

### Databas
- `bpmn_file_versions` - BPMN-fil versionering
- `artifact_versions` - Per-element artefakt-versionering
- Foreign key: `artifact_versions.bpmn_version_hash` → `bpmn_file_versions.content_hash`

### Kod
- `src/lib/bpmnVersioning.ts` - BPMN-fil versionering utilities
- `src/lib/artifactVersioning.ts` - Per-element artefakt-versionering utilities
- `src/lib/artifactPaths.ts` - Storage path building med två-lagers versionering

### UI
- `VersionSelector` - Välj BPMN-fil version
- (Framtida) Per-element version selector i DocViewer
- (Framtida) Versionshistorik för både BPMN-filer och artefakter

