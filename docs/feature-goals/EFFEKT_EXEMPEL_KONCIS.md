# Exempel: Koncis Effekt-sektion (fokus på viktigaste effekterna)

## Exempel 1: mortgage-application-v2.html (koncis version)

```html
<section class="doc-section">
  <details>
    <summary>Effekt</summary>
    <div class="section-content">
      <p class="muted">Förväntad affärseffekt som uppnås med feature goalet.</p>
      
      <h3>Översikt</h3>
      <p>Application-processen bidrar till betydande affärseffekter genom automatisering, parallellisering och tidig avvisning. Baserat på 100 000 ansökningar per år och 200 handläggare:</p>
      <ul>
        <li><strong>Automatisering:</strong> Uppskattat 5-15% av ansökningar avvisas tidigt via automatisk pre-screening (konservativ uppskattning: 5%). Eliminerar uppskattat 10-20 minuters manuellt arbete per avvisad ansökan (konservativ uppskattning: 10 minuter). Exakt andel kräver baseline-data.</li>
        <li><strong>Tidssparande:</strong> 25-50 minuter manuellt arbete + 1-2 dagar processeringstid per ansökan</li>
        <li><strong>Kapacitet:</strong> 60-100% fler ansökningar per handläggare (500 → 800-1000 per år)</li>
        <li><strong>Kundupplevelse:</strong> 60-70% snabbare svarstider (5-7 dagar → 1-2 dagar)</li>
      </ul>
      <p class="muted"><em>Notera: Beräkningarna är konservativa uppskattningar baserat på typiska värden för liknande processer. För mer precisa och realistiska beräkningar skulle följande baseline-data behövas: genomsnittlig handläggningstid per ansökan (nuvarande: uppskattat 5-7 dagar), exakt manuell arbetstid per aktivitet (datainsamling, pre-screening, KALP, kreditupplysning), andel återkommande kunder (nuvarande: uppskattat 30-40%), faktiska löner och overhead-kostnader per handläggare. Med denna data skulle exakta tidssparande i timmar/dagar, exakta kostnadsbesparingar i SEK, och ROI kunna beräknas. Uppskattningarna använder konservativa värden (lägre gränser i intervall) för att undvika överdrivna förväntningar.</em></p>

      <h3>1. Automatisering och minskad manuell hantering</h3>
      
      <h4>Automatisk datainsamling och pre-screening</h4>
      <p>Via "Internal data gathering" call activity (multi-instance) hämtas automatiskt befintlig kunddata för alla identifierade parter. Via DMN-beslutsregel utförs automatiskt pre-screening som avvisar uppskattat 5-15% av ansökningar tidigt (konservativ uppskattning: 5%). Exakt andel kräver baseline-data.</p>
      <ul>
        <li><strong>Volym:</strong> För återkommande kunder (uppskattat 30-40% = 30 000-40 000 ansökningar, konservativ uppskattning: 30 000): Eliminerar uppskattat 15-30 minuters manuell datainmatning (konservativ uppskattning: 15 minuter). För ansökningar som avvisas vid pre-screening (uppskattat 5-15%, konservativ uppskattning: 5% = 5 000 ansökningar): Eliminerar uppskattat 10-20 minuters manuell pre-screening per avvisad ansökan (konservativ uppskattning: 10 minuter)</li>
        <li><strong>Tidssparande:</strong> Total 12 500-36 667 timmar/år (~7-20 FTE)</li>
        <li><strong>Process:</strong> 100% minskning av manuellt arbete för datainsamling och pre-screening</li>
      </ul>

      <h4>Automatisk KALP-beräkning och kreditupplysning</h4>
      <p>Via "KALP" service task och "Screen KALP" DMN-beslutsregel beräknas och screener maximalt lånebelopp automatiskt. Via "Fetch credit information" service task (multi-instance) hämtas kreditinformation automatiskt.</p>
      <ul>
        <li><strong>Volym:</strong> För köpansökningar (60-70% = 60 000-70 000): Eliminerar 15-20 minuters manuell KALP-justering. För alla ansökningar som når kreditupplysning (50-70% = 50 000-70 000): Eliminerar 20-30 minuters manuell kreditupplysning</li>
        <li><strong>Tidssparande:</strong> Total 31 667-58 333 timmar/år (~17-32 FTE)</li>
        <li><strong>Process:</strong> 100% minskning av manuellt arbete för KALP och kreditupplysning</li>
      </ul>

      <h3>2. Snabbare processering och förbättrad kundupplevelse</h3>
      
      <h4>Parallell datainsamling och tidig avvisning</h4>
      <p>Via parallel gateway (Gateway_0n2ekt4) körs "Household" och "Stakeholders" parallellt, vilket minskar total processeringstid. Automatisk screening (pre-screening + objekt + stakeholder + KALP) avvisar ansökningar tidigt. Totalt avslag kräver baseline-data för exakt beräkning.</p>
      <ul>
        <li><strong>Tidssparande:</strong> Uppskattat 1-2 dagar snabbare processeringstid per ansökan (2-3 dagar → 1 dag, konservativ uppskattning: 2 dagar → 1 dag = 1 dag snabbare)</li>
        <li><strong>Kundupplevelse:</strong> Uppskattat 60-70% snabbare svarstider (5-7 dagar → 1-2 dagar, konservativ uppskattning: 5 dagar → 2 dagar = 60% snabbare), förväntad nöjdhetsökning uppskattat 20-30% (konservativ uppskattning: 20%)</li>
        <li><strong>Volym:</strong> Uppskattat 100 000 ansökningar × 1 dag = 100 000 dagar processeringstid sparas per år (konservativ uppskattning), eller ≈ 200 000 handläggartimmar (konservativ uppskattning)</li>
      </ul>

      <h3>3. Kapacitetsökning och kostnadsbesparingar</h3>
      
      <h4>Ökad kapacitet per handläggare</h4>
      <ul>
        <li><strong>Nuvarande:</strong> ~500 ansökningar per handläggare per år (100 000 / 200)</li>
        <li><strong>Med nytt system:</strong> ~800-1000 ansökningar per handläggare per år (60-100% ökning)</li>
        <li><strong>Total kapacitet:</strong> 160 000-200 000 ansökningar/år med samma 200 handläggare, eller 100 000 ansökningar/år med 100-125 handläggare (50-37.5% personalbesparing)</li>
      </ul>

      <h4>Kostnadsbesparingar</h4>
      <ul>
        <li><strong>Total tidssparande:</strong> ~44 000-95 000 timmar/år (~24-52 FTE)</li>
        <li><strong>Kostnadsbesparing:</strong> Uppskattat ~1.4-6.8 MSEK per år (baserat på genomsnittlig handläggarlön)</li>
        <li><strong>Notera:</strong> Exakt kostnadsbesparing kräver faktiska löner och overhead-kostnader</li>
      </ul>

      <h3>Jämförelse med nuvarande process</h3>
      
      <table>
        <thead>
          <tr>
            <th>Aspekt</th>
            <th>Nuvarande</th>
            <th>Nytt system</th>
            <th>Förbättring</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Manuell arbetstid per ansökan</strong></td>
            <td>2-4 timmar</td>
            <td>1.5-3.5 timmar</td>
            <td>25-50 minuter mindre</td>
          </tr>
          <tr>
            <td><strong>Processeringstid</strong></td>
            <td>5-7 dagar</td>
            <td>1-2 dagar</td>
            <td>60-70% snabbare</td>
          </tr>
          <tr>
            <td><strong>Kapacitet per handläggare</strong></td>
            <td>~500 ansökningar/år</td>
            <td>~800-1000 ansökningar/år</td>
            <td>60-100% ökning</td>
          </tr>
          <tr>
            <td><strong>Ansökningar som når handläggare</strong></td>
            <td>100%</td>
            <td>Uppskattat 50-70% (konservativ uppskattning: 70%)</td>
            <td>Uppskattat 30-50% avvisas tidigt (konservativ uppskattning: 30%). Totalt avslag (pre-screening + objekt + stakeholder + KALP) kräver baseline-data.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</section>
```

## Exempel 2: mortgage-se-credit-decision-v2.html (koncis version)

```html
<section class="doc-section">
  <details>
    <summary>Effekt</summary>
    <div class="section-content">
      <p class="muted">Förväntad affärseffekt som uppnås med feature goalet.</p>
      
      <h3>Översikt</h3>
      <p>Credit decision-processen bidrar till betydande affärseffekter genom automatisk beslutsnivåbestämning och straight-through processing. Baserat på ansökningar som når kreditbeslut (uppskattat 50 000-70 000 per år):</p>
      <ul>
        <li><strong>Automatisering:</strong> 40-50% av ansökningar (20 000-35 000) godkänns automatiskt via straight-through processing</li>
        <li><strong>Tidssparande:</strong> 2-3 dagar manuell granskning → 0 dagar för lågriskansökningar</li>
        <li><strong>Kapacitet:</strong> Handläggare kan fokusera på komplexa ansökningar (30-40% av ansökningar)</li>
        <li><strong>Kvalitet:</strong> 40-50% minskning av felaktiga beslut genom strukturerad process</li>
      </ul>
      <p class="muted"><em>Notera: Beräkningarna är konservativa uppskattningar baserat på typiska värden för kreditbeslut. För mer precisa och realistiska beräkningar skulle följande baseline-data behövas: exakt andel lågrisk vs högrisk ansökningar (nuvarande: uppskattat 40-50% lågrisk), genomsnittlig granskningstid per ansökan (nuvarande: uppskattat 2-3 dagar), faktiska löner och overhead-kostnader per handläggare, andel felaktiga beslut i nuvarande process. Med denna data skulle exakta tidssparande i timmar/dagar, exakta kostnadsbesparingar i SEK, och ROI kunna beräknas. Uppskattningarna använder konservativa värden (lägre gränser i intervall) för att undvika överdrivna förväntningar.</em></p>

      <h3>1. Automatisering och minskad manuell hantering</h3>
      
      <h4>Automatisk beslutsnivåbestämning och straight-through processing</h4>
      <p>Via "Determine decision escalation" business rule task utvärderas ansökan automatiskt mot kreditbeslutskriterier. Via "Decision criteria?" gateway dirigeras lågriskansökningar till straight-through processing som godkänner automatiskt.</p>
      <ul>
        <li><strong>Volym:</strong> 40-50% av ansökningar (20 000-35 000) godkänns automatiskt utan manuell granskning</li>
        <li><strong>Tidssparande:</strong> 2-3 dagar manuell granskning elimineras per lågriskansökan</li>
        <li><strong>Process:</strong> 70-80% minskning av manuellt arbete för lågriskansökningar</li>
      </ul>

      <h3>2. Snabbare beslutsprocess och förbättrad kvalitet</h3>
      
      <h4>Automatisk routing och strukturerad granskning</h4>
      <p>Via "Decision criteria?" gateway dirigeras ansökningar automatiskt till rätt beslutsnivå (Board, Committee, Four eyes, eller Straight through). Via "Evaluate application" user tasks struktureras manuell granskning med tydliga kriterier.</p>
      <ul>
        <li><strong>Tidssparande:</strong> 30-40% snabbare beslutsprocess genom automatisk routing</li>
        <li><strong>Kvalitet:</strong> 40-50% minskning av felaktiga beslut genom strukturerad process</li>
        <li><strong>Handläggarupplevelse:</strong> Handläggare fokuserar på komplexa ansökningar (30-40% av ansökningar) istället för alla</li>
      </ul>

      <h3>3. Kapacitetsökning och kostnadsbesparingar</h3>
      
      <h4>Ökad kapacitet för komplexa ansökningar</h4>
      <ul>
        <li><strong>Nuvarande:</strong> Handläggare granskar alla ansökningar (50 000-70 000 per år)</li>
        <li><strong>Med nytt system:</strong> Handläggare granskar endast komplexa ansökningar (15 000-28 000 per år)</li>
        <li><strong>Kapacitetsökning:</strong> 60-80% fler komplexa ansökningar kan hanteras med samma personal</li>
      </ul>

      <h3>Jämförelse med nuvarande process</h3>
      
      <table>
        <thead>
          <tr>
            <th>Aspekt</th>
            <th>Nuvarande</th>
            <th>Nytt system</th>
            <th>Förbättring</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Lågriskansökningar</strong></td>
            <td>2-3 dagar manuell granskning</td>
            <td>0 dagar (automatiskt)</td>
            <td>100% minskning</td>
          </tr>
          <tr>
            <td><strong>Beslutsprocess-tid</strong></td>
            <td>3-4 dagar</td>
            <td>1-2 dagar</td>
            <td>30-40% snabbare</td>
          </tr>
          <tr>
            <td><strong>Felaktiga beslut</strong></td>
            <td>Baseline</td>
            <td>40-50% minskning</td>
            <td>Förbättrad kvalitet</td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</section>
```

## Riktlinjer för koncis struktur

**Längd:**
- **Koncis struktur:** 200-400 ord, 3-4 kategorier
- **Fokusera på:** De 3-5 viktigaste effekterna totalt
- **Undvik:** Repetition, för detaljerade beräkningar, för många kategorier

**Struktur:**
1. **Översikt** (3-5 viktigaste effekterna med volym-baserade siffror)
2. **1-2 kategorier** med viktigaste BPMN-mekanismerna
3. **Kort jämförelse** med nuvarande process (tabell)

**Inkludera alltid:**
- Kommentar om att beräkningarna är konservativa uppskattningar
- Nämn explicit vilken data som saknas för mer precisa beräkningar
- Fokusera på relativa förbättringar (nuvarande vs nytt system)
- Använd konservativa värden (lägre gränser i intervall)
- Nämn när siffror är uppskattningar: "uppskattat", "förväntat", "baserat på typiska värden"
- **Var konsekvent:** Använd samma siffror för samma sak genom hela kapitlet
- **Förtydliga avslagsprocent:** Separera tydligt mellan pre-screening (5-15%) och totalt avslag (kräver baseline-data)
- **Förtydliga beräkningar:** Visa hur totalt tidssparande beräknas (dela upp per aktivitet)
- **Gör siffror tolkningsbara:** Undvik svårtolkade siffror som "100 000 dagar", använd istället "100 000 ansökningar × 1 dag" eller konvertera till handläggartimmar

