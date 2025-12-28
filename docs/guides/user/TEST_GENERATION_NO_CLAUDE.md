# Testgenerering Använder INTE Claude

## ❌ Vi Använder INTE Claude för Testgenerering

**Viktigt:** Testgenerering är **helt deterministisk** och använder **ingen LLM (Claude)**.

---

## 🔄 Hur Det Faktiskt Fungerar

### 1. User Story-scenarios (från dokumentation)

**Process:**
1. **Läser befintlig dokumentation** från Supabase Storage (HTML-filer)
2. **Parserar HTML** med DOM-parser eller regex för att hitta user stories
3. **Extraherar strukturerad data** (role, goal, value, acceptanceCriteria)
4. **Konverterar till test scenarios** med deterministisk logik
5. **Sparar till databasen**

**Ingen Claude-anrop:**
- Vi läser bara från dokumentation som **redan är genererad av Claude**
- Dokumentationen genereras av Claude när du kör dokumentationsgenerering
- Testgenerering läser bara från den befintliga dokumentationen

**Exempel:**
```typescript
// 1. Läser HTML från Supabase Storage
const html = await supabase.storage.download('docs/claude/epics/...');

// 2. Parserar HTML (ingen Claude)
const userStories = parseUserStoriesFromHtml(html);

// 3. Konverterar till scenarios (ingen Claude)
const scenarios = convertUserStoriesToTestScenarios(userStories);
```

---

### 2. Process Flow-scenarios (från BPMN)

**Process:**
1. **Bygger BPMN-processgraf** från BPMN-filer (deterministisk parsing)
2. **Identifierar paths** från start till end (graf-traversering)
3. **Genererar scenarios** baserat på strukturen (deterministisk logik)
4. **Sparar till databasen**

**Ingen Claude-anrop:**
- Helt baserat på BPMN-struktur
- Ingen LLM behövs - allt är deterministiskt

**Exempel:**
```typescript
// 1. Bygger graf från BPMN (ingen Claude)
const graph = await buildBpmnProcessGraph(bpmnFile, bpmnFiles);

// 2. Genererar scenarios från graf (ingen Claude)
const scenarios = generateProcessFlowTestScenarios(graph, bpmnFile);
```

---

## 🤔 Men Varför "Claude" i Databasen?

I databasen ser du `provider: 'claude'` för user story-scenarios. Detta betyder:

**Inte:** "Detta genererades av Claude just nu"
**Utan:** "Detta kommer från dokumentation som genererades av Claude tidigare"

Det är en **spårbarhetsmarkör**, inte en indikation på att Claude anropas.

---

## 📋 Var Används Claude?

Claude används **endast** för:

### Dokumentationsgenerering (inte testgenerering)

När du genererar dokumentation (Epic, Feature Goal, Business Rule):
1. Claude får en prompt med BPMN-kontext
2. Claude genererar dokumentation inklusive user stories
3. Dokumentationen sparas i Supabase Storage
4. **Senare:** Testgenerering läser från denna dokumentation

**Claude-prompt för dokumentation:**
- Se `prompts/llm/feature_epic_prompt.md`
- Se `src/lib/bpmnGenerators.ts` → `renderDocWithLlm()`

---

## 🔍 Vad Händer i Testgenerering?

### User Story-scenarios:

```typescript
// 1. Läs dokumentation (ingen Claude)
const html = await loadDocFromStorage(bpmnFile, elementId, docType);

// 2. Parse HTML (ingen Claude)
const userStories = parseUserStoriesFromHtml(html);
// Parserar: "Som Kund vill jag X så att Y" → { role: 'Kund', goal: 'X', value: 'Y' }

// 3. Konvertera (ingen Claude)
const scenarios = convertUserStoriesToTestScenarios(userStories);
// Bestämmer kategori baserat på keywords i acceptanskriterier
// Bestämmer prioritering baserat på roll
```

### Process Flow-scenarios:

```typescript
// 1. Bygg graf (ingen Claude)
const graph = await buildBpmnProcessGraph(bpmnFile, bpmnFiles);
// Parsar BPMN XML → bygger graf-struktur

// 2. Hitta paths (ingen Claude)
const paths = findPathsToEnd(rootNode, graph);
// Graf-traversering: start → task1 → task2 → end

// 3. Generera scenarios (ingen Claude)
const scenarios = generateProcessFlowTestScenarios(graph, bpmnFile);
// Skapar scenarios baserat på strukturen
```

---

## 💡 Varför Ingen Claude?

### Fördelar:
1. **Snabbare** - ingen API-anrop, ingen väntetid
2. **Deterministisk** - samma input ger samma output
3. **Kostnadsfri** - ingen LLM-kostnad
4. **Pålitlig** - ingen risk för API-fel eller rate limits
5. **Separerad** - påverkar inte dokumentationsgenerering

### Nackdelar:
1. **Begränsad kreativitet** - scenarios är strukturerade, inte kreativa
2. **Kräver dokumentation** - user story-scenarios kräver att dokumentation finns
3. **Enkel logik** - kategorisering baseras på keywords, inte djup förståelse

---

## 🎯 Sammanfattning

| Aspekt | Dokumentationsgenerering | Testgenerering |
|--------|-------------------------|----------------|
| **Använder Claude?** | ✅ Ja | ❌ Nej |
| **När anropas Claude?** | När du genererar dokumentation | Aldrig |
| **Vad genereras?** | Epic/Feature Goal/Business Rule docs | Test scenarios |
| **Var sparas?** | Supabase Storage (HTML) | Supabase Database (JSON) |
| **Hur fungerar det?** | LLM-generering med prompts | Deterministic parsing & conversion |

---

## 📝 Exempel: Fullständigt Flöde

### Steg 1: Generera Dokumentation (med Claude)
```
Du: Klicka "Generera Dokumentation" för en Epic
System: Anropar Claude med prompt
Claude: Genererar dokumentation inklusive user stories
System: Sparar HTML i Supabase Storage
```

### Steg 2: Generera Test Scenarios (utan Claude)
```
Du: Klicka "Extrahera User Story-scenarios"
System: Läser HTML från Storage (ingen Claude)
System: Parserar HTML för att hitta user stories (ingen Claude)
System: Konverterar till test scenarios (ingen Claude)
System: Sparar i databasen
```

---

**Datum:** 2025-12-22
**Status:** Förtydligande - testgenerering använder inte Claude








