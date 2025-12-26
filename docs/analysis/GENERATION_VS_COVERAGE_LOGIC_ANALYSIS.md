# Analys: Genereringslogik vs. Coverage-räkning

## Datum: 2025-12-26

## 🎯 Syfte

Analysera om det finns logiska diskrepanser mellan:
1. **Coverage-räkning** (hur många noder som förväntas)
2. **Progress-räkning** (hur många noder som faktiskt genereras)
3. **Dokumentationsgenerering** (vilka noder som faktiskt genereras)
4. **Testgenerering** (vilka noder som faktiskt genereras)

---

## 📊 Nuvarande Logik

### 1. Coverage-räkning (`useFileArtifactCoverage.ts`)

**Logik:**
- Räknar **ALLA** relevanta noder direkt från BPMN-filen
- **UserTask/ServiceTask/BusinessRuleTask** → Epics (räknas alltid)
- **CallActivity** → Feature Goals (räknas alltid, oavsett om subprocess-filen finns)

**Exempel för `mortgage-se-object.bpmn`:**
- 2 UserTasks → 2 Epics
- 1 ServiceTask → 1 Epic
- 1 CallActivity "object-information" → 1 Feature Goal
- **Total: 4/4** (räknas alltid, även om subprocess-filen saknas)

---

### 2. Progress-räkning (`bpmnGenerators.ts` - `total:init`)

**Logik (EFTER fix):**
- Räknar **ALLA** relevanta noder direkt från BPMN-filerna (samma som coverage)
- Använder `parseBpmnFile()` för varje fil och räknar:
  - UserTask/ServiceTask/BusinessRuleTask → Epics
  - CallActivity → Feature Goals

**Exempel för `mortgage-se-object.bpmn`:**
- **Total: 4/4** (matchar coverage-räkningen)

**Status:** ✅ **KORREKT** (efter fix)

---

### 3. Dokumentationsgenerering (`bpmnGenerators.ts` - `nodesToGenerate`)

**Logik:**
- Filtrerar `testableNodes` till `nodesToGenerate`
- **För call activities:**
  - ✅ Inkluderas BARA om callActivity-filen är med i `analyzedFiles`
  - ❌ **Hoppas över** om `node.missingDefinition = true` (subprocess-filen saknas)
  - ❌ **Hoppas över** om subprocess-filen inte finns i `existingBpmnFiles`

**Kod (rad 1524-1563):**
```typescript
const nodesToGenerate = testableNodes.filter(node => {
  if (node.type === 'callActivity') {
    // Hoppa över om subprocess-filen saknas
    if (node.missingDefinition) {
      return false; // ❌ Hoppas över
    }
    if (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile)) {
      return false; // ❌ Hoppas över
    }
    return analyzedFiles.includes(node.bpmnFile);
  }
  return analyzedFiles.includes(node.bpmnFile);
});
```

**Exempel för `mortgage-se-object.bpmn`:**
- Om `mortgage-se-object-information.bpmn` **saknas**:
  - 2 UserTasks → 2 Epics (genereras)
  - 1 ServiceTask → 1 Epic (genereras)
  - 1 CallActivity → **HOPPAS ÖVER** (genereras INTE)
  - **Faktiskt genererat: 3 noder** (inte 4)

**Status:** ⚠️ **DISKREPANS** - Genererar färre noder än vad coverage-räkningen förväntar sig

---

### 4. Feature Goal-generering (`bpmnGenerators.ts` - rad 2146-2177)

**Logik:**
- När Feature Goals genereras för call activities:
  - ❌ **Hoppas över** om `node.missingDefinition = true`
  - ❌ **Hoppas över** om `!node.subprocessFile`
  - ❌ **Hoppas över** om subprocess-filen inte finns i `existingBpmnFiles`

**Kod (rad 2173-2177):**
```typescript
if (node.missingDefinition) {
  console.warn(`⚠️ Skipping Feature Goal generation for ${node.bpmnElementId} (subprocess file missing)`);
  continue; // ❌ Hoppas över
}
```

**Status:** ⚠️ **DISKREPANS** - Genererar INTE Feature Goals för call activities där subprocess-filen saknas

---

### 5. Testgenerering (`testGenerators.ts`)

**Logik:**
- Filtrerar bara call activities (rad 91)
- Kontrollerar om dokumentation finns för varje call activity (rad 107-153)
- Om dokumentation saknas, returnerar fel (rad 155-165)

**Kod (rad 85-95):**
```typescript
const graph = await buildBpmnProcessGraphFromParseResults(bpmnFileName, parseResults);
const allTestableNodes = getTestableNodes(graph);
const testableNodes = allTestableNodes.filter(node => node.type === 'callActivity');
```

**Problem:**
- Om subprocess-filen saknas, kommer call activity **INTE** att vara med i grafen
- Därför kommer den **INTE** att vara med i `testableNodes`
- Testgenerering hoppar över den automatiskt

**Status:** ⚠️ **DISKREPANS** - Genererar INTE tester för call activities där subprocess-filen saknas

---

## 🔍 Identifierade Problem

### Problem 1: Call Activities med Saknade Subprocess-filer

**Scenario:**
- `mortgage-se-object.bpmn` har call activity "object-information" som pekar på `mortgage-se-object-information.bpmn`
- `mortgage-se-object-information.bpmn` **saknas** i databasen

**Vad händer:**

| Komponent | Räknar/Genererar | Resultat |
|-----------|------------------|----------|
| **Coverage-räkning** | ✅ Räknar call activity | 4/4 |
| **Progress-räkning** | ✅ Räknar call activity | 4/4 (efter fix) |
| **Dokumentationsgenerering** | ❌ Hoppar över call activity | Genererar 3 noder |
| **Testgenerering** | ❌ Hoppar över call activity | Genererar 0 tester |

**Konsekvens:**
- Coverage visar "4/4" men bara 3 noder genereras
- Användaren ser "4/3 noder" i progress (efter fix: "4/4" men bara 3 genereras)
- Feature Goal för call activity genereras INTE
- Tester för call activity genereras INTE

---

### Problem 2: Inkonsistent Logik

**Fråga:** Ska call activities genereras även om subprocess-filen saknas?

**Nuvarande beteende:**
- **Coverage-räkning:** ✅ Ja (räknar alltid)
- **Progress-räkning:** ✅ Ja (räknar alltid, efter fix)
- **Dokumentationsgenerering:** ❌ Nej (hoppar över)
- **Testgenerering:** ❌ Nej (hoppar över)

**Problemet:**
- Coverage och progress förväntar sig 4 noder
- Men bara 3 noder genereras faktiskt
- Detta leder till förvirring och felaktiga siffror

---

## 💡 Möjliga Lösningar

### Lösning 1: Generera Feature Goals även om Subprocess-filen Saknas

**Fördelar:**
- Matchar coverage-räkningen
- Användaren ser konsekventa siffror
- Feature Goals kan genereras med begränsad information (bara från call activity-definitionen)

**Nackdelar:**
- Feature Goals blir ofullständiga (saknar information om subprocessen)
- Kan vara förvirrande för användaren

**Implementering:**
- Ta bort `missingDefinition`-check i `nodesToGenerate`-filtreringen
- Generera Feature Goals även om subprocess-filen saknas (med begränsad information)

---

### Lösning 2: Uppdatera Coverage-räkning att Matcha Generering

**Fördelar:**
- Matchar faktiskt generering
- Användaren ser korrekta siffror (3/3 istället för 4/4)

**Nackdelar:**
- Coverage-räkningen blir mer komplex (behöver kolla om subprocess-filer finns)
- Användaren ser inte att call activity saknas dokumentation

**Implementering:**
- Uppdatera `useFileArtifactCoverage.ts` att kolla om subprocess-filer finns
- Räknar bara call activities där subprocess-filen finns

---

### Lösning 3: Hybrid Approach - Varningar och Partiell Generering

**Fördelar:**
- Genererar Feature Goals även om subprocess-filen saknas
- Lägger till varningar i dokumentationen
- Matchar coverage-räkningen

**Nackdelar:**
- Mer komplex implementering
- Feature Goals blir ofullständiga

**Implementering:**
- Generera Feature Goals även om subprocess-filen saknas
- Lägg till varning i dokumentationen: "⚠️ Subprocess-filen saknas: {subprocessFile}"
- Använd bara information från call activity-definitionen

---

## 🎯 Rekommendation

**Rekommenderad lösning: Lösning 1 eller 3**

**Anledning:**
- Coverage-räkningen är korrekt - call activities ska räknas i parent-filen
- Användaren förväntar sig att alla noder i filen genereras
- Det är bättre att generera ofullständig dokumentation än att hoppa över noder helt

**Implementering:**
1. Ta bort `missingDefinition`-check i `nodesToGenerate`-filtreringen
2. Generera Feature Goals även om subprocess-filen saknas
3. Lägg till varning i dokumentationen om subprocess-filen saknas
4. Uppdatera testgenerering att hantera saknade subprocess-filer (eller hoppa över tester för dessa)

---

## 📋 Sammanfattning

### Nuvarande Status:

| Komponent | Status | Matchar Coverage? |
|-----------|--------|------------------|
| **Coverage-räkning** | ✅ Korrekt | - |
| **Progress-räkning** | ✅ Korrekt (efter fix) | ✅ Ja |
| **Dokumentationsgenerering** | ⚠️ Hoppar över call activities utan subprocess | ❌ Nej |
| **Testgenerering** | ⚠️ Hoppar över call activities utan subprocess | ❌ Nej |

### Problem:

1. **Diskrepans mellan coverage och generering:**
   - Coverage räknar 4 noder
   - Generering genererar bara 3 noder (om subprocess-filen saknas)

2. **Inkonsistent logik:**
   - Call activities räknas i coverage
   - Men hoppas över i generering om subprocess-filen saknas

3. **Användarupplevelse:**
   - Användaren ser "4/4" i coverage
   - Men bara 3 noder genereras faktiskt
   - Detta kan vara förvirrande

---

**Datum:** 2025-12-26
**Status:** Analys klar - Identifierade diskrepanser mellan coverage-räkning och faktisk generering



