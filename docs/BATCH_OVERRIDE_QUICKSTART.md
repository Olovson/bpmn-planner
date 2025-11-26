# 🚀 Snabbstart: Batch-Generera för 200+ Noder

## Två kommandon - Klart!

```bash
# 1. Hitta alla filer som behöver fyllas i
npm run batch-overrides

# 2. Kopiera instruktionen som visas och klistra in i Codex-chatten
```

**Det är allt!** Codex gör resten automatiskt. 🎉

---

## ⚠️ Om Codex kraschar

**Ingen fara!** Systemet har checkpoint/resume-stöd:

```bash
# Återuppta från där Codex slutade
npm run batch-overrides:resume
```

Detta kommer bara bearbeta filer som **INTE** redan är klara.

---

## Vad händer?

1. **Scriptet söker** igenom alla override-filer
2. **Hittar alla** med `TODO`-platshållare  
3. **Visar statistik** (hur många filer behöver fyllas i)
4. **Genererar en färdig instruktion** för Codex
5. **Skapar batchar** (25 filer per batch för att undvika överbelastning)

Du kopierar instruktionen → Klistrar in i Codex → Codex gör jobbet automatiskt.

---

## Checkpoint/Resume-system

Systemet sparar automatiskt vilka filer som är klara i `.codex-batch-checkpoint.json`.

### Efter varje batch:
1. Uppdatera checkpoint-filen med klara filer
2. Codex kan då återuppta från rätt ställe om den kraschar

### Om Codex kraschar:
```bash
npm run batch-overrides:resume
```

### För att starta om från början:
```bash
npm run batch-overrides:clear
```

---

## Alternativ

### Alla epics:
```bash
npm run batch-overrides:epic
```

### Alla feature-goals:
```bash
npm run batch-overrides:feature
```

### Alla business-rules:
```bash
npm run batch-overrides:business-rule
```

### Specifik BPMN-fil:
```bash
npm run batch-overrides mortgage-se-application.bpmn
```

---

## Efter att Codex är klar

```bash
# Se vad som ändrats
git diff src/data/node-docs/
```

---

## Checkpoint-fil format

Checkpoint-filen (`.codex-batch-checkpoint.json`) ser ut så här:

```json
{
  "completed": [
    "src/data/node-docs/epic/file1.doc.ts",
    "src/data/node-docs/epic/file2.doc.ts"
  ],
  "started": [],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Lägg till filer i `completed`-arrayen när de är klara.

---

## Mer info?

Se `docs/SIMPLE_BATCH_GUIDE_SV.md` för detaljerad guide.
