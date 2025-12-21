# Testscenarion: Generering från BPMN-filer

## Problem

När nya BPMN-filer importeras, användes tidigare gamla testscenarion från databasen istället för att generera nya från de nya BPMN-filerna. Detta ledde till att scenarion inte reflekterade den aktuella BPMN-strukturen.

## Lösning

### Prioriteringsordning för Testscenarion

1. **LLM-genererade scenarion från dokumentation** (högsta prioritet)
   - Extraheras från Claude-genererad dokumentation (`lastDocJson`)
   - Reflekterar den aktuella BPMN-strukturen

2. **LLM-genererade scenarion via `generateTestSpecWithLlm`**
   - Genereras direkt från BPMN-elementet
   - Används när dokumentation inte innehåller scenarion
   - Reflekterar den aktuella BPMN-strukturen

3. **Gamla scenarion från databasen** (sista fallback)
   - Används endast om LLM-generering misslyckas
   - Varning loggas när gamla scenarion används

### Flöde vid Import av Nya BPMN-filer

```
1. Parse BPMN-filer → skapa process graph
2. För varje nod:
   a. Generera dokumentation med Claude (om useLlm = true)
   b. Extrahera scenarion från dokumentationen
   c. Om inga scenarion → generera via generateTestSpecWithLlm
   d. Om fortfarande inga → använd gamla från databasen (med varning)
3. Spara nya LLM-genererade scenarion i databasen
```

### Vad Sparas i Databasen?

- **LLM-genererade scenarion** (`provider: 'cloud'`, `origin: 'llm-doc'`)
  - Genereras från aktuella BPMN-filer
  - Sparas för framtida användning
  - Kan återanvändas om BPMN-filen inte ändrats

- **Fallback-scenarion** (`provider: 'local-fallback'`, `origin: 'design'`)
  - Skapas automatiskt från grafen
  - Används endast om LLM-generering misslyckas
  - Enkla "happy path"-scenarion

### När Bör Scenarion Regenereras?

Scenarion bör regenereras när:
- ✅ Nya BPMN-filer importeras
- ✅ BPMN-filer ändras (strukturella ändringar)
- ✅ Nya noder läggs till
- ✅ Noder tas bort eller ändras

**Automatisk regenerering:**
- När `generateAllFromBpmnWithGraph` körs med `useLlm = true`
- Nya scenarion genereras alltid från aktuella BPMN-filer
- Gamla scenarion används endast som sista fallback

### Varningar

När gamla scenarion används från databasen, loggas en varning:
```
[bpmnGenerators] Using fallback scenarios from database for {nodeKey} (provider: {provider}). 
Consider regenerating with LLM to get scenarios based on current BPMN structure.
```

Detta indikerar att scenarion inte reflekterar den aktuella BPMN-strukturen och bör regenereras.

---

## Framtida Förbättringar

### Diff-baserad Återanvändning (Spekulativt)

En möjlig framtida förbättring är att göra en diff mellan gamla och nya BPMN-filer för att se vilka scenarion som kan återanvändas:

```typescript
// Pseudokod
function canReuseScenarios(oldBpmn: BpmnFile, newBpmn: BpmnFile, nodeId: string): boolean {
  const oldNode = findNode(oldBpmn, nodeId);
  const newNode = findNode(newBpmn, nodeId);
  
  // Om noden inte ändrats strukturellt, kan scenarion återanvändas
  return (
    oldNode.name === newNode.name &&
    oldNode.type === newNode.type &&
    oldNode.inputs === newNode.inputs &&
    oldNode.outputs === newNode.outputs
  );
}
```

**Men detta är spekulativt** eftersom:
- Små ändringar i BPMN kan ändå påverka testscenarion
- Det är svårt att avgöra vad som är "samma" nod
- LLM-generering är snabb och billig nog att alltid köra

**Rekommendation:** Fortsätt att alltid generera nya scenarion från BPMN-filerna. Det ger bäst kvalitet och säkerställer att scenarion alltid reflekterar aktuell struktur.








