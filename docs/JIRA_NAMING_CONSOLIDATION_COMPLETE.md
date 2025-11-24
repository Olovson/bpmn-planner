# Jira Namngivning - Konsolidering Genomförd ✅

## Sammanfattning

Alla platser där Jira-namn genereras i appen har nu konsoliderats till att använda samma logik via `buildJiraName()`-funktionen.

## Implementerade Ändringar

### 1. Skapad Deno-kompatibel version
**Fil**: `supabase/functions/_shared/jiraNaming.ts`

- Portad version av `buildJiraName`-logiken
- Fungerar med `HierarchyNode`-strukturen som används i Edge Functions
- Samma logik som client-side versionen

### 2. Uppdaterad Edge Function
**Fil**: `supabase/functions/generate-artifacts/index.ts`

**Ändringar**:
- Importerar `buildJiraName` från `_shared/jiraNaming.ts`
- Ersatt gammal `pathParts.join(' - ')`-logik med `buildJiraName(...)`
- Lagt till `findNodeById()` för att hitta noder i hierarkin
- Använder nu den nya namngivningsschemat konsekvent

### 3. Uppdaterad Legacy Hierarchy Builder
**Fil**: `src/lib/bpmnHierarchy.ts`

**Ändringar**:
- Importerar `buildJiraName` från `jiraNaming.ts`
- Skapad `computeJiraNames()`-funktion som:
  - Konverterar `BpmnHierarchyNode` till `ProcessTreeNode`-format
  - Anropar `buildJiraName` för alla noder
  - Uppdaterar `jiraName`-egenskapen på alla noder
- Anropas automatiskt efter hierarkin byggts

## Konsoliderade Platser

### ✅ Alla Använder Nu `buildJiraName`

1. **`src/pages/BpmnFileManager.tsx`**
   - Använder: `buildJiraName(node, tree, parentPath)`
   - Syfte: Genererar Jira-mappningar vid hierarkibyggnad

2. **`src/hooks/useAllBpmnNodes.ts`**
   - Använder: `buildJiraName(node, processTree, parentPathWithoutRoot)`
   - Syfte: Fallback-namn när ingen mapping finns i databasen

3. **`supabase/functions/generate-artifacts/index.ts`**
   - Använder: `buildJiraName(elementNode, rootHierarchy, parentPathWithoutRoot)`
   - Syfte: Genererar Jira-mappningar vid artefaktgenerering i Edge Function

4. **`src/lib/bpmnHierarchy.ts`**
   - Använder: `buildJiraName()` via `computeJiraNames()`
   - Syfte: Bygger Jira-namn för `BpmnHierarchyNode`-strukturen

## Fördelar med Konsolideringen

1. **Konsekvens**: Samma subprocess får alltid samma Jira-namn, oavsett var den genereras
2. **Underhållbarhet**: En enda plats att uppdatera när namngivningsregler ändras
3. **Testbarhet**: Enklare att testa namngivningslogiken när den är centraliserad
4. **Kvalitet**: Mindre risk för buggar och inkonsekvenser

## Namngivningsregler (Enhetliga Överallt)

### Feature Goals (CallActivity)
- Top-level subprocess: `<N.label>`
- Djupare subprocess: `<T.label> – <N.label>` (där T är top-level subprocess)
- Root-processnamn ingår **aldrig**

### Epics (UserTask, ServiceTask, BusinessRuleTask)
- Path-baserad: `<parent1> - <parent2> - ... - <node.label>`
- Root-processnamn exkluderas från pathen

## Separata Användningsfall (Behöver Inte Konsolideras)

1. **`src/lib/llmDocumentation.ts`** - `buildJiraNameFromTrail()`
   - Syfte: Bygger namn för LLM-kontext, inte faktiska Jira-mappningar
   - Status: Kan behållas separat (tydligt dokumenterat)

2. **`src/lib/bpmnGenerators.ts`** - `jiraName: node.name`
   - Syfte: Placeholder, använder inte faktisk namngivningslogik
   - Status: OK som placeholder

## Testning

Efter konsolidering, verifiera:

1. ✅ **Konsistens**: Edge Function och client-side genererar samma namn för samma noder
2. ✅ **Feature goals**: Top-level subprocesser får rätt format
3. ✅ **Epics**: Path-baserad namngivning fungerar korrekt
4. ✅ **Root exclusion**: Root-processnamn ingår aldrig

## Nästa Steg (Valfritt)

1. **Enhetstester**: Lägg till tester för `buildJiraName` och relaterade funktioner
2. **Integrationstester**: Verifiera att alla platser genererar samma namn
3. **Dokumentation**: Uppdatera användardokumentation med exempel på Jira-namn

