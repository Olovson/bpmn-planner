# Analys: Duplicerade Komponenter i "Ingående komponenter"-sektionen

## Problem

"Ingående komponenter"-sektionen visar duplicerade komponenter:
- **Service Tasks (6)**: "Fetch party information" och "Fetch engagements" visas 3 gånger vardera
- **Business Rules (3)**: "Pre-screen party" visas 3 gånger
- **Call Activities (3)**: "Internal data gathering", "Stakeholder", "Household" (ser korrekt ut - unika)

## Orsak

### Hur `descendantNodes` Samlas

`collectDescendants` i `documentationContext.ts` samlar alla descendant nodes rekursivt:

```typescript
export function collectDescendants(node: BpmnProcessNode): BpmnProcessNode[] {
  const result: BpmnProcessNode[] = [];
  const stack = [...node.children];
  while (stack.length) {
    const current = stack.shift()!;
    result.push(current);
    if (current.children?.length) {
      stack.push(...current.children);
    }
  }
  return result;
}
```

**Problemet:** Om samma subprocess anropas flera gånger (t.ex. "Internal data gathering" anropas från flera olika ställen i `mortgage-se-application.bpmn`), kommer samma noder att finnas flera gånger i `descendantNodes`.

### Exempel: `mortgage-se-application.bpmn`

Om "Internal data gathering" anropas från 3 olika ställen:
1. Varje anrop skapar en egen instans av subprocess-noden
2. Varje instans har sina egna children (fetch-party-information, pre-screen-party, fetch-engagements)
3. `collectDescendants` samlar ALLA dessa instanser
4. Resultat: "Fetch party information" visas 3 gånger (en för varje anrop)

### I `buildFeatureGoalDocHtmlFromModel`

```typescript
const serviceTasks = context.descendantNodes
  .filter(n => n.type === 'serviceTask' && n.bpmnElementId && n.bpmnFile)
  .map(n => { ... })
  .filter((task): task is NonNullable<typeof task> => task !== null);
```

**Problemet:** Ingen deduplicering baserat på `bpmnElementId` och `bpmnFile`. Om samma task finns i flera instanser av samma subprocess, visas den flera gånger.

## Lösning

### Deduplicera baserat på unik nyckel

För tasks/epics: Använd `bpmnFile` + `bpmnElementId` som unik nyckel
För callActivities: Använd `subprocessFile` som unik nyckel (eller `bpmnFile` + `bpmnElementId`)

### Implementering

```typescript
// Deduplicera serviceTasks baserat på bpmnFile + bpmnElementId
const serviceTasksMap = new Map<string, { id: string; name: string; docUrl: string }>();
context.descendantNodes
  .filter(n => n.type === 'serviceTask' && n.bpmnElementId && n.bpmnFile)
  .forEach(n => {
    if (!n.bpmnElementId || !n.bpmnFile) return;
    const uniqueKey = `${n.bpmnFile}::${n.bpmnElementId}`;
    if (!serviceTasksMap.has(uniqueKey)) {
      const docPath = getNodeDocViewerPath(n.bpmnFile, n.bpmnElementId);
      const docUrl = `#/doc-viewer/${encodeURIComponent(docPath)}`;
      serviceTasksMap.set(uniqueKey, {
        id: n.bpmnElementId,
        name: n.name || n.bpmnElementId,
        docUrl,
      });
    }
  });
const serviceTasks = Array.from(serviceTasksMap.values());
```

Samma logik för:
- `userTasks`
- `businessRuleTasks`
- `callActivities` (använd `subprocessFile` som unik nyckel om det finns)

## Förväntat Resultat (Efter Fix)

**Service Tasks (2)**
- Fetch party information (fetch-party-information)
- Fetch engagements (fetch-engagements)

**User Tasks (1)**
- Confirm application (confirm-application)

**Call Activities (3)**
- Internal data gathering (internal-data-gathering)
- Stakeholder (stakeholder)
- Household (household)

**Business Rules (1)**
- Pre-screen party (pre-screen-party)

## Risk

**LÅG RISK** - Deduplicering baserat på `bpmnFile` + `bpmnElementId` är säker eftersom:
- Samma task/epic i samma fil är faktiskt samma komponent
- Det är korrekt att visa den bara en gång
- Ingen information går förlorad (vi visar bara unika komponenter)

