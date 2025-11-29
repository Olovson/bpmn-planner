# Analys: Per-Node Konfiguration

## Svar på frågorna

### 1. Varifrån hämtar vi listan över alla BPMN-noder?

**Rekommendation: Kombination av ProcessTree + STACC_INTEGRATION_MAPPING**

**Motivering:**
- **ProcessTree** ger oss alla timeline-noder (callActivity, userTask, serviceTask, businessRuleTask)
- **STACC_INTEGRATION_MAPPING** ger oss alla kända integrationer med beskrivningar
- **integration_overrides** (via IntegrationContext) ger oss vilka som är bank-implementerade

**Implementation:**
```typescript
// 1. Hämta ProcessTree
const { data: processTree } = useProcessTree(rootFile);

// 2. Extrahera alla timeline-noder rekursivt
const allTimelineNodes = extractAllTimelineNodes(processTree);

// 3. Kombinera med STACC_INTEGRATION_MAPPING för beskrivningar
const nodesWithMetadata = allTimelineNodes.map(node => {
  const mapping = STACC_INTEGRATION_MAPPING.find(
    m => m.bpmnFile === node.bpmnFile && m.elementId === node.bpmnElementId
  );
  return {
    ...node,
    description: mapping?.description,
    integrationSource: mapping?.integrationSource,
  };
});

// 4. Kolla integration_overrides för bank-implementerade
const { useStaccIntegration } = useIntegration();
const isBankImplemented = !useStaccIntegration(node.bpmnFile, node.bpmnElementId);
```

---

### 2. Ska ALLA BPMN-noder visas eller bara vissa typer?

**Rekommendation: Visa alla timeline-noder, men markera tydligt vilka som är integrationer**

**Timeline-noder (enligt `isTimelineNode`):**
- `callActivity` - Subprocesser/Feature Goals
- `userTask` - Användaruppgifter
- `serviceTask` - Service Tasks (integrationer)
- `businessRuleTask` - Business Rule Tasks

**UI-förslag:**
- Visa alla timeline-noder
- Markera tydligt typ (badge)
- Endast noder som är bank-implementerade (avcheckade på integrationssidan) behöver konfigurera extra arbetsmoment
- Men låt användaren konfigurera alla om de vill (för framtida användning)

---

### 3. Ska default-värdena finnas som mall?

**Rekommendation: Ja, med bulk-apply funktionalitet**

**UI-förslag:**
```
[📋 Applicera default-värden på alla bank-integrationer]
[📋 Applicera default-värden på alla noder]
[📋 Applicera default-värden på valda noder]
```

**Default-värden:**
- Analys: 2 veckor
- Implementering: 4 veckor
- Testing: 2 veckor
- Validering: 1 vecka

---

### 4. Behöver vi koppla till integration_overrides?

**Rekommendation: Ja, men visa alla noder ändå**

**Logik:**
- **Bank-implementerade** (avcheckade på integrationssidan): Visa alla 4 inputs (analys, impl, test, val)
- **Stacc-integrationer** (ikryssade): Dölj eller disable inputs (de behöver inte extra arbetsmoment)
- **Andra noder** (userTask, callActivity, etc.): Visa inputs men markera att de bara används om noden är bank-implementerad

**UI-indikering:**
- Badge: "Bank-implementerad" / "Stacc" / "Ej integration"
- Färgkodning: Grön för bank, Blå för Stacc, Grå för andra

---

## Ny datastruktur

```typescript
interface PerNodeWorkItems {
  bpmnFile: string;
  elementId: string;
  analysisWeeks?: number;      // Optional, default from global config
  implementationWeeks?: number; // Optional, default from global config
  testingWeeks?: number;        // Optional, default from global config
  validationWeeks?: number;     // Optional, default from global config
}

interface GlobalProjectConfig {
  // ... existing fields ...
  
  // Per-node work items (overrides global defaults)
  perNodeWorkItems: PerNodeWorkItems[];
}
```

**Fallback-logik:**
- Om `perNodeWorkItems` saknas för en nod → använd globala `bankIntegrationWorkItems`
- Om `perNodeWorkItems` finns men ett fält saknas → använd globalt default för det fältet

---

## Implementation-steg

1. ✅ Utöka `GlobalProjectConfig` med `perNodeWorkItems[]`
2. ✅ Skapa ny sektion i ConfigurationPage: "BPMN-aktiviteter & Integrationer"
3. ✅ Hämta alla timeline-noder från ProcessTree
4. ✅ Kombinera med STACC_INTEGRATION_MAPPING och integration_overrides
5. ✅ Visa lista med inputs per nod
6. ✅ Implementera bulk-apply för default-värden
7. ✅ Spara per-node konfiguration i Local Storage

---

## UI-komponenter att skapa

```
src/components/config/PerNodeWorkItemsSection.tsx
src/components/config/NodeWorkItemRow.tsx
src/components/config/BulkApplyDialog.tsx
```

