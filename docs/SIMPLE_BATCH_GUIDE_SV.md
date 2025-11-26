# Super Enkel Guide: Batch-Generera för 200+ Noder

## Snabbstart (2 kommandon)

```bash
# 1. Hitta alla filer som behöver fyllas i
node scripts/batch-generate-overrides.mjs

# 2. Kopiera instruktionen som visas och klistra in i Codex-chatten
```

Det är allt! 🎉

---

## Detaljerad Guide

### Steg 1: Kör scriptet

Öppna terminalen i projektets rotmapp och kör:

```bash
node scripts/batch-generate-overrides.mjs
```

Detta kommer att:
- ✅ Söka igenom alla override-filer
- ✅ Hitta alla som har `TODO`-platshållare
- ✅ Visa statistik
- ✅ Generera en färdig instruktion för Codex

### Steg 2: Kopiera instruktionen

Scriptet visar en färdig instruktion som du kopierar och klistrar in i Codex-chatten (i Cursor).

### Steg 3: Codex gör resten

Codex kommer automatiskt att:
1. Läsa varje fil
2. Hämta rätt prompt
3. Generera innehåll
4. Uppdatera filerna

---

## Alternativ: Generera för specifik mapp eller BPMN-fil

### Alla epics i en mapp:
```bash
node scripts/batch-generate-overrides.mjs src/data/node-docs/epic
```

### Alla noder i en specifik BPMN-fil:
```bash
node scripts/batch-generate-overrides.mjs mortgage-se-application.bpmn
```

### Alla feature-goals:
```bash
node scripts/batch-generate-overrides.mjs src/data/node-docs/feature-goal
```

---

## Exempel-Output

När du kör scriptet ser du något sånt här:

```
🔍 Söker efter override-filer...

📊 Statistik:
   Totalt antal override-filer: 247
   Filer med TODO-platshållare: 189
   Filer utan TODO: 58

📁 Filer med TODO, grupperade per typ:
   feature-goal: 45 filer
   epic: 132 filer
   business-rule: 12 filer

======================================================================
📋 INSTRUKTION FÖR CODEX:
======================================================================

Kopiera och klistra in detta i Codex-chatten:

```
Använd codexBatchOverrideHelper för att batch-generera innehåll
för 189 override-filer med TODO-platshållare.

För varje fil:
1. Använd parseOverrideFileContext() för att läsa filen
2. Använd getCodexGenerationInstructions() för att få rätt prompt
3. Generera JSON enligt promptens instruktioner (svenska, formell bankton)
4. Använd mapLlmResponseToOverrides() för att konvertera till override-format
5. Uppdatera filen - ersätt ENDAST TODO-platshållare, behåll allt annat

Filer att bearbeta:
- src/data/node-docs/feature-goal/mortgage-se-application.household.doc.ts
- src/data/node-docs/epic/mortgage-se-application.confirm-application.doc.ts
... och 187 fler filer
```

💾 Fil-lista sparad i: .codex-batch-files.txt
```

---

## Om du har många filer (200+)

Codex kan behöva bearbeta filerna i batchar. Säg till Codex:

```
Bearbeta filerna i batchar om 20-30 filer åt gången.
När en batch är klar, fortsätt med nästa.
```

Eller be Codex att börja med en specifik typ:

```
Börja med alla epic-filer först, sedan feature-goals, sedan business-rules.
```

---

## Verifiera resultatet

Efter att Codex är klar:

```bash
# Se vad som ändrats
git diff src/data/node-docs/

# Eller se status
git status src/data/node-docs/
```

---

## Felsökning

### Scriptet hittar inga filer
- Kontrollera att du är i projektets rotmapp
- Kontrollera att `src/data/node-docs/` finns

### Codex genererar fel innehåll
- Se till att Codex använder `getCodexGenerationInstructions()`
- Kontrollera att prompten från `prompts/llm/` används

### För många filer på en gång
- Be Codex att bearbeta i mindre batchar
- Eller kör scriptet för en specifik mapp i taget

---

## Snabbkommandon

Lägg till detta i din `package.json` för enklare användning:

```json
{
  "scripts": {
    "batch-overrides": "node scripts/batch-generate-overrides.mjs",
    "batch-overrides:epic": "node scripts/batch-generate-overrides.mjs src/data/node-docs/epic",
    "batch-overrides:feature": "node scripts/batch-generate-overrides.mjs src/data/node-docs/feature-goal"
  }
}
```

Då kan du köra:
```bash
npm run batch-overrides
npm run batch-overrides:epic
npm run batch-overrides:feature
```

---

## Sammanfattning

1. **Kör scriptet**: `node scripts/batch-generate-overrides.mjs`
2. **Kopiera instruktionen** som visas
3. **Klistra in i Codex**-chatten
4. **Vänta** medan Codex bearbetar filerna
5. **Verifiera** med `git diff`

Klart! 🚀

