# Lista: User Tasks med Inkorrekt Användarbenämning

**Datum:** 2025-01-XX  
**Status:** Analys genomförd med script `check-user-task-lanes-from-storage.mjs`

---

## 📊 Sammanfattning

**Total User Tasks kontrollerade:** 35  
**Med problem:** 1  
**Korrekt:** 34

---

## ❌ User Tasks med Inkorrekt Användarbenämning

### 1. Evaluate application (Board)
- **Fil:** `mortgage-se-credit-decision.bpmn`
- **Element ID:** `evaluate-application-board`
- **Förväntad lane:** Handläggare (p.g.a. "evaluate" i namnet)
- **Problem:** Nämner kund men inte handläggare
- **Åtgärd:** Regenerera dokumentation med korrekt lane (Handläggare)

---

## ⚠️ User Tasks som Behöver Granskas

### Register source of equity
- **Fil:** `mortgage-se-object.bpmn`
- **Element ID:** `register-source-of-equity`
- **Förväntad lane:** Kund (primary stakeholder)
- **Status:** Nämner både "kunden" och "handläggare"
- **Notering:** 
  - Dokumentationen nämner kunden som primär användare i summary: "Epiken ger kunden möjlighet att registrera..."
  - Men den har också en sektion för "Anställd (Rådgivare/Admin)" som beskriver vad handläggare kan göra
  - I flowSteps nämns "Kunden eller handläggare" vilket kan ge intrycket att handläggaren gör uppgiften
- **Rekommendation:** 
  - Verifiera att dokumentationen tydligt framhäver att kunden är primär användare
  - Överväg att ändra flowSteps från "Kunden eller handläggare" till "Kunden (primary stakeholder) kan registrera, handläggare kan hjälpa vid behov"
  - Eller regenerera dokumentation med tydligare fokus på kunden som primär användare

---

## ✅ Korrekt Användarbenämning

Följande User Tasks har korrekt användarbenämning (34 st):
- Alla andra User Tasks som kontrollerades

---

## 📝 Nästa Steg

1. **Regenerera dokumentation för "Evaluate application (Board)"**
   - Kör dokumentationsgenerering igen
   - Verifiera att Claude nu får "Handläggare" som lane (p.g.a. "evaluate" i namnet)
   - Kontrollera att dokumentationen nämner "handläggare" eller "credit evaluator" istället för "kund"

2. **Granska "Register source of equity"**
   - Dokumentationen nämner både kunden och handläggare
   - Verifiera att kunden är tydligt framhävd som primär användare
   - Om dokumentationen ger intrycket att handläggaren gör uppgiften → regenerera med tydligare fokus på kunden

3. **Verifiera att fixen fungerar**
   - Kör scriptet igen efter regenerering
   - Kontrollera att antalet problem minskat
   - Verifiera att "Register source of equity" tydligt nämner kunden som primär användare

---

## 🔧 Teknisk Detalj

**Script använt:** `scripts/check-user-task-lanes-from-storage.mjs`

**Logik för att identifiera User Tasks:**
- Kollar om dokumentationen har "Kund / Rådgivare" i swimlaneOwner
- ELLER om det är en Epic med "interaktion" sektion (och INTE "automatiserad systemexekvering")

**Logik för att bestämma förväntad lane:**
- Default för User Tasks = "Kund"
- Om namnet innehåller interna nyckelord ("review", "assess", "evaluate", etc.) = "Handläggare"

**Fix implementerad:**
- `inferLane()` i `llmDocumentation.ts` uppdaterad för att använda samma logik som process-explorer
- Default för User Tasks ändrat från "Handläggare" till "Kund"
- "evaluate" lagt till i interna nyckelord för "evaluate-application-*" i credit decision



