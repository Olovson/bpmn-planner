# Test Scenarios för Genereringsordning

## Översikt

Detta dokument beskriver de olika testscenarion som verifierar att dokumentationsgenereringen fungerar korrekt oavsett i vilken ordning användaren genererar dokumentation för olika BPMN-filer.

## Testfiler

**Fil**: `tests/integration/generation-order-scenarios.test.ts`

## Scenarion

### Scenario 1: Subprocess genereras först, sedan parent

**Beskrivning**: När en subprocess genereras först (isolated), och sedan en parent som använder den genereras (med hierarchy), ska systemet:
- Återanvända subprocess-dokumentationen
- Generera parent-dokumentation korrekt
- Inkludera subprocess-dokumentation i parent-resultatet

**Tester**:
1. `should generate subprocess first, then parent, and verify no duplicates`
   - Genererar `mortgage-se-internal-data-gathering.bpmn` först (isolated)
   - Genererar `mortgage-se-application.bpmn` sedan (med hierarchy)
   - Verifierar att all dokumentation finns i parent-resultatet

2. `should verify that subprocess documentation is reused when parent is generated`
   - Verifierar att subprocess-dokumentation återanvänds när parent genereras
   - Kontrollerar att Feature Goals, Epics och Combined docs finns i båda resultaten

### Scenario 2: Parent genereras först, sedan subprocess

**Beskrivning**: När en parent genereras först (med hierarchy), och sedan subprocessen genereras separat (isolated), ska systemet:
- Generera all dokumentation korrekt i parent-resultatet
- Tillåta subprocess att generera sin egen dokumentation separat
- Inte skapa konflikter mellan de två genereringarna

**Tester**:
1. `should generate parent first, then subprocess, and verify all documentation exists`
   - Genererar `mortgage-se-application.bpmn` först (med hierarchy)
   - Genererar `mortgage-se-internal-data-gathering.bpmn` sedan (isolated)
   - Verifierar att båda har korrekt dokumentation

### Scenario 3: Multi-level hierarchy - different generation orders

**Beskrivning**: Testar tre-nivå hierarki (root -> parent -> subprocess) med olika genereringsordningar:
- Bottom-up: subprocess -> parent -> root
- Top-down: root -> parent -> subprocess
- Mixed: parent -> root -> subprocess

**Tester**:
1. `should handle three-level hierarchy: root -> parent -> subprocess`
   - Testar alla tre ordningar
   - Verifierar att all dokumentation genereras korrekt oavsett ordning
   - Använder: `mortgage.bpmn` -> `mortgage-se-application.bpmn` -> `mortgage-se-internal-data-gathering.bpmn`

### Scenario 4: Recurring subprocesses (same subprocess used multiple times)

**Beskrivning**: När samma subprocess används flera gånger i en parent (t.ex. "signing" används både i main flow och advance flow), ska systemet:
- Hantera alla instanser korrekt
- Inte dubbelgenerera dokumentation
- Generera instans-specifik dokumentation när det behövs

**Tester**:
1. `should handle same subprocess used multiple times in parent`
   - Genererar `mortgage.bpmn` som använder `mortgage-se-signing.bpmn` flera gånger
   - Verifierar att Feature Goals, Epics och Combined docs genereras korrekt
   - Kontrollerar att inga dubbletter skapas

### Scenario 5: Verify no duplicate documentation

**Beskrivning**: Verifierar att systemet inte genererar dubbletter av dokumentation när samma subprocess genereras i olika kontexter.

**Tester**:
1. `should not generate duplicate Feature Goals for the same subprocess`
   - Genererar `mortgage-se-application.bpmn` (med hierarchy, inkluderar internal-data-gathering)
   - Genererar `mortgage-se-internal-data-gathering.bpmn` separat (isolated)
   - Verifierar att Feature Goals har olika keys (instans-specifika) men inte dubbletter

### Scenario 6: Verify all required documentation is generated

**Beskrivning**: Verifierar att all nödvändig dokumentation genereras oavsett genereringsordning:
- Feature Goals för alla subprocesser
- Epics för alla tasks
- Combined docs för alla filer

**Tester**:
1. `should generate all Feature Goals, Epics, and Combined docs regardless of order`
   - Genererar `mortgage-se-application.bpmn` med alla subprocesser (med hierarchy)
   - Verifierar att Feature Goals finns för:
     - application (själva processen)
     - internal-data-gathering
     - household
     - stakeholder
     - object
   - Verifierar att Combined docs finns för alla filer
   - Verifierar att Epics finns för alla tasks

## Viktiga Verifieringar

### 1. Ingen dubbelgenerering
- Systemet använder `globalProcessedDocNodes` och `generatedSubprocessFeatureGoals` för att spåra genererad dokumentation
- För callActivities: används `subprocessFile` som key för att undvika dubbletter
- För tasks/epics: används `${bpmnFile}::${bpmnElementId}` som key (unik per instans)

### 2. Dokumentationsåteranvändning
- När en subprocess genereras först, och sedan en parent som använder den:
  - Subprocess-dokumentation återanvänds i parent-resultatet
  - Parent kan referera till subprocess-dokumentation

### 3. Instans-specifik dokumentation
- När samma subprocess används flera gånger:
  - Varje instans kan ha sin egen dokumentation (baserat på kontext)
  - Feature Goals kan ha olika keys (t.ex. med/utan parent-fil i namnet)

### 4. Komplett dokumentation
- Oavsett genereringsordning ska all nödvändig dokumentation genereras:
  - Feature Goals för alla processer/subprocesser
  - Epics för alla tasks
  - Combined docs för alla filer

## Testresultat

Alla 7 tester passerar ✅

**Test Files**: 1 passed (1)
**Tests**: 7 passed (7)

## Framtida Förbättringar

Potentiella scenarion att lägga till:
1. **Nested subprocesses**: Testa när en subprocess innehåller en annan subprocess
2. **Circular dependencies**: Testa hantering av cirkulära beroenden (om de kan uppstå)
3. **Partial regeneration**: Testa när endast vissa noder regenereras (med nodeFilter)
4. **Concurrent generation**: Testa när flera generationer körs samtidigt (om det är relevant)
