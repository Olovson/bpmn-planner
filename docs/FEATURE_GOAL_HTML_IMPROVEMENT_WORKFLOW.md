# Feature Goal HTML Improvement Workflow

## 📋 Behovsammanfattning

**Problem:**
- Lokalt genererade Feature Goal HTML-dokument behöver iterativt förbättras
- Förbättringar ska göras med AI-hjälp (assistenten skriver förbättringar)
- Förbättrat innehåll måste sparas lokalt (inte bara i Supabase)
- Förbättringar ska inte försvinna vid databas-delete
- **Använda befintlig LLM-prompt för konsistens**

**Nuvarande situation:**
- HTML-filer sparas i Supabase Storage
- Export-script finns (`export:feature-goals`) men exporterar från Supabase
- Import-script finns (`import:feature-goals`) men importerar tillbaka till Supabase
- Override-system finns (`src/data/node-docs/`) men det är för JSON-struktur, inte HTML
- **LLM-prompt finns i `prompts/llm/feature_epic_prompt.md`** - används för JSON-generering
- **Feature Goals har två templates: v1 och v2** - olika HTML-struktur

## 🎯 Lösningsförslag

### 1. Lokal HTML-arkivstruktur

```
local-html-improvements/
  feature-goals/
    {bpmnFile}-{elementId}-v{version}.html          # Förbättrad version
    {bpmnFile}-{elementId}-v{version}.original.html # Original (backup)
    metadata.json                                    # Metadata om förbättringar
  README.md                                          # Dokumentation
```

**Fördelar:**
- ✅ Lokal backup (kan committas till git)
- ✅ Versionering (original + förbättrad)
- ✅ Metadata för spårning
- ✅ Enkelt att maila (hela mappen)

### 2. AI-assisterad förbättringsprocess (med LLM-prompt)

**Workflow:**
1. Användare exporterar Feature Goal HTML från Supabase (eller använder lokalt genererad)
2. Användare ber assistenten förbättra specifik fil eller sektion
3. **Assistenten använder befintlig LLM-prompt för att generera förbättrat innehåll**
   - Läser original HTML
   - Extraherar relevant data från HTML
   - Använder `feature_epic_prompt.md` för att generera förbättrad JSON
   - Mappar JSON tillbaka till HTML-struktur (v1 eller v2)
4. Förbättrad HTML sparas lokalt
5. (Valfritt) Importeras tillbaka till Supabase

**Kommandon:**
```bash
# Exportera från Supabase till lokal mapp
npm run export:feature-goals:local

# Förbättra en specifik fil (interaktivt med AI + LLM-prompt)
npm run improve:feature-goal <bpmnFile> <elementId> <version>

# Importera förbättrade filer tillbaka till Supabase
npm run import:feature-goals:improved

# Visa status över förbättrade filer
npm run status:feature-goals:improved
```

**LLM-prompt-användning:**
- **v1 template**: Använder standard `feature_epic_prompt.md` (Feature Goal-sektionen)
- **v2 template**: Använder samma prompt men mappar till v2:s 8 kapitel-struktur
  - Beskrivning av FGoal ← `summary`
  - Confluence länk ← `relatedItems` (extraherar URL)
  - Processteg - Input ← `flowSteps` (första stegen)
  - Processteg - Output ← `effectGoals`
  - Omfattning ← `scopeIncluded`
  - Avgränsning ← `scopeExcluded`
  - Beroenden ← `dependencies`
  - BPMN - Process ← (behålls från original)

### 3. Metadata-spårning

`metadata.json` innehåller:
```json
{
  "improvements": [
    {
      "file": "mortgage-se-mortgage-commitment-documentation-assessment-v2.html",
      "bpmnFile": "mortgage-se-mortgage-commitment.bpmn",
      "elementId": "documentation-assessment",
      "templateVersion": "v2",
      "improvedAt": "2025-01-XX",
      "improvedBy": "AI Assistant",
      "llmPromptVersion": "1.0.0",
      "sections": ["Beskrivning av FGoal", "Processteg - Input"],
      "originalPath": "exports/feature-goals/...",
      "notes": "Förbättrad beskrivning och tydligare input/output",
      "llmProvider": "cloud",
      "llmModel": "gpt-4"
    }
  ]
}
```

### 4. Integration med befintliga scripts

**Befintliga scripts:**
- `export:feature-goals` - Exporterar från Supabase till `exports/feature-goals/`
- `import:feature-goals` - Importerar från `exports/feature-goals/` till Supabase

**Nya scripts:**
- `export:feature-goals:local` - Exporterar till `local-html-improvements/feature-goals/`
- `improve:feature-goal` - Interaktivt förbättra med AI
- `import:feature-goals:improved` - Importera förbättrade filer till Supabase
- `status:feature-goals:improved` - Visa status

### 5. AI-förbättringsprocess (detaljerad med LLM-prompt)

**Steg 1: Användare exporterar**
```bash
npm run export:feature-goals:local
```

**Steg 2: Användare identifierar fil att förbättra**
- Lista filer: `ls local-html-improvements/feature-goals/*.html`
- Eller använd status-kommando

**Steg 3: Användare ber assistenten förbättra**
- "Förbättra beskrivningen i mortgage-se-mortgage-commitment-documentation-assessment-v2.html"
- "Gör input/output-sektionerna tydligare i filen X"
- "Förbättra hela innehållet i filen Y"

**Steg 4: Assistenten (med LLM-prompt)**
1. Läser original HTML-fil
2. Extraherar BPMN-kontext från filen (bpmnFile, elementId, templateVersion)
3. Bygger `NodeDocumentationContext` från BPMN-graph
4. **Använder `feature_epic_prompt.md` + kontext för att generera förbättrad JSON**
   - Anropar `generateDocumentationWithLlm('feature', context, links)`
   - Får tillbaka `FeatureGoalDocModel` JSON
5. **Mappar JSON tillbaka till HTML-struktur:**
   - **v1**: Använder `buildFeatureGoalDocHtmlFromModel()` 
   - **v2**: Använder `buildFeatureGoalDocHtmlFromModelV2()` (8 kapitel)
6. Sparar förbättrad version som `{filename}.html`
7. Sparar original som `{filename}.original.html`
8. Uppdaterar `metadata.json` med prompt-version och LLM-info

**Steg 5: (Valfritt) Importera tillbaka**
```bash
npm run import:feature-goals:improved
```

**Viktigt:**
- **Samma prompt används för både v1 och v2** - skillnaden är bara i HTML-renderingen
- **Prompt-version spåras** i metadata för framtida kompatibilitet
- **LLM-provider och modell spåras** för reproducerbarhet

### 6. Backup och versionering

**Git-integration:**
- `local-html-improvements/` kan committas till git
- `.gitignore` kan exkludera den om önskat
- Eller inkludera den för backup

### 7. Säkerhetskopiering

**Strategier:**
1. **Git commit** - Committa `local-html-improvements/` till git
2. **Separate backup** - Kopiera till annan plats
3. **Supabase sync** - Importera förbättrade filer till Supabase (valfritt)

## 🔄 Alternativ: HTML Override System

**Alternativ lösning:** Utöka override-systemet för att stödja HTML direkt.

**Fördelar:**
- ✅ Integrerat med befintligt system
- ✅ Automatisk användning vid rendering

**Nackdelar:**
- ❌ Mer komplex implementation
- ❌ Kräver ändringar i rendering-logik
- ❌ Svårare att maila/exporta

**Rekommendation:** Börja med lokal HTML-arkiv, kan utökas senare om behov finns.

## 📝 Implementation Checklist

### Steg 1: Skapa struktur
- [ ] Skapa `local-html-improvements/feature-goals/` mapp
- [ ] Skapa `metadata.json` template
- [ ] Skapa `README.md` i mappen

### Steg 2: Export-script
- [ ] Uppdatera `export-feature-goals.ts` för att stödja lokal export
- [ ] Eller skapa nytt script `export-feature-goals-local.ts`

### Steg 3: AI-förbättringsscript (med LLM-prompt)
- [ ] Skapa `improve-feature-goal.ts` script
- [ ] Läsa HTML-fil och extrahera BPMN-kontext
- [ ] Bygga `NodeDocumentationContext` från BPMN-graph
- [ ] Anropa `generateDocumentationWithLlm()` med `feature_epic_prompt.md`
- [ ] Mappa JSON tillbaka till HTML (v1 eller v2 baserat på templateVersion)
- [ ] Interaktivt spara förbättrad fil
- [ ] Uppdatera metadata med prompt-version och LLM-info

### Steg 4: Import-script
- [ ] Uppdatera `import-feature-goals.ts` för att läsa från lokal mapp
- [ ] Eller skapa nytt script `import-feature-goals-improved.ts`

### Steg 5: Status-script
- [ ] Skapa `status-feature-goals-improved.ts`
- [ ] Visa lista över förbättrade filer
- [ ] Visa diff-status

### Steg 6: Dokumentation
- [ ] Uppdatera huvud-README med workflow
- [ ] Skapa guide för AI-förbättring
- [ ] Dokumentera metadata-format

## 🚀 Nästa steg

1. **Godkänn lösningsförslaget** - Är detta rätt riktning?
2. **Implementera struktur** - Skapa mappar och templates
3. **Skapa export-script** - För lokal export
4. **Skapa förbättringsscript** - För AI-assisterad förbättring
5. **Testa workflow** - Med en riktig Feature Goal

## ❓ Frågor att besvara

1. **Ska förbättrade filer automatiskt användas vid rendering?**
   - Ja: Kräver ändringar i `renderFeatureGoalDoc`
   - Nej: Manuell import till Supabase

2. **Ska original-filer sparas?**
   - Ja: Backup av original
   - Nej: Bara förbättrad version

3. **Ska metadata spåra vem som förbättrade?**
   - Ja: Användarnamn/identifierare
   - Nej: Bara timestamp

4. **Ska git ignorera eller inkludera mappen?**
   - Ignorera: `.gitignore`
   - Inkludera: Committa till git

5. **Behöver vi separata prompts för v1 och v2?**
   - **Nej**: Samma prompt (`feature_epic_prompt.md`) används för båda
   - Skillnaden är bara i HTML-renderingen (`buildFeatureGoalDocHtmlFromModel` vs `buildFeatureGoalDocHtmlFromModelV2`)
   - Prompten genererar samma JSON-struktur (`FeatureGoalDocModel`), som sedan mappas olika beroende på template-version

