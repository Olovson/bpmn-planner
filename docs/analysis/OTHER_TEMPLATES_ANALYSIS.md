# Analys: Feature Goal och Business Rule Mallar

**Datum:** 2025-12-28

## Sammanfattning

Efter att ha förenklat Epic-mallarna, analyserar vi Feature Goal och Business Rule mallarna för liknande problem.

---

## 1. Feature Goal Mallar

### `buildFeatureGoalDocModelFromContext`
✅ **Status: Redan minimal**
- Returnerar bara tom modell (samma som Epic efter förenkling)
- Inga oanvända variabler
- Inga problem här

### `buildFeatureGoalDocHtmlFromModel` (rad 707-802)

#### Problem identifierade:

1. **Hårdkodad `versionLabel`** (rad 723-725)
   ```typescript
   const versionLabel = model.summary
     ? '1.0 (LLM-validerad) – uppdateras vid ändring'
     : '1.0 (exempel) – uppdateras vid ändring';
   ```
   - **Problem:** Hårdkodad version ger ingen information
   - **Lösning:** Ta bort från HTML (samma som Epic)

2. **Hårdkodad `ownerLabel`** (rad 726)
   ```typescript
   const ownerLabel = 'Produktägare Kredit / Risk & Policy';
   ```
   - **Problem:** Hårdkodad ägare ger ingen information
   - **Lösning:** Ta bort från HTML (samma som Epic)

3. **User Stories-sektionen visas alltid** (rad 778-799)
   - **Problem:** Visas även när `userStories` är tom
   - **Lösning:** Lägg till `userStories.length > 0` kontroll (samma som Epic)

4. **Duplicerad logik med Epic**
   - `upstreamNode`, `downstreamNode`, `upstreamName`, `downstreamName`, `processStep` beräknas på samma sätt som Epic
   - **Lösning:** Använd `extractEpicContextVars()` (eller skapa gemensam funktion)

---

## 2. Business Rule Mallar

### `buildBusinessRuleDocModelFromContext` (rad 809-929)

#### Status: ✅ Okej (men kan förbättras)
- Har fallback-innehåll (summary, inputs, decisionLogic, outputs, businessRulesPolicy, scenarios)
- Detta är faktiskt okej eftersom Business Rules har mer specifik struktur och behöver fallback-innehåll
- **Inga oanvända variabler identifierade**

### `buildBusinessRuleDocHtmlFromModel` (rad 1441-1752)

#### Problem identifierade:

1. **Hårdkodad `versionLabel`** (rad 1698)
   ```typescript
   <li><strong>Version:</strong> 1.0 (exempel) – uppdateras vid ändring</li>
   ```
   - **Problem:** Hårdkodad version ger ingen information
   - **Lösning:** Ta bort från HTML

2. **Hårdkodad `ownerLabel`** (rad 1699)
   ```typescript
   <li><strong>Ägare:</strong> Risk &amp; Kreditpolicy</li>
   ```
   - **Problem:** Hårdkodad ägare ger ingen information
   - **Lösning:** Ta bort från HTML

3. **Många variabler i `buildBusinessRuleDocModelFromContext`**
   - Alla variabler verkar användas, men det finns mycket fallback-innehåll
   - **Status:** Okej - Business Rules behöver fallback-innehåll

4. **Legacy-funktion `renderBusinessRuleDocLegacy`** (rad 1166-1408)
   - **Problem:** Denna funktion verkar inte användas längre (ersatt av `buildBusinessRuleDocHtmlFromModel`)
   - **Lösning:** Ta bort om den inte används

---

## 3. Jämförelse: Epic vs Feature Goal vs Business Rule

| Aspekt | Epic (Efter) | Feature Goal | Business Rule |
|--------|--------------|--------------|---------------|
| **Model-funktion** | ✅ Minimal (tom modell) | ✅ Minimal (tom modell) | ⚠️ Har fallback-innehåll |
| **HTML-funktion** | ✅ Förenklad | ⚠️ Har hårdkodade labels | ⚠️ Har hårdkodade labels |
| **Version label** | ✅ Borttagen | ❌ Hårdkodad | ❌ Hårdkodad |
| **Owner label** | ✅ Borttagen | ❌ Hårdkodad | ❌ Hårdkodad |
| **User Stories** | ✅ Visas endast om finns | ❌ Visas alltid | N/A |
| **Duplicerad logik** | ✅ Extraherad | ❌ Duplicerad med Epic | N/A |

---

## 4. Rekommendationer

### Feature Goal (Hög prioritet)

1. ✅ **Ta bort `versionLabel`** från HTML
2. ✅ **Ta bort `ownerLabel`** från HTML
3. ✅ **Lägg till `userStories.length > 0` kontroll** för User Stories-sektionen
4. ✅ **Använd `extractEpicContextVars()`** för att undvika duplicerad logik

**Förväntad reduktion:** ~10-15 rader kod

### Business Rule (Läg prioritet)

1. ✅ **Ta bort `versionLabel`** från HTML
2. ✅ **Ta bort `ownerLabel`** från HTML
3. ⚠️ **Kontrollera om `renderBusinessRuleDocLegacy` används** - ta bort om den inte används

**Förväntad reduktion:** ~5-10 rader kod

---

## 5. Implementeringsplan

### Steg 1: Feature Goal (Snabbt)
- Ta bort `versionLabel` och `ownerLabel`
- Lägg till `userStories.length > 0` kontroll
- Använd `extractEpicContextVars()` för kontextvariabler

**Tidsåtgång:** ~15 minuter

### Steg 2: Business Rule (Snabbt)
- Ta bort `versionLabel` och `ownerLabel`
- Kontrollera om `renderBusinessRuleDocLegacy` används

**Tidsåtgång:** ~10 minuter

---

## Slutsats

**Feature Goal** har liknande problem som Epic hade:
- Hårdkodade labels som ger ingen information
- User Stories-sektionen visas alltid
- Duplicerad logik med Epic

**Business Rule** har mindre problem:
- Hårdkodade labels (samma som Feature Goal)
- Men fallback-innehåll är faktiskt okej för Business Rules

**Rekommendation:** Implementera fixarna för Feature Goal först (snabbt och enkelt), sedan Business Rule.

