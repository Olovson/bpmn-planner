# 🚀 Codex Batch - Super Enkel Guide

## Ett kommando - Klart!

```bash
npm run codex:batch
```

Det är allt! 🎉

---

## Vad händer?

1. **Scriptet hittar** alla override-filer med TODO-platshållare
2. **Analyserar** vad som behöver fyllas i
3. **Visar färdiga instruktioner** direkt i terminalen
4. **Du kopierar** instruktionen och klistrar in i Codex-chatten
5. **Codex bearbetar** filerna automatiskt

---

## Steg-för-steg

### 1. Kör kommandot

```bash
npm run codex:batch
```

### 2. Kopiera instruktionen

Scriptet visar en färdig instruktion i terminalen. Kopiera allt från ```` till ````.

### 3. Klistra in i Codex

Öppna Codex-chatten i Cursor och klistra in instruktionen.

### 4. Codex gör jobbet

Codex kommer att:
- Läsa varje fil
- Hitta rätt prompt
- Generera innehåll
- Uppdatera filerna (ersätter bara TODO, behåller allt annat)

---

## Alternativ

### Bara epics:
```bash
npm run codex:batch:epic
```

### Bara feature-goals:
```bash
npm run codex:batch:feature
```

### Bara business-rules:
```bash
npm run codex:batch:business-rule
```

---

## Viktigt

⚠️ **Codex skriver INTE över befintligt innehåll!**
- Ersätter bara `'TODO'`, tomma arrayer `[]`, eller tomma strängar `''`
- Behåller allt annat innehåll oförändrat

---

## Efter att Codex är klar

```bash
# Se vad som ändrats
git diff src/data/node-docs/
```

---

## Exempel-output

När du kör `npm run codex:batch` ser du:

```
🚀 Codex Batch Override Generation

📊 Hittade 6 override-filer
   ✅ 1 filer är redan ifyllda
   ⚠️  5 filer behöver uppdateras

📋 INSTRUKTION FÖR CODEX - Kopiera och klistra in i Codex-chatten:

```
Jag vill att du batch-genererar innehåll för override-filer.
...
```

Kopiera instruktionen → Klistra in i Codex → Klart!

---

## Sammanfattning

1. **Kör:** `npm run codex:batch`
2. **Kopiera** instruktionen från terminalen
3. **Klistra in** i Codex-chatten
4. **Klar!** 🎉

