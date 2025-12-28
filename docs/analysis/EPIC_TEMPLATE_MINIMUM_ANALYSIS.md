# Analys: Epic Mallar - Minimum och Reellt Värde

**Datum:** 2025-12-28

## Översikt

Analys av vad Epic-mallarna innehåller nu och vad som ger reellt värde för service tasks och user tasks.

---

## Nuvarande Innehåll i Epic-Mallar

### 1. Header & Metadata (Alltid visas)
```html
<section class="doc-section">
  <span class="doc-badge">Epic</span>
  <h1>${ctx.nodeName}</h1>
  <p class="muted">${node.type} i ${ctx.processStep} mellan ${ctx.upstreamName} → ${ctx.downstreamName}.</p>
  <ul>
    <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
    <li><strong>Kreditprocess-steg:</strong> ${ctx.processStep}</li>
    <li><strong>Swimlane/ägare:</strong> ${ctx.swimlaneOwner}</li>
  </ul>
</section>
```

**Värde:** ✅ **HÖGT** - Ger kontext och position i processen

---

### 2. Sammanfattning (Visas alltid, men kan vara tom)
```html
<section class="doc-section" data-source-summary="${summarySource}">
  <h2>Sammanfattning</h2>
  <p>${summaryText}</p>
</section>
```

**Värde:** ✅ **HÖGT** - Kortfattad beskrivning av vad epiken gör

**Status:** Visas alltid, även om tom (visar "missing" badge)

---

### 3. Förutsättningar (Visas alltid, men kan vara tom)
```html
<section class="doc-section" data-source-prerequisites="${prerequisitesSource}">
  <h2>Förutsättningar</h2>
  ${renderList(prerequisites)}
</section>
```

**Värde:** ⚠️ **MEDEL** - Kan vara generiskt, men viktigt för att förstå när epiken kan köras

**Status:** Visas alltid, även om tom (visar "missing" badge)

---

### 4. Funktionellt flöde (Visas alltid, har fallback)
```html
<section class="doc-section" data-source-flow="${flowStepsSource}">
  <h2>Funktionellt flöde</h2>
  <ol>
    ${flowSteps.map((step) => `<li>${step}</li>`).join('')}
  </ol>
</section>
```

**Fallback-innehåll:**
- **User Tasks:** 4 generiska steg om kundinteraktion
- **Service Tasks (Data Gathering):** 4 generiska steg om datahämtning
- **Service Tasks (Evaluation):** 4 generiska steg om bedömning
- **Service Tasks (Decision):** 4 generiska steg om beslut
- **Service Tasks (Övriga):** 4 generiska steg om exekvering

**Värde:** ⚠️ **MEDEL-HÖGT** - Viktigt för att förstå flödet, men fallback är generisk

**Problem:** Fallback-innehåll är mycket generiskt och ger lite värde

---

### 5. Interaktioner (Endast för User Tasks, eller om LLM genererat)
```html
${interactions && interactions.length > 0 && interactionsSource !== 'missing' ? `
<section class="doc-section" data-source-interactions="${interactionsSource}">
  <h2>Interaktioner</h2>
  ${renderList(interactions)}
</section>
` : ''}
```

**Fallback-innehåll (User Tasks):**
- "Kanal: web/app eller internt handläggargränssnitt beroende på roll."
- "UI ska vara förklarande, med tydlig koppling till kreditbeslut och nästa steg."
- "Felmeddelanden ska vara begripliga och vägleda till rätt åtgärd."

**Värde:** ✅ **HÖGT för User Tasks** - Viktigt för att förstå användarinteraktion
**Värde:** ❌ **LÅGT för Service Tasks** - Visas inte (korrekt)

**Problem:** Fallback-innehåll är generiskt

---

### 6. Beroenden (Visas alltid, har fallback)
```html
<section class="doc-section" data-source-dependencies="${dependenciesSource}">
  <h2>Beroenden</h2>
  ${renderList(dependencies)}
</section>
```

**Fallback-innehåll:**
- **Data Gathering:** 2 generiska punkter om externa datakällor
- **Evaluation/Decision:** 2 generiska punkter om kreditregler
- **Övriga:** 2 generiska punkter om kreditmotor

**Värde:** ⚠️ **MEDEL** - Viktigt för att förstå tekniska beroenden, men fallback är generisk

**Problem:** Fallback-innehåll är generiskt och kan vara felaktigt för specifika epiker

---

### 7. User Stories (Endast om LLM genererat)
```html
${userStories.length > 0 ? `
<section class="doc-section" data-source-user-stories="${userStoriesSource}">
  <h2>User Stories</h2>
  <p class="muted">User stories med acceptanskriterier som ska mappas till automatiska tester.</p>
  ${userStories.map((story) => `...`).join('')}
</section>
` : ''}
```

**Värde:** ✅ **HÖGT** - Viktigt för att förstå användarbehov och testbarhet

**Status:** Visas endast om LLM genererat (korrekt)

---

## Analys: Vad Ger Reellt Värde?

### ✅ HÖGT VÄRDE (Behåll)

1. **Header & Metadata**
   - Ger kontext och position i processen
   - Visar BPMN-element, process-steg, swimlane
   - **Behåll:** ✅

2. **Sammanfattning**
   - Kortfattad beskrivning av vad epiken gör
   - **Behåll:** ✅ (men kräv LLM-genererat innehåll)

3. **Funktionellt flöde**
   - Viktigt för att förstå flödet
   - **Behåll:** ✅ (men ta bort fallback-innehåll - kräv LLM-genererat)

4. **Interaktioner (User Tasks)**
   - Viktigt för att förstå användarinteraktion
   - **Behåll:** ✅ (men ta bort fallback-innehåll - kräv LLM-genererat)

5. **User Stories**
   - Viktigt för att förstå användarbehov och testbarhet
   - **Behåll:** ✅ (redan kräver LLM-genererat)

---

### ⚠️ MEDEL VÄRDE (Överväg att förenkla)

1. **Förutsättningar**
   - Kan vara generiskt, men viktigt för att förstå när epiken kan köras
   - **Rekommendation:** Behåll, men kräv LLM-genererat innehåll (ta bort om tom)

2. **Beroenden**
   - Viktigt för att förstå tekniska beroenden, men fallback är generisk
   - **Rekommendation:** Behåll, men ta bort fallback-innehåll - kräv LLM-genererat eller ta bort sektionen om tom

---

### ❌ LÅGT VÄRDE (Överväg att ta bort)

1. **Fallback-innehåll i Funktionellt flöde**
   - Generiskt och ger lite värde
   - **Rekommendation:** Ta bort - visa sektionen endast om LLM genererat

2. **Fallback-innehåll i Interaktioner**
   - Generiskt och ger lite värde
   - **Rekommendation:** Ta bort - redan korrekt (visas endast om LLM genererat)

3. **Fallback-innehåll i Beroenden**
   - Generiskt och kan vara felaktigt
   - **Rekommendation:** Ta bort - visa sektionen endast om LLM genererat

---

## Rekommenderad Minimum-Mall

### För Service Tasks och User Tasks:

1. **Header & Metadata** ✅ (Alltid)
   - BPMN-element, process-steg, swimlane

2. **Sammanfattning** ✅ (Kräv LLM-genererat)
   - Visas endast om LLM genererat innehåll

3. **Funktionellt flöde** ✅ (Kräv LLM-genererat)
   - Visas endast om LLM genererat innehåll
   - Ta bort alla fallback-innehåll

4. **Interaktioner** ✅ (Endast User Tasks, kräv LLM-genererat)
   - Visas endast för User Tasks om LLM genererat innehåll
   - Ta bort fallback-innehåll

5. **Beroenden** ⚠️ (Kräv LLM-genererat eller ta bort)
   - Visas endast om LLM genererat innehåll
   - Ta bort alla fallback-innehåll

6. **Förutsättningar** ⚠️ (Kräv LLM-genererat eller ta bort)
   - Visas endast om LLM genererat innehåll
   - Ta bort om tom

7. **User Stories** ✅ (Kräv LLM-genererat)
   - Visas endast om LLM genererat innehåll
   - Redan korrekt

---

## Implementeringsplan

### Steg 1: Ta bort fallback-innehåll
- Ta bort fallback-innehåll i "Funktionellt flöde"
- Ta bort fallback-innehåll i "Interaktioner"
- Ta bort fallback-innehåll i "Beroenden"

### Steg 2: Visa sektioner endast om innehåll finns
- "Funktionellt flöde": Visa endast om `model.flowSteps.length > 0`
- "Interaktioner": Redan korrekt (visas endast om finns)
- "Beroenden": Visa endast om `model.dependencies.length > 0`
- "Förutsättningar": Visa endast om `model.prerequisites.length > 0`

### Steg 3: Kräv LLM-genererat innehåll
- Alla sektioner (utom Header) kräver LLM-genererat innehåll
- Om ingen LLM-genererat innehåll finns, visa endast Header

---

## Förväntat Resultat

### Före:
- 7 sektioner (varav 3-4 med generiskt fallback-innehåll)
- Mycket generiskt innehåll som ger lite värde

### Efter:
- 1-4 sektioner (beroende på LLM-genererat innehåll)
- Endast faktiskt värdefullt innehåll
- Tydligare signal om vad som saknas (tomma sektioner visas inte)

---

## Slutsats

**Minimum-mall för Epic:**
- ✅ Header & Metadata (alltid)
- ✅ Sammanfattning (endast om LLM-genererat)
- ✅ Funktionellt flöde (endast om LLM-genererat)
- ✅ Interaktioner (endast User Tasks, endast om LLM-genererat)
- ⚠️ Beroenden (endast om LLM-genererat, eller ta bort)
- ⚠️ Förutsättningar (endast om LLM-genererat, eller ta bort)
- ✅ User Stories (endast om LLM-genererat)

**Totalt:** 1-4 sektioner (beroende på LLM-genererat innehåll) istället för 7 sektioner med generiskt innehåll.

