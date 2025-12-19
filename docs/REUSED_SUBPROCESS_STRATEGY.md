# Strategi: Återkommande Noder med Instans-Specifik Dokumentation

## Problem

När samma nod (subprocess, task, epic) används flera gånger i en process (t.ex. "KYC-verifiering" anropas 3 gånger, eller "Validera inkomst" används både vid ansökan och vid re-verifiering), kan varje användning ha olika anledningar och kontext:

- **Första gången**: Initial verifiering när kunden ansöker
- **Andra gången**: Re-verifiering efter 6 månader
- **Tredje gången**: Extra verifiering för stora belopp

Varje anrop kan ha:
- Olika user stories/scenarios
- Olika kontext (tidpunkt, belopp, kundtyp)
- Olika förväntade utfall

## Lösning

### Dokumentation: Per Instans för Återkommande Noder

**Dokumentation** (Feature Goals, Epics, Business Rules) genereras **PER INSTANS** för återkommande noder:
- Varje anrop kan ha olika kontext och anledning
- Instans-specifika fält: `summary`, `flowSteps`, `epics`, `scenarios`, `testDescription`
- Generella fält (samma för alla instanser): `scopeIncluded`, `scopeExcluded`, `dependencies`, `relatedItems`

**Anledning:**
- **summary**: Kan vara annorlunda baserat på varför subprocessen anropas (t.ex. "Initial verifiering" vs "Re-verifiering")
- **flowSteps**: Kan vara annorlunda baserat på kontext (t.ex. olika steg för initial vs re-verifiering)
- **epics**: Kan vara annorlunda om olika epics används i olika kontexter
- **scenarios**: Definitivt annorlunda - olika anledningar = olika user stories/scenarios
- **testDescription**: Kan vara annorlunda baserat på kontext

**Första gången noden genereras:**
- Dokumentation sparas i `generatedChildDocs` med key baserat på nodtyp:
  - Subprocesser: `subprocess:${subprocessFile}`
  - Tasks/Epics: `node.id`
- Används som referens i parent node prompts (för att förstå vad noden gör)
- Men varje instans får sin egen dokumentation baserat på kontext

### Testscenarion: Per Instans

**Testscenarion** genereras **PER INSTANS** (varje gång subprocessen anropas):
- Varje anrop kan ha olika kontext
- User stories kan vara annorlunda baserat på varför subprocessen anropas
- Sparas med `origin: 'llm-spec'` (instans-specifik)

**Anledning:**
- Testscenarion beskriver **hur** subprocessen används i specifik kontext
- Olika anledningar = olika scenarion
- Exempel: "Initial verifiering" vs "Re-verifiering" har olika user stories

## Implementation

### 1. Dokumentationsgenerering

```typescript
// För callActivities, använd subprocessFile som key
const docKey = node.type === 'callActivity' && node.subprocessFile
  ? `subprocess:${node.subprocessFile}` // Unik per subprocess-fil
  : `${node.bpmnFile}::${node.bpmnElementId}`; // Unik per instans för tasks

if (processedDocNodes.has(docKey)) {
  // Dokumentation redan genererad - återanvänd
  const existingDoc = generatedChildDocs.get(docKey);
  if (existingDoc) {
    // Använd redan genererad dokumentation
    // Men fortsätt för att generera testscenarion per instans
  }
}
```

### 2. Testscenarion-Generering

```typescript
// För återkommande subprocesser: hoppa över docJson.scenarios
// och generera alltid nya per instans
const shouldGenerateInstanceSpecificScenarios = 
  skipDocGeneration && node.type === 'callActivity' && node.subprocessFile;

if (shouldGenerateInstanceSpecificScenarios) {
  // Generera instans-specifika scenarion baserat på kontexten
  const generated = await generateTestSpecWithLlm(
    node.element,
    llmProvider,
    localAvailable,
  );
  
  // Spara med origin 'llm-spec' (instans-specifik)
  await supabase.from('node_planned_scenarios').upsert({
    bpmn_file: node.bpmnFile,
    bpmn_element_id: node.bpmnElementId,
    provider: scenarioProvider,
    origin: 'llm-spec', // Markera som instans-specifik
    scenarios: generated.map(...),
  });
}
```

## Exempel

### Scenario: "KYC-verifiering" anropas 3 gånger

**Dokumentation:**
- Genereras 3 gånger (en per instans) med instans-specifika fält:
  - **Instans 1 (Initial verifiering):**
    - `summary`: "KYC-verifiering utförs första gången när kunden ansöker om lån..."
    - `flowSteps`: ["Kunden ansöker om lån", "System initierar KYC-verifiering", ...]
    - `scenarios`: ["Initial verifiering vid ansökan", ...]
  - **Instans 2 (Re-verifiering):**
    - `summary`: "KYC-verifiering utförs igen efter 6 månader för att säkerställa att kundens information fortfarande är korrekt..."
    - `flowSteps`: ["System identifierar att 6 månader har passerat", "System initierar re-verifiering", ...]
    - `scenarios`: ["Re-verifiering efter 6 månader", ...]
  - **Instans 3 (Extra verifiering):**
    - `summary`: "KYC-verifiering utförs extra för stora belopp för att säkerställa compliance..."
    - `flowSteps`: ["System identifierar stort belopp", "System initierar extra verifiering", ...]
    - `scenarios`: ["Extra verifiering för stora belopp", ...]
- Generella fält (samma för alla instanser): `scopeIncluded`, `scopeExcluded`, `dependencies`, `relatedItems`
- Första gången sparas i `generatedChildDocs` med key `subprocess:kyc-verification.bpmn` (för parent node prompts)

**Testscenarion:**
- Genereras 3 gånger (en per instans)
- Varje instans får kontext-specifika scenarion:
  - Instans 1: "Initial verifiering vid ansökan"
  - Instans 2: "Re-verifiering efter 6 månader"
  - Instans 3: "Extra verifiering för stora belopp"
- Sparas med `origin: 'llm-spec'` (instans-specifik)

## Resultat

✅ **Korrekt**: Dokumentation reflekterar faktisk användning per instans
✅ **Kontext-specifik**: Summary, flowSteps, epics, scenarios, testDescription är instans-specifika
✅ **Logiskt**: Olika anledningar = olika user stories/scenarios och dokumentation
✅ **Robust**: Hanterar både nästade och återkommande subprocesser
✅ **Effektivt**: Första gången sparas för parent node prompts, men varje instans får sin egen dokumentation

## Databasstruktur

### `node_planned_scenarios` tabell

- `bpmn_file`: Fil där callActivity är definierad (t.ex. "application.bpmn")
- `bpmn_element_id`: CallActivity element ID (t.ex. "kyc-verification-1", "kyc-verification-2")
- `provider`: 'cloud' | 'local-fallback' | 'ollama'
- `origin`: 
  - `'llm-doc'`: Genererad från dokumentation (första gången subprocessen genereras)
  - `'llm-spec'`: Genererad per instans (för återkommande subprocesser)
  - `'design'`: Manuellt skapad
- `scenarios`: Array av testscenarion

**Exempel:**
```json
{
  "bpmn_file": "application.bpmn",
  "bpmn_element_id": "kyc-verification-1",
  "provider": "cloud",
  "origin": "llm-spec",
  "scenarios": [
    {
      "id": "kyc-initial",
      "name": "Initial verifiering vid ansökan",
      "description": "Kunden ansöker om lån och KYC-verifiering körs första gången",
      "status": "pending",
      "category": "happy-path"
    }
  ]
}
```

## Fördelar

1. **Korrekt dokumentation**: Feature Goals beskriver vad subprocessen gör (samma för alla)
2. **Kontext-specifika scenarion**: Testscenarion reflekterar faktisk användning per instans
3. **Effektivitet**: Dokumentation genereras en gång, testscenarion per instans
4. **Flexibilitet**: Olika anledningar = olika user stories/scenarios

