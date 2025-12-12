# Översikt: Hantering av återkommande Feature Goals

**Detta dokument ger en översikt över hur vi hanterar feature goals som anropas från flera ställen i vår dokumentation.**

## 📚 Dokumentstruktur

Vi har skapat följande dokument för att hantera återkommande feature goals:

### 1. **REUSED_FEATURE_GOALS_GUIDE.md** ⭐ START HÄR
**Snabbguide för att hantera återkommande feature goals.**
- Kortfattad guide med steg-för-steg-instruktioner
- Exempel på hur man dokumenterar återkommande feature goals
- Checklista för kvalitetskontroll

### 2. **REUSED_FEATURE_GOALS_STRATEGY.md**
**Detaljerad strategi och principer.**
- Problembeskrivning
- Lösningsstrategi med principer
- Exempel på återkommande feature goals
- Implementation-steg

### 3. **REUSED_FEATURE_GOAL_TEMPLATE.md**
**HTML-mall för dokumentation.**
- Färdig struktur för HTML-dokumentation
- Exempel på hur varje sektion ska se ut
- Tips för tydlighet

### 4. **REUSED_FEATURE_GOALS_ANALYSIS.md** (genereras automatiskt)
**Automatisk analys av alla återkommande feature goals.**
- Lista över alla återkommande feature goals
- Alla anropningskontexter för varje feature goal
- Rekommendationer per feature goal

### 5. **AUTO_IMPROVEMENT_EXECUTION_PLAN.md** (uppdaterad)
**Uppdaterad arbetsprocess.**
- Nya instruktioner för att identifiera återkommande feature goals
- Uppdaterade sektioner för Beskrivning, Input, Output, BPMN - Process
- Uppdaterad kvalitetschecklista

## 🚀 Snabbstart

### För att identifiera återkommande feature goals:
```bash
npx tsx scripts/analyze-reused-feature-goals.ts
```

Detta genererar `docs/feature-goals/REUSED_FEATURE_GOALS_ANALYSIS.md` med alla återkommande feature goals.

### För att dokumentera ett återkommande feature goal:

1. **Läs guiden:** `REUSED_FEATURE_GOALS_GUIDE.md`
2. **Följ mallen:** `REUSED_FEATURE_GOAL_TEMPLATE.md`
3. **Kontrollera strategin:** `REUSED_FEATURE_GOALS_STRATEGY.md`

## 📊 Aktuell status

**8 återkommande feature goals identifierade:**
1. Credit Evaluation (5 anrop)
2. Documentation Assessment (3 anrop)
3. Object Information (3 anrop)
4. Credit Decision (3 anrop)
5. Internal Data Gathering (2 anrop)
6. Signing (2 anrop)
7. Disbursement (2 anrop)
8. Document Generation (2 anrop)

Se `REUSED_FEATURE_GOALS_ANALYSIS.md` för detaljerad analys.

## ✅ Checklista för dokumentation

När du dokumenterar ett återkommande feature goal:

- [ ] Identifierat alla anropningsställen
- [ ] Dokumenterat generell funktionalitet tydligt
- [ ] Listat alla anropningskontexter i Beskrivning-sektionen
- [ ] Förklarat varför processen anropas igen i varje kontext
- [ ] Beskrivit vad som är annorlunda i varje kontext
- [ ] Uppdaterat Input-sektionen med kontextspecifika krav
- [ ] Uppdaterat Output-sektionen med kontextspecifika resultat
- [ ] Uppdaterat BPMN - Process med alla anropningsställen
- [ ] Säkerställt att dokumentationen är tydlig och lätt att förstå

## 🔗 Relaterade dokument

- **Arbetsprocess:** `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` - Huvudarbetsprocessen
- **Status:** `FEATURE_GOAL_STATUS.md` - Status över alla feature goals

## 💡 Tips

1. **Använd automatisk analys:** Kör `analyze-reused-feature-goals.ts` regelbundet för att hitta nya återkommande feature goals
2. **Följ mallen:** Använd `REUSED_FEATURE_GOAL_TEMPLATE.md` för att säkerställa konsistent struktur
3. **Var specifik:** Förklara exakt vilken ny information som har tillkommit i varje kontext
4. **Använd visuell struktur:** Rubriker, underrubriker och listor gör dokumentationen lättläst
5. **Förklara syfte:** Förklara inte bara VAD, utan också VARFÖR i varje kontext

