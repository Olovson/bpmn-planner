# Jira Namngivning - Konsolideringsplan

## Nuvarande Status

### ✅ Konsoliderat (Använder `buildJiraName`)

1. **`src/pages/BpmnFileManager.tsx`** (rad ~2015)
   - Använder `buildJiraName(node, tree, parentPath)`
   - Genererar Jira-mappningar vid hierarkibyggnad

2. **`src/hooks/useAllBpmnNodes.ts`** (rad ~150)
   - Använder `buildJiraName(node, processTree, parentPathWithoutRoot)`
   - Genererar fallback-namn när ingen mapping finns i databasen

3. **`supabase/functions/generate-artifacts/index.ts`** (rad ~265-280)
   - Använder `buildJiraName` från `_shared/jiraNaming.ts`
   - Deno-kompatibel version av namngivningslogiken
   - Uppdaterad att använda den nya namngivningsschemat

4. **`src/lib/bpmnHierarchy.ts`** (rad ~170, 192, 210, 228)
   - Använder `buildJiraName` via `computeJiraNames()`-funktion
   - Konverterar `BpmnHierarchyNode` till `ProcessTreeNode` för kompatibilitet
   - Uppdaterad att använda den nya namngivningsschemat

### ℹ️ Separata Användningsfall (Behöver Inte Konsolideras)

1. **`src/lib/llmDocumentation.ts`** - `buildJiraNameFromTrail()`
   - Syfte: Bygger namn för LLM-kontext, inte faktiska Jira-mappningar
   - Kan behållas separat

2. **`src/lib/bpmnGenerators.ts`** (rad ~160)
   - Sätter bara `jiraName: node.name` som placeholder
   - Använder inte faktisk namngivningslogik

## Konsolidering Genomförd ✅

### Implementerade Ändringar

#### 1. Skapad Deno-kompatibel version för Edge Function
- **Fil**: `supabase/functions/_shared/jiraNaming.ts`
- **Innehåll**: Portad version av `buildJiraName`-logiken som fungerar med `HierarchyNode`-strukturen
- **Funktioner**: `buildJiraName`, `buildFeatureGoalJiraName`, `findTopLevelSubprocess`, etc.

#### 2. Uppdaterad Edge Function
- **Fil**: `supabase/functions/generate-artifacts/index.ts`
- **Ändringar**:
  - Importerar `buildJiraName` från `_shared/jiraNaming.ts`
  - Ersatt `pathParts.join(' - ')` med `buildJiraName(...)`
  - Lagt till `findNodeById`-hjälpfunktion för att hitta noder i hierarkin
  - Använder nu den nya namngivningsschemat för både feature goals och epics

#### 3. Uppdaterad `bpmnHierarchy.ts`
- **Fil**: `src/lib/bpmnHierarchy.ts`
- **Ändringar**:
  - Importerar `buildJiraName` från `jiraNaming.ts`
  - Skapad `computeJiraNames()`-funktion som konverterar `BpmnHierarchyNode` till `ProcessTreeNode`-format
  - Uppdaterad `buildBpmnHierarchy()` att anropa `computeJiraNames()` efter hierarkin byggts
  - Alla noder får nu Jira-namn enligt den nya schemat

### Resultat

**Alla platser där Jira-namn genereras använder nu samma logik:**
1. ✅ Client-side hierarkibyggnad (`BpmnFileManager.tsx`)
2. ✅ Fallback-namn (`useAllBpmnNodes.ts`)
3. ✅ Edge Function artefaktgenerering (`generate-artifacts/index.ts`)
4. ✅ Legacy hierarchy builder (`bpmnHierarchy.ts`)

**Konsekvens garanterad:**
- Samma subprocess får samma Jira-namn oavsett var den genereras
- Feature goals använder top-level subprocess-logik
- Epics använder path-baserad namngivning (exkluderar root)
- Root-processnamn ingår aldrig i Jira-namn

## Testning

Efter konsolidering, verifiera:

1. **Konsistens**: Edge Function och client-side genererar samma namn för samma noder
2. **Feature goals**: Top-level subprocesser får rätt format
3. **Epics**: Path-baserad namngivning fungerar korrekt
4. **Root exclusion**: Root-processnamn ingår aldrig

## Dokumentation

Uppdatera:
- `JIRA_NAMING_UPDATE_SUMMARY.md` med konsolideringsstatus
- Kommentarer i kod som förklarar var Jira-namn genereras
- README om den nya namngivningsmodellen

