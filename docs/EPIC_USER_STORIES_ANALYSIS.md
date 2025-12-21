# Analys: User Stories och Acceptanskriterier för Epics

## Nuvarande situation

### Feature Goals har user stories
- Feature Goals (v2) innehåller redan user stories med acceptanskriterier
- Format: "Som [roll] vill jag [mål] så att [värde]"
- Acceptanskriterier: Konkreta krav som måste uppfyllas

### Epics saknar user stories
- Epics har endast `scenarios` (test-orienterade)
- Scenarios fokuserar på testfall (Happy, Edge, Error)
- Saknar explicit användarcentrerad beskrivning

## Analys: Behövs user stories för Epics?

### ✅ FÖRDELAR

#### 1. **Användarcentrerad fokus**
- User stories tvingar fokus på **vem** använder systemet och **varför**
- För User Tasks: Mycket värdefullt - tydlig fokus på användarens behov
- För Service Tasks: Mindre värdefullt men kan ge kontext om vem som drar nytta

#### 2. **Acceptanskriterier är mer konkreta än scenarios**
- **Scenarios**: Test-orienterade, fokuserar på "vad händer om..."
- **Acceptanskriterier**: Konkreta krav, fokuserar på "vad måste fungera"
- Exempel scenario: "Happy path - kunden fyller i korrekta uppgifter"
- Exempel acceptanskriterium: "Systemet ska validera att alla obligatoriska fält är ifyllda innan formuläret kan skickas"

#### 3. **Bättre för implementation**
- Acceptanskriterier ger tydligare riktlinjer för utvecklare
- "Systemet ska X" är mer actionabelt än "Happy path scenario"
- Kan användas direkt för att skriva tester

#### 4. **Konsistens med Feature Goals**
- Feature Goals har redan user stories
- Epics är delar av Feature Goals - logiskt att de också har user stories
- Ger bättre hierarki: Feature Goal → User Stories → Epic User Stories

### ⚠️  NACKDELAR

#### 1. **Risk för generiska formuleringar**
- LLM kan generera generiska user stories som inte ger värde
- "Som användare vill jag att systemet fungerar så att jag kan använda det" - inte värdefullt
- Kräver tydliga instruktioner i prompten

#### 2. **Kan bli redundant med scenarios**
- User stories och scenarios kan överlappa
- Risk för dubbelarbete
- Men: User stories fokuserar på "vad", scenarios på "hur man testar"

#### 3. **Ökar komplexitet**
- Ytterligare fält att hantera
- Mer innehåll att generera
- Men: Kan göras opcional för att minska komplexitet

#### 4. **Mindre värde för Service Tasks**
- Service Tasks har ofta ingen direkt användare
- User stories kan bli artificiella ("Som system vill jag...")
- Men: Kan utelämnas eller förenklas för Service Tasks

## Rekommendation

### ✅ LÄGG TILL - Men gör det OPCIONAL och SMART

#### Struktur:
```typescript
{
  // ... befintliga fält ...
  userStories?: Array<{
    id: string;
    role: string;  // "Kund", "Handläggare", "System"
    goal: string;  // Vad vill rollen uppnå?
    value: string; // Varför är det värdefullt?
    acceptanceCriteria: string[]; // Konkreta krav
  }>;
}
```

#### Regler:
1. **Opcional fält** - Kan utelämnas om det inte ger värde
2. **Primärt för User Tasks** - Viktigast för User Tasks, mindre viktigt för Service Tasks
3. **Minimalt antal** - 1-3 user stories per Epic (inte för många)
4. **Konkreta acceptanskriterier** - Varje user story ska ha 2-4 konkreta acceptanskriterier
5. **Tydliga instruktioner i prompten** - Förhindra generiska formuleringar

### Implementering

#### För User Tasks:
- **Rekommenderat**: 2-3 user stories med acceptanskriterier
- Fokus på användarens behov och värde
- Exempel: "Som kund vill jag kunna se min ansökningsstatus så att jag vet vad som händer"

#### För Service Tasks:
- **Opcional**: 1-2 user stories om det ger värde
- Fokus på vem som drar nytta (indirekt användare)
- Exempel: "Som handläggare vill jag att systemet automatiskt hämtar kunddata så att jag slipper göra det manuellt"
- Eller utelämna helt om det blir för artificiellt

## Jämförelse: Scenarios vs User Stories + Acceptanskriterier

### Scenarios (nuvarande):
```
Scenario: Happy path
Type: Happy
Description: Kunden fyller i korrekta uppgifter och flödet går vidare
Outcome: Epiken slutförs utan avvikelser
```

### User Story + Acceptanskriterier (föreslaget):
```
User Story: Som kund vill jag kunna fylla i min ansökningsinformation så att jag kan ansöka om lån
Acceptanskriterier:
- Systemet ska validera att alla obligatoriska fält är ifyllda
- Systemet ska visa tydliga felmeddelanden om fält saknas eller är ogiltiga
- Systemet ska spara utkast automatiskt så att kunden inte förlorar information
- Systemet ska bekräfta när informationen är sparad
```

**Skillnad:**
- Scenarios: Test-orienterade, fokuserar på "vad händer"
- User Stories + AC: Användarcentrerade, fokuserar på "vad måste fungera"

## Slutsats

### ✅ JA - Lägg till user stories och acceptanskriterier

**Men:**
1. Gör det **opcional** - inte obligatoriskt
2. **Primärt för User Tasks** - mindre viktigt för Service Tasks
3. **Tydliga instruktioner** - förhindra generiska formuleringar
4. **Minimalt antal** - 1-3 user stories per Epic
5. **Konkreta acceptanskriterier** - 2-4 per user story

**Varför:**
- Ger bättre användarcentrerad fokus
- Acceptanskriterier är mer konkreta än scenarios
- Bättre för implementation och testning
- Konsistens med Feature Goals
- Kan utelämnas om det inte ger värde

**Risk:**
- Generiska formuleringar - men kan hanteras med tydliga instruktioner
- Redundans med scenarios - men de fyller olika syften
- Ökad komplexitet - men opcional fält minskar risken





