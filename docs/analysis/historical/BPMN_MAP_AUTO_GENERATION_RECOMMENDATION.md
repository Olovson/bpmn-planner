# Rekommendation: Automatisk Generering av bpmn-map.json

## Sammanfattning

**JA - Systemet kan automatiskt generera bpmn-map.json** baserat på automatisk matching som redan finns i systemet.

## Nuvarande Situation

### Hur systemet fungerar

1. **Prioritering vid matching**:
   - **Först**: `bpmn-map.json` (om den finns) - används via `matchCallActivityUsingMap()`
   - **Sedan**: Automatisk matching via `matchCallActivityToProcesses()` i `SubprocessMatcher.ts`

2. **Automatisk matching använder**:
   - `calledElement` från BPMN (högsta konfidens, score: 1.0)
   - `callActivity.id` matchar `process.id` (score: 0.9)
   - `callActivity.name` matchar `process.name` (score: 0.85)
   - Filnamnsheuristik: `mortgage-se-{id}.bpmn` eller `{id}.bpmn` (score: 0.8)
   - Fuzzy matching baserat på namn (score: 0.7 * similarity)

3. **Match-status returneras**:
   - `'matched'`: Hög konfidens (score >= 0.75, ingen ambiguity)
   - `'lowConfidence'`: Låg konfidens (score < 0.75)
   - `'ambiguous'`: Flera matchningar med liknande score
   - `'unresolved'`: Ingen matchning hittad

## Kan vi automatiskt generera bpmn-map.json?

### ✅ JA - med följande förutsättningar

**Systemet kan automatiskt generera bpmn-map.json för:**

1. **Hög konfidens matchningar** (`matchStatus === 'matched'`):
   - `needs_manual_review: false`
   - Kan genereras automatiskt utan review

2. **Låg konfidens / ambiguous matchningar**:
   - `needs_manual_review: true`
   - Genereras automatiskt men flaggas för review

3. **Unresolved matchningar**:
   - `needs_manual_review: true`
   - `subprocess_bpmn_file: null`
   - Kräver manuell mappning

### Vad fungerar automatiskt?

Baserat på analys av dina BPMN-filer:

1. **calledElement i BPMN**: Många callActivities har `calledElement` som direkt matchar processId
   - Exempel: `signing` callActivity har `calledElement="signing"` → matchar `mortgage-se-signing.bpmn`
   - **Konfidens**: Hög (score: 1.0)

2. **Naming conventions**: Konsekvent användning av `mortgage-se-{id}.bpmn`
   - Exempel: `household` callActivity → `mortgage-se-household.bpmn`
   - **Konfidens**: Hög (score: 0.8-0.9)

3. **Process ID matching**: `callActivity.id` matchar ofta `process.id`
   - **Konfidens**: Hög (score: 0.9)

### Vad behöver fortfarande manuell mappning?

1. **Unresolved matches**: När ingen automatisk matchning hittas
2. **Ambiguous matches**: När flera subprocesser matchar lika bra
3. **Low confidence matches**: När matchningen har låg konfidens (< 0.75)
4. **Edge cases**: När naming conventions inte följs

## Rekommendation

### ✅ Automatisk generering som standard

**Strategi:**

1. **Generera automatiskt**: Använd `matchCallActivityToProcesses()` för alla callActivities
2. **Flagga för review**: Sätt `needs_manual_review: true` för:
   - Low confidence matches
   - Ambiguous matches
   - Unresolved matches
3. **Tillåt override**: Behåll möjlighet att manuellt överrida matchningar

### Implementation

**Steg 1: Skapa script för automatisk generering**

```typescript
// scripts/generate-bpmn-map-auto.ts
// - Läs alla BPMN-filer
// - Parsa varje fil
// - Matcha callActivities automatiskt
// - Generera bpmn-map.json med needs_manual_review flaggor
```

**Steg 2: Integrera i workflow**

- Kör automatiskt när nya BPMN-filer läggs till
- Eller som separat kommando: `npm run generate-bpmn-map-auto`

**Steg 3: Manual review UI** (valfritt)

- Visa matchningar med `needs_manual_review: true`
- Tillåt användare att korrigera/överrida matchningar
- Spara överrides tillbaka till bpmn-map.json

## Slutsats

**bpmn-map.json behöver INTE hårdmappas manuellt för de flesta fall.**

**Systemet kan automatiskt generera bpmn-map.json för:**
- ✅ Hög konfidens matchningar (via `calledElement`, naming conventions, process ID)
- ⚠️ Låg konfidens matchningar (flaggas för review)
- ❌ Unresolved matchningar (kräver manuell mappning)

**bpmn-map.json behövs fortfarande för:**
- Edge cases som inte matchar naming conventions
- Manuella överrides för problematiska matchningar
- Explicit mappning när automatisk matching misslyckas

**Rekommendation**: 
- Implementera automatisk generering som standard
- Använd `needs_manual_review: true` för matchningar som behöver review
- Behåll möjlighet till manuell override för edge cases

## Nästa Steg

1. ✅ Analys klar - systemet kan automatiskt generera bpmn-map.json
2. ⏳ Skapa script för automatisk generering (påbörjat)
3. ⏳ Testa scriptet med dina BPMN-filer
4. ⏳ Verifiera att genererad map fungerar korrekt
5. ⏳ Integrera i workflow (valfritt)
