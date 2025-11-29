# HTML Workflow Status

## ✅ Implementerat

### 1. Local Content Storage
- **Mapp:** `public/local-content/feature-goals/`
- **Status:** ✅ 27 HTML-filer lagrade med förbättrat innehåll
- **Namngivning:** Följer `{bpmnFile}-{elementId}-v2.html` pattern

### 2. Visual Badge
- **Badge:** "📄 Lokal version – Förbättrat innehåll"
- **Status:** ✅ Alla filer i `public/local-content/feature-goals/` har badge
- **Styling:** Blå bakgrund (#e0f2fe), synlig längst upp i dokumentet

### 3. DocViewer Integration
- **Prioritering:** ✅ `DocViewer.tsx` prioriterar local-content för v2 Feature Goals
- **Fallback:** Om local-content inte finns, fallback till Supabase Storage
- **Sökväg:** `/local-content/feature-goals/{filename}`

### 4. Version Switching
- **UI:** ✅ Användare kan växla mellan v1 och v2 templates
- **Logik:** v2 använder local-content om tillgängligt, annars Supabase

## 📋 Workflow

### För att fortsätta förbättra HTML-innehåll:

1. **Redigera filer direkt:**
   - Öppna `public/local-content/feature-goals/{bpmnFile}-{elementId}-v2.html`
   - Redigera innehållet manuellt
   - Spara filen

2. **Visa i appen:**
   - Navigera till Feature Goal i appen
   - Välj "v2" template version
   - Appen visar automatiskt från `public/local-content/` om filen finns

3. **Badge visas automatiskt:**
   - Alla filer i `public/local-content/` har "📄 Lokal version" badge
   - Badge visas längst upp i dokumentet

## 🔄 Nästa steg (JSON-pipeline)

För framtida iterationer, JSON-export/import är förberedd:

- ✅ `FeatureGoalDocModel.scenarios` utökad med testgenerering-fält
- ✅ `exportFeatureGoalToJson()` funktion skapad
- ⏳ `importFeatureGoalFromJson()` - förberedd för nästa iteration

## 📝 Noteringar

- HTML-filer i `public/local-content/` är **statiska** och versionerade lokalt
- Dessa filer **ersätter inte** Supabase Storage-filer, de prioriteras bara för v2
- För att synka till Supabase, använd `import:feature-goals` script (kommer att uppdateras för JSON i framtiden)

