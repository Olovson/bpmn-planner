# Global Testing Rules - Permanent Policy

## ⚠️ PERMANENT RULE för ALL kod, ALLA projekt, för ALLTID

Detta dokument beskriver permanenta regler som gäller för ALL kod som skrivs, oavsett projekt.

## Regel 1: ALDRIG duplicera produktionslogik i tester

**Varför:** Duplicerad logik betyder att tester kan passera medan produktionen misslyckas. Detta ger falsk trygghet och gör felsökning omöjlig.

**Vad att göra:**
- IMPORTERA och använd alltid den faktiska produktionskoden
- Om produktionskoden inte exporterar vad du behöver, exportera den från produktion först, sedan importera i tester
- Om du hittar dig själv kopiera kod från produktion till tester, STOPPA OMEDELBART

## Regel 2: ALDRIG skapa fallback-lösningar i tester

**Varför:** Fallback-lösningar döljer buggar och gör felsökning omöjlig. Om produktionen misslyckas, ska testerna också misslyckas.

**Vad att göra:**
- Använd endast fallbacks för testisolering (t.ex. `tmpdir()` för filoperationer)
- Skapa aldrig fallback-implementationer av produktionslogik
- Om produktionskoden behöver en fallback, ska den vara i produktionskoden, inte i tester

## Regel 3: Tester måste använda samma kodvägar som produktion

**Varför:** Detta är det ENDA sättet att säkerställa att tester fångar buggar i produktionskoden.

**Vad att göra:**
- Importera produktionsfunktioner direkt
- Använd samma parametrar och returtyper
- Testa det faktiska beteendet, inte en mock av det

## Regel 4: Mocka endast externa beroenden

**Vad att mocka:**
- Externa API:er
- Databaser (för isolering)
- Filsystem (använd `tmpdir()` för isolering)
- Nätverksförfrågningar

**Vad INTE att mocka:**
- Intern produktionskod som du testar
- Affärslogik
- Verktygsfunktioner från din egen kodbas

## Implementering

### För nya projekt:
1. Kopiera `.cursorrules-template` till `.cursorrules` i projektets rot
2. Lägg till projekt-specifika regler efter testreglerna

### För befintliga projekt:
1. Lägg till testreglerna i projektets `.cursorrules`
2. Se `.cursorrules-template` för exempel

### Cursor Memory (om tillgängligt):
Om Cursor har en Memory-funktion, lägg till denna regel där för global tillämpning.

## Kom ihåg

**Tester ska validera produktionskod, inte en kopia av den.**

Om du duplicerar logik eller skapar fallbacks, testar du inte produktionskoden - du testar en annan implementation som råkar vara liknande.

