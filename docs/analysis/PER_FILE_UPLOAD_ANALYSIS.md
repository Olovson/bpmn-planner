# Analys: Lagra per fil vs. batch upload

**Datum:** 2025-12-22  
**Syfte:** Analysera fördelar och nackdelar med att uploada varje fil direkt när den genereras, jämfört med att vänta tills alla filer är klara

---

## 1. Nuvarande System

### Dokumentationsgenerering (Batch Upload)

**Flöde:**
1. Generera alla filer → spara i `result.docs` Map (i minnet)
2. När ALLA filer är genererade → loopa genom `result.docs`
3. Uploada varje fil till Storage

**Kod:**
```typescript
// I bpmnGenerators.ts - generering
result.docs.set(docFileName, docContent); // Sparar i minnet

// I BpmnFileManager.tsx - upload (efter generering)
for (const [docFileName, docContent] of result.docs.entries()) {
  await supabase.storage.from('bpmn-files').upload(docPath, htmlBlob, { upsert: true });
}
```

**Problem:**
- Om genereringen avbryts → alla filer försvinner (fanns bara i minnet)
- Ingen progress-sparning
- Måste starta om från början vid avbrott

### Testgenerering (Per-Fil Upload)

**Flöde:**
1. Generera en testfil
2. Uploada direkt till Storage
3. Generera nästa testfil
4. Uploada direkt till Storage
5. ... (upprepa)

**Kod (testGenerators.ts rad 140-149):**
```typescript
const testContent = generateTestSkeleton(element, llmScenarios);
const testFileKey = getNodeTestFileKey(bpmnFileName, element.id);

// Upload to Supabase Storage IMMEDIATELY
const { error: uploadError } = await supabase.storage
  .from('bpmn-files')
  .upload(testFileKey, testContent, {
    contentType: 'text/plain',
    upsert: true,
  });
```

**Fördelar:**
- ✅ Progress sparas direkt
- ✅ Mindre risk för dataförlust
- ✅ Om genereringen avbryts, redan genererade filer finns kvar

---

## 2. Föreslaget System: Per-Fil Upload för Dokumentation

### Koncept

**Flöde:**
1. Generera en dokumentationsfil
2. Uploada direkt till Storage
3. Generera nästa dokumentationsfil
4. Uploada direkt till Storage
5. ... (upprepa)

**Fördelar:**
- ✅ Progress sparas direkt
- ✅ Mindre risk för dataförlust vid avbrott
- ✅ Möjlighet att resume från avbrott
- ✅ Bättre användarupplevelse
- ✅ Konsistent med testgenerering

**Nackdelar:**
- ⚠️ Fler Storage-anrop (men inte så dyrt)
- ⚠️ Mer komplexitet i koden
- ⚠️ **Hierarkisk generering:** Parent nodes behöver child docs för prompts

---

## 3. Hierarkisk Generering - Det Stora Problemet

### Hur Hierarkisk Generering Fungerar

**Pass 1: Leaf Nodes (Tasks/Epics)**
1. Generera dokumentation för leaf nodes
2. Spara i `generatedChildDocs` Map (i minnet)
3. Används senare för parent node prompts

**Pass 2: Parent Nodes (Feature Goals)**
1. Ladda child docs från `generatedChildDocs` Map
2. Inkludera i parent node prompt
3. Generera parent node dokumentation

**Kod (bpmnGenerators.ts rad 2243-2250):**
```typescript
// Spara child node dokumentation för att använda i parent node prompts
if (docJson) {
  const docInfo = extractDocInfoFromJson(docJson);
  if (docInfo) {
    generatedChildDocs.set(docKey, docInfo); // Sparar i minnet
  }
}
```

### Problem med Per-Fil Upload + Hierarkisk Generering

**Scenario:**
1. Leaf node genereras → uploadas direkt till Storage
2. Leaf node docs sparas i `generatedChildDocs` Map (för parent prompts)
3. Parent node genereras → behöver child docs från `generatedChildDocs`
4. Om parent node genereras senare (t.ex. efter avbrott), finns `generatedChildDocs` inte kvar

**Lösningar:**

#### Lösning 1: Ladda Child Docs från Storage

**Koncept:**
- När parent node genereras, ladda child docs från Storage istället för minnet
- Använd `loadChildDocFromStorage()` (finns redan i koden)

**Fördelar:**
- ✅ Fungerar även efter avbrott
- ✅ Child docs finns i Storage
- ✅ Ingen beroende på minnet

**Nackdelar:**
- ⚠️ Extra Storage-anrop för varje parent node
- ⚠️ Litet mer komplexitet

**Kod (redan finns i bpmnGenerators.ts rad 1224-1317):**
```typescript
async function loadChildDocFromStorage(
  bpmnFile: string,
  elementId: string,
  docFileKey: string,
  versionHash: string | null,
  generationSourceLabel: string
): Promise<{ summary: string; flowSteps: string[]; ... } | null>
```

#### Lösning 2: Hybrid Approach

**Koncept:**
- Under samma genereringssession: använd `generatedChildDocs` Map (minnet)
- Efter avbrott/resume: ladda från Storage

**Fördelar:**
- ✅ Optimalt under normal körning (ingen extra Storage-anrop)
- ✅ Fungerar efter avbrott (laddar från Storage)

**Nackdelar:**
- ⚠️ Mer komplexitet (två sätt att hämta child docs)

---

## 4. Jämförelse: Batch vs. Per-Fil Upload

### Batch Upload (Nuvarande)

**Fördelar:**
- ✅ Enklare kod
- ✅ Färre Storage-anrop (men alla på en gång)
- ✅ Hierarkisk generering fungerar enkelt (child docs i minnet)

**Nackdelar:**
- ❌ Alla filer försvinner vid avbrott
- ❌ Ingen progress-sparning
- ❌ Måste starta om från början
- ❌ Sämre användarupplevelse

### Per-Fil Upload (Föreslaget)

**Fördelar:**
- ✅ Progress sparas direkt
- ✅ Mindre risk för dataförlust
- ✅ Möjlighet att resume från avbrott
- ✅ Bättre användarupplevelse
- ✅ Konsistent med testgenerering

**Nackdelar:**
- ⚠️ Fler Storage-anrop (men inte så dyrt)
- ⚠️ Mer komplexitet
- ⚠️ Hierarkisk generering kräver extra logik (ladda child docs från Storage)

---

## 5. Rekommenderad Lösning

### Hybrid Approach: Per-Fil Upload + Smart Child Doc Loading

**Koncept:**
1. **Leaf nodes:** Uploada direkt när de genereras
2. **Parent nodes:** 
   - Under samma session: använd `generatedChildDocs` Map (minnet)
   - Efter avbrott/resume: ladda child docs från Storage
3. **Progress:** Spara i database eller localStorage

**Implementation:**

```typescript
// I bpmnGenerators.ts - efter varje fil genereras
async function saveDocToStorage(
  docFileName: string,
  docContent: string,
  bpmnFile: string,
  versionHash: string | null
): Promise<void> {
  const { modePath: docPath } = buildDocStoragePaths(
    docFileName,
    effectiveLlmMode ?? null,
    llmProvider,
    bpmnFile,
    versionHash
  );
  
  const htmlBlob = new Blob([docContent], { type: 'text/html; charset=utf-8' });
  const { error: uploadError } = await supabase.storage
    .from('bpmn-files')
    .upload(docPath, htmlBlob, {
      upsert: true,
      contentType: 'text/html; charset=utf-8',
      cacheControl: '3600',
    });
  
  if (uploadError) {
    console.error(`Error uploading ${docFileName}:`, uploadError);
    throw uploadError; // Låt fel propagera uppåt
  }
}

// I generation loop - efter varje fil genereras
const docContent = await renderDocWithLlm(...);
result.docs.set(docFileName, docContent); // Fortfarande i result.docs för UI

// Uploada direkt
await saveDocToStorage(docFileName, docContent, node.bpmnFile, versionHash);
```

**För Parent Nodes:**

```typescript
// Försök ladda child docs från minnet först
let childDocs = generatedChildDocs.get(childDocKey);

// Om inte i minnet, ladda från Storage
if (!childDocs) {
  childDocs = await loadChildDocFromStorage(
    child.bpmnFile,
    child.bpmnElementId,
    childDocFileKey,
    versionHash,
    generationSourceLabel
  );
  
  if (childDocs) {
    // Spara i minnet för framtida användning
    generatedChildDocs.set(childDocKey, childDocs);
  }
}
```

---

## 6. Ytterligare Förbättringar

### Resume-Funktionalitet

**Koncept:**
- Spara genereringsstatus i database
- Track vilka noder som genererats
- Vid resume: hoppa över redan genererade noder

**Implementation:**
```typescript
// Spara status i database
await supabase.from('generation_status').upsert({
  bpmn_file: bpmnFileName,
  node_id: node.id,
  status: 'completed',
  doc_path: docPath,
  generated_at: new Date().toISOString(),
});

// Vid resume: kolla status
const existingStatus = await supabase
  .from('generation_status')
  .select('*')
  .eq('bpmn_file', bpmnFileName)
  .eq('node_id', node.id)
  .single();

if (existingStatus.data && !forceRegenerate) {
  // Hoppa över - redan genererad
  continue;
}
```

### Progress Tracking

**Koncept:**
- Spara progress i database eller localStorage
- Visa progress även efter avbrott
- Möjlighet att resume från avbrott

---

## 7. Potentiella Problem

### Problem 1: Storage Rate Limits

**Problem:**
- Fler Storage-anrop kan potentiellt träffa rate limits
- Men Supabase Storage har generösa rate limits

**Lösning:**
- Implementera retry-logik med exponential backoff
- Batch-uploada om rate limit träffas

### Problem 2: Partial State

**Problem:**
- Om genereringen avbryts, kan vissa filer finnas men inte alla
- Parent nodes kan sakna child docs

**Lösning:**
- Resume-funktionalitet som laddar child docs från Storage
- Validera att alla filer finns innan markera som klar

### Problem 3: Hierarkisk Generering Komplexitet

**Problem:**
- Parent nodes behöver child docs
- Om child docs uploadas direkt, måste parent nodes ladda från Storage

**Lösning:**
- Hybrid approach: använd minnet under samma session, Storage efter avbrott
- `loadChildDocFromStorage()` finns redan i koden

---

## 8. Slutsatser

### Rekommendation: Implementera Per-Fil Upload

**Varför:**
1. ✅ **Mindre risk för dataförlust:** Progress sparas direkt
2. ✅ **Bättre användarupplevelse:** Ingen frustration vid avbrott
3. ✅ **Konsistent med testgenerering:** Samma pattern för alla generationer
4. ✅ **Möjlighet att resume:** Kan återuppta från avbrott

**Implementation:**
1. Uploada varje fil direkt när den genereras
2. För parent nodes: använd hybrid approach (minnet + Storage)
3. Implementera resume-funktionalitet (valfritt men rekommenderat)

**Komplexitet:**
- ⚠️ Litet mer komplexitet, men hanterbar
- ⚠️ `loadChildDocFromStorage()` finns redan
- ⚠️ Testgenerering gör redan detta (kan använda som referens)

**Nackdelar:**
- ⚠️ Fler Storage-anrop (men inte så dyrt)
- ⚠️ Mer komplexitet i koden

**Men fördelarna överväger nackdelarna:**
- Mindre risk för dataförlust
- Bättre användarupplevelse
- Möjlighet att resume från avbrott

---

## 9. Nästa Steg

### Implementation Plan

1. **Steg 1: Implementera Per-Fil Upload**
   - Skapa `saveDocToStorage()` helper function
   - Uploada varje fil direkt när den genereras
   - Behåll `result.docs` för UI (men uploada också)

2. **Steg 2: Smart Child Doc Loading**
   - För parent nodes: använd minnet först, Storage som fallback
   - Använd `loadChildDocFromStorage()` för resume

3. **Steg 3: Resume-Funktionalitet (Valfritt)**
   - Spara genereringsstatus i database
   - Track vilka noder som genererats
   - Hoppa över redan genererade noder vid resume

4. **Steg 4: Testing**
   - Testa normal generering
   - Testa avbrott och resume
   - Testa hierarkisk generering med child docs från Storage

---

## Relaterade dokument

- `STORAGE_UPLOAD_ANALYSIS.md` - Var filerna sparas
- `NETWORK_ERROR_HANDLING_ANALYSIS.md` - Nätverksfel-hantering
