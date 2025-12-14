# Exempel: Enkel Effekt-sektion för enkla processer

## Exempel: mortgage-appeal-v2.html (enkel process)

**Komplexitet:** Enkel - få aktiviteter, enkelt flöde, inga call activities

```html
<section class="doc-section">
  <details>
    <summary>Effekt</summary>
    <div class="section-content">
      <p class="muted">Förväntad affärseffekt som uppnås med feature goalet.</p>
      
      <h3>Översikt</h3>
      <p>Appeal-processen bidrar till förbättrad kundupplevelse genom strukturerad hantering av överklaganden. Baserat på uppskattat 5 000-10 000 överklaganden per år (konservativ uppskattning: 5 000):</p>
      <ul>
        <li><strong>Kundupplevelse:</strong> Strukturerad process för överklaganden ger kunder tydlig feedback och snabbare hantering</li>
        <li><strong>Processhantering:</strong> Automatisk screening och routing säkerställer att överklaganden hanteras korrekt</li>
        <li><strong>Tidssparande:</strong> Uppskattat 1-2 dagar snabbare hanteringstid per överklagan (konservativ uppskattning: 1 dag)</li>
      </ul>
      <p class="muted"><em>Notera: Beräkningarna är konservativa uppskattningar baserat på typiska värden för liknande processer. För mer precisa beräkningar skulle följande baseline-data behövas: exakt antal överklaganden per år, genomsnittlig hanteringstid i nuvarande process, faktiska löner och overhead-kostnader per handläggare.</em></p>

      <h3>Förbättrad kundupplevelse och processhantering</h3>
      <ul>
        <li><strong>Strukturerad hantering:</strong> Via "Screening accepted?" gateway och "Submit appeal" user task får kunder tydlig feedback om överklagandet godkänns eller avvisas. Detta förbättrar kundupplevelsen genom tydlig kommunikation.</li>
        <li><strong>Automatisk routing:</strong> Via "Screening accepted?" gateway dirigeras överklaganden automatiskt till rätt hantering, vilket säkerställer att endast godkända överklaganden går vidare.</li>
        <li><strong>Tidssparande:</strong> Uppskattat 1-2 dagar snabbare hanteringstid per överklagan (konservativ uppskattning: 1 dag) genom strukturerad process och automatisk routing. För uppskattat 5 000 överklaganden per år: 5 000 dagar processeringstid sparas per år (konservativ uppskattning).</li>
      </ul>
    </div>
  </details>
</section>
```

## Riktlinjer för enkla processer

**Längd:** 100-200 ord

**Struktur:**
- **Översikt:** 2-3 viktigaste effekterna (kortfattat)
- **En kategori:** "Förbättrad kundupplevelse och processhantering" eller liknande
- **Ingen tabell:** Endast om det finns tydlig jämförelse att göra

**Fokus:**
- Affärsmässigt och relevant
- 2-3 viktigaste effekterna
- Kortfattat och koncist
- Undvik onödiga detaljer

**Undvik:**
- Många kategorier
- Långa förklaringar
- Detaljerade volym-baserade beräkningar (om inte relevant)
- Tekniska detaljer
- "Halv novell" - håll det kortfattat

