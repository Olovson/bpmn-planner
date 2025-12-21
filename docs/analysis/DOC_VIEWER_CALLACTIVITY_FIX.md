# Fix: DocViewer försöker Feature Goal paths för alla noder

**Datum:** 2025-01-XX  
**Status:** ✅ Fixad

---

## 📊 Problem

När användaren försökte öppna dokumentation för `nodes/mortgage/application` fick de felet:
```
Kunde inte hämta dokumentationen i valt läge eller legacy-läge.
```

**Rotorsak:**
- DocViewer försökte Feature Goal-paths för **alla** node docs, även om det inte var en callActivity
- För `nodes/mortgage/application`:
  - Om "application" inte är en callActivity, hittas inga Feature Goal-filer
  - Standard node doc-paths testas efteråt, men dokumentationen kanske inte finns där heller
  - Resultat: Felmeddelande

---

## ✅ Lösning

### Uppdaterad Logik i DocViewer

**Före:**
- Försökte Feature Goal-paths för alla node docs
- Testade standard node doc-paths efteråt

**Efter:**
1. **Först:** Kontrollera om noden är en callActivity genom att:
   - Bygga BPMN process graph
   - Hämta node context
   - Kontrollera om `node.type === 'callActivity'`
   - Fallback till `bpmn-map.json` om process graph misslyckas

2. **Om callActivity:** Testa Feature Goal-paths
3. **Om INTE callActivity:** Hoppa över Feature Goal-paths och testa standard node doc-paths direkt

### Förbättrad Felhantering

- Bättre felmeddelanden med debug-info
- Loggar vilka paths som testades
- Visar node-typ och annan relevant information

---

## 🔍 Teknisk Detalj

### Ny Variabel: `isCallActivity`

```typescript
let isCallActivity = false;
let nodeContext: ReturnType<typeof buildNodeDocumentationContext> | null = null;

// Kontrollera först om det är en callActivity
if (isNodeDoc && baseName && elementSegment) {
  // Bygg process graph och kontrollera node-typ
  const graph = await buildBpmnProcessGraph(...);
  const nodeId = `${baseName}.bpmn::${elementSegment}`;
  nodeContext = buildNodeDocumentationContext(graph, nodeId);
  
  if (nodeContext?.node.type === 'callActivity') {
    isCallActivity = true;
  }
}

// Bara testa Feature Goal paths om det är en callActivity
if (isNodeDoc && baseName && elementSegment && isCallActivity) {
  // ... Feature Goal paths
}

// Standard node doc paths testas alltid
if (isNodeDoc && baseName) {
  // ... Standard node doc paths
}
```

### Återanvändning av nodeContext

- `nodeContext` sparas från första kontrollen
- Återanvänds när vi behöver `subprocessFile` för Feature Goals
- Undviker onödiga process graph-byggen

---

## ✅ Resultat

När användaren öppnar `nodes/mortgage/application`:

1. **Om "application" är en callActivity:**
   - Kontrollerar att det är en callActivity
   - Testar Feature Goal-paths
   - Om inte hittat, testar standard node doc-paths

2. **Om "application" INTE är en callActivity:**
   - Kontrollerar att det INTE är en callActivity
   - Hoppar över Feature Goal-paths
   - Testar standard node doc-paths direkt
   - Sparar tid och undviker onödiga sökningar

---

## 📝 Exempel

### Före:
- URL: `nodes/mortgage/application`
- DocViewer försöker Feature Goal-paths (även om det inte är en callActivity)
- Hittar inget
- Försöker standard node doc-paths
- Om dokumentationen inte finns → Fel

### Efter:
- URL: `nodes/mortgage/application`
- DocViewer kontrollerar: Är det en callActivity? → Nej
- Hoppar över Feature Goal-paths
- Testar standard node doc-paths direkt
- Om dokumentationen inte finns → Tydligare felmeddelande med debug-info

---

## 🔧 Relaterade Filer

- `src/pages/DocViewer.tsx` - Uppdaterad logik för att kontrollera callActivity innan Feature Goal-paths testas



