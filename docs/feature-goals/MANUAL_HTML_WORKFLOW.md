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

### 1. Redigera HTML-filer

Öppna och redigera filer direkt i `public/local-content/feature-goals/`:

```bash
# Exempel: Redigera Application Feature Goal
code public/local-content/feature-goals/mortgage-se-application-application-v2.html
```

### 2. Vad kan redigeras?

- **Beskrivning av FGoal** - Förbättra sammanfattningen
- **Processteg - Input/Output** - Uppdatera input/output-beskrivningar
- **Omfattning** - Lägg till/ta bort scope-punkter
- **Avgränsning** - Uppdatera boundaries
- **Beroenden** - Lägg till/uppdatera dependencies
- **Testgenerering** - Fyll i testscenarier, UI Flow, testdata-referenser, implementation mapping

### 3. Visa i appen

1. Starta appen: `npm run dev`
2. Navigera till Feature Goal i appen
3. Välj **"v2"** template version (om inte redan valt)
4. Appen visar automatiskt från `public/local-content/` om filen finns

### 4. Badge visas automatiskt

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

## 🚀 Nästa steg

När du är nöjd med HTML-redigeringarna:

1. **Fortsätt förbättra:** Redigera fler filer i `public/local-content/feature-goals/`
2. **Framtida iteration:** När JSON-pipeline är klar, använd `export:feature-goal:json` och `import:feature-goal:json` för strukturerad redigering

## 📚 Relaterade dokument

- `docs/feature-goals/html-workflow-status.md` - Teknisk status
- `docs/feature-goals/json-export-import-implementation-plan.md` - JSON-pipeline plan
- `docs/feature-goals/test-generation-section-design.md` - Testgenerering design

