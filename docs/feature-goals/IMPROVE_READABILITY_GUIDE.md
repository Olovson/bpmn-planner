# Guide: Förbättra läsbarhet för långa dokument

Denna guide beskriver de automatiska läsbarhetsförbättringar som har implementerats för Feature Goal-dokument.

## 🎯 Förbättringar som har implementerats

### 1. Collapsible Sections (Automatiskt)
- **Alla sektioner är collapsible/expandable** för bättre navigering
- **"Beskrivning av FGoal" öppen som standard** - Den första sektionen är alltid öppen när dokumentet öppnas
- **Alla andra sektioner stängda som standard** - Minskar scrollning och ger bättre översikt
- **Visuell indikator** - ▶-ikon som roterar när sektionen expanderas
- **Hover-effekter** - Tydlig visuell feedback när användaren hovrar över sektioner

### 2. Förbättrad visuell hierarki
- **Tydligare spacing** mellan sektioner
- **Bättre typografi** med tydliga rubriker
- **Card-baserad layout** för bättre läsbarhet
- **Konsekvent styling** för alla sektioner

### 3. Standalone-kompatibilitet
- **All CSS inline** - Inga externa dependencies
- **Ingen JavaScript** - Funktioner fungerar med ren HTML/CSS
- **Fungerar perfekt som standalone-filer** - Kan skickas via e-post, öppnas direkt i webbläsare, eller användas utan appen

### 4. Borttagna element
- **Ingen sidebar-menyn** - Dokumenten använder collapsible sections istället
- **Ingen Confluence-sektion** - Denna sektion har tagits bort helt

## 📋 Automatisk uppdatering

Alla Feature Goal-dokument uppdateras automatiskt via `scripts/improve-feature-goal-readability.ts`.

**Kör scriptet manuellt:**
```bash
npx tsx scripts/improve-feature-goal-readability.ts
```

Scriptet:
- ✅ Uppdaterar alla HTML-filer i `public/local-content/feature-goals/`
- ✅ Gör alla sektioner collapsible (förutom "Beskrivning av FGoal" som är öppen)
- ✅ Tar bort Confluence-sektionen
- ✅ Tar bort sidebar/TOC-struktur
- ✅ Ersätter CSS med förbättrad version
- ✅ Säkerställer standalone-kompatibilitet

## 🎨 Struktur

Varje sektion har nu följande struktur:

```html
<section class="doc-section">
  <details open>  <!-- "open" bara för "Beskrivning av FGoal" -->
    <summary>Beskrivning av FGoal</summary>
    <div class="section-content">
      <!-- Innehåll här -->
    </div>
  </details>
</section>
```

## 💡 Tips för användning

1. **Öppna sektioner när du läser** - Klicka på sektionstiteln för att expandera
2. **"Beskrivning av FGoal" är alltid öppen** - Den första sektionen ger direkt översikt
3. **Stängda sektioner ger översikt** - Se alla sektioner på en gång utan att scrolla
4. **Standalone-kompatibelt** - Dokumenten fungerar perfekt utan appen

## 📝 Noteringar

- **Ingen manuell uppdatering behövs** - Scriptet hanterar allt automatiskt
- **Befintligt innehåll bevaras** - Endast strukturen och styling uppdateras
- **Confluence-sektionen tas bort automatiskt** - Om den finns i filen
