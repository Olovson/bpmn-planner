# Svar: Per-Node Konfiguration

## 1. Varifrån hämtar vi listan över alla BPMN-noder?

**Svar: ProcessTree + STACC_INTEGRATION_MAPPING + integration_overrides**

**Implementation:**
- **ProcessTree** (via `useProcessTree` hook) ger oss alla timeline-noder rekursivt
- **STACC_INTEGRATION_MAPPING** ger oss metadata (beskrivning, integrationSource) för service tasks
- **integration_overrides** (via `IntegrationContext`) ger oss vilka som är bank-implementerade

**Funktion att skapa:**
```typescript
function extractAllTimelineNodes(node: ProcessTreeNode): ProcessTreeNode[] {
  const result: ProcessTreeNode[] = [];
  
  if (isTimelineNode(node)) {
    result.push(node);
  }
  
  node.children.forEach(child => {
    result.push(...extractAllTimelineNodes(child));
  });
  
  return result;
}
```

---

## 2. Ska ALLA BPMN-noder visas eller bara vissa typer?

**Svar: Alla timeline-noder, men markera tydligt typ**

**Timeline-noder (enligt `isTimelineNode`):**
- `callActivity` - Subprocesser/Feature Goals
- `userTask` - Användaruppgifter  
- `serviceTask` - Service Tasks (integrationer)
- `businessRuleTask` - Business Rule Tasks

**UI:**
- Visa alla timeline-noder
- Badge för typ
- Markera vilka som är bank-implementerade (via integration_overrides)
- Alla kan konfigureras, men endast bank-implementerade behöver extra arbetsmoment i timeline

---

## 3. Ska default-värdena finnas som mall?

**Svar: Ja, med bulk-apply funktionalitet**

**UI-knappar:**
- "📋 Applicera default-värden på alla bank-integrationer"
- "📋 Applicera default-värden på alla noder"
- "📋 Applicera default-värden på valda noder" (checkboxar per rad)

**Default-värden:**
- Analys: 2 veckor
- Implementering: 4 veckor
- Testing: 2 veckor
- Validering: 1 vecka

---

## 4. Behöver vi koppla till integration_overrides?

**Svar: Ja, för att markera bank-implementerade noder**

**Logik:**
- **Bank-implementerad** (avcheckad på integrationssidan): Visa alla 4 inputs, markera med badge
- **Stacc-integration** (ikryssad): Visa inputs men disable eller dölj (de behöver inte extra arbetsmoment)
- **Andra noder** (userTask, callActivity): Visa inputs, markera att de bara används om noden blir bank-implementerad

**UI-indikering:**
- Badge: "🏦 Bank-implementerad" / "🔌 Stacc" / "📋 Ej integration"
- Färgkodning: Grön för bank, Blå för Stacc, Grå för andra

---

## Ny datastruktur

```typescript
interface PerNodeWorkItems {
  bpmnFile: string;
  elementId: string;
  analysisWeeks?: number;      // Optional, fallback to global default
  implementationWeeks?: number; // Optional, fallback to global default
  testingWeeks?: number;       // Optional, fallback to global default
  validationWeeks?: number;    // Optional, fallback to global default
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

