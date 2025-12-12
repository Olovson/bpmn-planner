# Guide: Hantera återkommande Feature Goals i dokumentationen

**Detta dokument förklarar hur vi hanterar feature goals som anropas från flera ställen i vår dokumentation.**

## 🎯 Syfte

När ett feature goal anropas från flera ställen (t.ex. Credit Decision anropas från huvudprocessen, Offer-processen, och Sales Contract-processen), behöver dokumentationen tydligt förklara:
- **Vad processen gör generellt** (så att läsaren förstår funktionaliteten)
- **Var processen anropas från** (så att läsaren kan hitta rätt kontext)
- **Varför processen anropas igen** (vilken ny information har tillkommit)
- **Vad som är annorlunda** i varje kontext (vilka specifika input/output-variabler)

## 📋 Snabbguide

### Steg 1: Identifiera återkommande feature goals

Kör analysscriptet:
```bash
npx tsx scripts/analyze-reused-feature-goals.ts
```

Detta genererar `docs/feature-goals/REUSED_FEATURE_GOALS_ANALYSIS.md` med alla återkommande feature goals.

**Eller sök manuellt:**
- Öppna `bpmn-map.json`
- Sök efter samma `subprocess_bpmn_file` i flera `call_activities`
- Om samma fil finns i flera ställen: Detta är ett återkommande feature goal

### Steg 2: Dokumentera enligt mallen

För varje återkommande feature goal:

1. **Beskrivning av FGoal:**
   - Generell beskrivning först
   - Lägg till "Anropningskontexter" sektion som listar alla anropningsställen
   - För varje kontext: Förklara var, när, varför och vad som är annorlunda

2. **Processteg - Input:**
   - Generella krav först
   - Lägg till "Kontextspecifika input-krav" sektion
   - För varje kontext: Förklara vilken ny information som har tillkommit

3. **Processteg - Output:**
   - Generella resultat först
   - Lägg till "Kontextspecifika output-resultat" sektion
   - För varje kontext: Förklara hur resultatet används

4. **BPMN - Process:**
   - Generellt processflöde först
   - Lägg till "Anropningsställen" sektion
   - För varje anropningsställe: Förklara hur processen anropas

### Steg 3: Följ mallen

Använd `REUSED_FEATURE_GOAL_TEMPLATE.md` som mall för strukturen.

## 📖 Exempel

### Exempel 1: Credit Decision (3 anrop)

**Anropningskontexter:**
1. **Huvudprocessen:** Efter KYC, initialt kreditbeslut
2. **Offer-processen - Ändringar:** Efter advanced underwriting, för ändringar i erbjudandet
3. **Offer-processen - Sales Contract:** Efter sales-contract-advanced-underwriting, för köpekontrakt-ändringar

**Dokumentation:**
- **Beskrivning:** Generell beskrivning + "Anropningskontexter" sektion
- **Input:** Generella krav + "Kontextspecifika input-krav" sektion
- **Output:** Generella resultat + "Kontextspecifika output-resultat" sektion

### Exempel 2: Credit Evaluation (5 anrop)

**Anropningskontexter:**
1. **Mortgage Commitment - Initial:** Första kreditevalueringen
2. **Mortgage Commitment - Efter ändringar:** Efter att villkor har ändrats
3. **Object Control:** Efter objektändringar
4. **Manual Credit Evaluation:** Efter uppdaterad dokumentation
5. **Huvudprocessen:** Initial kreditevaluering

**Dokumentation:**
- **Beskrivning:** Generell beskrivning + "Anropningskontexter" sektion med alla 5 kontexter
- **Input:** Generella krav + "Kontextspecifika input-krav" sektion för varje kontext
- **Output:** Generella resultat + "Kontextspecifika output-resultat" sektion för varje kontext

## ✅ Checklista

När du dokumenterar ett återkommande feature goal:

- [ ] Identifierat alla anropningsställen (kör script eller sök manuellt)
- [ ] Dokumenterat generell funktionalitet tydligt
- [ ] Listat alla anropningskontexter i Beskrivning-sektionen
- [ ] Förklarat varför processen anropas igen i varje kontext (vilken ny information)
- [ ] Beskrivit vad som är annorlunda i varje kontext (specifika input/output-variabler)
- [ ] Uppdaterat Input-sektionen med kontextspecifika krav
- [ ] Uppdaterat Output-sektionen med kontextspecifika resultat
- [ ] Uppdaterat BPMN - Process med alla anropningsställen
- [ ] Säkerställt att dokumentationen är tydlig och lätt att förstå

## 🔗 Relaterade dokument

- **Strategi:** `REUSED_FEATURE_GOALS_STRATEGY.md` - Detaljerad strategi och principer
- **Mall:** `REUSED_FEATURE_GOAL_TEMPLATE.md` - HTML-mall för dokumentation
- **Analys:** `REUSED_FEATURE_GOALS_ANALYSIS.md` - Automatisk analys av alla återkommande feature goals
- **Arbetsprocess:** `AUTO_IMPROVEMENT_EXECUTION_PLAN.md` - Uppdaterad arbetsprocess med instruktioner för återkommande feature goals

## 💡 Tips för tydlighet

1. **Använd konsekventa namn:** T.ex. "Huvudprocessen", "Offer-processen - Ändringar", "Offer-processen - Sales Contract"
2. **Var specifik om ny information:** Förklara exakt vilken ny information som har tillkommit
3. **Använd visuell struktur:** Rubriker, underrubriker och listor gör dokumentationen lättläst
4. **Förklara syfte:** Förklara inte bara VAD, utan också VARFÖR i varje kontext
5. **Koppla till affärsvärde:** Förklara hur varje kontext bidrar till affärsvärde

