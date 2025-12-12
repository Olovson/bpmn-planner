# Filnamn vs Jira-namn Mismatch

## Problem

I appen genereras Jira-namn med hierarki baserat på parent-processer:
- `Application - Internal data gathering` (parent - child)
- `Application - Object`
- `Application - Household`
- `Application - Stakeholder`

Men HTML-filnamnen följer inte samma hierarki:
- `mortgage-se-internal-data-gathering-v2.html` (istället för `mortgage-se-application-internal-data-gathering-v2.html`)
- `mortgage-se-object-v2.html` (istället för `mortgage-se-application-object-v2.html`)
- `mortgage-se-household-v2.html` (istället för `mortgage-se-application-household-v2.html`)
- `mortgage-se-stakeholder-v2.html` (istället för `mortgage-se-application-stakeholder-v2.html`)

## Nuvarande Situation

### Application-processens Subprocesser

| Call Activity | Subprocess BPMN | Jira-namn | Nuvarande filnamn | Förväntat filnamn (hierarkiskt) |
|---------------|-----------------|-----------|-------------------|--------------------------------|
| `internal-data-gathering` | `mortgage-se-internal-data-gathering.bpmn` | `Application - Internal data gathering` | `mortgage-se-internal-data-gathering-v2.html` | `mortgage-se-application-internal-data-gathering-v2.html` |
| `object` | `mortgage-se-object.bpmn` | `Application - Object` | `mortgage-se-object-v2.html` | `mortgage-se-application-object-v2.html` |
| `household` | `mortgage-se-household.bpmn` | `Application - Household` | `mortgage-se-household-v2.html` | `mortgage-se-application-household-v2.html` |
| `stakeholder` | `mortgage-se-stakeholder.bpmn` | `Application - Stakeholder` | `mortgage-se-stakeholder-v2.html` | `mortgage-se-application-stakeholder-v2.html` |

## Hur Appen Hittar Filer Nu

I `DocViewer.tsx` försöker appen hitta filer med flera strategier:

1. **Med subprocess BPMN-fil + elementId:**
   - `feature-goals/${featureGoalBpmnFile}-${elementSegment}-${versionToUse}.html`
   - Exempel: `feature-goals/mortgage-se-internal-data-gathering-internal-data-gathering-v2.html`

2. **Med parent BPMN-fil + elementId (backward compatibility):**
   - `feature-goals/${baseName}-${elementSegment}-${versionToUse}.html`
   - Exempel: `feature-goals/mortgage-se-application-internal-data-gathering-v2.html`

Men vi har bara:
- `mortgage-se-internal-data-gathering-v2.html` (bara subprocess, utan elementId)

## Lösningsalternativ

### Alternativ 1: Döp om filerna till hierarkiska namn (Rekommenderat)

**Fördelar:**
- Matchar Jira-namnen direkt
- Tydligare struktur
- Lättare att förstå hierarkin

**Nackdelar:**
- Kräver omdöpning av alla filer
- Kräver uppdatering av `getFeatureGoalDocFileKey` för att generera hierarkiska namn

**Implementation:**
1. Uppdatera `getFeatureGoalDocFileKey` för att ta hänsyn till parent-processen
2. Döp om alla filer till hierarkiska namn
3. Uppdatera valideringsskript

### Alternativ 2: Behåll nuvarande filnamn, uppdatera app-logik

**Fördelar:**
- Inga filer behöver döpas om
- Mindre ändringar

**Nackdelar:**
- Filnamnen matchar inte Jira-namnen
- Mindre tydlig struktur
- Kräver fallback-logik i appen

## Rekommendation

**Alternativ 1** är att rekommendera eftersom:
1. Filnamnen matchar Jira-namnen direkt
2. Tydligare struktur och lättare att förstå
3. Konsistent med appens namngivningslogik
4. Lättare att underhålla långsiktigt

## Nästa Steg

1. Uppdatera `getFeatureGoalDocFileKey` för att generera hierarkiska filnamn baserat på parent-processen
2. Identifiera alla filer som behöver döpas om
3. Skapa ett script för att döpa om filerna
4. Uppdatera valideringsskript för att använda hierarkiska namn
5. Testa att appen hittar filerna korrekt

