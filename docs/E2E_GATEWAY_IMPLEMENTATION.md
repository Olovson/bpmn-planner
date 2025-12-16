# Gateway-hantering: Implementation och strategi

**Datum:** 2025-01-XX  
**Status:** Strategi definierad, implementation pågår

---

## Sammanfattning

För att skapa **realistiska E2E-tester** behöver vi hantera **gateways** (beslutspunkter) i BPMN-processer korrekt. Varje gateway har flera utgående vägar, och vi måste välja rätt väg baserat på scenario-typ (happy path, error path, etc.).

---

## Hur gateways fungerar i BPMN

### 1. Gateway-struktur

```xml
<bpmn:exclusiveGateway id="is-purchase" name="Is purchase?">
  <bpmn:incoming>Flow_05h03ml</bpmn:incoming>
  <bpmn:outgoing>is-purchase-no</bpmn:outgoing>
  <bpmn:outgoing>is-purchase-yes</bpmn:outgoing>
</bpmn:exclusiveGateway>

<bpmn:sequenceFlow id="is-purchase-yes" name="Yes" 
  sourceRef="is-purchase" targetRef="mortgage-commitment" />
<bpmn:sequenceFlow id="is-purchase-no" name="No" 
  sourceRef="is-purchase" targetRef="Gateway_0m8pi2g" />
```

### 2. Identifiering av gateway-beslut

**Metod:**
1. Extrahera gateway ID och namn från BPMN
2. Identifiera alla utgående sequence flows
3. Mappa sequence flow-namn/ID till beslut (Yes/No)
4. Välj rätt sequence flow baserat på scenario

---

## Gateway-beslut för E2E_BR001 (Happy Path - Köp)

### Root process: mortgage.bpmn

| Gateway ID | Namn | Beslut | Sequence Flow | Mål |
|------------|------|--------|---------------|-----|
| `is-purchase` | Is purchase? | **Yes** | `is-purchase-yes` | `mortgage-commitment` |
| `is-automatically-approved` | Automatically approved? | **Yes** | `is-automatically-approved-yes` | `event-automatically-approved` |
| `is-credit-approved` | Credit approved? | **Yes** | `is-credit-approved-yes` | `event-credit-decision-completed` |
| `needs-collateral-registration` | Needs collateral registration? | **No** | `needs-collateral-registration-no` | `Gateway_13v2pnb` |

### Subprocesser

#### mortgage-se-mortgage-commitment.bpmn
| Gateway ID | Namn | Beslut | Sequence Flow | Mål |
|------------|------|--------|---------------|-----|
| `is-mortgage-commitment-approved` | Is mortgage commitment approved? | **Yes** | `is-mortgage-commitment-approved-yes` | `mortgage-commitment-ready` |
| `is-object-evaluated` | Is object evaluated? | **No** | `Flow_02wen6m` | `object-information` |
| `is-object-approved` | Is object approved? | **Yes** | `is-object-approved-yes` | `has-terms-changed` |
| `has-terms-changed` | Has terms changed? | **No** | `has-terms-changed-no` | `won-bidding-round` |

#### mortgage-se-internal-data-gathering.bpmn
| Gateway ID | Namn | Beslut | Sequence Flow | Mål |
|------------|------|--------|---------------|-----|
| `is-party-rejected` | Party rejected? | **No** | (happy path) | Fortsätt flödet |

#### mortgage-se-object.bpmn
| Gateway ID | Namn | Beslut | Sequence Flow | Mål |
|------------|------|--------|---------------|-----|
| `purposes` | Purposes? | **Yes** | (för köp) | Fortsätt flödet |
| `skip-register-source-of-equity` | Skip step? | **Yes** | (hoppa över) | Fortsätt flödet |

---

## Implementation i analysscript

### Konfiguration

```typescript
const scenarioGatewayDecisions: Record<string, Record<string, 'Yes' | 'No'>> = {
  'E2E_BR001': {
    // Root process
    'is-purchase': 'Yes',
    'is-automatically-approved': 'Yes',
    'is-credit-approved': 'Yes',
    'needs-collateral-registration': 'No',
    // Subprocesser
    'is-mortgage-commitment-approved': 'Yes',
    'is-object-evaluated': 'No',
    'is-object-approved': 'Yes',
    'has-terms-changed': 'No',
    'is-party-rejected': 'No',
    'purposes': 'Yes',
    'skip-register-source-of-equity': 'Yes',
  },
};
```

### Välj rätt sequence flow

```typescript
function selectSequenceFlowFromGateway(
  gatewayId: string,
  scenarioId: string,
  sequenceFlows: SequenceFlow[]
): SequenceFlow | null {
  const decisions = scenarioGatewayDecisions[scenarioId];
  const decision = decisions?.[gatewayId];
  
  if (!decision) return null;
  
  const flowsFromGateway = sequenceFlows.filter(
    sf => sf.sourceRef === gatewayId
  );
  
  // Matcha baserat på namn eller ID-mönster
  return flowsFromGateway.find(sf => {
    const name = (sf.name || sf.id).toLowerCase();
    if (decision === 'Yes') {
      return name.includes('yes') || 
             name.includes('approved') ||
             sf.id.includes('-yes');
    } else {
      return name.includes('no') || 
             name.includes('rejected') ||
             sf.id.includes('-no');
    }
  }) || flowsFromGateway[0];
}
```

---

## Validering

För varje E2E-scenario:

- [ ] Alla gateways i huvudflödet har definierade beslut
- [ ] Alla gateways i subprocesser har definierade beslut
- [ ] Rätt sequence flow väljs baserat på scenario-typ
- [ ] Gateway-beslut dokumenteras i testscenariot
- [ ] Testet följer rätt väg genom processen

---

## Nästa steg

1. ✅ Strategi definierad
2. ✅ Gateway-beslut konfigurerade för E2E_BR001
3. ⏳ Förbättra scriptet för att följa hela flödet korrekt
4. ⏳ Testa med E2E_BR001
5. ⏳ Dokumentera alla gateway-beslut i E2eTestsOverviewPage.tsx

