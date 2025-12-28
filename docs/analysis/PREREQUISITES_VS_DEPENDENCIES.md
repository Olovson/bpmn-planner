# Förutsättningar vs Beroenden - Skillnad och Överlapp

**Datum:** 2025-12-28

## Fråga

Är "Förutsättningar" och "Beroenden" mer eller mindre samma sak?

## Svar: De är olika, men kan överlappa

### Förutsättningar (Prerequisites)
**Vad:** Process-kontext - vad måste vara klart INNAN epiken kan köras

**Exempel:**
- "Föregående steg måste vara klart"
- "Data måste vara validerad"
- "KYC/AML-kontroller ska vara godkända"
- "Grundläggande kund- och ansökningsdata är komplett"

**Fokus:** Processflöde och affärslogik

---

### Beroenden (Dependencies)
**Vad:** Tekniska system/API:er - vad behövs för att köra epiken

**Exempel:**
- "Kräver UC API för kreditupplysning"
- "Kräver DMN-regler för beslutsfattande"
- "Kräver integration mot folkbokföring"
- "Kräver databas med kunddata"

**Fokus:** Tekniska system och integrationer

---

## Överlapp

De kan överlappa eftersom:
- "Föregående steg måste vara klart" (Förutsättning) kan också ses som ett beroende på föregående steg
- "Data måste vara validerad" (Förutsättning) kan också ses som ett beroende på valideringssystem

## Rekommendation

### Alternativ 1: Behåll båda (tydligare)
- **Förutsättningar:** Process-kontext (vad måste hända före)
- **Beroenden:** Tekniska system (vad behövs för att köra)

**Fördelar:**
- Tydligare separation mellan process och teknik
- Bättre för olika målgrupper (affärsfolk vs utvecklare)

**Nackdelar:**
- Kan vara förvirrande om de överlappar
- Mer sektioner att fylla i

### Alternativ 2: Konsolidera till "Beroenden"
- Ta bort "Förutsättningar"
- "Beroenden" inkluderar både process-kontext och tekniska system

**Fördelar:**
- Enklare - en sektion istället för två
- Mindre förvirring

**Nackdelar:**
- Mindre tydlig separation
- Kan bli lång lista med olika typer av beroenden

### Alternativ 3: Konsolidera till "Förutsättningar"
- Ta bort "Beroenden"
- "Förutsättningar" inkluderar både process-kontext och tekniska system

**Fördelar:**
- Enklare - en sektion istället för två
- Mer affärsfokuserat språk

**Nackdelar:**
- "Förutsättningar" låter mer som process-kontext än tekniska system
- Kan vara förvirrande för utvecklare

---

## Rekommendation: Alternativ 2 (Konsolidera till "Beroenden")

**Anledning:**
- "Beroenden" är mer allmänt och kan inkludera både process och teknik
- Enklare att förstå - "vad behöver epiken för att fungera?"
- Mindre sektioner att fylla i
- Fokus på minimum-mall

**Implementation:**
- Ta bort "Förutsättningar"-sektionen
- "Beroenden" inkluderar både:
  - Process-kontext (t.ex. "Föregående steg måste vara klart")
  - Tekniska system (t.ex. "Kräver UC API")

---

## Slutsats

Ja, de är mer eller mindre samma sak i praktiken. Rekommendation: Konsolidera till "Beroenden" för enklare och mer fokuserad mall.

