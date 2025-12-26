# Analys: Ger testscenarios värde utöver user stories?

## 🔍 Nuvarande Situation

### Vad som händer nu

#### 1. User Stories genereras av Claude
- ✅ Claude genererar user stories i JSON-format när Epic-dokumentation genereras
- ✅ User stories sparas i `EpicDocModel.userStories`
- ✅ User stories renderas i HTML-dokumentationen (visas för användare)

#### 2. Scenarios extraheras från user stories
- ✅ `buildScenariosFromEpicUserStories()` konverterar user stories → TestScenario[]
- ✅ Funktionen finns men anropas ALDRIG
- ❌ Scenarios sparas INTE till `node_planned_scenarios`

#### 3. Testgenerering
- ✅ `generateTestsForFile()` genererar testfiler
- ❌ Använder INTE scenarios från `node_planned_scenarios`
- ✅ Genererar nya scenarios varje gång med `generateTestSpecWithLlm()`
- ✅ Använder scenarios för att generera testfiler (`generateTestSkeleton()`)

#### 4. UI-visning
- ✅ RightPanel visar scenarios från `node_planned_scenarios`
- ✅ TestReport visar scenarios från `node_planned_scenarios`
- ✅ Används för att visa testtäckning och planerade tester

---

## ❓ Kärnfrågan: Ger scenarios värde?

### Vad scenarios gör just nu

1. **UI-visning** (RightPanel, TestReport)
   - Visar planerade tester
   - Visar testtäckning
   - Men: Samma information finns redan i dokumentationen som user stories

2. **Testgenerering**
   - Används INTE i testgenerering
   - Testgenerering skapar nya scenarios varje gång med LLM
   - Scenarios från dokumentationen används inte

3. **Dataformat**
   - User stories: `{ id, role, goal, value, acceptanceCriteria }`
   - Scenarios: `{ id, name, description, status, category }`
   - Skillnad: Scenarios har `status` och `category` (men dessa är bara metadata)

---

## 💡 Analys: Värde vs Duplicering

### Argument FÖR att behålla scenarios

1. **Testbar form**
   - Scenarios är strukturerade för testning
   - Har `status` (pending/passing/failing) - kan spåra testtäckning
   - Har `category` (happy-path/edge-case/error-case) - kan gruppera tester

2. **Separation of concerns**
   - User stories = dokumentation (förståelse)
   - Scenarios = testbar form (exekverbar)
   - Olika syften, olika format

3. **Framtida användning**
   - Om testgenerering börjar använda scenarios från databas (spara LLM-anrop)
   - Om vi vill spåra testtäckning över tid
   - Om vi vill ha olika scenarios per provider (claude vs chatgpt)

### Argument MOT att behålla scenarios (som bara är konvertering)

1. **Duplicerad data**
   - Scenarios är bara en 1:1-konvertering av user stories
   - Samma information, bara annat format
   - Ökar komplexitet utan tydligt värde

2. **Används inte i testgenerering**
   - Testgenerering skapar nya scenarios varje gång
   - Scenarios från dokumentationen används inte
   - Bara för UI-visning (som redan visar user stories)

3. **Underhåll**
   - Två system att hålla synkade
   - Risk för inkonsistens
   - Extra kod att underhålla

---

## 🎯 Rekommendation

### Alternativ 1: Behåll scenarios MEN använd dem i testgenerering

**Värde:**
- ✅ Sparar LLM-anrop (använd befintliga scenarios istället för att generera nya)
- ✅ Konsistent dataflöde: Dokumentation → Scenarios → Testfiler
- ✅ Kan spåra testtäckning över tid

**Implementering:**
1. Spara scenarios från dokumentationen till `node_planned_scenarios`
2. Ändra testgenerering att hämta scenarios från databas först
3. Generera nya scenarios bara om inga finns

**Nackdel:**
- Mer komplexitet
- Två system att hålla synkade

### Alternativ 2: Ta bort scenarios, använd user stories direkt

**Värde:**
- ✅ Enklare system
- ✅ Mindre duplicering
- ✅ User stories är redan strukturerade och testbara

**Implementering:**
1. Ta bort `node_planned_scenarios` tabell
2. Använd user stories direkt i UI och testgenerering
3. Konvertera user stories → testfiler direkt när det behövs

**Nackdel:**
- Förlorar möjlighet att spåra testtäckning separat
- Förlorar möjlighet att ha olika scenarios per provider

### Alternativ 3: Hybrid - Scenarios bara för testgenerering

**Värde:**
- ✅ Scenarios används faktiskt (i testgenerering)
- ✅ Sparar LLM-anrop
- ✅ Enklare än att ha scenarios bara för UI

**Implementering:**
1. Ta bort scenarios från UI (använd user stories direkt)
2. Spara scenarios från dokumentationen
3. Använd scenarios i testgenerering (spara LLM-anrop)

**Nackdel:**
- Scenarios används bara för testgenerering, inte för UI

---

## 📊 Jämförelse

| Aspekt | User Stories (dokumentation) | Scenarios (extraherade) |
|--------|------------------------------|------------------------|
| **Format** | `{ id, role, goal, value, acceptanceCriteria }` | `{ id, name, description, status, category }` |
| **Syfte** | Dokumentation, förståelse | Testbar form, exekverbar |
| **Används i UI** | ✅ Ja (i dokumentationen) | ✅ Ja (RightPanel, TestReport) |
| **Används i testgenerering** | ❌ Nej | ❌ Nej (genererar nya varje gång) |
| **Sparas i databas** | ❌ Nej (bara i HTML) | ✅ Ja (`node_planned_scenarios`) |
| **Extra metadata** | ❌ Nej | ✅ Ja (`status`, `category`) |

---

## 🎯 Slutsats

### Just nu: Scenarios ger LITET värde

**Varför:**
1. Scenarios är bara en konvertering av user stories
2. Används bara för UI-visning (samma info finns i dokumentationen)
3. Används INTE i testgenerering (genererar nya varje gång)
4. Extra komplexitet utan tydligt värde

### Men: Scenarios KAN ge värde om de används korrekt

**Om vi:**
1. Använder scenarios i testgenerering (spara LLM-anrop)
2. Sparar scenarios från dokumentationen
3. Använder scenarios för att spåra testtäckning

**Då ger scenarios värde:**
- Sparar LLM-anrop (använd befintliga scenarios)
- Konsistent dataflöde
- Kan spåra testtäckning över tid

---

## 💡 Rekommendation

**Kort sikt:** Ta bort scenarios om de bara används för UI-visning
- User stories räcker för dokumentation
- Testgenerering skapar sina egna scenarios ändå
- Förenklar systemet

**Lång sikt:** Behåll scenarios MEN använd dem i testgenerering
- Spara scenarios från dokumentationen
- Använd scenarios i testgenerering (spara LLM-anrop)
- Ger faktiskt värde genom att spara kostnader och tid

**Alternativ:** Hybrid
- Ta bort scenarios från UI (använd user stories direkt)
- Behåll scenarios för testgenerering (spara LLM-anrop)
- Bästa av båda världar

---

**Datum:** 2025-12-22
**Status:** Analys klar, väntar på beslut







