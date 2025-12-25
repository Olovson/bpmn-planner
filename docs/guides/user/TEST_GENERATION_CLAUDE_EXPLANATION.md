# Claude och Testgenerering - Förtydligande

## ❌ Vi Använder INTE Claude för Testgenerering

**Viktigt:** Testgenerering är **helt deterministisk** och använder **ingen LLM (Claude)**.

---

## 🔄 Hur Det Faktiskt Fungerar

### Claude Används ENDAST för Dokumentationsgenerering

Claude används när du **genererar dokumentation** (Epic, Feature Goal, Business Rule), **INTE** när du genererar test scenarios.

**Flöde:**

```
1. Dokumentationsgenerering (MED Claude)
   ↓
   Claude genererar dokumentation inklusive user stories
   ↓
   Dokumentation sparas i Supabase Storage (HTML)
   
2. Testgenerering (UTAN Claude)
   ↓
   Läser från befintlig dokumentation (HTML)
   ↓
   Parserar HTML för att extrahera user stories
   ↓
   Konverterar till test scenarios (deterministisk logik)
   ↓
   Sparar i databasen
```

---

## 📝 Claude-prompt för Dokumentationsgenerering

När du genererar dokumentation används Claude med denna prompt:

**Fil:** `prompts/llm/feature_epic_prompt.md`

**Vad prompten gör:**
- Ber Claude generera dokumentation för Epic eller Feature Goal
- Inkluderar instruktioner för att generera **user stories** som en del av dokumentationen
- User stories ska följa formatet: "Som [role] vill jag [goal] så att [value]"
- User stories ska ha acceptanskriterier (2-4 per story)

**Relevant del av prompten för user stories:**

```markdown
- **userStories**: Identifiera user stories baserat på vem som drar nytta av Feature Goalet. 
  **VIKTIGT**: Använd ALDRIG "System" som roll - systemet är verktyget, inte användaren. 
  För automatiserade processer (Service Tasks), tänk på vem som drar nytta av automatiseringen. 
  T.ex. om child nodes automatiskt hämtar data, kan en user story vara för "Handläggare" 
  som vill spara tid genom automatisering.
  
**Format för user stories:**
- Varje user story följer mönstret: "Som [role] vill jag [goal] så att [value]"
- Acceptanskriterier ska vara konkreta och testbara
- Varje acceptanskriterium ska börja med "Systemet ska..." eller liknande
```

**Exempel på vad Claude genererar:**

```json
{
  "userStories": [
    {
      "id": "US-1",
      "role": "Kund",
      "goal": "skapa ansökan",
      "value": "jag kan ansöka om lån",
      "acceptanceCriteria": [
        "Systemet ska validera att alla obligatoriska fält är ifyllda",
        "Systemet ska visa tydliga felmeddelanden om fält saknas"
      ]
    }
  ]
}
```

---

## 🔍 Vad Händer i Testgenerering?

### Steg 1: Läsa Dokumentation (ingen Claude)

```typescript
// Läser HTML från Supabase Storage
const html = await supabase.storage.download('docs/claude/epics/...');
```

### Steg 2: Parse HTML (ingen Claude)

```typescript
// Parserar HTML för att hitta user stories
const userStories = parseUserStoriesFromHtml(html);
// Hittar: "Som Kund vill jag skapa ansökan så att jag kan ansöka om lån"
// Extraherar: { role: 'Kund', goal: 'skapa ansökan', value: 'jag kan ansöka om lån' }
```

### Steg 3: Konvertera till Scenarios (ingen Claude)

```typescript
// Deterministic logik - ingen LLM
const scenarios = convertUserStoriesToTestScenarios(userStories);
// Bestämmer kategori baserat på keywords i acceptanskriterier
// Bestämmer prioritering baserat på roll
```

---

## 📊 Jämförelse

| Aspekt | Dokumentationsgenerering | Testgenerering |
|--------|-------------------------|----------------|
| **Använder Claude?** | ✅ Ja | ❌ Nej |
| **När?** | När du genererar dokumentation | När du extraherar test scenarios |
| **Prompt?** | `prompts/llm/feature_epic_prompt.md` | Ingen prompt (deterministisk) |
| **Input?** | BPMN-kontext + processContext | Befintlig HTML-dokumentation |
| **Output?** | JSON med dokumentation + user stories | Test scenarios (JSON) |
| **Var sparas?** | Supabase Storage (HTML) | Supabase Database (JSON) |

---

## 🎯 Sammanfattning

1. **Claude används för dokumentationsgenerering** - genererar dokumentation inklusive user stories
2. **Testgenerering läser från dokumentationen** - ingen Claude-anrop
3. **Ingen prompt för testgenerering** - allt är deterministisk logik
4. **Process flow-scenarios** - genereras helt från BPMN-struktur, ingen Claude

---

## 💡 Varför Ingen Claude i Testgenerering?

### Fördelar:
- **Snabbare** - ingen API-anrop
- **Kostnadsfri** - ingen LLM-kostnad
- **Deterministisk** - samma input ger samma output
- **Pålitlig** - ingen risk för API-fel

### Nackdelar:
- **Begränsad kreativitet** - scenarios är strukturerade
- **Kräver dokumentation** - user story-scenarios kräver att dokumentation finns

---

**Datum:** 2025-12-22
**Status:** Förtydligande - Claude används endast för dokumentationsgenerering



