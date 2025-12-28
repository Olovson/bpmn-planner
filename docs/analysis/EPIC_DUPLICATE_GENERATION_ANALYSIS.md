# Analys: Dubbelgenerering av Epics

**Datum:** 2025-12-28

## Översikt

Användaren misstänker att epics kan dubbelgenereras när samma task används i flera filer. Denna analys undersöker:
1. Hur många epics som potentiellt dubbelgenereras
2. Skillnader mellan Service Tasks, User Tasks och Business Rules
3. Om regenerering är nödvändig eller om det är onödig dubbelgenerering

---

## 1. Nuvarande Logik för Dokumentationsgenerering

### Key-format för Dokumentation

**För callActivities:**
```typescript
const docKey = `subprocess:${node.subprocessFile}`; // Unik per subprocess-fil
```

**För tasks/epics:**
```typescript
const docKey = `${node.bpmnFile}::${node.bpmnElementId}`; // Unik per fil + elementId
```

### Dubbelgenereringslogik

**För callActivities:**
- Genereras alltid (instans-specifik Feature Goal)
- Använder `subprocess:${subprocessFile}` som key
- Om samma subprocess anropas från flera parent-filer, genereras Feature Goal per instans

**För tasks/epics:**
- Genereras endast om `alreadyProcessedGlobally` är false
- `alreadyProcessedGlobally = globalProcessedDocNodes.has(docKey)`
- `docKey = ${node.bpmnFile}::${node.bpmnElementId}`

**Konsekvens:**
- Om samma task (samma `bpmnElementId`) används i olika filer → **genereras separat** (olika `docKey`)
- Om samma task används flera gånger i samma fil → **genereras endast en gång** (samma `docKey`)

---

## 2. Scenario: Samma Task i Flera Filer

### Exempel: "Fetch party information" Service Task

**Scenario:**
- `mortgage-se-internal-data-gathering.bpmn` har task "fetch-party-information"
- `mortgage-se-stakeholder.bpmn` har också task "fetch-party-information" (samma `bpmnElementId`)

**Nuvarande Beteende:**
- Fil 1: `docKey = "mortgage-se-internal-data-gathering.bpmn::fetch-party-information"`
- Fil 2: `docKey = "mortgage-se-stakeholder.bpmn::fetch-party-information"`
- **Resultat:** Genereras 2 gånger (olika `docKey`)

**Fråga:** Är detta korrekt eller onödig dubbelgenerering?

---

## 3. Analys per Task-typ

### Service Tasks

**Karakteristik:**
- Automatiserade system-uppgifter
- Kontexten är ofta liknande oavsett var de anropas
- Exempel: "Fetch party information", "Fetch engagements", "Validate data"

**Argument FÖR Dubbelgenerering:**
- ❌ Service Tasks är ofta kontext-oberoende
- ❌ Samma funktionalitet oavsett var de anropas
- ❌ Onödig kostnad att generera samma dokumentation flera gånger

**Argument MOT Dubbelgenerering:**
- ✅ Kan ha olika kontext beroende på parent-process
- ✅ Dependencies kan skilja sig (olika datakällor beroende på kontext)
- ✅ FlowSteps kan vara olika (olika valideringar beroende på kontext)

**Slutsats:** ⚠️ **Troligen onödig dubbelgenerering för Service Tasks**

---

### User Tasks

**Karakteristik:**
- Användarinteraktioner
- Kontexten kan skilja sig betydligt beroende på när/var de anropas
- Exempel: "Confirm application", "Review KYC", "Sign documents"

**Argument FÖR Dubbelgenerering:**
- ✅ Kontexten kan vara helt annorlunda
- ✅ User Stories kan skilja sig (olika roller, olika värde)
- ✅ FlowSteps kan vara olika (olika steg beroende på kontext)
- ✅ Dependencies kan skilja sig (olika föregående processer)

**Argument MOT Dubbelgenerering:**
- ❌ Om tasken är identisk, är dokumentationen också identisk
- ❌ Onödig kostnad om kontexten faktiskt är samma

**Slutsats:** ✅ **Dubbelgenerering kan vara nödvändig för User Tasks**

---

### Business Rule Tasks

**Karakteristik:**
- Beslutslogik (DMN)
- Kontexten kan skilja sig beroende på när/var de anropas
- Exempel: "Pre-screen party", "Credit decision rules"

**Argument FÖR Dubbelgenerering:**
- ✅ Beslutslogik kan vara olika beroende på kontext
- ✅ Inputs/Outputs kan skilja sig
- ✅ Decision Logic kan vara olika (olika regler beroende på kontext)

**Argument MOT Dubbelgenerering:**
- ❌ Om regeln är identisk, är dokumentationen också identisk
- ❌ Onödig kostnad om kontexten faktiskt är samma

**Slutsats:** ⚠️ **Dubbelgenerering kan vara nödvändig för Business Rules, men bör valideras**

---

## 4. Testresultat: Dokumentation för Alla 19 Filer

**Från testet:**
- **Totala Epics:** 63
- **Totala Feature Goals:** 31
- **Totala Combined:** 19

**Fråga:** Hur många av dessa 63 epics är potentiellt dubbelgenererade?

---

## 5. Identifiering av Dubbelgenererade Epics

### Metod för Identifiering

**Kriterier för dubbelgenerering:**
1. Samma `bpmnElementId` i olika filer
2. Samma task-typ (Service Task, User Task, Business Rule Task)
3. Potentiellt samma funktionalitet

**Nuvarande Key-format:**
- `${node.bpmnFile}::${node.bpmnElementId}`
- Om samma `bpmnElementId` finns i flera filer → olika `docKey` → genereras separat

**Problem:**
- Vi kan inte automatiskt identifiera om samma task används i flera filer baserat på `bpmnElementId` ensamt
- BPMN-filer kan ha olika `bpmnElementId` för samma logiska task
- BPMN-filer kan ha samma `bpmnElementId` för olika logiska tasks (om de är i olika namespaces)

---

## 6. Rekommenderad Analys

### Steg 1: Identifiera Potentiellt Dubbelgenererade Epics

**Metod:**
1. Extrahera alla epics från testresultatet
2. Gruppera efter task-namn (inte `bpmnElementId`)
3. Identifiera epics med samma namn i olika filer

**Exempel:**
- `mortgage-se-internal-data-gathering.bpmn::fetch-party-information`
- `mortgage-se-stakeholder.bpmn::fetch-party-information`
- → Potentiellt dubbelgenererad

### Steg 2: Analysera Kontextskillnader

**För varje potentiellt dubbelgenererad epic:**
1. Jämför parent-processer
2. Jämför dependencies
3. Jämför flowSteps
4. Jämför userStories

**Om kontexten är identisk:**
- ❌ Onödig dubbelgenerering
- Rekommendation: Använd samma dokumentation

**Om kontexten skiljer sig:**
- ✅ Dubbelgenerering är nödvändig
- Rekommendation: Behåll separata dokumentationer

---

## 7. Nuvarande Implementering

### Storage-check för Epics

**Kod:**
```typescript
// För tasks/epics: hoppa över om alreadyProcessedGlobally är true
if (node.type !== 'callActivity' && alreadyProcessedGlobally) {
  continue; // Hoppa över tasks/epics som redan processats
}
```

**Beteende:**
- Om samma `docKey` redan finns i `globalProcessedDocNodes` → hoppa över
- Om olika `docKey` (olika filer) → generera separat

**Problem:**
- Samma task i olika filer genereras alltid separat
- Ingen kontroll om dokumentationen faktiskt skiljer sig

---

## 8. Rekommendationer

### Rekommendation 1: Analysera Faktiska Dubbelgenereringar

**Åtgärd:**
1. Kör testet för alla 19 filer
2. Extrahera alla epics med deras filer
3. Identifiera epics med samma namn i olika filer
4. Analysera om kontexten faktiskt skiljer sig

### Rekommendation 2: Förbättra Dubbelgenereringslogik (Optional)

**För Service Tasks:**
- Överväg att använda `bpmnElementId` som key (inte `bpmnFile::bpmnElementId`)
- Om samma Service Task används i flera filer, använd samma dokumentation
- **Risks:** Kontexten kan faktiskt skilja sig

**För User Tasks och Business Rules:**
- Behåll nuvarande logik (generera per fil)
- Kontexten kan skilja sig betydligt

### Rekommendation 3: Lägg till Validering

**Åtgärd:**
- Lägg till varning om samma task används i flera filer
- Logga när dubbelgenerering sker
- Ge användaren möjlighet att välja om regenerering ska ske

---

## 9. Faktiska Dubbelgenereringar (Från Testresultat)

**Testresultat för alla 19 filer:**
- **Totala epics:** 63
- **Unika epic-namn:** 61
- **Potentiella dubbelgenereringar:** 2

### Identifierade Dubbelgenereringar

#### 1. `fetch-credit-information`
- **Filer:** 
  - `mortgage-se-credit-evaluation.bpmn`
  - `mortgage-se-manual-credit-evaluation.bpmn`
- **Analys:** 
  - Båda är Service Tasks (troligen)
  - Olika parent-processer (Credit Evaluation vs Manual Credit Evaluation)
  - **Fråga:** Är kontexten faktiskt olika eller samma funktionalitet?

#### 2. `advanced-underwriting`
- **Filer:**
  - `mortgage-se-manual-credit-evaluation.bpmn`
  - `mortgage-se-offer.bpmn`
- **Analys:**
  - Båda är troligen Service Tasks eller User Tasks
  - Olika parent-processer (Manual Credit Evaluation vs Offer)
  - **Fråga:** Är kontexten faktiskt olika eller samma funktionalitet?

### Slutsats

**Potentiella dubbelgenereringar: 2 av 63 epics (3.2%)**

Detta är relativt lågt, men bör analyseras närmare för att avgöra om:
1. Kontexten faktiskt skiljer sig (dependencies, flowSteps, userStories)
2. Om dubbelgenerering är nödvändig eller onödig

---

## 10. Nuvarande Beteende

### Key-format för Epics

**`docKey` för epics:**
```typescript
const docKey = `${node.bpmnFile}::${node.bpmnElementId}`;
```

**Filnyckel för epics:**
```typescript
const docFileKey = getNodeDocFileKey(node.bpmnFile, node.bpmnElementId);
// Resultat: `nodes/${bpmnFile}/${elementId}.html`
```

**Konsekvens:**
- Om samma task (samma `bpmnElementId`) används i olika filer → **genereras separat** (olika `docKey` och `docFileKey`)
- Om samma task används flera gånger i samma fil → **genereras endast en gång** (samma `docKey`)

### Dubbelgenereringslogik

**För epics:**
```typescript
const alreadyProcessedGlobally = globalProcessedDocNodes.has(docKey);
if (node.type !== 'callActivity' && alreadyProcessedGlobally) {
  continue; // Hoppa över om redan processad
}
```

**Resultat:**
- Samma task i olika filer → **alltid genereras separat** (olika `docKey`)
- Ingen kontroll om dokumentationen faktiskt skiljer sig

---

## 11. Rekommendationer

### Rekommendation 1: Analysera Faktiska Dubbelgenereringar ✅

**Status:** Klar
- Identifierat 2 potentiella dubbelgenereringar
- `fetch-credit-information` (2 filer)
- `advanced-underwriting` (2 filer)

### Rekommendation 2: Jämför Kontext för Dubbelgenererade Epics

**Åtgärd:**
1. Läsa faktiska BPMN-filer för de 2 dubbelgenererade epics
2. Jämföra:
   - Task-typ (Service Task, User Task, Business Rule Task)
   - Parent-processer
   - Dependencies (föregående processer)
   - FlowSteps (om de skiljer sig)
   - UserStories (om de skiljer sig)

**Förväntat Resultat:**
- Om kontexten är identisk → Onödig dubbelgenerering
- Om kontexten skiljer sig → Dubbelgenerering är nödvändig

### Rekommendation 3: Förbättra Dubbelgenereringslogik (Optional)

**För Service Tasks:**
- Överväg att använda `bpmnElementId` som key (inte `bpmnFile::bpmnElementId`)
- Om samma Service Task används i flera filer, använd samma dokumentation
- **Risks:** Kontexten kan faktiskt skilja sig (olika datakällor, olika valideringar)

**För User Tasks och Business Rules:**
- Behåll nuvarande logik (generera per fil)
- Kontexten kan skilja sig betydligt

### Rekommendation 4: Lägg till Varning

**Åtgärd:**
- Lägg till varning när samma task används i flera filer
- Logga när dubbelgenerering sker
- Ge användaren möjlighet att välja om regenerering ska ske

---

## 12. Nästa Steg

1. ✅ **Kör analys:** Identifiera faktiska dubbelgenereringar från testresultatet
2. **Jämför kontext:** Analysera om kontexten faktiskt skiljer sig för de 2 dubbelgenererade epics
3. **Besluta:** Om dubbelgenerering är nödvändig eller onödig
4. **Implementera:** (Optional) Förbättra logik för Service Tasks om nödvändigt

