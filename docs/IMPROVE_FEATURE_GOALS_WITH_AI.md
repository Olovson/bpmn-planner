# Förbättra Feature Goal HTML med AI

Denna guide beskriver hur du kan använda AI (t.ex. ChatGPT/Cursor) för att förbättra innehållet i Feature Goal HTML-dokumentation.

## Workflow

```
1. Export → 2. Förbättra med AI → 3. Import
```

### Steg 1: Exportera HTML-filer

Exportera alla Feature Goal HTML-filer från Supabase Storage till lokal disk:

```bash
npm run export:feature-goals
```

Detta skapar:
- `exports/feature-goals/` - mapp med alla HTML-filer
- `exports/feature-goals/README.md` - index med information om exporterade filer

### Steg 2: Förbättra med AI

#### Alternativ A: Förbättra enskilda filer

1. Öppna en HTML-fil från `exports/feature-goals/` i din editor
2. Kopiera innehållet och ge till AI med instruktioner som:

```
Jag har en Feature Goal HTML-fil som behöver förbättras. 
Analysera innehållet och förbättra:
- Beskrivningen av FGoal (gör den mer detaljerad och konkret)
- Processteg Input/Output (lägg till fler relevanta inputs/outputs)
- Omfattning (specificera tydligare vad som ingår)
- Avgränsning (specificera tydligare vad som inte ingår)
- Beroenden (uppdatera beroenden till satelitteam)

Behåll HTML-strukturen och formateringen, uppdatera bara innehållet.
```

3. Kopiera den förbättrade HTML-koden tillbaka till filen
4. Spara filen

#### Alternativ B: Batch-förbättring

1. Öppna flera HTML-filer samtidigt
2. Ge AI instruktioner för att förbättra alla:

```
Jag har flera Feature Goal HTML-filer som behöver förbättras.
För varje fil, analysera och förbättra innehållet enligt:
- Mer detaljerad beskrivning
- Fler relevanta inputs/outputs
- Tydligare omfattning och avgränsning
- Uppdaterade beroenden

Lista alla filer och ge förbättringar för varje.
```

3. Uppdatera filerna med de förbättrade versionerna

### Steg 3: Importera förbättrade filer

Ladda uppb de förbättrade HTML-filerna tillbaka till Supabase Storage:

```bash
npm run import:feature-goals
```

Detta:
- Läser alla HTML-filer från `exports/feature-goals/`
- Laddar uppb dem till rätt plats i Supabase Storage
- Bevarar mode-information (local, slow/chatgpt, etc.)
- Skapar även legacy-kopior för bakåtkompatibilitet

## Tips för AI-förbättringar

### Vad ska förbättras?

1. **Beskrivning av FGoal**
   - Gör den mer konkret och detaljerad
   - Inkludera specifika aktiviteter och steg
   - Beskriv affärsvärdet

2. **Processteg - Input**
   - Lista alla relevanta inputs
   - Specificera datatyper och format
   - Inkludera preconditions

3. **Processteg - Output**
   - Lista alla outputs
   - Specificera format och struktur
   - Beskriv vad som skickas vidare

4. **Omfattning**
   - Specificera tydligt vad som ingår
   - Lista alla funktioner och features
   - Inkludera edge cases som hanteras

5. **Avgränsning**
   - Specificera tydligt vad som INTE ingår
   - Lista begränsningar
   - Inkludera framtida utökningar (om relevant)

6. **Beroenden**
   - Uppdatera beroenden till satelitteam
   - Specificera typ av beroende (API, data, etc.)
   - Inkludera SLA-krav (om relevant)

### Exempel på AI-prompt

```
Analysera denna Feature Goal HTML-fil och förbättra innehållet:

[Klistra in HTML-innehållet här]

Förbättringar att göra:
1. Beskrivning: Gör den mer detaljerad med konkreta aktiviteter
2. Input: Lägg till fler relevanta inputs baserat på BPMN-processen
3. Output: Specificera tydligare vad som produceras
4. Omfattning: Lista alla funktioner som ingår
5. Avgränsning: Specificera tydligt vad som inte ingår
6. Beroenden: Uppdatera till korrekta satelitteam

Behåll HTML-strukturen och formateringen, uppdatera bara innehållet.
Ge mig den förbättrade HTML-koden.
```

## Verifiering

Efter import kan du:

1. Öppna appen och navigera till Feature Goal-dokumentationen
2. Verifiera att förbättringarna syns korrekt
3. Kontrollera att alla länkar och formatering fungerar

## Felsökning

### Filen importeras inte

- Kontrollera att filen har rätt format: `{mode}--{bpmnFile}-{elementId}.html` eller `{bpmnFile}-{elementId}.html`
- Kontrollera att filen är en giltig HTML-fil
- Kontrollera att `.env.local` har rätt Supabase-credentials

### Förbättringar syns inte i appen

- Kontrollera att importen lyckades (inga fel i terminalen)
- Rensa webbläsarens cache
- Kontrollera att filen finns i Supabase Storage (via Supabase Dashboard)

## Nästa steg

Efter att ha förbättrat Feature Goal-dokumentationen kan du:

1. Generera om dokumentationen med LLM för att få ännu bättre innehåll
2. Uppdatera relaterade dokument (Epic, Business Rules)
3. Exportera och förbättra andra typer av dokumentation

