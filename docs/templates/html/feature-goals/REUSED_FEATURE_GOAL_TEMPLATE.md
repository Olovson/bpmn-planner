# Mall för dokumentation av återkommande Feature Goals

**Detta är en mall för hur dokumentationen ska struktureras när ett feature goal anropas från flera ställen.**

## Struktur

### 1. Beskrivning av FGoal

```html
<section class="doc-section">
  <details open>
    <summary>Beskrivning av FGoal</summary>
    <div class="section-content">
      <!-- Generell beskrivning -->
      <p>[Feature goal namn] är en [typ av process] som [vad processen gör generellt]. Processen syftar till att [syfte och värde].</p>
      
      <!-- Detaljerad beskrivning av processflöde -->
      <p>Processen börjar med [första steget]. Därefter [nästa steg]. [Fortsätt beskriva processflödet].</p>
      
      <!-- Anropningskontexter (ENDAST för återkommande feature goals) -->
      <h3>Anropningskontexter</h3>
      <p>Denna process anropas från flera ställen i Mortgage-processen:</p>
      <ul>
        <li><strong>[Kontext 1 - Namn]:</strong> [Var det anropas från] - [När det anropas] - [Varför det anropas igen - vilken ny information har tillkommit]</li>
        <li><strong>[Kontext 2 - Namn]:</strong> [Var det anropas från] - [När det anropas] - [Varför det anropas igen - vilken ny information har tillkommit]</li>
        <li><strong>[Kontext 3 - Namn]:</strong> [Var det anropas från] - [När det anropas] - [Varför det anropas igen - vilken ny information har tillkommit]</li>
      </ul>
    </div>
  </details>
</section>
```

**Exempel:**
```html
<section class="doc-section">
  <details open>
    <summary>Beskrivning av FGoal</summary>
    <div class="section-content">
      <p>Credit Decision är en manuell beslutsprocess där ansökningar bedöms och godkänns eller avvisas baserat på kreditkriterier. Processen syftar till att säkerställa att endast lämpliga låneansökningar godkänns.</p>
      
      <p>Processen börjar med att systemet automatiskt avgör beslutsnivå baserat på kreditkriterier. Ansökningen dirigeras sedan till rätt beslutsnivå: Board, Committee, Four eyes, eller Straight through. Efter manuell granskning (om krävs) samlas flöden ihop och processen avgör om omvärdering behövs.</p>
      
      <h3>Anropningskontexter</h3>
      <p>Denna process anropas från flera ställen i Mortgage-processen:</p>
      <ul>
        <li><strong>Huvudprocessen (mortgage.bpmn):</strong> Efter KYC-processen, för initialt kreditbeslut när ansökan är komplett. Detta är första gången kreditbeslut fattas för ansökan.</li>
        <li><strong>Offer-processen - Ändringar (mortgage-se-offer.bpmn):</strong> Efter "Perform advanced underwriting" när kunden begärt ändringar i erbjudandet. Ny information: Uppdaterade villkor och förutsättningar från advanced underwriting.</li>
        <li><strong>Offer-processen - Sales Contract (mortgage-se-offer.bpmn):</strong> Efter "sales-contract-advanced-underwriting" när kunden begärt ändringar via köpekontrakt. Ny information: Köpekontrakt-ändringar och uppdaterade förutsättningar från sales-contract-advanced-underwriting.</li>
      </ul>
    </div>
  </details>
</section>
```

### 2. Processteg - Input

```html
<section class="doc-section">
  <details>
    <summary>Processteg - Input</summary>
    <div class="section-content">
      <!-- Generella krav -->
      <p>[Feature goal namn]-processen startar när:</p>
      <ul>
        <li><strong>[Generellt krav 1]:</strong> [Beskrivning]</li>
        <li><strong>[Generellt krav 2]:</strong> [Beskrivning]</li>
        <li><strong>[Generellt krav 3]:</strong> [Beskrivning]</li>
      </ul>
      
      <!-- Kontextspecifika krav (ENDAST för återkommande feature goals) -->
      <h3>Kontextspecifika input-krav</h3>
      <ul>
        <li><strong>[Kontext 1 - Namn]:</strong> [Specifika krav för denna kontext - vilken ny information har tillkommit, vilka specifika input-variabler]</li>
        <li><strong>[Kontext 2 - Namn]:</strong> [Specifika krav för denna kontext - vilken ny information har tillkommit, vilka specifika input-variabler]</li>
        <li><strong>[Kontext 3 - Namn]:</strong> [Specifika krav för denna kontext - vilken ny information har tillkommit, vilka specifika input-variabler]</li>
      </ul>
    </div>
  </details>
</section>
```

**Exempel:**
```html
<section class="doc-section">
  <details>
    <summary>Processteg - Input</summary>
    <div class="section-content">
      <p>Credit Decision-processen startar när:</p>
      <ul>
        <li><strong>All information är tillgänglig:</strong> All nödvändig information för kreditbeslut är samlad och tillgänglig, inklusive kreditscore, skuldkvoter, inkomstverifiering och riskfaktorer</li>
        <li><strong>Processkontext:</strong> Credit Decision anropas via call activity. Alla relevanta processvariabler skickas med för att säkerställa fullständig kontext</li>
      </ul>
      
      <h3>Kontextspecifika input-krav</h3>
      <ul>
        <li><strong>Huvudprocessen:</strong> KYC-processen är slutförd och ansökan är komplett. Detta är första gången kreditbeslut fattas för ansökan</li>
        <li><strong>Offer-processen - Ändringar:</strong> "Perform advanced underwriting" är slutförd för de nya förutsättningarna. Ny information: Uppdaterade villkor och förutsättningar från advanced underwriting. Processen anropas via "credit-decision" call activity efter "Flow_0xn8e37" sequence flow</li>
        <li><strong>Offer-processen - Sales Contract:</strong> "sales-contract-advanced-underwriting" är slutförd och köpekontrakt-ändringar är tillgängliga. Ny information: Köpekontrakt-ändringar från "upload-sales-contract" user task och uppdaterade förutsättningar från sales-contract-advanced-underwriting. Processen anropas via "sales-contract-credit-decision" call activity efter "Flow_1oio4da" sequence flow</li>
      </ul>
    </div>
  </details>
</section>
```

### 3. Processteg - Output

```html
<section class="doc-section">
  <details>
    <summary>Processteg - Output</summary>
    <div class="section-content">
      <!-- Generella resultat -->
      <p>När [Feature goal namn]-processen är slutförd har följande resultat uppnåtts:</p>
      <ul>
        <li><strong>[Generellt resultat 1]:</strong> [Beskrivning]</li>
        <li><strong>[Generellt resultat 2]:</strong> [Beskrivning]</li>
        <li><strong>[Generellt resultat 3]:</strong> [Beskrivning]</li>
      </ul>
      
      <!-- Kontextspecifika resultat (ENDAST för återkommande feature goals) -->
      <h3>Kontextspecifika output-resultat</h3>
      <ul>
        <li><strong>[Kontext 1 - Namn]:</strong> [Specifika resultat för denna kontext - vilka specifika output-variabler, hur resultatet används]</li>
        <li><strong>[Kontext 2 - Namn]:</strong> [Specifika resultat för denna kontext - vilka specifika output-variabler, hur resultatet används]</li>
        <li><strong>[Kontext 3 - Namn]:</strong> [Specifika resultat för denna kontext - vilka specifika output-variabler, hur resultatet används]</li>
      </ul>
    </div>
  </details>
</section>
```

**Exempel:**
```html
<section class="doc-section">
  <details>
    <summary>Processteg - Output</summary>
    <div class="section-content">
      <p>När Credit Decision-processen är slutförd har följande resultat uppnåtts:</p>
      <ul>
        <li><strong>Slutgiltigt kreditbeslut:</strong> Ett beslut om ansökan ska godkännas eller avvisas baserat på kreditkriterier</li>
        <li><strong>Beslutsnivå:</strong> Beslutet fattas via antingen Straight through, Board, Committee, eller Four eyes</li>
      </ul>
      
      <h3>Kontextspecifika output-resultat</h3>
      <ul>
        <li><strong>Huvudprocessen:</strong> Beslut om ansökan ska godkännas eller avvisas. Om godkänt, fortsätter huvudprocessen med Offer-processen. Om avvisat, avslutas ansökningsprocessen</li>
        <li><strong>Offer-processen - Ändringar:</strong> Beslut om ändringar kan godkännas. Om godkänt, kan uppdaterat erbjudande skapas för kunden baserat på de nya förutsättningarna. Om avvisat, avslutas Offer-processen med "Credit decision rejected" event</li>
        <li><strong>Offer-processen - Sales Contract:</strong> Beslut om köpekontrakt-ändringar kan godkännas. Om godkänt, kan uppdaterat erbjudande baserat på köpekontrakt skapas. Om avvisat, avslutas Offer-processen med "Credit decision rejected" event</li>
      </ul>
    </div>
  </details>
</section>
```

### 4. BPMN - Process

```html
<section class="doc-section">
  <details>
    <summary>BPMN - Process</summary>
    <div class="section-content">
      <p><a href="#/bpmn/[bpmn-fil].bpmn">Visa BPMN-processen för [Feature goal namn]</a></p>
      
      <!-- Generellt processflöde -->
      <h3>Processflöde - Steg för steg</h3>
      <ol>
        <li><strong>[Steg 1]:</strong> [Beskrivning]</li>
        <li><strong>[Steg 2]:</strong> [Beskrivning]</li>
        <!-- ... -->
      </ol>
      
      <!-- Anropningsställen (ENDAST för återkommande feature goals) -->
      <h3>Anropningsställen</h3>
      <p>Denna process anropas från följande ställen:</p>
      <ul>
        <li><strong>[Kontext 1 - Namn]:</strong> Anropas från [process] via "[call activity namn]" call activity ([call activity ID]). [Beskrivning av flöde till/från]</li>
        <li><strong>[Kontext 2 - Namn]:</strong> Anropas från [process] via "[call activity namn]" call activity ([call activity ID]). [Beskrivning av flöde till/från]</li>
        <li><strong>[Kontext 3 - Namn]:</strong> Anropas från [process] via "[call activity namn]" call activity ([call activity ID]). [Beskrivning av flöde till/från]</li>
      </ul>
    </div>
  </details>
</section>
```

## Checklista för återkommande Feature Goals

När du dokumenterar ett återkommande feature goal:

- [ ] **Identifierat alla anropningsställen** - Kör `npx tsx scripts/analyze-reused-feature-goals.ts` eller sök i `bpmn-map.json`
- [ ] **Dokumenterat generell funktionalitet** - Tydlig beskrivning av vad processen gör generellt
- [ ] **Listat alla anropningskontexter** - I Beskrivning-sektionen med "Anropningskontexter" underrubrik
- [ ] **Förklarat varför processen anropas igen** - För varje kontext: vilken ny information har tillkommit
- [ ] **Beskrivit vad som är annorlunda** - För varje kontext: vilka specifika input/output-variabler
- [ ] **Uppdaterat Input-sektionen** - Generella krav först, sedan kontextspecifika krav
- [ ] **Uppdaterat Output-sektionen** - Generella resultat först, sedan kontextspecifika resultat
- [ ] **Uppdaterat BPMN - Process** - Generellt processflöde först, sedan lista över alla anropningsställen
- [ ] **Säkerställt tydlighet** - Dokumentationen är lätt att förstå och tydligt skiljer mellan generell funktionalitet och kontextspecifik användning

## Tips för tydlighet

1. **Använd konsekventa namn för kontexter** - T.ex. "Huvudprocessen", "Offer-processen - Ändringar", "Offer-processen - Sales Contract"
2. **Var specifik om ny information** - Förklara exakt vilken ny information som har tillkommit i varje kontext
3. **Använd visuell struktur** - Använd rubriker, underrubriker och listor för att göra dokumentationen lättläst
4. **Förklara syfte** - Förklara inte bara VAD som händer, utan också VARFÖR det händer i varje kontext
5. **Koppla till affärsvärde** - Förklara hur varje kontext bidrar till affärsvärde

