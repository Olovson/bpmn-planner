# Strategi för Gateway-hantering i E2E-tester

**Datum:** 2025-01-XX  
**Syfte:** Definiera hur gateways hanteras för att skapa realistiska E2E-tester

---

## Problem

BPMN-processer innehåller **gateways** (beslutspunkter) som styr flödet. För att skapa realistiska E2E-tester behöver vi:

1. **Identifiera alla gateways** i processen
2. **Välja rätt väg** baserat på scenario-typ (happy path, error path, etc.)
3. **Dokumentera gateway-beslut** i testscenarionna
4. **Validera att rätt väg följs** i testet

---

## Gateway-typer i BPMN

### 1. Exclusive Gateway (XOR)
- **Beskrivning:** Väljer **en** väg baserat på villkor
- **Exempel:** `is-purchase?` → Yes eller No
- **Användning:** Välj rätt väg baserat på scenario

### 2. Inclusive Gateway (OR)
- **Beskrivning:** Kan ta **flera** vägar baserat på villkor
- **Användning:** Följ alla vägar som uppfyller villkoren

### 3. Parallel Gateway (AND)
- **Beskrivning:** Tar **alla** vägar parallellt
- **Användning:** Följ alla vägar samtidigt

---

## Gateway-beslut för E2E-scenarion

### E2E_BR001: En sökande - Bostadsrätt godkänd automatiskt (Happy Path)

**Gateway-beslut i `mortgage.bpmn`:**

| Gateway ID | Gateway Namn | Beslut för Happy Path | Sequence Flow | Mål |
|------------|--------------|----------------------|---------------|-----|
| `is-purchase` | Is purchase? | **Yes** | `is-purchase-yes` | `mortgage-commitment` |
| `is-automatically-approved` | Automatically approved? | **Yes** | `is-automatically-approved-yes` | `event-automatically-approved` |
| `is-credit-approved` | Credit approved? | **Yes** | `is-credit-approved-yes` | `event-credit-decision-completed` |
| `needs-collateral-registration` | Needs collateral registration? | **No** | `needs-collateral-registration-no` | `Gateway_13v2pnb` |

**Gateway-beslut i subprocesser:**

#### `mortgage-se-mortgage-commitment.bpmn`:
| Gateway ID | Gateway Namn | Beslut för Happy Path | Sequence Flow | Mål |
|------------|--------------|----------------------|---------------|-----|
| `is-mortgage-commitment-approved` | Is mortgage commitment approved? | **Yes** | `is-mortgage-commitment-approved-yes` | `mortgage-commitment-ready` |
| `is-object-evaluated` | Is object evaluated? | **No** (för happy path) | `Flow_02wen6m` | `object-information` |
| `is-object-approved` | Is object approved? | **Yes** | `is-object-approved-yes` | `has-terms-changed` |
| `has-terms-changed` | Has terms changed? | **No** (för happy path) | `has-terms-changed-no` | `won-bidding-round` |

---

## Metod för att identifiera gateway-beslut

### Steg 1: Extrahera gateways från BPMN

```typescript
// Identifiera alla exclusive gateways
const gatewayRegex = /<bpmn:exclusiveGateway id="([^"]+)"[^>]*name="([^"]*)"/g;

// Identifiera alla sequence flows från gateway
const sequenceFlowRegex = /<bpmn:sequenceFlow id="([^"]+)"[^>]*(?:name="([^"]*)")?[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/g;
```

### Steg 2: Mappa gateway till scenario-typ

**Konfiguration per scenario:**

```typescript
const scenarioGatewayDecisions = {
  'E2E_BR001': { // Happy Path - Köp
    'is-purchase': 'Yes',
    'is-automatically-approved': 'Yes',
    'is-credit-approved': 'Yes',
    'needs-collateral-registration': 'No',
    // Subprocesser
    'is-mortgage-commitment-approved': 'Yes',
    'is-object-approved': 'Yes',
    'has-terms-changed': 'No',
  },
  'E2E_005': { // Error Path - Application avvisad
    'is-purchase': 'Yes', // (eller No, beroende på scenario)
    // Application avvisas via boundary event
  },
  // ... fler scenarion
};
```

### Steg 3: Välj rätt sequence flow

```typescript
function selectSequenceFlow(
  gatewayId: string,
  decision: 'Yes' | 'No',
  sequenceFlows: SequenceFlow[]
): SequenceFlow | null {
  // Hitta sequence flows från gateway
  const flowsFromGateway = sequenceFlows.filter(
    sf => sf.sourceRef === gatewayId
  );
  
  // Välj baserat på namn (Yes/No) eller ID-mönster
  const flow = flowsFromGateway.find(sf => {
    const name = sf.name || sf.id;
    if (decision === 'Yes') {
      return name.includes('yes') || name.includes('Yes') || 
             name.toLowerCase().includes('approved') ||
             sf.id.includes('-yes');
    } else {
      return name.includes('no') || name.includes('No') || 
             name.toLowerCase().includes('rejected') ||
             sf.id.includes('-no');
    }
  });
  
  return flow || flowsFromGateway[0]; // Fallback till första
}
```

---

## Implementation i analysscript

### Förbättringar som behövs:

1. **Gateway-identifiering:**
   - Extrahera alla gateways med ID och namn
   - Identifiera alla utgående sequence flows
   - Mappa sequence flow-namn till beslut (Yes/No)

2. **Scenario-baserad vägval:**
   - Definiera gateway-beslut per scenario
   - Välj rätt sequence flow baserat på scenario
   - Följ rätt väg genom processen

3. **Rekursiv gateway-hantering:**
   - Hantera gateways i subprocesser
   - Applicera samma scenario-beslut i subprocesser
   - Dokumentera alla gateway-beslut i testscenariot

---

## Exempel: E2E_BR001 Gateway-flöde

### Root process: mortgage.bpmn

```
Start → application → is-purchase? 
  → [Yes] → mortgage-commitment → object-valuation → credit-evaluation 
  → is-automatically-approved? 
    → [Yes] → kyc → credit-decision 
    → is-credit-approved? 
      → [Yes] → offer → document-generation → signing → disbursement 
      → needs-collateral-registration? 
        → [No] → Done
```

### Subprocess: mortgage-se-mortgage-commitment.bpmn

```
Start → credit-evaluation-1 
  → is-mortgage-commitment-approved? 
    → [Yes] → mortgage-commitment-decision 
    → is-object-evaluated? 
      → [No] → object-information 
      → is-object-approved? 
        → [Yes] → has-terms-changed? 
          → [No] → won-bidding-round → Done
```

---

## Validering

För varje E2E-scenario, verifiera:

- [ ] Alla gateways i huvudflödet har definierade beslut
- [ ] Alla gateways i subprocesser har definierade beslut
- [ ] Rätt sequence flow väljs baserat på scenario-typ
- [ ] Gateway-beslut dokumenteras i testscenariot
- [ ] Testet följer rätt väg genom processen

---

## Nästa steg

1. ✅ Förbättra analysscriptet för att identifiera gateways
2. ⏳ Implementera scenario-baserad vägval
3. ⏳ Testa med E2E_BR001
4. ⏳ Dokumentera alla gateway-beslut i E2eTestsOverviewPage.tsx

