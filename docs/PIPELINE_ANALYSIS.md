# Pipeline-analys: Claude vs Lokal v2-generering

## 🔄 Nuvarande Pipeline: Claude-generering

### Steg-för-steg (useLlm = true)

```
1. generateAllFromBpmnWithGraph()
   └─> Bygger process graph från BPMN-filer
   └─> Identifierar testableNodes (callActivity, userTask, serviceTask, businessRuleTask)

2. För varje nod:
   └─> buildNodeDocumentationContext(graph, node.id)
       └─> Skapar NodeDocumentationContext med:
           - node (BPMN-nod info)
           - parentChain, siblingNodes, childNodes
           - descendantNodes
           - element (BPMN element reference)

3. renderDocWithLlmFallback()
   ├─> Om useLlm = true:
   │   └─> generateDocumentationWithLlm()
   │       ├─> buildContextPayload(context, links)
   │       │   └─> Skapar processContext + currentNodeContext (JSON)
   │       ├─> getPromptForDocType(docType)
   │       │   └─> Hämtar system prompt (feature_prompt.md, epic_prompt.md, etc.)
   │       ├─> Skickar till Claude:
   │       │   - systemPrompt: prompt från fil
   │       │   - userPrompt: JSON med processContext + currentNodeContext
   │       │   - responseFormat: JSON schema (structured outputs)
   │       └─> Claude returnerar JSON-struktur
   │
   └─> renderFeatureGoalDoc() / renderEpicDoc() / renderBusinessRuleDoc()
       ├─> buildFeatureGoalDocModelFromContext(context)
       │   └─> Bygger basmodell från BPMN-kontext
       ├─> loadFeatureGoalOverrides(context)
       │   └─> Hämtar per-node overrides från src/data/node-docs/
       ├─> mergeFeatureGoalOverrides(model, overrides)
       │   └─> Applicerar overrides på basmodellen
       ├─> Om llmContent finns:
       │   ├─> mapFeatureGoalLlmToSections(llmContent)
       │   │   └─> Parsar Claude's JSON → FeatureGoalLlmSections
       │   └─> mergeLlmPatch(model, llmModel)
       │       └─> Applicerar Claude's JSON som "patch" på modellen
       ├─> Om templateVersion === 'v2':
       │   ├─> fetchPlannedScenarios(bpmnFile, elementId, preferredProvider)
       │   │   └─> Hämtar testscenarion från node_planned_scenarios (prioriterar 'cloud' om Claude användes)
       │   └─> aggregateE2eTestInfoForFeatureGoal(childNodeIds, bpmnFile)
       │       └─> Hämtar E2E-testinfo (API-anrop, UI-interaktioner, DMN-beslut)
       └─> buildFeatureGoalDocHtmlFromModelV2(context, links, model, plannedScenarios, e2eTestInfo)
           └─> Genererar HTML från modell med v2-template

4. Spara testscenarion i databasen (om Claude genererade dem):
   └─> buildScenariosFromDocJson('feature', docJson)
   └─> supabase.from('node_planned_scenarios').upsert()
       └─> provider: 'cloud', origin: 'llm-doc'
```

---

## 🔄 Nuvarande Pipeline: Lokal v2-generering

### Steg-för-steg (useLlm = false)

```
1. generateAllFromBpmnWithGraph()
   └─> Bygger process graph från BPMN-filer
   └─> Identifierar testableNodes

2. För varje nod:
   └─> buildNodeDocumentationContext(graph, node.id)
       └─> Samma som Claude-generering

3. renderDocWithLlmFallback()
   └─> Om useLlm = false:
       └─> Anropar fallback-funktionen direkt
           └─> renderFeatureGoalDoc(nodeContext, docLinks, undefined, undefined, 'v2')
               ├─> buildFeatureGoalDocModelFromContext(context)
               │   └─> Bygger basmodell från BPMN-kontext
               ├─> loadFeatureGoalOverrides(context)
               │   └─> Hämtar per-node overrides
               ├─> mergeFeatureGoalOverrides(model, overrides)
               │   └─> Applicerar overrides
               ├─> Ingen LLM-patch (llmContent = undefined)
               ├─> Om templateVersion === 'v2':
               │   ├─> fetchPlannedScenarios(bpmnFile, elementId, 'local-fallback')
               │   │   └─> Hämtar testscenarion från databas (prioriterar 'local-fallback')
               │   └─> aggregateE2eTestInfoForFeatureGoal(childNodeIds, bpmnFile)
               │       └─> Hämtar E2E-testinfo
               └─> buildFeatureGoalDocHtmlFromModelV2(context, links, model, plannedScenarios, e2eTestInfo)
                   └─> Genererar HTML från modell med v2-template

4. Sparar INTE nya testscenarion i databasen
```

---

## 📊 Jämförelse: Claude vs Lokal

| Steg | Claude (useLlm = true) | Lokal (useLlm = false) |
|------|----------------------|------------------------|
| **1. Build Context** | ✅ Samma | ✅ Samma |
| **2. Build Base Model** | ✅ Samma | ✅ Samma |
| **3. Apply Overrides** | ✅ Samma | ✅ Samma |
| **4. LLM Generation** | ✅ Claude genererar JSON | ❌ Hoppas över |
| **5. Apply LLM Patch** | ✅ Applicerar Claude's JSON | ❌ Ingen patch |
| **6. Fetch Test Scenarios** | ✅ Prioriterar 'cloud' | ✅ Prioriterar 'local-fallback' |
| **7. Fetch E2E Test Info** | ✅ Samma | ✅ Samma |
| **8. Render HTML** | ✅ Samma v2-template | ✅ Samma v2-template |
| **9. Save Scenarios** | ✅ Sparar i databas | ❌ Sparar inte |

---

## 🔍 Identifierade Förbättringsmöjligheter

### 1. **Dubbel Kontext-byggning** ⚠️

**Problem:**
- `buildContextPayload()` i `generateDocumentationWithLlm()` bygger context från `NodeDocumentationContext`
- `buildFeatureGoalDocModelFromContext()` i `renderFeatureGoalDoc()` bygger också modell från samma `NodeDocumentationContext`
- Detta innebär att vi bygger context två gånger med potentiellt olika logik

**Förbättring:**
- Dela context-byggning mellan LLM och rendering
- Använd samma context-objekt för både LLM och rendering
- Reducera duplicering och säkerställ konsistens

### 2. **LLM Patch Merge-logik** ⚠️

**Problem:**
- `mergeLlmPatch()` applicerar Claude's JSON som "patch" på basmodellen
- Men vad händer om Claude's JSON saknar fält som finns i basmodellen?
- Vad händer om Claude's JSON har fält som inte finns i basmodellen?

**Förbättring:**
- Dokumentera merge-strategin tydligt
- Hantera edge cases (saknade fält, extra fält)
- Validera att merge-resultatet är komplett

### 3. **Testscenarion: Prioritering** ✅

**Nuvarande:**
- Claude: Prioriterar 'cloud' → 'local-fallback' → 'ollama'
- Lokal: Prioriterar 'local-fallback' → 'cloud' → 'ollama'

**Förbättring:**
- Detta fungerar bra, men kan förbättras:
  - Om Claude genererade scenarion, använd dem alltid (inte fallback till 'local-fallback')
  - Om Claude misslyckades, använd 'local-fallback' som fallback

### 4. **E2E Test Info: Hämtas Sent** ⚠️

**Problem:**
- E2E-testinfo hämtas i `renderFeatureGoalDoc()` efter att modellen är byggd
- Detta betyder att Claude inte har tillgång till E2E-testinfo när den genererar dokumentation
- E2E-testinfo används bara för rendering, inte för generering

**Förbättring:**
- Om vi vill att Claude ska använda E2E-testinfo (valfritt steg):
  - Hämta E2E-testinfo tidigare i pipeline
  - Inkludera i `currentNodeContext` när vi skickar till Claude
  - Men detta ökar token-kostnaden och komplexiteten

**Rekommendation:**
- Behåll nuvarande approach (E2E-testinfo hämtas sent)
- Detta är OK eftersom E2E-testinfo är för rendering, inte generering

### 5. **Error Handling** ⚠️

**Problem:**
- Om Claude misslyckas, fallback till lokal generering
- Men vad händer om både Claude och lokal generering misslyckas?
- Vad händer om `fetchPlannedScenarios()` misslyckas?

**Förbättring:**
- Förbättra error handling och logging
- Ge tydliga felmeddelanden när något misslyckas
- Hantera edge cases (t.ex. tomma scenarion, saknade E2E-testinfo)

### 6. **Performance** ⚠️

**Problem:**
- Claude-generering är asynkron och kan ta tid
- Om vi genererar många noder, kan det ta lång tid
- Ingen parallellisering av LLM-anrop

**Förbättring:**
- Överväg parallellisering av LLM-anrop (med rate limiting)
- Caching av LLM-resultat (om samma nod genereras flera gånger)
- Progress reporting för långa genereringar

### 7. **Validering** ⚠️

**Problem:**
- Claude's JSON valideras mot JSON schema (structured outputs)
- Men valideras resultatet efter merge mot modellen?
- Valideras att alla obligatoriska fält finns?

**Förbättring:**
- Lägg till validering efter merge
- Validera att modellen är komplett innan rendering
- Ge tydliga felmeddelanden om validering misslyckas

### 8. **Dokumentation** ⚠️

**Problem:**
- Pipeline är komplex och svår att förstå
- Ingen tydlig dokumentation av merge-strategin
- Ingen dokumentation av edge cases

**Förbättring:**
- Dokumentera pipeline tydligt (denna fil är ett steg)
- Dokumentera merge-strategin
- Dokumentera edge cases och hur de hanteras

---

## ✅ Rekommenderade Förbättringar (Prioriterade)

### Hög prioritet:

1. **Dokumentera merge-strategin**
   - Hur appliceras Claude's JSON på basmodellen?
   - Vad händer med saknade/extra fält?
   - Lägg till tydlig dokumentation i koden

2. **Förbättra error handling**
   - Hantera edge cases (tomma scenarion, saknade E2E-testinfo)
   - Ge tydliga felmeddelanden
   - Logga varningar för icke-kritiska fel

3. **Validera efter merge**
   - Validera att modellen är komplett innan rendering
   - Ge tydliga felmeddelanden om validering misslyckas

### Medel prioritet:

4. **Dela context-byggning**
   - Reducera duplicering mellan LLM och rendering
   - Använd samma context-objekt för både LLM och rendering

5. **Förbättra testscenarion-prioritering**
   - Om Claude genererade scenarion, använd dem alltid
   - Om Claude misslyckades, använd 'local-fallback' som fallback

### Låg prioritet:

6. **Performance-optimering**
   - Överväg parallellisering av LLM-anrop (med rate limiting)
   - Caching av LLM-resultat

7. **E2E Test Info i Claude Context**
   - Om vi vill att Claude ska använda E2E-testinfo (valfritt steg)
   - Men detta ökar token-kostnaden och komplexiteten

---

## 📝 Sammanfattning

**Nuvarande pipeline fungerar bra**, men det finns förbättringsmöjligheter:

1. **Dokumentation**: Pipeline är komplex och behöver bättre dokumentation
2. **Error Handling**: Förbättra hantering av edge cases
3. **Validering**: Validera efter merge för att säkerställa komplett modell
4. **Context-byggning**: Reducera duplicering mellan LLM och rendering

**Största förbättringarna:**
- Tydlig dokumentation av merge-strategin
- Förbättrad error handling och validering
- Reducerad duplicering i context-byggning








