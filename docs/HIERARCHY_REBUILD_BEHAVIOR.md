# Hierarki Återskapas Varje Gång - Förklaring

## Nuvarande Beteende

**Ja, hierarkin återskapas varje gång du genererar dokumentation med ChatGPT**, även om du redan har lokal dokumentation.

### Varför?

1. **`generateAllFromBpmnWithGraph`** anropas varje gång
2. Denna funktion bygger BPMN-processgrafen från scratch med `buildBpmnProcessGraph()` (rad 1282 i `bpmnGenerators.ts`)
3. Det finns **ingen caching** av grafen för närvarande

### Processen

```
Användare klickar "Generera dokumentation"
  ↓
generateAllFromBpmnWithGraph() anropas
  ↓
buildBpmnProcessGraph() bygger om hela grafen
  ↓
buildNodeDocumentationContext() bygger kontext för varje nod
  ↓
generateDocumentationWithLlm() genererar dokumentation
```

## Är Detta Önskat?

### Fördelar med att bygga om varje gång:
- ✅ **Uppdaterad hierarki**: Om BPMN-filer har ändrats, får du alltid den senaste strukturen
- ✅ **Korrekt kontext**: ChatGPT får alltid korrekt kontext baserat på aktuell BPMN-struktur
- ✅ **Ingen stale data**: Inga problem med gammal cachad hierarki

### Nackdelar:
- ⚠️ **Ineffektivt**: Om inget har ändrats, bygger vi om samma struktur varje gång
- ⚠️ **Långsamt**: För stora hierarkier kan det ta tid att bygga om grafen
- ⚠️ **Onödigt**: Om du bara vill uppdatera dokumentation för en specifik nod

## Borde Detta Ändras?

### Alternativ 1: Caching (Rekommenderat)
Implementera caching av `BpmnProcessGraph`:
- Cache grafen baserat på filnamn + filändringstid
- Bygg om endast om BPMN-filer har ändrats
- Snabbare för upprepade genereringar

### Alternativ 2: Inkrementell uppdatering
- Behåll befintlig graf i minnet
- Uppdatera endast ändrade delar
- Mer komplex men mycket snabbare

### Alternativ 3: Behåll nuvarande beteende
- Enklare kod
- Alltid korrekt hierarki
- Men långsammare för upprepade genereringar

## Rekommendation

**För nu: Behåll nuvarande beteende** eftersom:
1. Det säkerställer att ChatGPT alltid får korrekt, uppdaterad kontext
2. Det är viktigare med korrekt innehåll än snabbhet
3. Caching kan introducera buggar om BPMN-filer ändras

**För framtiden: Implementera caching** med:
- Filändringstid som cache-key
- Automatisk invalidering när filer ändras
- Manuell "force rebuild"-knapp

---

**Datum:** 2025-11-26
**Status:** Nuvarande beteende är avsiktligt och korrekt, men kan optimeras med caching i framtiden

