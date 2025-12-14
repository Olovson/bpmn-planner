# Analys: Tabellformat för detaljerade sektioner i Effekt-kapitlet

## Syfte med analysen

Analysera om detaljerade sektioner i Effekt-kapitlet skulle bli mer översiktliga och lättlästa om de presenterades i tabellformat istället för nuvarande textformat.

## Nuvarande struktur

### Sektion 1: Automatisering och kostnadsbesparingar

**Format:** Text med listor och underlistor
**Innehåll:**
- Beskrivning av BPMN-mekanism (text)
- Volym-baserade beräkningar (lista)
- Tidssparande med uppdelning (underlista)
- Processförbättringar (lista)
- Noteringar (lista)

**Exempel:**
```html
<h4>Automatisk datainsamling och pre-screening</h4>
<p>Via "Internal data gathering" call activity (multi-instance)...</p>
<ul>
  <li><strong>Volym:</strong> För återkommande kunder...</li>
  <li><strong>Tidssparande:</strong>
    <ul>
      <li>Datainsamling: 30 000 × 15 min = 7 500 timmar/år</li>
      <li>Pre-screening: 5 000 × 10 min = 833 timmar/år</li>
      <li>Total: 8 333 timmar/år ≈ ~4.6 FTE</li>
    </ul>
  </li>
</ul>
```

## Fördelar med tabellformat

### ✅ Potentiella fördelar

1. **Mer kompakt:**
   - Mindre vertikal utrymme
   - Lättare att få översikt över alla aktiviteter på en gång

2. **Lättare att jämföra:**
   - Alla aktiviteter i samma format
   - Snabbare att se skillnader mellan aktiviteter

3. **Strukturerad data:**
   - Beräkningar passar bra i tabellformat
   - Tydlig kolumnstruktur

4. **Snabbare att skanna:**
   - Ögonen kan snabbt gå igenom rader
   - Lättare att hitta specifik information

## Nackdelar med tabellformat

### ❌ Potentiella nackdelar

1. **För trångt för långa förklaringar:**
   - BPMN-beskrivningar kan bli långa
   - Tabellceller blir svåra att läsa med mycket text
   - Risk för att texten blir förkortad eller otydlig

2. **Förlorar kontext:**
   - Beräkningsmetodik kan försvinna
   - Svårare att förstå "varför" och "hur"
   - Tekniska detaljer kan bli svårare att inkludera

3. **Svårare att inkludera noteringar:**
   - Noteringar och förtydliganden passar inte bra i tabeller
   - Kan bli förvirrande om de placeras i separata celler

4. **Mindre flexibilitet:**
   - Tabeller kräver strukturerad data
   - Svårare att anpassa för olika typer av information
   - Kan bli stel och formell

5. **Mobil/print-vänlighet:**
   - Tabeller kan bli svåra att läsa på små skärmar
   - Kan kräva horisontell scrollning
   - Mindre användarvänligt för olika enheter

## Hybrid-approach: Tabell för beräkningar, text för förklaringar

### ✅ Bästa av båda världar

**Struktur:**
1. **Kort textbeskrivning** av BPMN-mekanismen
2. **Tabell för beräkningar** (volym, tidssparande, FTE)
3. **Text för noteringar och förtydliganden**

**Exempel:**
```html
<h4>Automatisk datainsamling och pre-screening</h4>
<p>Via "Internal data gathering" call activity (multi-instance) hämtas automatiskt befintlig kunddata för alla identifierade parter. Via DMN-beslutsregel utförs automatiskt pre-screening som avvisar uppskattat 5-15% av ansökningar tidigt (konservativ uppskattning: 5%).</p>

<table>
  <thead>
    <tr>
      <th>Aktivitet</th>
      <th>Volym</th>
      <th>Tid per ansökan</th>
      <th>Total tidssparande/år</th>
      <th>FTE-värde</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Datainsamling (återkommande kunder)</td>
      <td>30 000 ansökningar</td>
      <td>15 min</td>
      <td>7 500 timmar/år</td>
      <td>~4.2 FTE</td>
    </tr>
    <tr>
      <td>Pre-screening (avvisade ansökningar)</td>
      <td>5 000 ansökningar</td>
      <td>10 min</td>
      <td>833 timmar/år</td>
      <td>~0.5 FTE</td>
    </tr>
    <tr>
      <td><strong>Total</strong></td>
      <td><strong>-</strong></td>
      <td><strong>-</strong></td>
      <td><strong>8 333 timmar/år</strong></td>
      <td><strong>~4.6 FTE</strong></td>
    </tr>
  </tbody>
</table>

<p><strong>Process:</strong> 100% minskning av manuellt arbete för datainsamling och pre-screening.</p>
<p class="muted"><strong>Notera:</strong> För exakt beräkning behövs: exakt andel återkommande kunder, exakt manuell arbetstid för datainsamling och pre-screening, faktiska löner och overhead-kostnader.</p>
```

## Jämförelse: Nuvarande vs Tabellformat

### Nuvarande format (text + listor)

**Fördelar:**
- ✅ Flexibelt - kan inkludera långa förklaringar
- ✅ Lätt att läsa på alla enheter
- ✅ Bra för kontext och beräkningsmetodik
- ✅ Noteringar och förtydliganden passar bra

**Nackdelar:**
- ❌ Tar mer vertikal utrymme
- ❌ Svårare att jämföra aktiviteter
- ❌ Kan bli långt och svårt att skanna

### Tabellformat (helt i tabell)

**Fördelar:**
- ✅ Kompakt
- ✅ Lätt att jämföra aktiviteter
- ✅ Snabbare att skanna

**Nackdelar:**
- ❌ För trångt för långa förklaringar
- ❌ Förlorar kontext och beräkningsmetodik
- ❌ Svårare att inkludera noteringar
- ❌ Mindre flexibelt
- ❌ Kan bli svårt att läsa på små skärmar

### Hybrid-approach (text + tabell för beräkningar)

**Fördelar:**
- ✅ Kombinerar fördelarna från båda
- ✅ Tabell för strukturerad data (beräkningar)
- ✅ Text för förklaringar och kontext
- ✅ Bästa läsbarhet

**Nackdelar:**
- ⚠️ Lite mer komplex struktur
- ⚠️ Kräver mer planering

## Rekommendation

### ✅ Hybrid-approach rekommenderas

**Struktur:**
1. **Kort textbeskrivning** (1-2 meningar) av BPMN-mekanismen
2. **Tabell för beräkningar** med kolumner:
   - Aktivitet
   - Volym (ansökningar)
   - Tid per ansökan (minuter)
   - Total tidssparande/år (timmar)
   - FTE-värde
3. **Text för processförbättringar och noteringar**

**Fördelar:**
- ✅ Mer översiktligt för beräkningar
- ✅ Lättare att jämföra aktiviteter
- ✅ Behåller kontext och förklaringar
- ✅ Noteringar och förtydliganden finns kvar

**När använda:**
- För sektioner med flera aktiviteter som kan jämföras (t.ex. sektion 1 med datainsamling, pre-screening, KALP, kreditupplysning)
- När beräkningarna är strukturerade och jämförbara

**När INTE använda:**
- För sektioner med få aktiviteter eller unika beräkningar
- När förklaringar är viktigare än beräkningar
- När innehållet är mer kvalitativt än kvantitativt

## Exempel: Hybrid-approach för sektion 1

```html
<h3>1. Automatisering och kostnadsbesparingar</h3>
<p>Detaljerade beräkningar för hur vi kom fram till ~20 MSEK i kostnadsbesparingar och 37.5% personalbesparing i Executive Summary:</p>

<h4>Automatisk datainsamling och pre-screening</h4>
<p>Via "Internal data gathering" call activity (multi-instance) hämtas automatiskt befintlig kunddata för alla identifierade parter. Via DMN-beslutsregel utförs automatiskt pre-screening som avvisar uppskattat 5-15% av ansökningar tidigt (konservativ uppskattning: 5%). Exakt andel kräver baseline-data.</p>

<table>
  <thead>
    <tr>
      <th>Aktivitet</th>
      <th>Volym</th>
      <th>Tid per ansökan</th>
      <th>Total tidssparande/år</th>
      <th>FTE-värde</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Datainsamling<br><small>(återkommande kunder, 30-40%)</small></td>
      <td>30 000 ansökningar</td>
      <td>15 min</td>
      <td>7 500 timmar/år</td>
      <td>~4.2 FTE</td>
    </tr>
    <tr>
      <td>Pre-screening<br><small>(avvisade ansökningar, 5%)</small></td>
      <td>5 000 ansökningar</td>
      <td>10 min</td>
      <td>833 timmar/år</td>
      <td>~0.5 FTE</td>
    </tr>
    <tr>
      <td><strong>Subtotal</strong></td>
      <td><strong>-</strong></td>
      <td><strong>-</strong></td>
      <td><strong>8 333 timmar/år</strong></td>
      <td><strong>~4.6 FTE</strong></td>
    </tr>
  </tbody>
</table>

<p><strong>Process:</strong> 100% minskning av manuellt arbete för datainsamling och pre-screening.</p>
<p class="muted"><strong>Notera:</strong> För exakt beräkning behövs: exakt andel återkommande kunder, exakt manuell arbetstid för datainsamling och pre-screening, faktiska löner och overhead-kostnader.</p>

<h4>Automatisk KALP-beräkning och kreditupplysning</h4>
<p>Via "KALP" service task och "Screen KALP" DMN-beslutsregel beräknas och screener maximalt lånebelopp automatiskt. Via "Fetch credit information" service task (multi-instance) hämtas kreditinformation automatiskt.</p>

<table>
  <thead>
    <tr>
      <th>Aktivitet</th>
      <th>Volym</th>
      <th>Tid per ansökan</th>
      <th>Total tidssparande/år</th>
      <th>FTE-värde</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>KALP-justering<br><small>(köpansökningar, 60-70%)</small></td>
      <td>60 000 ansökningar</td>
      <td>15 min</td>
      <td>15 000 timmar/år</td>
      <td>~8.3 FTE</td>
    </tr>
    <tr>
      <td>Kreditupplysning<br><small>(ansökningar som når kreditupplysning, 50-70%)</small></td>
      <td>50 000 ansökningar</td>
      <td>20 min</td>
      <td>16 667 timmar/år</td>
      <td>~9.3 FTE</td>
    </tr>
    <tr>
      <td><strong>Subtotal</strong></td>
      <td><strong>-</strong></td>
      <td><strong>-</strong></td>
      <td><strong>31 667 timmar/år</strong></td>
      <td><strong>~17 FTE</strong></td>
    </tr>
  </tbody>
</table>

<p><strong>Process:</strong> 100% minskning av manuellt arbete för KALP och kreditupplysning.</p>
<p class="muted"><strong>Notera:</strong> För exakt beräkning behövs: exakt andel köpansökningar, exakt manuell arbetstid för KALP-justering och kreditupplysning, faktiska löner och overhead-kostnader.</p>

<h4>Kostnadsbesparingar från automatisering</h4>
<table>
  <thead>
    <tr>
      <th>Kategori</th>
      <th>Tidssparande/år</th>
      <th>FTE-värde</th>
      <th>Kostnadsbesparing/år</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Datainsamling och pre-screening</td>
      <td>8 333 timmar/år</td>
      <td>~4.6 FTE</td>
      <td>~4.1 MSEK</td>
    </tr>
    <tr>
      <td>KALP och kreditupplysning</td>
      <td>31 667 timmar/år</td>
      <td>~17 FTE</td>
      <td>~15.9 MSEK</td>
    </tr>
    <tr>
      <td><strong>Total</strong></td>
      <td><strong>40 000 timmar/år</strong></td>
      <td><strong>~22 FTE</strong></td>
      <td><strong>~20 MSEK</strong></td>
    </tr>
  </tbody>
</table>

<p class="muted"><strong>Notera:</strong> Exakt kostnadsbesparing kräver faktiska löner och overhead-kostnader per handläggare. Med exakt data skulle exakt kostnadsbesparing i SEK och ROI kunna beräknas.</p>
```

## Slutsats

### ✅ Hybrid-approach är bäst

**Rekommendation:**
- Använd **tabellformat för beräkningar** (volym, tid, FTE, kostnader)
- Behåll **textformat för förklaringar** (BPMN-mekanismer, processförbättringar, noteringar)

**Fördelar:**
- ✅ Mer översiktligt för strukturerad data
- ✅ Lättare att jämföra aktiviteter
- ✅ Behåller kontext och förklaringar
- ✅ Bästa läsbarhet

**När använda:**
- För sektioner med flera aktiviteter som kan jämföras (t.ex. sektion 1)
- När beräkningarna är strukturerade och jämförbara

**När INTE använda:**
- För sektioner med få aktiviteter eller unika beräkningar
- När förklaringar är viktigare än beräkningar
- När innehållet är mer kvalitativt än kvantitativt

## Ytterligare överväganden

### Mobil/print-vänlighet

**Problem med tabeller:**
- Kan kräva horisontell scrollning på små skärmar
- Kan bli svåra att läsa i print

**Lösning:**
- Använd responsiva tabeller (scrollbar på små skärmar)
- Överväg vertikal layout för mobil
- Testa på olika enheter

### Läsbarhet vs Översiktlighet

**Trade-off:**
- Tabeller = mer översiktligt men kan förlora läsbarhet
- Text = bättre läsbarhet men mindre översiktligt

**Hybrid-approach balanserar detta:**
- Tabell för data som behöver jämföras
- Text för information som behöver förklaras

