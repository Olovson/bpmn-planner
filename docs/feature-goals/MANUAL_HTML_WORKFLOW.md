# Manual HTML Workflow för Feature Goals

## 🎯 Syfte

Detta dokument beskriver hur du manuellt förbättrar Feature Goal HTML-dokumentation och ser till att appen visar dina förbättringar.

## ✅ Status

**HTML-workflow är fullt implementerad och redo att användas!**

- ✅ 27 förbättrade HTML-filer i `public/local-content/feature-goals/`
- ✅ Badge "📄 Lokal version" visas automatiskt
- ✅ `DocViewer` prioriterar local-content för v2 Feature Goals
- ✅ Version switching (v1/v2) fungerar

## 📁 Filstruktur

```
public/local-content/feature-goals/
  ├── mortgage-se-application-application-v2.html
  ├── mortgage-se-kyc-kyc-v2.html
  ├── mortgage-se-credit-evaluation-credit-evaluation-v2.html
  └── ... (27 filer totalt)
```

**Namngivning:** `{bpmnFile}-{elementId}-v2.html`

## 🔄 Workflow

### Steg 0: Identifiera filer som behöver uppdateras

1. **Kör sync-scriptet** för att analysera skillnader mellan BPMN-filer och dokumentation:
   ```bash
   npx tsx scripts/analyze-feature-goal-sync.ts
   ```
   
   Scriptet använder automatiskt den senaste BPMN-arkivmappen (t.ex. `mortgage-se YYYY.MM.DD HH:MM`).

2. **Läs rapporten** som genereras i archive-mappen:
   ```
   tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/feature-goal-sync-report.md
   ```

3. **Identifiera filer som behöver uppdateras:**
   - **Nya Feature Goals** → Skapa nya HTML-filer
   - **Ändrade Feature Goals** → Uppdatera befintliga HTML-filer
   - **Orphaned docs** → Granska och uppdatera eller ta bort

### Steg 1: Förberedelse för varje fil

1. **Hitta motsvarande BPMN-fil** i senaste archive-mappen:
   - Rapporten visar `parent_bpmn_file` och `bpmn_id` för varje Feature Goal
   - BPMN-filerna ligger i: `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/`

2. **Läs BPMN-filen** för att få faktisk information om:
   - Call activities och subprocesses
   - Service tasks, user tasks, business rule tasks
   - Sequence flows och dependencies
   - Processnamn och ID:n

3. **Öppna befintlig HTML-fil** (eller skapa ny om den saknas):
   ```bash
   # Exempel: Redigera Application Feature Goal
   code public/local-content/feature-goals/mortgage-se-application-application-v2.html
   ```

### Steg 2: Redigera HTML-filer

Uppdatera innehållet baserat på BPMN-filerna. V2-templaten har följande sektioner:

- **Beskrivning av FGoal** - Sammanfattning av vad Feature Goalet gör
- **Confluence länk** - Länk till Confluence-sida (om tillgänglig)
- **Processteg - Input** - När processen startar (baserat på BPMN sequence flows)
- **Processteg - Output** - Förväntad utkomst (baserat på BPMN sequence flows)
- **Omfattning** - Vad som ingår (baserat på call activities, subprocesses, tasks)
- **Avgränsning** - Vad som inte ingår
- **Beroenden** - Externa beroenden (service tasks, integrations)
- **BPMN - Process** - Referens till BPMN-processen
- **Testgenerering** - Testscenarier, UI Flow, testdata-referenser, implementation mapping

**Tips:**
- Använd information från BPMN-filen för att fylla i faktiskt innehåll
- Var konkret och affärsnära
- Fokusera på vad som faktiskt händer i processen

### Steg 3: Visa i appen

1. Starta appen: `npm run dev`
2. Navigera till Feature Goal i appen
3. Välj **"v2"** template version (om inte redan valt)
4. Appen visar automatiskt från `public/local-content/` om filen finns

### Steg 4: Badge visas automatiskt

Alla filer i `public/local-content/` har en "📄 Lokal version – Förbättrat innehåll" badge som visas längst upp i dokumentet.

## 🎨 Badge-styling

Badgen har följande styling:
- **Bakgrund:** #e0f2fe (ljusblå)
- **Text:** #0369a1 (mörkblå)
- **Border:** #0284c7 (blå accent)
- **Position:** Längst upp i dokumentet, efter `<body>` tag

## 🔍 Verifiering

### Kontrollera att filen visas:

1. Öppna appen och navigera till en Feature Goal
2. Välj v2 template
3. Kontrollera att:
   - Badge "📄 Lokal version" visas längst upp
   - Innehållet matchar din redigering
   - URL i DevTools visar `/local-content/feature-goals/...`

### Felsökning:

**Problem:** Filen visas inte
- ✅ Kontrollera att filen finns i `public/local-content/feature-goals/`
- ✅ Kontrollera att filnamnet följer pattern: `{bpmnFile}-{elementId}-v2.html`
- ✅ Kontrollera att du valt "v2" template version i appen

**Problem:** Badge visas inte
- ✅ Kontrollera att HTML-filen innehåller `<div class="local-version-badge">`
- ✅ Badge ska vara direkt efter `<body>` tag

## 📝 Exempel: Redigera Testgenerering-sektion

```html
<section class="doc-section">
  <h2>Testgenerering</h2>
  
  <h3>Testscenarier</h3>
  <table>
    <tbody>
      <tr>
        <td><strong>S1</strong></td>
        <td>Normalflöde – komplett ansökan</td>
        <td>Happy</td>
        <td>customer</td>
        <td>P1</td>
        <td>functional</td>
        <td>Kunden får ett tydligt besked</td>
        <td>✅ Klar</td>
      </tr>
    </tbody>
  </table>
  
  <!-- Lägg till UI Flow, testdata-referenser, implementation mapping -->
</section>
```

## 🚀 Systematiskt arbete

När du arbetar med flera filer:

1. **Prioritera enligt rapporten:**
   - Börja med nya Feature Goals (måste skapas)
   - Fortsätt med ändrade Feature Goals (behöver uppdateras)
   - Slutligen orphaned docs (granska och uppdatera eller ta bort)

2. **För varje fil:**
   - Öppna BPMN-filen → Läs faktisk information
   - Öppna HTML-filen → Uppdatera baserat på BPMN-innehållet
   - Verifiera i appen → Kontrollera att allt ser bra ut

3. **När du är klar med en batch:**
   - Kör sync-scriptet igen för att se om det finns fler ändringar
   - Uppdatera rapporten med status (t.ex. "✅ Klar" i en egen fil)

## 📚 Relaterade verktyg

- **Sync-script:** `scripts/analyze-feature-goal-sync.ts` - Identifierar filer som behöver uppdateras
- **Archive-script:** `scripts/archive-bpmn-files.ts` - Skapar nya BPMN-arkivmappar

## 📚 Relaterade dokument

- `docs/feature-goals/html-workflow-status.md` - Teknisk status
- `docs/feature-goals/json-export-import-implementation-plan.md` - JSON-pipeline plan
- `docs/feature-goals/test-generation-section-design.md` - Testgenerering design
- `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/feature-goal-sync-report.md` - Sync-rapport (genereras av scriptet)

