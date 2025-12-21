# Batch-generering av Dokumentation

## Codex Batch Auto (Rekommenderat)

För att batch-generera innehåll för många noder med Codex:

```bash
# 1. Skapa instruktionsfil
npm run codex:batch:auto

# 2. Öppna Codex-chatten i Cursor och säg:
# "Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.
#  VIKTIGT: Skriv ALDRIG över befintligt innehåll - ersätt bara 'TODO', tomma arrayer [], eller tomma strängar ''.
#  Fortsätt från fil 1 till sista filen utan att stoppa eller fråga.
#  Bearbeta filerna en i taget, men kontinuerligt."
```

Detta kommer att:
- Hitta alla override-filer med TODO-platshållare eller gamla prompt-versioner
- Skapa en instruktionsfil (`.codex-batch-all.md`) med detaljerade instruktioner per fil
- Codex bearbetar alla filer automatiskt och uppdaterar bara TODO-fält

Se `docs/CODEX_BATCH_AUTO.md` för fullständig dokumentation.

## Prompt-versionering

När du uppdaterar prompt-mallarna (`prompts/llm/*.md`):

```bash
# 1. Uppdatera versionen i prompt-filen (t.ex. 1.0.0 → 1.1.0)
# 2. Kontrollera vilka filer som påverkas
npm run check:prompt-versions

# 3. Re-generera innehåll
npm run codex:batch:auto
```

Se `docs/PROMPT_VERSIONING.md` för detaljer.

## Skapa Override-filer

```bash
# Skapa override-filer för alla BPMN-filer
npm run create:all-node-docs

# Skapa override-filer för en specifik BPMN-fil
npm run create:node-docs-from-bpmn mortgage-se-application.bpmn

# Skapa en enskild override-fil
npm run create:node-doc feature-goal mortgage-se-application.bpmn household
```
