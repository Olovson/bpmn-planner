# 🚀 Super Enkel Guide: Kör Alla BPMN Noder

## Steg 1: Öppna Terminal

1. Öppna Terminal-appen på din Mac
2. Navigera till projektet:
```bash
cd /Users/magnusolovson/Documents/Projects/bpmn-planner
```

## Steg 2: Skapa Instruktionsfil

Kör detta kommando:
```bash
npm run codex:batch:auto
```

Detta skapar en fil som heter `.codex-batch-all.md` med alla instruktioner för Codex.

## Steg 3: Öppna Codex i Cursor

1. Öppna Cursor (din kodredigerare)
2. Öppna Codex-chatten (Cmd+L eller klicka på Codex-ikonen)

## Steg 4: Kopiera och Klistra In

Kopiera denna text och klistra in i Codex-chatten:

```
Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.

VIKTIGT: Skriv ALDRIG över befintligt innehåll - ersätt bara fält som är:
- "TODO" (exakt strängen)
- Tomma arrayer: []
- Tomma strängar: ''

Fortsätt från fil 1 till sista filen utan att stoppa eller fråga.
Bearbeta filerna en i taget, men kontinuerligt.
```

Tryck Enter.

## Steg 5: Vänta (Codex arbetar automatiskt)

Codex kommer nu att:
- Läsa instruktionsfilen
- Bearbeta alla filer en i taget
- Uppdatera statusfilen automatiskt
- **Fråga INTE om den ska fortsätta** - den bara fortsätter

## Steg 6: Kolla Status (valfritt)

Öppna en ny terminal och kör:
```bash
cat .codex-batch-status.json
```

Detta visar hur många filer som är klara.

## Klart! 🎉

När Codex är klar kan du:
- Kolla resultatet: `git diff src/data/node-docs/`
- Se vilka filer som ändrats
- Granska innehållet i filerna

---

## Tips

- **Lämna Codex ifred** - den arbetar automatiskt
- **Kolla status** när du vill se framsteg
- **Var tålmodig** - det kan ta tid för många filer

## Om något går fel

- Codex kommer hoppa över problematiska filer och fortsätta
- Du kan alltid köra kommandot igen - det uppdaterar bara filer med 'TODO'
- Befintligt innehåll skrivs ALDRIG över

