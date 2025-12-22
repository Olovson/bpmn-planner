# bpmn-map.json vs BPMN-filanalys

**Datum:** 2025-12-22

## Kort svar

**Vi analyserar BPMN-filerna direkt** för att bestämma vad som ska genereras. `bpmn-map.json` används **inte** för att bestämma vad som genereras, utan bara för **matchning** och **identifiering**.

## Detaljerad förklaring

### Vad bestämmer vad som genereras?

**1. `graphFileScope`** (vilka filer som analyseras):
```typescript
const graphFileScope = useHierarchy && existingBpmnFiles.length > 0 
  ? existingBpmnFiles  // Alla filer i hierarkin
  : [bpmnFileName];    // Bara vald fil
```

**2. `analyzedFiles`** (vilka filer som får dokumentation genererad):
```typescript
const analyzedFiles = isRootFileGeneration
  ? graphFileScope  // Alla filer i hierarkin
  : [bpmnFileName]; // Bara vald fil
```

**3. `nodesToGenerate`** (vilka noder som genereras):
- Filtreras baserat på `analyzedFiles` (vilka filer som ska genereras)
- Alla tasks och callActivities i dessa filer genereras
- **Inte** baserat på `bpmn-map.json`

### Vad används bpmn-map.json för?

**1. Matchning av callActivities:**
- `matchCallActivityUsingMap()` används för att matcha callActivities till subprocess-filer
- Om matchning finns i `bpmn-map.json`, används den (hög konfidens)
- Om ingen matchning finns, används automatisk matchning

**2. Identifiering av root-process:**
- `orchestration.root_process` används för att identifiera root-filen
- Används för att avgöra om en fil är root-process eller subprocess

**3. Fallback om bpmn-map.json saknas:**
- Om `bpmn-map.json` inte kan laddas, används automatisk matchning
- Systemet fungerar fortfarande, men med lägre konfidens för matchningar

### Exempel

**Scenario:** Generera dokumentation för `mortgage.bpmn` med hierarki

1. **`graphFileScope`** = alla filer i `existingBpmnFiles` (t.ex. 21 filer)
2. **`buildBpmnProcessGraph()`** parsar alla 21 BPMN-filer direkt
3. **`getTestableNodes()`** hämtar alla tasks och callActivities från grafen
4. **`nodesToGenerate`** filtreras baserat på `analyzedFiles` (alla 21 filer)
5. **`bpmn-map.json`** används bara för att matcha callActivities till subprocess-filer

**Resultat:**
- Alla tasks i alla 21 filer genererar Epics (72 st)
- Alla callActivities i alla 21 filer genererar Feature Goals (54 st)
- `bpmn-map.json` används bara för att veta vilken subprocess-fil varje callActivity pekar på

### Skillnaden

| Aspekt | bpmn-map.json | BPMN-filanalys |
|--------|---------------|----------------|
| **Vad genereras?** | ❌ Används INTE | ✅ Bestämmer allt |
| **Matchning** | ✅ Används för callActivity → subprocess | ❌ Används INTE |
| **Root-process** | ✅ Identifierar root | ❌ Används INTE |
| **Fallback** | ⚠️ Om saknas, används automatisk matchning | ✅ Alltid används |

### Slutsats

**Systemet är BPMN-filbaserat, inte bpmn-map-baserat:**
- Alla noder som finns i BPMN-filerna genereras
- `bpmn-map.json` är bara en hjälpfil för matchning och identifiering
- Om `bpmn-map.json` saknas eller är ofullständig, fungerar systemet fortfarande (med automatisk matchning)
