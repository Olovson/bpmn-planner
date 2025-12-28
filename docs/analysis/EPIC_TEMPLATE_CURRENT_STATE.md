# Epic Mallar - Nuvarande Tillstånd

**Datum:** 2025-12-28

## EpicDocModel Struktur

```typescript
export interface EpicDocModel {
  summary: string;                    // Obligatoriskt
  flowSteps: string[];                // Obligatoriskt
  interactions?: string[];            // Valfritt - endast för User Tasks
  dependencies?: string[];            // Valfritt - inkluderar både process-kontext och tekniska system
  userStories: EpicUserStory[];       // Obligatoriskt - 3-6 user stories
}
```

## HTML-Mall Struktur

Epic-mallen renderar följande sektioner (alla conditional - visas endast om innehåll finns):

1. **Header** (alltid synlig)
   - Badge: "Epic"
   - Nodnamn
   - Typ och processsteg
   - BPMN-element, kreditprocess-steg, swimlane/ägare

2. **Sammanfattning** (conditional - visas endast om `summary` finns)
   - 2-4 meningar om syfte och värde

3. **Funktionellt flöde** (conditional - visas endast om `flowSteps.length > 0`)
   - 4-6 steg som beskriver epikens ansvar

4. **Interaktioner** (conditional - visas endast om `interactions.length > 0` och `interactionsSource !== 'missing'`)
   - 2-3 strängar om kanal, UX och interaktionsmönster
   - Endast för User Tasks

5. **Beroenden** (conditional - visas endast om `dependencies.length > 0`)
   - Inkluderar både process-kontext (vad måste vara klart före) och tekniska system (vad behövs för att köra)
   - Format: `"Beroende: <typ>; Id: <beskrivande namn>; Beskrivning: <kort förklaring>."`

6. **User Stories** (conditional - visas endast om `userStories.length > 0`)
   - 3-6 user stories med acceptanskriterier
   - Format: "Som [role] vill jag [goal] så att [value]"

## Viktiga Egenskaper

### ✅ Inga Fallback-värden
- Alla sektioner kräver LLM-genererat innehåll
- Om innehåll saknas, visas sektionen inte (conditional rendering)

### ✅ Minimum-Mall
- Fokus på det som ger reellt värde
- Inga generiska fallback-texter
- Sektioner visas endast om de har innehåll

### ✅ Dependencies Konsoliderat
- Både process-kontext (tidigare "prerequisites") och tekniska system i samma sektion
- Tydliga formatkrav för att undvika generiska beskrivningar
- Exempel på bra vs dåliga dependencies

## Jämförelse: Före vs Efter

| Aspekt | Före | Efter |
|--------|------|-------|
| **Prerequisites** | Separat sektion (obligatorisk) | Konsoliderat i Dependencies |
| **Dependencies** | Valfritt, generiska fallback-texter | Valfritt men rekommenderat, specifika formatkrav |
| **Fallback-innehåll** | Generiska texter för flowSteps, interactions, dependencies | Inga fallback-texter - allt måste genereras av LLM |
| **Sektioner** | Alltid synliga (även om tomma) | Conditional - visas endast om innehåll finns |
| **Antal sektioner** | 7 (Header + 6 alltid synliga) | 1-6 (Header + 0-5 conditional) |

## Förväntat Resultat

Ett Epic-dokument kan nu innehålla:
- **Minimum:** Header + Sammanfattning + Funktionellt flöde + User Stories (4 sektioner)
- **Maximum:** Header + Sammanfattning + Funktionellt flöde + Interaktioner + Beroenden + User Stories (6 sektioner)
- **Typiskt:** 4-5 sektioner (beroende på om det är User Task eller Service Task, och om dependencies finns)

