# BPMN File Diff Strategy

## Översikt

När BPMN-filer uppdateras vill vi:
1. **Identifiera ändringar** - Se vilka noder som har lagts till, tagits bort eller ändrats
2. **Visa diff-översikt** - En sida där användaren kan se alla ändringar
3. **Selektiv regenerering** - Välja vilka noder som ska regenereras istället för att generera om allt

## Databasstruktur

### `bpmn_file_diffs` tabell

Sparar diff-resultat för varje BPMN-fil:

- `bpmn_file_id` - Referens till `bpmn_files`
- `file_name` - Filnamn för snabb lookup
- `diff_type` - 'added', 'removed', 'modified', 'unchanged'
- `node_key` - Format: "bpmnFile::bpmnElementId" (unik identifierare)
- `node_type` - 'callActivity', 'userTask', 'serviceTask', 'businessRuleTask'
- `node_name` - Nodens namn
- `old_content` - JSONB med tidigare version metadata
- `new_content` - JSONB med ny version metadata
- `diff_details` - JSONB med detaljerade ändringar per fält
- `detected_at` - När diff:en upptäcktes
- `resolved_at` - När användaren markerade som löst/regenererat
- `resolved_by` - Användare som löste

### `bpmn_files` tabell (uppdaterad)

Lägger till:
- `previous_version_content` - TEXT med tidigare BPMN XML
- `previous_version_meta` - JSONB med tidigare parsed metadata
- `last_diff_calculated_at` - När diff senast beräknades

## Diff-beräkning

### Process

1. **Vid uppladdning av BPMN-fil:**
   - Hämta tidigare version från `bpmn_files.previous_version_content` och `previous_version_meta`
   - Parse både gamla och nya versioner
   - Jämför noder baserat på `bpmnFile::bpmnElementId`
   - Identifiera:
     - **Added**: Noder som finns i ny men inte i gammal
     - **Removed**: Noder som finns i gammal men inte i ny
     - **Modified**: Noder som finns i båda men har ändrats
     - **Unchanged**: Noder som är identiska

2. **Spara diff-resultat:**
   - Spara alla ändringar i `bpmn_file_diffs`
   - Markera som `resolved_at = NULL` (olösta)
   - Uppdatera `bpmn_files.previous_version_content` och `previous_version_meta` med nuvarande version

3. **Vid regenerering:**
   - Användaren väljer vilka noder som ska regenereras
   - Markera valda diff:er som `resolved_at = now()`
   - Regenerera endast valda noder

## UI/UX

### BpmnDiffOverviewPage

En ny sida (`/bpmn-diff`) som visar:

1. **Översikt:**
   - Totalt antal ändringar per fil
   - Antal olösta diff:er
   - Antal lösta diff:er

2. **Diff-lista per fil:**
   - Filnamn
   - Lista med ändringar:
     - **Added** (grön badge) - Nya noder
     - **Removed** (röd badge) - Borttagna noder
     - **Modified** (gul badge) - Ändrade noder
   - För varje ändring:
     - Nodnamn och typ
     - Vad som ändrats (diff_details)
     - Checkbox för att välja för regenerering
     - "Regenerera" knapp

3. **Åtgärder:**
   - "Regenerera valda" - Regenerera endast valda noder
   - "Regenerera alla ändringar" - Regenerera alla ändrade/tillagda noder
   - "Markera som löst" - Markera diff:er som lösta utan regenerering

### Integration i BpmnFileManager

Lägg till:
- Badge/indikator på filer som har olösta diff:er
- Snabb länk till diff-översikt
- Varning när man försöker generera om allt när det finns olösta diff:er

## Implementation

### 1. Diff-beräkning (`src/lib/bpmnDiff.ts`)

- `extractNodeSnapshots()` - Extrahera noder från parse result
- `calculateBpmnDiff()` - Jämför gamla vs nya versioner
- `diffResultToDbFormat()` - Konvertera till databasformat

### 2. Edge Function (`supabase/functions/upload-bpmn-file/index.ts`)

Uppdatera för att:
- Hämta tidigare version
- Beräkna diff
- Spara diff-resultat
- Uppdatera previous_version

### 3. UI-sida (`src/pages/BpmnDiffOverviewPage.tsx`)

Ny sida för att visa och hantera diff:er

### 4. Selektiv regenerering

Uppdatera `generateAllFromBpmnWithGraph()` för att acceptera:
- `selectedNodes?: string[]` - Lista med node_keys som ska regenereras
- Om `selectedNodes` anges, hoppa över noder som inte är i listan

## Fördelar

✅ **Effektivitet** - Generera bara det som behövs
✅ **Kontroll** - Användaren väljer vad som ska regenereras
✅ **Transparens** - Tydlig översikt över vad som ändrats
✅ **Sparar tid och kostnad** - Inte generera om allt med Claude



