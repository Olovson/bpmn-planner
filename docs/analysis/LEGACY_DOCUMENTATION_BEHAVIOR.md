# Beteende vid Generering med Legacy Dokumentation

## Problem

När du har legacy dokumentation (genererad med äldre namngivning) och genererar dokumentation igen, vad händer?

## Nuvarande Beteende

### För Call Activities (Feature Goals)

1. **Systemet genererar ALLTID** - även om dokumentation redan finns
   - Se rad 1959 i `bpmnGenerators.ts`: "Men för callActivities genererar vi alltid"
   - Anledning: "de behöver uppdateras när subprocesser ändras"

2. **Systemet använder hierarchical naming** (med parent prefix)
   - Exempel: `feature-goals/mortgage-se-application-internal-data-gathering.html`
   - Legacy naming: `feature-goals/mortgage-se-internal-data-gathering.html`

3. **Systemet kollar INTE efter legacy dokumentation**
   - Den kollar bara efter hierarchical naming paths
   - Se `buildDocStoragePaths` och `storageFileExists` anrop

4. **Legacy dokumentation tas INTE bort**
   - Det finns ingen cleanup-logik som tar bort gamla filer
   - Legacy filer finns kvar i Storage

### För Tasks/Epics

1. **Systemet kollar om dokumentation finns** (om inte `forceRegenerate` är true)
   - Se rad 1964: `if (node.type !== 'callActivity' && !forceRegenerate)`
   - Men kollar bara efter hierarchical naming paths

2. **Om legacy dokumentation finns, hittas den inte**
   - Systemet genererar ny dokumentation med hierarchical naming
   - Legacy dokumentationen finns kvar

## Resultat

### Du får dubbletter:

1. **Legacy dokumentation** (gamla filer)
   - `feature-goals/mortgage-credit-evaluation.html`
   - `feature-goals/mortgage-se-credit-evaluation.html`

2. **Hierarchical dokumentation** (nya filer)
   - `feature-goals/mortgage-se-object-control-credit-evaluation.html`
   - `feature-goals/mortgage-se-application-internal-data-gathering.html`

### Konsekvenser:

1. **Storage blir större** - både legacy och nya filer finns
2. **Förvirring** - vilken fil är den "rätta"?
3. **Testgenerering kan hitta fel fil** - om den söker legacy först (vilket vi fixade)
4. **Ingen automatisk cleanup** - legacy filer tas inte bort automatiskt

## Lösningar

### Alternativ 1: Cleanup Legacy Filer (Rekommenderat)

Lägg till logik som:
1. Identifierar legacy dokumentation innan generering
2. Tar bort legacy filer när ny hierarchical dokumentation genereras
3. Gör detta som en separat cleanup-funktion

### Alternativ 2: Migration Script

Skapa ett script som:
1. Hittar alla legacy dokumentationsfiler
2. Migrerar dem till hierarchical naming (eller tar bort om dubbletter)
3. Körs manuellt eller automatiskt

### Alternativ 3: Sök Både Legacy och Hierarchical

Uppdatera `storageFileExists` checken att:
1. Först söka efter hierarchical naming
2. Om inte hittat, söka efter legacy naming
3. Om legacy hittas, använd den (eller migrera den)

## Rekommendation

**Alternativ 1 + 3 kombinerat:**
- Uppdatera existence check att söka både legacy och hierarchical
- Lägg till cleanup-funktion som tar bort legacy när ny genereras
- Gör cleanup valfritt (flag) så användare kan välja

