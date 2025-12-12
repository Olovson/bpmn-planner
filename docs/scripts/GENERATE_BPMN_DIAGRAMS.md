# Generate BPMN Diagrams

Detta script genererar statiska bilder av BPMN-diagram och embeddar dem i feature goal HTML-filer.

## Syfte

Varje feature goal HTML-fil får ett nytt kapitel "Process Diagram" som visar en statisk bild av BPMN-processdiagrammet. Bilden är embedded som base64 i HTML-filen, vilket gör filerna helt fristående och delningsbara utan att behöva appen eller externa servrar.

## Användning

```bash
npm run generate:bpmn-diagrams
```

## Vad scriptet gör

1. **Läser alla HTML-filer** i `public/local-content/feature-goals/`
2. **För varje fil:**
   - Extraherar BPMN-filnamn från HTML-filnamnet eller HTML-innehållet
   - Kontrollerar om diagram redan finns (hoppar över om det gör det)
   - Läser motsvarande BPMN-fil från `tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11/`
3. **Renderar BPMN-diagram:**
   - Använder Playwright för att öppna headless browser
   - Laddar bpmn-js från CDN
   - Renderar BPMN-diagrammet
   - Tar screenshot som PNG
4. **Embeddar bilden:**
   - Konverterar PNG till base64
   - Lägger till "Process Diagram" kapitel i HTML-filen
   - Sparar uppdaterad HTML-fil

## Output

Varje HTML-fil får ett nytt kapitel i slutet:

```html
<section class="doc-section">
  <details>
    <summary>Process Diagram</summary>
    <div class="section-content">
      <p>Nedan visas BPMN-processdiagrammet för denna subprocess:</p>
      <div style="margin: 20px 0; text-align: center;">
        <img 
          src="data:image/png;base64,..." 
          alt="BPMN Process Diagram" 
          style="max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        />
      </div>
      <p class="muted">Diagrammet visar processflödet med alla aktiviteter, gateways, events och sequence flows.</p>
    </div>
  </details>
</section>
```

## Krav

- Playwright måste vara installerat (`@playwright/test` finns redan i projektet)
- BPMN-filer måste finnas i `tests/fixtures/bpmn/mortgage-se 2025.12.11 18:11/`
- HTML-filer måste finnas i `public/local-content/feature-goals/`

## Felsökning

### "BPMN-fil finns inte"
- Kontrollera att BPMN-filen finns i rätt mapp
- Kontrollera att filnamnet matchar (t.ex. `mortgage-se-signing.bpmn` för `mortgage-se-signing-v2.html`)

### "Rendering error"
- Kontrollera att BPMN-filen är giltig XML
- Kontrollera internetanslutning (CDN behövs för bpmn-js)

### "Canvas element not found"
- Detta kan hända om bpmn-js inte laddas korrekt
- Kontrollera CDN-länkar i scriptet

## Tekniska detaljer

- **Rendering:** Playwright headless browser med bpmn-js från CDN
- **Format:** PNG (base64 embedded)
- **Storlek:** Automatisk zoom för att passa viewport
- **Timeout:** 10 sekunder för rendering

