# Analys: Given/When/Then i Test Coverage Tabell

## Nuvarande struktur

### Data-struktur
- **ProcessTreeNode**: Hierarkisk struktur med noder (process, callActivity, userTask, etc.)
- **E2eScenario**: Har `subprocessSteps[]` där varje steg har:
  - `callActivityId`: Matchar mot `ProcessTreeNode.bpmnElementId`
  - `given`, `when`, `then`: Test-information för den subprocessen
  - `scenario.id`: Vilket scenario (E2E_BR001, E2E_BR006)

### Matchning
- En callActivity (t.ex. "application") kan ha flera scenarier
- Varje scenario har sin egen given/when/then för samma callActivity
- Exempel:
  - `E2E_BR001.subprocessSteps[0]` → `callActivityId: 'application'` → `given/when/then`
  - `E2E_BR006.subprocessSteps[0]` → `callActivityId: 'application'` → `given/when/then` (kan vara annorlunda)

---

## Alternativ 1: Nuvarande tabell-struktur (rader = noder)

### Layout
```
┌──────┬──────────────┬──────┬──────────────┬──────────────┬──────────────────────────────────────┐
│ Nivå │ Nodnamn      │ Typ  │ BPMN-fil     │ Element-ID   │ Test Information                      │
├──────┼──────────────┼──────┼──────────────┼──────────────┼──────────────────────────────────────┤
│ 0    │ mortgage     │ ...  │ ...          │ -            │ -                                     │
│ 1    │ Application  │ ...  │ ...          │ application  │ [E2E_BR001] [E2E_BR006]                │
│      │              │      │              │              │ ▼ E2E_BR001: Given/When/Then...      │
│      │              │      │              │              │ ▼ E2E_BR006: Given/When/Then...        │
└──────┴──────────────┴──────┴──────────────┴──────────────┴──────────────────────────────────────┘
```

### Fördelar
- ✅ Behåller hierarkin (nivå, indentering)
- ✅ Tydlig koppling mellan nod och test-information
- ✅ Enkelt att se vilka noder som har coverage
- ✅ Expandera/kollapsa fungerar naturligt

### Nackdelar
- ❌ Långa rader när många scenarier täcker samma nod
- ❌ Given/When/Then kan bli svårt att läsa i smal kolumn
- ❌ Svårt att jämföra scenarier för samma subprocess (de är i samma cell)

---

## Alternativ 2: Transponerad struktur (rader = scenario+subprocess)

### Layout
```
┌──────────────┬──────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Scenario     │ Subprocess           │ Given                                 │ When                                 │ Then                                 │
├──────────────┼──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ E2E_BR001    │ Application          │ En person ansöker om bolån...       │ Kunden navigerar till...             │ Ansökan är komplett...               │
│ E2E_BR001    │ Mortgage Commitment  │ Ansökan är klar för...                │ Automatic Credit Evaluation...       │ Processen avslutas normalt...        │
│ E2E_BR001    │ Object Valuation     │ Objekt är bostadsrätt...            │ Object type gateway...               │ Värdering sparas...                  │
│ E2E_BR006    │ Application          │ Två personer ansöker om bolån...     │ Kunden navigerar till...             │ Ansökan är komplett...               │
│ E2E_BR006    │ Mortgage Commitment  │ Ansökan är klar för...              │ Automatic Credit Evaluation...       │ Processen avslutas normalt...        │
│ ...          │ ...                  │ ...                                  │ ...                                  │ ...                                  │
└──────────────┴──────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### Fördelar
- ✅ Mycket översiktlig - ser alla scenarier för alla subprocesser på en gång
- ✅ Lätt att jämföra scenarier för samma subprocess (de är på olika rader)
- ✅ Given/When/Then får hela kolumner - mycket läsbart
- ✅ Enkel struktur - ingen hierarki att navigera

### Nackdelar
- ❌ Förlorar hierarkin (nivå, indentering, parent-child relationer)
- ❌ Svårt att se vilka noder som INTE har coverage
- ❌ Ingen visuell koppling till Process Explorer-strukturen
- ❌ Kan bli många rader (antal scenarier × antal subprocesser)

---

## Alternativ 3: Hybrid - Grupperad tabell

### Layout
```
┌──────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┐
│ Subprocess           │ E2E_BR001                            │ E2E_BR006                            │ ...                                 │
├──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Application          │ Given: En person ansöker...          │ Given: Två personer ansöker...       │ ...                                 │
│                      │ When: Kunden navigerar...            │ When: Kunden navigerar...            │                                     │
│                      │ Then: Ansökan är komplett...         │ Then: Ansökan är komplett...         │                                     │
├──────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┤
│ Mortgage Commitment  │ Given: Ansökan är klar...            │ Given: Ansökan är klar...            │ ...                                 │
│                      │ When: Automatic Credit...            │ When: Automatic Credit...            │                                     │
│                      │ Then: Processen avslutas...          │ Then: Processen avslutas...          │                                     │
└──────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┘
```

### Fördelar
- ✅ Mycket översiktlig - ser alla scenarier för en subprocess i samma rad
- ✅ Lätt att jämföra scenarier (de är i kolumner bredvid varandra)
- ✅ Given/When/Then får bra plats
- ✅ Grupperad per subprocess - lätt att hitta

### Nackdelar
- ❌ Förlorar hierarkin
- ❌ Kan bli bred med många scenarier
- ❌ Svårt att se vilka noder som INTE har coverage

---

## Rekommendation

### För Test Coverage-sidan: **Alternativ 2 (Transponerad)**

**Anledning:**
1. **Fokus på test-scenarier**: Sidan är specifikt för test coverage, inte process-struktur
2. **Översiktlighet**: Testledare vill se alla scenarier och deras Given/When/Then på en gång
3. **Jämförelse**: Lätt att jämföra scenarier för samma subprocess (de är på olika rader)
4. **Läsbarhet**: Given/When/Then får hela kolumner - mycket lättare att läsa

### Implementation

**Tabell-struktur:**
- **Rader**: Kombination av `scenario.id` + `subprocessStep.callActivityId`
- **Kolumner**: 
  - Scenario (E2E_BR001, E2E_BR006)
  - Subprocess (Application, Mortgage Commitment, etc.)
  - Given
  - When
  - Then
  - Order (körordning i scenariot)

**Data-hämtning:**
```typescript
// För varje scenario
for (const scenario of scenarios) {
  // För varje subprocessStep
  for (const subprocessStep of scenario.subprocessSteps) {
    // Skapa rad: scenario.id + subprocessStep.callActivityId
    rows.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      subprocessId: subprocessStep.callActivityId,
      subprocessName: subprocessStep.description,
      order: subprocessStep.order,
      given: subprocessStep.given,
      when: subprocessStep.when,
      then: subprocessStep.then,
    });
  }
}
```

**Sortering:**
- Primär: `order` (körordning)
- Sekundär: `scenarioId` (E2E_BR001, E2E_BR006)
- Alternativ: Gruppera per subprocess, sedan sortera på scenario

**Filter:**
- Filtrera på scenario (visa bara E2E_BR001)
- Filtrera på subprocess (visa bara Application)
- Sök i Given/When/Then

---

## Jämförelse: Nuvarande vs Transponerad

| Aspekt | Nuvarande (rader = noder) | Transponerad (rader = scenario+subprocess) |
|--------|---------------------------|-------------------------------------------|
| **Hierarki** | ✅ Behålls | ❌ Förloras |
| **Översiktlighet** | ❌ Svårt att se alla scenarier | ✅ Mycket översiktlig |
| **Jämförelse** | ❌ Svårt att jämföra scenarier | ✅ Lätt att jämföra |
| **Läsbarhet** | ❌ Given/When/Then i smal kolumn | ✅ Given/When/Then i hela kolumner |
| **Coverage-visning** | ✅ Tydlig (badges per nod) | ❌ Måste räkna rader |
| **Process-struktur** | ✅ Tydlig | ❌ Förloras |

---

## Slutsats

**För Test Coverage-sidan**: Använd **transponerad struktur** (Alternativ 2)

**Anledning:**
- Sidan är specifikt för test coverage, inte process-struktur
- Testledare vill se alla scenarier och deras Given/When/Then översiktligt
- Process-strukturen finns redan i Process Explorer - vi behöver inte duplicera den här

**Implementation:**
- Skapa en ny tabell-komponent `TestCoverageTransposedTable`
- Rader = scenario + subprocess kombinationer
- Kolumner = Scenario, Subprocess, Order, Given, When, Then
- Sortera på order, gruppera per subprocess
- Lägg till filter för scenario och subprocess

