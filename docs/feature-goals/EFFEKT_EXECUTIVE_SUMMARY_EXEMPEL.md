# Exempel: Executive Summary-struktur för Effekt-kapitlet

## Syfte

Executive Summary-sektionen ska ge beslutsfattare (produktägare, controller, CFO) en snabb översikt med nyckeltal utan tekniska detaljer. Detaljsektionerna förklarar sedan hur man kom fram till dessa siffror.

## Struktur

### Executive Summary (i början)
- Kortfattad sammanfattning med nyckeltal
- Max 1-2 paragrafstycken eller kort lista med 5-7 nyckeltal
- Fokus på affärsmässiga effekter (tidssparande, kostnader, kapacitet, kundupplevelse)
- Inga tekniska detaljer (ingen BPMN-terminologi, inga processsteg)
- Lätt att skanna (bullet points eller kortfattade meningar)

### Detaljerade sektioner (efter Executive Summary)
- Förklarar hur man kom fram till siffrorna i Executive Summary
- Innehåller tekniska detaljer (BPMN-mekanismer, processsteg)
- Visar beräkningsmetodik (volym × tid = total tidssparande)
- Innehåller förtydliganden och noteringar

## Exempel: mortgage-application-v2.html

### Executive Summary (före)

```html
<h3>Översikt</h3>
<p>Application-processen bidrar till betydande affärseffekter genom automatisering, parallellisering och tidig avvisning. Baserat på 100 000 ansökningar per år och 200 handläggare (konservativa uppskattningar):</p>
<ul>
  <li><strong>Automatisering:</strong> Uppskattat 5-15% av ansökningar avvisas tidigt via automatisk pre-screening (konservativ uppskattning: 5%). Eliminerar uppskattat 10-20 minuters manuellt arbete per avvisad ansökan (konservativ uppskattning: 10 minuter). Exakt andel kräver baseline-data.</li>
  <li><strong>Tidssparande:</strong> Uppskattat 25-50 minuter manuellt arbete + 1-2 dagar processeringstid per ansökan (konservativ uppskattning: 25 minuter + 1 dag)</li>
  <li><strong>Kapacitet:</strong> Uppskattat 60-100% fler ansökningar per handläggare (500 → 800-1000 per år, konservativ uppskattning: 800 per år)</li>
  <li><strong>Kundupplevelse:</strong> Uppskattat 60-70% snabbare svarstider (5-7 dagar → 1-2 dagar, konservativ uppskattning: 5 dagar → 2 dagar = 60% snabbare)</li>
</ul>
```

**Problem:**
- ❌ För lång första punkt (många förklaringar som borde vara i detaljsektionen)
- ❌ Blandar affärsmässiga effekter med tekniska förklaringar
- ❌ Svårt att skanna snabbt
- ❌ Ingen tydlig struktur med nyckeltal

### Executive Summary (efter - förbättrad)

```html
<h3>Executive Summary</h3>
<p>Application-processen automatisering och parallellisering ger betydande affärseffekter baserat på 100 000 ansökningar per år och 200 handläggare (konservativa uppskattningar):</p>

<h4>Kostnadsbesparingar</h4>
<ul>
  <li><strong>~20 MSEK</strong> kostnadsbesparingar per år (≈22 FTE elimineras genom direkt automatisering)</li>
  <li><strong>37.5%</strong> personalbesparing möjlig vid samma volym (200 → 125 handläggare) - total kapacitetsökning inklusive parallellisering</li>
</ul>

<h4>Kapacitetsökning</h4>
<ul>
  <li><strong>60%</strong> fler ansökningar per handläggare (500 → 800 per år)</li>
  <li><strong>60-100%</strong> ökad total kapacitet med samma personal (100 000 → 160 000-200 000 ansökningar/år)</li>
</ul>

<h4>Kundupplevelse</h4>
<ul>
  <li><strong>60%</strong> snabbare svarstider (5-7 dagar → 1-2 dagar)</li>
  <li><strong>20%</strong> förväntad ökning i kundnöjdhet (konservativ uppskattning)</li>
  <li><strong>Omedelbar</strong> datainsamling för återkommande kunder (vs 15-30 minuters väntetid)</li>
</ul>

<p class="muted"><em>Notera: Beräkningarna är konservativa uppskattningar baserat på typiska värden för liknande processer. För mer precisa beräkningar krävs baseline-data från nuvarande process (genomsnittlig handläggningstid, exakt manuell arbetstid per aktivitet, andel återkommande kunder, faktiska löner och overhead-kostnader). Se detaljerade sektioner nedan för beräkningsmetodik och förtydliganden.</em></p>
```

**Förbättringar:**
- ✅ Kortfattad och lätt att skanna
- ✅ Tydlig struktur med kategorier och nyckeltal
- ✅ Inga tekniska detaljer (ingen BPMN-terminologi)
- ✅ Fokus på affärsmässiga effekter
- ✅ Konkreta siffror i fetstil för att framhäva nyckeltal
- ✅ Hänvisning till detaljsektioner för mer information

### Detaljerade sektioner (efter Executive Summary)

```html
<h3>1. Automatisering och kostnadsbesparingar</h3>
<p>Detaljerade beräkningar för hur vi kom fram till ~20 MSEK i kostnadsbesparingar och 37.5% personalbesparing i Executive Summary:</p>

<h4>Automatisk datainsamling och pre-screening</h4>
<p>Via "Internal data gathering" call activity (multi-instance) hämtas automatiskt befintlig kunddata för alla identifierade parter. Via DMN-beslutsregel utförs automatiskt pre-screening som avvisar uppskattat 5-15% av ansökningar tidigt (konservativ uppskattning: 5%). Exakt andel kräver baseline-data.</p>
<ul>
  <li><strong>Volym:</strong> För återkommande kunder (uppskattat 30-40% = 30 000-40 000 ansökningar, konservativ uppskattning: 30 000): Eliminerar uppskattat 15-30 minuters manuell datainmatning (konservativ uppskattning: 15 minuter). För ansökningar som avvisas vid pre-screening (uppskattat 5-15%, konservativ uppskattning: 5% = 5 000 ansökningar): Eliminerar uppskattat 10-20 minuters manuell pre-screening per avvisad ansökan (konservativ uppskattning: 10 minuter)</li>
  <li><strong>Tidssparande:</strong> 
    <ul>
      <li>Datainsamling: 30 000 ansökningar × 15 min = 7 500 timmar/år</li>
      <li>Pre-screening: 5 000 ansökningar × 10 min = 833 timmar/år</li>
      <li>Total: 8 333 timmar/år ≈ ~4.6 FTE (konservativ uppskattning, baserat på 1 800 arbetstimmar/år per FTE)</li>
    </ul>
  </li>
  <li><strong>Process:</strong> 100% minskning av manuellt arbete för datainsamling och pre-screening</li>
  <li><strong>Notera:</strong> För exakt beräkning behövs: exakt andel återkommande kunder, exakt manuell arbetstid för datainsamling och pre-screening, faktiska löner och overhead-kostnader</li>
</ul>

<h4>Automatisk KALP-beräkning och kreditupplysning</h4>
<p>Via "KALP" service task och "Screen KALP" DMN-beslutsregel beräknas och screener maximalt lånebelopp automatiskt. Via "Fetch credit information" service task (multi-instance) hämtas kreditinformation automatiskt.</p>
<ul>
  <li><strong>Volym:</strong> För köpansökningar (uppskattat 60-70% = 60 000-70 000, konservativ uppskattning: 60 000): Eliminerar uppskattat 15-20 minuters manuell KALP-justering (konservativ uppskattning: 15 minuter). För alla ansökningar som når kreditupplysning (uppskattat 50-70% = 50 000-70 000, konservativ uppskattning: 50 000): Eliminerar uppskattat 20-30 minuters manuell kreditupplysning (konservativ uppskattning: 20 minuter)</li>
  <li><strong>Tidssparande:</strong>
    <ul>
      <li>KALP-justering: 60 000 ansökningar × 15 min = 15 000 timmar/år</li>
      <li>Kreditupplysning: 50 000 ansökningar × 20 min = 16 667 timmar/år</li>
      <li>Total: 31 667 timmar/år ≈ ~17 FTE (konservativ uppskattning, baserat på 1 800 arbetstimmar/år per FTE)</li>
    </ul>
  </li>
  <li><strong>Process:</strong> 100% minskning av manuellt arbete för KALP och kreditupplysning</li>
  <li><strong>Notera:</strong> För exakt beräkning behövs: exakt andel köpansökningar, exakt manuell arbetstid för KALP-justering och kreditupplysning, faktiska löner och overhead-kostnader</li>
</ul>

<h4>Kostnadsbesparingar från automatisering</h4>
<ul>
  <li><strong>Totalt tidssparande:</strong> 8 333 + 31 667 = 40 000 timmar/år ≈ ~22 FTE (konservativ uppskattning, baserat på 1 800 arbetstimmar/år per FTE)</li>
  <li><strong>Kostnadsbesparing:</strong> 22 FTE × 900 000 SEK/år per FTE = ~20 MSEK per år (konservativ uppskattning, baserat på genomsnittlig handläggarlön uppskattat 600 000 SEK/år + overhead uppskattat 300 000 SEK/år = 900 000 SEK/år per FTE)</li>
  <li><strong>Notera:</strong> Exakt kostnadsbesparing kräver faktiska löner och overhead-kostnader per handläggare. Med exakt data skulle exakt kostnadsbesparing i SEK och ROI kunna beräknas.</li>
</ul>
```

**Förbättringar:**
- ✅ Förklarar hur man kom fram till siffrorna i Executive Summary
- ✅ Innehåller tekniska detaljer (BPMN-mekanismer, processsteg)
- ✅ Visar beräkningsmetodik (volym × tid = total tidssparande)
- ✅ Innehåller förtydliganden och noteringar
- ✅ Länkar tillbaka till Executive Summary för tydlighet

## Checklista för Executive Summary

- [ ] Max 1-2 paragrafstycken eller kort lista med 5-7 nyckeltal
- [ ] Fokus på affärsmässiga effekter (tidssparande, kostnader, kapacitet, kundupplevelse)
- [ ] Inga tekniska detaljer (ingen BPMN-terminologi, inga processsteg)
- [ ] Lätt att skanna (bullet points eller kortfattade meningar)
- [ ] Konkreta siffror i fetstil för att framhäva nyckeltal
- [ ] Tydlig struktur med kategorier (t.ex. Automatisering, Tidssparande, Kapacitet, Kundupplevelse)
- [ ] Hänvisning till detaljsektioner för mer information
- [ ] Notering om konservativa uppskattningar och saknad baseline-data

## Checklista för detaljerade sektioner

- [ ] Förklarar hur man kom fram till siffrorna i Executive Summary
- [ ] Innehåller tekniska detaljer (BPMN-mekanismer, processsteg)
- [ ] Visar beräkningsmetodik (volym × tid = total tidssparande)
- [ ] Innehåller förtydliganden och noteringar
- [ ] Länkar tillbaka till Executive Summary för tydlighet (t.ex. "Detaljerade beräkningar för hur vi kom fram till ~20 MSEK i kostnadsbesparingar i Executive Summary")
- [ ] För sektion 3 (Kapacitetsökning): Förtydliga relationen mellan 22 FTE (direkt automatisering) och 37.5% personalbesparing (total kapacitetsökning inklusive parallellisering)
- [ ] Använd ALLTID hybrid-approach med tabeller för beräkningar när flera aktiviteter kan jämföras (OBLIGATORISKT - se `EFFEKT_TABELL_ANALYSIS.md`)
- [ ] Lägg till "Aggregeringsinformation"-sektion i slutet av Effekt-kapitlet (OBLIGATORISKT - se `EFFEKT_AGGREGATION_ANALYSIS.md`)

## Hybrid-approach för beräkningar (OBLIGATORISKT)

För sektioner med flera aktiviteter som kan jämföras (t.ex. sektion 1: datainsamling, pre-screening, KALP, kreditupplysning), använd ALLTID hybrid-approach:

**Struktur:**
1. Kort textbeskrivning (1-2 meningar) av BPMN-mekanismen
2. Tabell för beräkningar med kolumner:
   - Aktivitet
   - Volym (ansökningar)
   - Tid per ansökan (minuter)
   - Total tidssparande/år (timmar)
   - FTE-värde
3. Text för processförbättringar och noteringar

**Se `EFFEKT_TABELL_ANALYSIS.md` för detaljerad analys och exempel.**

