# Komplett checklista för systematisk förbättring av Feature Goal-filer

## ⚠️ KRITISKA REGLER

- ❌ **INGA shortcuts** - Kvalitet är absolut nödvändigt
- ❌ **INGA filer hoppas över** - Alla filer måste uppdateras
- ❌ **INGA sektioner hoppas över** - Alla sektioner måste granskas
- ❌ **INGA automatiseringar** - Varje fil ska granskas och uppdateras manuellt
- ✅ **KVALITET FÖRE HASTIGHET** - Ta den tid som behövs
- ✅ **SYSTEMATISK PROCESS** - Gå igenom varje fil steg för steg
- ✅ **VERIFIERA EFTER VARJE FIL** - Kontrollera att allt är korrekt

## 📋 Komplett checklista för varje fil

### Steg 1: Läsa och analysera filen
- [ ] Läsa hela filen grundligt
- [ ] Identifiera alla sektioner
- [ ] Identifiera vad som behöver uppdateras
- [ ] Läsa relaterade BPMN-filer för att förstå processen

### Steg 2: Uppdatera Omfattning-sektionen
- [ ] Ta bort tekniska krav (timeout, retry, error codes, logging)
- [ ] Ta bort skalbarhet och säkerhet
- [ ] Behåll huvudsteg och felhantering (affärsorienterat)
- [ ] Lägg till notis om att tekniska krav finns i Tekniska krav-sektionen
- [ ] Verifiera att innehållet är affärsorienterat
- [ ] Kontrollera att alla aktiviteter från BPMN är inkluderade

### Steg 3: Uppdatera User stories-sektionen
- [ ] Behåll funktionella acceptanskriterier (enligt Alternativ 3)
- [ ] Kontrollera att acceptanskriterier fokuserar på vad användaren ser/gör, UI/UX
- [ ] Ta bort tekniska krav från acceptanskriterier om de finns
- [ ] Lägg till notis om att tekniska krav finns i Tekniska krav-sektionen
- [ ] Verifiera att user stories är koncisa och lättlästa
- [ ] Organisera i kategorier (Kundperspektiv, Handläggarperspektiv, etc.)

### Steg 4: Uppdatera Acceptanskriterier → Tekniska krav
- [ ] Döp om sektionen till "Tekniska krav"
- [ ] Ta bort funktionella acceptanskriterier (flytta till User stories om de saknas där)
- [ ] Lägg till tekniska krav från Omfattning-sektionen (timeout, retry, error codes, logging)
- [ ] Lägg till skalbarhet och säkerhet från Omfattning-sektionen
- [ ] Organisera i kategorier: Tekniska krav, Skalbarhet och prestanda, Säkerhet och compliance
- [ ] Lägg till notis om att funktionella acceptanskriterier finns i User stories-sektionen
- [ ] Verifiera att endast tekniska krav finns kvar

### Steg 5: Uppdatera Effekt-sektionen
- [ ] Lägg till Executive Summary (direktörsvänlig, kortfattad, 3-4 kategorier)
- [ ] Lägg till volym-baserade beräkningar (baserat på antal ansökningar/processer per år)
- [ ] Lägg till detaljerade sektioner med tabeller (OBLIGATORISKT för alla beräkningar)
  - [ ] Sektion 1: Automatisering och kostnadsbesparingar (med tabell)
  - [ ] Sektion 2: Snabbare processering och förbättrad kundupplevelse (med tabell)
  - [ ] Sektion 3: Kapacitetsökning (med tabell)
- [ ] Lägg till jämförelse med nuvarande process (tabell)
- [ ] Lägg till aggregeringsinformation (OBLIGATORISKT - tabell med kolumner: Effekt, Typ, Volym, Aggregeringsbar, Redan inkluderad i parent)
- [ ] Verifiera att alla siffror är konservativa uppskattningar och markeras som sådana
- [ ] Verifiera att strukturen matchar `mortgage-application-v2.html` som referens

### Steg 6: Uppdatera Testscenarier-sektionen
- [ ] Kontrollera att alla testscenarier har Given-When-Then struktur
- [ ] Kontrollera att scenarion täcker alla processsteg (varje aktivitet, gateway, error event)
- [ ] Kontrollera att scenarion inkluderar alla scenariotyper (Happy, Error, Edge)
- [ ] Kontrollera att testdata-referenser är specifika (inte bara beskrivningar)
- [ ] Kontrollera att UI Flow per scenario är komplett
- [ ] Kontrollera att assertions är specifika och testbara
- [ ] Verifiera att scenarion matchar BPMN-processen

### Steg 7: Verifiera alla referenser
- [ ] Kontrollera att alla referenser till "Acceptanskriterier-sektionen" är uppdaterade till "Tekniska krav-sektionen" där relevant
- [ ] Kontrollera att referenser till funktionella acceptanskriterier pekar på User stories
- [ ] Kontrollera att referenser till tekniska krav pekar på Tekniska krav-sektionen

### Steg 8: Kvalitetskontroll
- [ ] Verifiera att allt innehåll är behållet (inget har försvunnit)
- [ ] Verifiera att separationen är tydlig (funktionella vs tekniska krav)
- [ ] Verifiera att filen är lättläst och koncis
- [ ] Kontrollera att inga tekniska detaljer finns kvar i Omfattning
- [ ] Kontrollera att inga funktionella detaljer finns kvar i Tekniska krav
- [ ] Kontrollera att Effekt-sektionen har korrekt struktur (Executive Summary, tabeller, aggregeringsinformation)
- [ ] Kontrollera att Testscenarier-sektionen har Given-When-Then struktur

### Steg 9: Markera som klar
- [ ] Markera filen med [x] i listan
- [ ] Notera eventuella särskilda observationer

## 📊 Status

- **Totalt:** 26 filer
- **Klara:** 0 filer (alla behöver komplett genomgång)
- **Kvar:** 26 filer
- **Framsteg:** 0% (0/26)

## ⚠️ VIKTIGT

**Jag har tidigare missat:**
- Effekt-sektionen (behöver Executive Summary, tabeller, aggregeringsinformation)
- Testscenarier-sektionen (behöver Given-When-Then struktur)

**Från och med nu ska ALLA sektioner uppdateras systematiskt för varje fil.**

