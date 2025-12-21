# Problem med Hierarkisk Generering: Nästade och Återkommande Subprocesser

## Identifierade Problem

### 1. Återkommande Subprocesser

**Problem:**
- Om samma subprocess används flera gånger i processen (t.ex. "KYC-verifiering" anropas 3 gånger)
- Varje callActivity har sin egen `node.id` (t.ex. "file1:callActivity1", "file1:callActivity2")
- Men de pekar på samma `subprocessFile` (t.ex. "kyc-verification.bpmn")
- Vi genererar dokumentation per `nodeKey = ${node.bpmnFile}::${node.bpmnElementId}`
- Detta betyder att vi genererar dokumentation för varje callActivity-instans, inte för subprocessen själv

**Nuvarande beteende:**
- Dokumentation genereras 3 gånger för samma subprocess (en per instans)
- `processedDocNodes` använder `nodeKey` som är unikt per callActivity, så vi undviker duplicering per instans
- Men problemet är: vi genererar faktiskt dokumentation för callActivity-instansen, inte subprocessen

**Vad vi borde göra:**
- För callActivities: generera dokumentation baserat på `subprocessFile` (om det finns)
- Om `subprocessFile` redan har genererats, återanvänd dokumentationen
- Spara child docs baserat på `subprocessFile` istället för `node.id`

### 2. Nästade Subprocesser

**Problem:**
- Om SubprocessA innehåller SubprocessB, kommer SubprocessB att ha högre depth
- SubprocessB genereras först (bra)
- Men när SubprocessA genereras, kan den ha SubprocessB som child
- Men SubprocessB kan också vara en child till en annan instans av SubprocessA
- Vi behöver se till att vi hämtar child docs baserat på subprocessFile, inte bara node.id

**Nuvarande beteende:**
- Depth-beräkningen fungerar korrekt för nästade subprocesser
- Men child docs sparas per `node.id`, inte per `subprocessFile`
- Om samma subprocess används flera gånger, kan vi missa child docs

### 3. Child Node Dokumentation

**Problem:**
- Vi sparar child docs per `node.id`
- Men om samma subprocess används flera gånger, kommer vi att spara flera kopior
- När vi hämtar child docs för en parent, använder vi `node.children` som pekar på specifika instanser
- Men om samma subprocess används flera gånger, kan vi behöva använda `subprocessFile` som key istället

**Nuvarande beteende:**
- Child docs sparas per `node.id`
- Om "SubprocessA" används 3 gånger, sparas 3 kopior
- Men när vi hämtar child docs, använder vi `child.id` som key
- Detta fungerar, men är ineffektivt

## Lösningsförslag

### Lösning 1: Använd subprocessFile som Key för CallActivities

**För callActivities:**
- Använd `subprocessFile` som key istället för `nodeKey`
- Om `subprocessFile` redan har genererats, återanvänd dokumentationen
- Spara child docs baserat på `subprocessFile` för callActivities

**Implementation:**
```typescript
// För callActivities, använd subprocessFile som key
const docKey = node.type === 'callActivity' && node.subprocessFile
  ? `subprocess:${node.subprocessFile}` // Unik per subprocess-fil
  : `${node.bpmnFile}::${node.bpmnElementId}`; // Unik per instans för tasks

if (processedDocNodes.has(docKey)) {
  // Återanvänd dokumentation
  const existingDoc = generatedChildDocs.get(docKey);
  // ...
}
```

### Lösning 2: Indexera Child Docs per subprocessFile

**För callActivities:**
- Spara child docs baserat på `subprocessFile` istället för `node.id`
- När vi hämtar child docs, använd `subprocessFile` som key

**Implementation:**
```typescript
// Spara child docs per subprocessFile för callActivities
const childDocKey = node.type === 'callActivity' && node.subprocessFile
  ? `subprocess:${node.subprocessFile}`
  : node.id;

generatedChildDocs.set(childDocKey, childDocInfo);

// När vi hämtar child docs för en parent
for (const child of node.children) {
  const childDocKey = child.type === 'callActivity' && child.subprocessFile
    ? `subprocess:${child.subprocessFile}`
    : child.id;
  const childDoc = generatedChildDocs.get(childDocKey);
  if (childDoc) {
    childDocsForNode.set(childDocKey, childDoc);
  }
}
```

### Lösning 3: Hantera Nästade Subprocesser

**För nästade subprocesser:**
- Depth-beräkningen fungerar redan korrekt
- Men vi behöver se till att child docs hämtas baserat på subprocessFile
- Om SubprocessA innehåller SubprocessB, och SubprocessB används flera gånger, ska vi använda samma child docs

## Rekommenderad Implementation

1. **Använd subprocessFile som key för callActivities:**
   - Unik dokumentation per subprocess-fil
   - Återanvänd dokumentation för återkommande subprocesser

2. **Indexera child docs per subprocessFile:**
   - Spara child docs baserat på subprocessFile för callActivities
   - Använd subprocessFile när vi hämtar child docs

3. **Hantera både callActivities och tasks:**
   - CallActivities: använd subprocessFile som key
   - Tasks/epics: använd nodeKey som vanligt (de är alltid unika)

## Exempel

**Scenario:**
- Process A anropar "KYC-verifiering" 3 gånger
- "KYC-verifiering" innehåller "Riskbedömning" (anropas 2 gånger i KYC)

**Med nuvarande implementation:**
- Genererar dokumentation för "KYC-verifiering" 3 gånger (en per callActivity-instans)
- Genererar dokumentation för "Riskbedömning" 2 gånger (en per instans i KYC)
- Sparar child docs 3 gånger för "KYC-verifiering"
- Sparar child docs 2 gånger för "Riskbedömning"

**Med förbättrad implementation:**
- Genererar dokumentation för "KYC-verifiering" 1 gång (baserat på subprocessFile)
- Genererar dokumentation för "Riskbedömning" 1 gång (baserat på subprocessFile)
- Sparar child docs 1 gång för "KYC-verifiering"
- Sparar child docs 1 gång för "Riskbedömning"
- Återanvänder dokumentation för alla instanser








