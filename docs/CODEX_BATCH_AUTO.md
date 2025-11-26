# 🚀 Codex Batch Auto - Fullt Automatiserat

## Ett kommando - Klart!

```bash
npm run codex:batch:auto
```

Detta skapar en fil (`.codex-batch-all.md`) med alla instruktioner.

## Sedan - En enkel instruktion till Codex

Öppna Codex-chatten i Cursor och säg:

```
Läs filen .codex-batch-all.md och bearbeta ALLA filer där automatiskt.
Fortsätt från fil 1 till sista filen utan att stoppa eller fråga.
Bearbeta filerna en i taget, men kontinuerligt.
```

**Det är allt!** Codex bearbetar alla filer automatiskt.

---

## Vad händer?

1. **Du kör:** `npm run codex:batch:auto`
   - Scriptet hittar alla filer med TODO-platshållare
   - Skapar en fil (`.codex-batch-all.md`) med alla instruktioner

2. **Du säger till Codex:** "Läs .codex-batch-all.md och bearbeta alla filer"
   - Codex läser filen
   - Bearbetar alla filer en i taget
   - Uppdaterar bara TODO-fält
   - Behåller allt annat innehåll

3. **Klar!** 🎉

---

## För många filer? Bearbeta i batchar

Om du har 100+ filer, be Codex att bearbeta i batchar:

```
Läs filen .codex-batch-all.md och bearbeta filerna i batchar om 20-25 filer åt gången.
När en batch är klar, kontrollera resultatet innan du fortsätter.
```

Eller bearbeta per typ:

```
Läs filen .codex-batch-all.md och bearbeta bara epic-filerna först.
När alla epics är klara, gå vidare till feature-goals.
```

---

## Efter att Codex är klar

```bash
# Se vad som ändrats
git diff src/data/node-docs/
```

---

## Sammanfattning

1. **Kör:** `npm run codex:batch:auto`
2. **Säg till Codex:** "Läs .codex-batch-all.md och bearbeta alla filer"
3. **Klar!** 🎉

Ingen manuell kopiering, ingen mikro-hantering - bara köra och låta Codex göra jobbet!

