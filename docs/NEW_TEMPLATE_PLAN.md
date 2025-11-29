# Plan: Ny HTML Template för Dokumentation

## Översikt

Skapa en ny HTML template med samma upplägg som befintliga templates men med anpassat innehåll för projektorganisationsdokumentation (ways of working, teststrategi, etc.).

## Befintliga Templates

### 1. Feature Goal Template
- **Plats**: `docs/feature-goals/feature-goal-template.html`
- **Användning**: För callActivity-noder (subprocesser)
- **Render-funktion**: `renderFeatureGoalDoc()` i `src/lib/documentationTemplates.ts`
- **Struktur**: Syfte, Processomfång, Start & Slut, Bidragande team, Regler, Funktionellt innehåll, Data, Avgränsningar, DoR/DoD, Relaterade artefakter

### 2. Epic Template
- **Plats**: `docs/epics/epic-template.html`
- **Användning**: För tasks (userTask, serviceTask, businessRuleTask)
- **Render-funktion**: `renderEpicDoc()` i `src/lib/documentationTemplates.ts`
- **Struktur**: Introduktion, BPMN-koppling, Funktionell beskrivning, Affärs- & kreditregler, Data In/Ut, Arkitektur, API-översikt, Acceptanskriterier, Testscenarier, Testresultat, Relaterade noder

### 3. Business Rule Template
- **Plats**: `docs/rules/business-rule-task-template.html`
- **Användning**: För businessRuleTask-noder
- **Render-funktion**: `renderBusinessRuleDoc()` i `src/lib/documentationTemplates.ts`
- **Struktur**: (Liknande Epic men fokuserad på DMN-logik)

## Plan för Ny Template

### Steg 1: Identifiera Användningsområde
**Frågor att besvara:**
- Vad ska den nya templaten användas för?
  - Projektorganisationsdokumentation?
  - Ways of working-dokumentation?
  - Teststrategi-dokumentation?
  - Rollbeskrivningar?
  - Eller en generell template för projektrelaterad dokumentation?

**Rekommendation**: Skapa en **generell projektorganisations-template** som kan användas för:
- Ways of working
- Teststrategi
- Rollbeskrivningar
- Projektstruktur
- Processdokumentation

### Steg 2: Definiera Template-struktur

**Baserat på befintliga templates, föreslagen struktur:**

```html
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[Dokumenttyp] – [Titel]</title>
  <style>
    /* Samma styling som befintliga templates */
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 0 auto; padding: 32px; line-height: 1.5; }
    h1 { color: #0f172a; border-bottom: 2px solid #2e8f0; padding-bottom: 8px; }
    h2 { color: #1d4ed8; margin-top: 32px; }
    ul { padding-left: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    table th, table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    table th { background: #e0e7ff; }
    .muted { color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <h1>[Dokumenttyp] – [Titel]</h1>

  <h2>Översikt / Syfte</h2>
  <p class="muted">Beskriv syftet med dokumentet och vem det är riktat till.</p>

  <h2>Omfattning</h2>
  <p class="muted">Vad täcker detta dokument? Vad ingår och vad ingår inte?</p>

  <h2>Kontext & Bakgrund</h2>
  <p class="muted">Varför behövs detta? Vilken bakgrund finns?</p>

  <h2>Process / Metodik</h2>
  <ul>
    <li>[Processsteg 1]</li>
    <li>[Processsteg 2]</li>
  </ul>

  <h2>Roller & Ansvar</h2>
  <table>
    <tr><th>Roll</th><th>Ansvar</th><th>Kontakt</th></tr>
    <tr><td>[Roll]</td><td>[Ansvar]</td><td>[Kontakt]</td></tr>
  </table>

  <h2>Artefakter & Leverabler</h2>
  <ul>
    <li>[Artefakt 1]</li>
    <li>[Artefakt 2]</li>
  </ul>

  <h2>Definition of Ready / Definition of Done</h2>
  <ul>
    <li>[DoR/DoD-punkt]</li>
  </ul>

  <h2>Relaterade Dokument</h2>
  <ul>
    <li><a href="#link">Relaterat dokument</a></li>
  </ul>

  <h2>Version & Historik</h2>
  <table>
    <tr><th>Version</th><th>Datum</th><th>Ändring</th><th>Ansvarig</th></tr>
    <tr><td>1.0</td><td>YYYY-MM-DD</td><td>Initial version</td><td>[Namn]</td></tr>
  </table>
</body>
</html>
```

### Steg 3: Skapa Template-fil

**Plats**: `docs/project-organization/templates/project-org-template.html`

**Alternativ**: Om det ska finnas flera specialiserade templates:
- `docs/project-organization/templates/ways-of-working-template.html`
- `docs/project-organization/templates/test-strategy-template.html`
- `docs/project-organization/templates/role-description-template.html`

**Rekommendation**: Börja med en generell template som kan anpassas.

### Steg 4: Integration med BPMN Planner (valfritt)

**Fråga**: Ska den nya templaten integreras i BPMN Planner-appen eller är den bara en statisk mall?

**Alternativ A: Statisk mall (enklast)**
- Template finns bara som HTML-fil
- Används manuellt för att skapa dokumentation
- Ingen kodändring behövs

**Alternativ B: Integrerad i appen**
- Lägg till ny render-funktion i `src/lib/documentationTemplates.ts`
- Skapa ny doc-type (t.ex. `ProjectOrgDoc`)
- Integrera i dokumentationsgeneratorn
- Kräver kodändringar

**Rekommendation**: Börja med **Alternativ A** (statisk mall). Om behov uppstår kan den integreras senare.

### Steg 5: Dokumentation

**Skapa README för templates:**
- `docs/project-organization/templates/README.md`
- Beskriv hur templates används
- Ge exempel på fyllda templates
- Länka till relaterad dokumentation

## Implementation Checklist

### Fase 1: Grundläggande Template
- [ ] Skapa `docs/project-organization/templates/project-org-template.html`
- [ ] Använd samma styling som befintliga templates
- [ ] Definiera sektioner baserat på användningsområde
- [ ] Testa template i webbläsare
- [ ] Uppdatera `docs/project-organization/templates/README.md`

### Fase 2: Specialiserade Templates (om behövs)
- [ ] Skapa ways-of-working-specifik template (om annorlunda)
- [ ] Skapa test-strategy-specifik template (om annorlunda)
- [ ] Skapa role-description-template (om annorlunda)

### Fase 3: Integration (valfritt)
- [ ] Diskutera om template ska integreras i appen
- [ ] Om ja: Skapa render-funktion
- [ ] Om ja: Lägg till i dokumentationsgeneratorn
- [ ] Om ja: Uppdatera UI för att välja template-typ

## Exempel på Användning

### Ways of Working-dokument
1. Kopiera `project-org-template.html`
2. Fyll i sektioner:
   - Översikt: "Våra ways of working definierar hur vi arbetar tillsammans"
   - Process: Development process, Code review, Git workflow
   - Roller: Developer, Test Lead, Product Owner
   - Artefakter: PR templates, Code review checklist
3. Spara som `docs/project-organization/ways-of-working/ways-of-working.html`

### Teststrategi-dokument
1. Kopiera `project-org-template.html`
2. Fyll i sektioner:
   - Översikt: "Vår teststrategi definierar hur vi testar"
   - Process: Unit testing, Integration testing, E2E testing
   - Roller: Test Lead, Developer, QA
   - Artefakter: Test scripts, Test reports
3. Spara som `docs/project-organization/test-strategy/test-strategy.html`

## Nästa Steg

1. **Bekräfta användningsområde**: Vad ska den nya templaten användas för?
2. **Välj struktur**: Generell template eller specialiserade templates?
3. **Implementera**: Skapa template-fil(er)
4. **Dokumentera**: Uppdatera README med användningsinstruktioner

## Frågor att Besvara

1. **Vad ska den nya templaten användas för?**
   - Projektorganisationsdokumentation generellt?
   - Specifik typ (ways of working, teststrategi, etc.)?
   - Både och (generell + specialiserade)?

2. **Ska den integreras i BPMN Planner-appen?**
   - Statisk mall (enklast)?
   - Integrerad i appen (kräver kodändringar)?

3. **Vilka sektioner ska finnas?**
   - Baserat på befintliga templates?
   - Anpassade för projektorganisationsdokumentation?

4. **Ska det finnas flera templates?**
   - En generell template?
   - Flera specialiserade templates?

