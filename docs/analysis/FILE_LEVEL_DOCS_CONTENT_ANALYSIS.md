# Analys: File-level Documentation Innehåll och Visning

## Vad innehåller file-level documentation?

File-level documentation (`{fileBaseName}.html`) innehåller:

### 1. HTML-struktur
- En kombinerad HTML-sida med alla noders dokumentation (Feature Goals, Epics, Business Rules)
- Varje nod visas som en sektion med full HTML-innehåll

### 2. JSON-data (embeddat i HTML)
**Location:** `<script type="application/json">` tag i HTML

**Struktur:**
```json
{
  "summary": "Kombinerad sammanfattning av alla noder i filen",
  "flowSteps": [
    "Node 1: Flow step 1",
    "Node 2: Flow step 2",
    ...
  ],
  "userStories": [
    {
      "id": "US-1",
      "role": "Handläggare",
      "goal": "...",
      "value": "...",
      "acceptanceCriteria": [...]
    },
    ...
  ],
  "dependencies": [
    "Input: ...",
    "Output: ...",
    ...
  ]
}
```

### 3. Hur data samlas
- **summary**: Kombineras från alla noders summaries
- **flowSteps**: Samlas från alla noder med node-kontext (t.ex. "Fetch party information: Systemet hämtar data...")
- **userStories**: Samlas från Epic-dokumentationen (alla user stories från alla epics)
- **dependencies**: Samlas från alla noders inputs/outputs (deduplicerade)

### 4. Användning
- **E2E-scenariogenerering**: E2E-generatorn läser JSON-data från file-level docs för att generera testscenarier
- **Används INTE för användaren**: File-level docs är inte tänkta att visas direkt för användaren

---

## Visas file-level docs i node-matrix?

**Nej**, file-level docs visas INTE i node-matrix.

**Kod-location:** `src/hooks/useAllBpmnNodes.ts`, rad 374-375:
```typescript
// VIKTIGT: Process-noder (file-level documentation) ska INTE visas i node-matrix
// File-level documentation är bara för E2E-scenarier och ger inget värde för användaren
```

**Anledning:**
- File-level docs är tekniskt innehåll för E2E-generering
- Användaren ska se Process Feature Goals istället (för subprocess-filer)
- File-level docs skulle bara förvirra användaren

---

## Bör file-level docs visas i node-matrix?

### Argument FÖR att visa:
- ✅ Användaren kan se vad som faktiskt används för E2E-generering
- ✅ Transparens om vad som finns i systemet
- ✅ Debugging: Användaren kan kontrollera om JSON-data är korrekt

### Argument MOT att visa:
- ❌ File-level docs är tekniskt innehåll, inte användarvänligt
- ❌ Innehåller kombinerad data från alla noder (kan vara rörigt)
- ❌ Användaren ska se Process Feature Goals istället (renare, bättre struktur)
- ❌ Skulle skapa förvirring (vad är skillnaden mellan file-level docs och Process Feature Goal?)

### Rekommendation:
**Visa INTE** file-level docs i node-matrix, men **lägg till en länk** om användaren vill se det (t.ex. i en "Teknisk information"-sektion eller som en alternativ länk).

---

## Förslag: Lägg till länk till file-level docs

### Alternativ 1: I Process Feature Goal-sidan
Lägg till en länk i Process Feature Goal-dokumentationen:
```html
<section class="doc-section">
  <h2>Teknisk information</h2>
  <p class="muted">File-level documentation (används för E2E-scenariogenerering):</p>
  <a href="#/doc-viewer/{fileBaseName}">Visa file-level documentation</a>
</section>
```

### Alternativ 2: I NodeMatrix (som alternativ länk)
Lägg till en sekundär länk för Process Feature Goal-noder:
```html
<a href="...">Visa docs</a> (Process Feature Goal)
<a href="...">File-level docs</a> (för E2E-generering)
```

### Alternativ 3: I en separat "Teknisk information"-kolumn
Lägg till en kolumn i NodeMatrix för tekniska länkar (file-level docs, JSON-data, etc.)

---

## Exempel på file-level documentation innehåll

### För `mortgage-se-internal-data-gathering.bpmn`:

**HTML-struktur:**
```html
<h1>Dokumentation - mortgage-se-internal-data-gathering.bpmn</h1>

<div class="node-section">
  <span class="node-type">Epic</span>
  <h2>Fetch party information</h2>
  <!-- Full Epic HTML content -->
</div>

<div class="node-section">
  <span class="node-type">Epic</span>
  <h2>Pre-screen party</h2>
  <!-- Full Epic HTML content -->
</div>

<div class="node-section">
  <span class="node-type">Epic</span>
  <h2>Fetch engagements</h2>
  <!-- Full Epic HTML content -->
</div>

<script type="application/json">
{
  "summary": "Intern datainsamling säkerställer att intern kunddata hämtas...\n\nFetch party information: Systemet hämtar partsinformation...",
  "flowSteps": [
    "Fetch party information: Systemet hämtar partsinformation från Internal systems",
    "Pre-screen party: Systemet utför pre-screening av kunden",
    "Fetch engagements: Systemet hämtar kundens befintliga engagemang från Core System"
  ],
  "userStories": [
    {
      "id": "US-1",
      "role": "Handläggare",
      "goal": "Få komplett partsinformation automatiskt",
      "value": "Spara tid genom att inte behöva söka fram partsdata manuellt",
      "acceptanceCriteria": [...]
    },
    ...
  ],
  "dependencies": [
    "Input: Personnummer eller kundnummer",
    "Output: Partsinformation",
    "Input: Grundläggande uppgifter",
    "Output: Pre-screening resultat",
    ...
  ]
}
</script>
```

---

## Sammanfattning

1. **File-level docs innehåller:**
   - HTML med alla noders dokumentation
   - JSON-data (summary, flowSteps, userStories, dependencies) embeddat i HTML

2. **Visas i node-matrix:**
   - Nej, file-level docs visas INTE i node-matrix
   - Process Feature Goals visas istället (för subprocess-filer)

3. **Bör det visas?**
   - Rekommendation: Lägg till en länk som alternativ (t.ex. "File-level docs (för E2E-generering)") om användaren vill se tekniskt innehåll


