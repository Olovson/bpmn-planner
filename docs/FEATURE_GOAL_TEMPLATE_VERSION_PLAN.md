# Plan: Template Version Selection för Feature Goals

## Översikt

Lägga till möjlighet att välja mellan Feature Goal template v1 och v2 när dokumentation genereras.

## Nuvarande Situation

- **v1**: `docs/feature-goals/feature-goal-template.html` (befintlig)
- **v2**: `docs/feature-goals/feature-goal-template-v2.html` (ny)
- **Epic template**: Behålls oförändrad

## Implementation Plan

### Steg 1: Lägg till Template Version Parameter

**Filer att ändra:**
- `src/lib/documentationTemplates.ts`

**Ändringar:**
1. Lägg till `FeatureGoalTemplateVersion` type: `'v1' | 'v2'`
2. Lägg till parameter `templateVersion?: FeatureGoalTemplateVersion` i `renderFeatureGoalDoc()`
3. Skapa `buildFeatureGoalDocHtmlFromModelV2()` funktion (baserad på v2-strukturen)
4. Uppdatera `renderFeatureGoalDoc()` för att välja rätt render-funktion baserat på version

### Steg 2: Lägg till UI-val för Template Version

**Filer att ändra:**
- `src/pages/BpmnFileManager.tsx` (genereringsalternativ)
- `src/components/BpmnGeneratorDialog.tsx` (om det används)

**Ändringar:**
1. Lägg till state för template version: `featureGoalTemplateVersion: 'v1' | 'v2'`
2. Lägg till UI-kontroller (radio buttons eller dropdown) för att välja version
3. Skicka template version till genereringsfunktionen

### Steg 3: Spara Template Version i Metadata

**Alternativ:**
- **Alternativ A**: Spara i dokumentationsmetadata (i Supabase eller filmetadata)
- **Alternativ B**: Använd som runtime-parameter (vald vid generering, inte sparas)
- **Alternativ C**: Spara som användarinställning (localStorage/settings)

**Rekommendation**: Börja med **Alternativ B** (runtime-parameter), kan utökas senare.

### Steg 4: Implementera V2 Render-funktion

**Filer att ändra:**
- `src/lib/documentationTemplates.ts`

**Ändringar:**
1. Kopiera `buildFeatureGoalDocHtmlFromModel()` som bas
2. Skapa `buildFeatureGoalDocHtmlFromModelV2()` med v2-strukturen
3. Använd samma datamodell (`FeatureGoalDocModel`) men annan HTML-struktur

## Implementation Checklist

### Fase 1: Backend (Template Rendering)
- [ ] Lägg till `FeatureGoalTemplateVersion` type
- [ ] Skapa `buildFeatureGoalDocHtmlFromModelV2()` funktion
- [ ] Uppdatera `renderFeatureGoalDoc()` för att acceptera template version
- [ ] Testa båda versionerna

### Fase 2: Frontend (UI Selection)
- [ ] Lägg till state för template version i BpmnFileManager
- [ ] Lägg till UI-kontroller för val av version
- [ ] Skicka template version till genereringsfunktionen
- [ ] Testa UI-valet

### Fase 3: Integration & Testing
- [ ] Testa generering med v1
- [ ] Testa generering med v2
- [ ] Verifiera att Epic template inte påverkas
- [ ] Uppdatera dokumentation

## V2 Template Struktur

Baserat på `feature-goal-template-v2.html`:

1. **Sammanfattning** (istället för "Syfte")
2. **Effektmål** (ny sektion)
3. **Omfattning & Avgränsningar** (separerade "Ingår" / "Ingår inte")
4. **Ingående Epics** (tabell med ID, Epic, Beskrivning, Team)
5. **Affärsflöde** (istället för "Funktionellt innehåll")
6. **Kritiska Beroenden** (ny sektion)
7. **Affärs-scenarion & Testbarhet** (tabell med ID, Scenario, Typ, Utfall)
8. **Koppling till Automatiska Tester**
9. **Implementation Notes** (ny sektion)
10. **Relaterade Artefakter**
11. **BPMN-koppling** (ny sektion)
12. **DoR/DoD** (separerade sektioner)

## Nästa Steg

1. Implementera backend (template rendering)
2. Implementera frontend (UI selection)
3. Testa båda versionerna
4. Uppdatera dokumentation

