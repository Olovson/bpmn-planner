# Jämförelse: Epic Prompt vs Template

**Datum:** 2025-12-28

## Översikt

Detta dokument jämför Epic-prompten med Epic-mallen för att säkerställa att de stämmer överens.

## EpicDocModel Struktur

### ✅ Prompt och Template Stämmer Överens

**Prompt säger:**
- Obligatoriska: `summary`, `flowSteps`, `userStories`
- Valfria: `interactions` (endast för User Tasks), `dependencies` (valfritt men rekommenderat)

**Template förväntar:**
- `summary: string` (obligatoriskt)
- `flowSteps: string[]` (obligatoriskt)
- `interactions?: string[]` (valfritt)
- `dependencies?: string[]` (valfritt)
- `userStories: EpicUserStory[]` (obligatoriskt)

✅ **Stämmer överens!**

## HTML-Mall vs Prompt Instruktioner

### ✅ Conditional Rendering

**Template:**
- Alla sektioner (utom Header) är conditional - visas endast om innehåll finns
- Inga fallback-texter

**Prompt:**
- Inga instruktioner om fallback-texter
- Tydliga instruktioner om att LLM måste generera allt

✅ **Stämmer överens!**

## Dependencies

### ✅ Format och Instruktioner

**Prompt säger:**
- Format: `"Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."`
- Inkluderar både process-kontext och tekniska system
- Tydliga exempel på bra vs dåliga dependencies
- Varningar mot generiska beskrivningar

**Template:**
- Renderar dependencies som en lista (ingen specifik formatering)
- Kommentar: "Inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra)"

✅ **Stämmer överens!**

## Exempel i Prompten

### ⚠️ Inkonsistens: Epic-exemplen saknar dependencies

**Problem:**
- Epic-exemplen (User Task och Service Task) innehåller INTE `dependencies`-fältet
- Prompten säger att dependencies är "valfritt men rekommenderat"
- Detta kan göra att LLM tror att dependencies inte är viktigt

**Rekommendation:**
- Lägg till `dependencies`-fält i Epic-exemplen för att visa formatet och betona vikten

**Exempel på vad som saknas:**
```json
{
  "summary": "...",
  "flowSteps": [...],
  "interactions": [...], // endast för User Tasks
  "dependencies": [
    "Beroende: Process; Id: application; Beskrivning: Ansökningsprocessen måste vara slutförd med komplett kund- och ansökningsdata.",
    "Beroende: Kunddatabas; Id: internal-customer-db; Beskrivning: tillhandahåller grundläggande kundinformation och historik."
  ],
  "userStories": [...]
}
```

## Sammanfattning

### ✅ Vad som stämmer:
1. EpicDocModel struktur
2. Obligatoriska vs valfria fält
3. Conditional rendering i template
4. Inga fallback-texter
5. Dependencies-format och instruktioner

### ⚠️ Vad som behöver fixas:
1. **Epic-exemplen saknar `dependencies`-fält** - bör läggas till för att visa formatet och betona vikten

## Rekommendation

Lägg till `dependencies`-fält i Epic-exemplen (både User Task och Service Task) för att:
1. Visa formatet för dependencies
2. Betona att dependencies är rekommenderat även om det är valfritt
3. Ge LLM konkreta exempel på hur dependencies ska se ut

