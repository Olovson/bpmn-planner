# Quick Start: Förbättra Feature Goal-dokumentation

**Denna guide är en kort påminnelse för att komma igång snabbt. För fullständig dokumentation, se `MANUAL_HTML_WORKFLOW.md`.**

**🤖 Viktigt:** Endast innehållsförbättringar är manuellt - allt annat är automatiskt via scripts.

## 🚀 Snabbstart (3 steg)

### Steg 1: Automatisk identifiering och uppdatering (kör alla scripts)

**Kör dessa 3 scripts i ordning - allt är automatiskt:**

```bash
# 1. Analysera skillnader mellan BPMN-filer och dokumentation
npx tsx scripts/analyze-feature-goal-sync.ts

# 2. Uppdatera automatiskt filer med saknade aktiviteter
npx tsx scripts/auto-update-feature-goal-docs.ts

# 3. Generera status-lista över alla filer
npx tsx scripts/generate-feature-goal-status.ts
```

**Vad scripts gör automatiskt:**
- ✅ Identifierar filer som behöver uppdateras
- ✅ Lägger till saknade aktiviteter i "Omfattning"-sektionen
- ✅ Skapar/uppdaterar status-lista med alla filer
- ✅ Identifierar orphaned dokumentation

**Resultat:**
- Sync-rapport: `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/feature-goal-sync-report.md`
- Status-lista: `docs/feature-goals/FEATURE_GOAL_STATUS.md`

### Steg 2: Förbättra innehållet (endast manuellt steg)

**Öppna status-filen:**
```bash
code docs/feature-goals/FEATURE_GOAL_STATUS.md
```

**Arbeta systematiskt:**
- Börja med första filen i listan (under "✅ Matchade Feature Goals")
- Följ ordningen i listan
- **Fokusera endast på innehållsförbättringar** (se nedan)
- Markera med `[x]` när klar

**Viktiga filer och mappar:**
- **BPMN-filer:** `tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/`
- **HTML-filer:** `public/local-content/feature-goals/`
- **bpmn-map.json:** `bpmn-map.json` (för att hitta processer)

**Endast manuellt arbete - förbättra innehållet:**

1. **Hitta BPMN-filer** (använd bpmn-map.json):
   - Feature goal-processen: `{subprocess_bpmn_file}`
   - Parent-processen: `{parent_bpmn_file}`
   - Relaterade processer: Call activities i feature goal-processen

2. **Analysera BPMN** (för att förstå innehållet):
   - Alla aktiviteter, gateways, events
   - Flöde, sekvens, multi-instance, parallellitet
   - Error handling

3. **Förbättra HTML-innehåll** (endast manuellt steg):
   - Öppna: `public/local-content/feature-goals/{filename}-v2.html`
   - Uppdatera alla sektioner baserat på BPMN-analys
   - **VIKTIGT:** Ersätt ALLA tekniska ID:n (t.ex. `Gateway_1v59ktc`) med beskrivande namn
   - Gör texten lättläst och affärsorienterad
   - Se `MANUAL_HTML_WORKFLOW.md` för detaljerade riktlinjer per sektion

4. **Markera som klar:**
   - Uppdatera `FEATURE_GOAL_STATUS.md` med `[x]`

## 📋 Checklista för varje fil

- [ ] Analyserat feature goal-processen (subprocess BPMN-fil)
- [ ] Analyserat parent-processen (hur anropas feature goal?)
- [ ] Analyserat relaterade processer (call activities, nästa processer)
- [ ] Identifierat alla aktiviteter, gateways, events
- [ ] Uppdaterat "Beskrivning av FGoal" (tydlig, affärsorienterad, nämner vem som utför)
- [ ] Uppdaterat "Processteg - Input" (entry point, data, förutsättningar)
- [ ] Uppdaterat "Processteg - Output" (resultat, error events, felmeddelanden)
- [ ] Uppdaterat "Omfattning" (alla aktiviteter, gateways, events, sekvens)
- [ ] Uppdaterat "Beroenden" (externa system, API:er)
- [ ] Uppdaterat "BPMN - Process" (processflöde, sekvens)
- [ ] Uppdaterat "Effekt" (specifik, mätbar, kopplad till processsteg)
- [ ] Uppdaterat "User stories" (specifik, kopplad till processsteg, kategoriserad)
- [ ] Uppdaterat "Acceptanskriterier" (specifik, testbar, kopplad till processsteg)
- [ ] Ersatt ALLA tekniska ID:n med beskrivande namn
- [ ] Verifierat i appen (`npm run dev`)
- [ ] Markerat som klar i `FEATURE_GOAL_STATUS.md`

## 🎯 Viktiga riktlinjer

### Kvalitet före hastighet
- ❌ **SLARVA INTE** - Varje fil ska uppdateras till perfektion
- ❌ **TA INGA SHORTCUTS** - Gå igenom varje fil grundligt
- ✅ **KVALITET ÄR ALLT** - Tid är inte viktigt, kvalitet är det enda som räknas

### Undvik tekniska ID:n
- ❌ `Gateway_1v59ktc` → ✅ "KALP OK?" gateway
- ❌ `Event_111bwbu` → ✅ "Timeout" event
- ❌ `Activity_1mezc6h` → ✅ "Confirm application" user task

### Var specifik
- ❌ "Systemet hämtar data" → ✅ "Systemet hämtar kreditinformation via 'Fetch credit information' service task från UC3 API"
- ❌ "Processen avslutas" → ✅ "Processen avslutas med 'Application rejected' error event om KALP-beräkningen visar att maximalt lånebelopp är under tröskelvärde"

### Koppla till BPMN
- Alla beskrivningar ska vara kopplade till faktiska BPMN-element
- Nämn specifika call activities, gateways, error events
- Beskriv sekvens och flöde tydligt

## 📁 Viktiga filer och mappar

```
bpmn-map.json                                    # Mappning mellan processer
tests/fixtures/bpmn/mortgage-se YYYY.MM.DD HH:MM/  # BPMN-arkivmappar
public/local-content/feature-goals/              # HTML-filer (här redigerar du)
docs/feature-goals/FEATURE_GOAL_STATUS.md       # Status-lista
docs/feature-goals/MANUAL_HTML_WORKFLOW.md      # Fullständig dokumentation
```

## 🔧 Scripts

```bash
# Analysera skillnader
npx tsx scripts/analyze-feature-goal-sync.ts

# Uppdatera automatiskt
npx tsx scripts/auto-update-feature-goal-docs.ts

# Generera status-lista
npx tsx scripts/generate-feature-goal-status.ts

# Förbättra läsbarhet (collapsible sections)
npx tsx scripts/improve-feature-goal-readability.ts

# Arkivera BPMN-filer
npx tsx scripts/archive-bpmn-files.ts <source-dir>
```

## 💡 Tips

1. **Arbeta en fil i taget** - Fokusera på en fil tills den är helt klar
2. **Använd BPMN-filer som källa** - All information ska komma från BPMN-filerna
3. **Testa i appen** - Verifiera att filen visas korrekt (`npm run dev`)
4. **Markera direkt** - Markera filen som förbättrad i status-listan direkt efter att du är klar
5. **Läs MANUAL_HTML_WORKFLOW.md** - För detaljerade riktlinjer per sektion och målgrupp

## 🆘 Om du glömt något

**För fullständig dokumentation:**
- Se `docs/feature-goals/MANUAL_HTML_WORKFLOW.md` för detaljerade instruktioner
- Se `docs/feature-goals/TEST_SCENARIOS_ANALYSIS.md` för testscenarier-checklista

**För att komma igång igen:**
1. Kör de 3 scripten i Steg 1
2. Öppna `FEATURE_GOAL_STATUS.md`
3. Välj första filen som inte är markerad med `[x]`
4. Följ checklistan ovan

