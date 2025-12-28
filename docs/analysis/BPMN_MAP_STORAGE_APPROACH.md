# Analys: Låta Appen Spara bpmn-map.json till Storage

## Översikt

Detta dokument analyserar fördelar och risker med att låta appen faktiskt spara `bpmn-map.json` till Storage och sedan mocka GET-anropen för att returnera test-versionen.

## Nuvarande Problem

**Huvudproblem**: Vi kan inte extrahera JSON-innehåll från Blob-format i Playwright route handler när Supabase använder binary body för storage upload.

**Konsekvens**: Test-versionen av `bpmn-map.json` förblir tom, vilket leder till att:
- Matchningar mellan call activities och subprocess-filer misslyckas
- Dokumentation inte hittas i node-matrix
- Tester misslyckas

## Föreslagen Lösning

**Låta appen faktiskt spara till Storage och mocka GET-anropen:**

1. **POST/PUT-anrop**: Låt gå igenom till Storage (ingen mockning)
2. **GET-anrop**: Mocka för att läsa innehållet från Storage och spara i `testMapContent`
3. **Framtida GET-anrop**: Returnera `testMapContent` istället för att läsa från Storage

## Fördelar

### 1. Faktiskt Få JSON-Innehåll
- ✅ Vi kan faktiskt läsa JSON-innehållet eftersom det sparas till Storage
- ✅ Vi kan spara det i `testMapContent` via GET-anropet
- ✅ Enklare än att försöka extrahera från binary body

### 2. Använder Samma Flöde som Produktion
- ✅ Appen använder samma kod-sökväg som i produktion
- ✅ Testar faktisk Storage-integration
- ✅ Mindre risk för skillnader mellan test och produktion

### 3. Automatisk Generering Fungerar
- ✅ När appen genererar `bpmn-map.json` automatiskt, sparas den faktiskt
- ✅ Vi kan läsa den genererade map:en via GET-anropet
- ✅ Matchningar fungerar korrekt

## Potentiella Problem och Lösningar

### Problem 1: Storage Pollution

**Beskrivning**: Test-versionen av `bpmn-map.json` kan ligga kvar i Storage om cleanup misslyckas.

**Risk**: MEDEL - Test-versionen kan påverka produktionsfilen om den inte rensas.

**Lösning**:
- Lägg till cleanup av `bpmn-map.json` i `cleanupTestFiles()` om den innehåller test-filer
- Använd timestamp-baserad identifiering för att avgöra om `bpmn-map.json` är en test-version
- Lägg till fallback cleanup i `afterEach` hook

**Implementation**:
```typescript
// I cleanupTestFiles eller ny funktion
async function cleanupTestBpmnMap(page: Page, testFileNames: string[]): Promise<void> {
  // Läs bpmn-map.json från Storage
  // Kontrollera om den innehåller referenser till test-filer
  // Om ja, återställ till produktionsversionen eller ta bort
}
```

### Problem 2: Race Conditions

**Beskrivning**: Om flera tester körs samtidigt (även om vi har `mode: 'serial'`), kan de skriva över varandras `bpmn-map.json`.

**Risk**: LÅG - Vi har redan `mode: 'serial'` i test-suiten, så testerna körs sekventiellt.

**Lösning**:
- Behåll `mode: 'serial'` i test-suiten
- Lägg till ytterligare säkerhet genom att spara original-innehållet och återställa efter testet

**Implementation**:
```typescript
// I setupBpmnMapMocking
let originalMapContent: string | null = null;
// Spara original-innehållet
// Efter testet, återställ original-innehållet
```

### Problem 3: Produktionsfilen Skrivs Över

**Beskrivning**: Om testet misslyckas eller kraschar, kan test-versionen ligga kvar och påverka produktionsfilen.

**Risk**: HÖG - Detta är det största problemet.

**Lösning**:
- **Backup och Restore**: Spara original-innehållet innan testet och återställ efter testet
- **Timestamp-baserad Identifiering**: Identifiera om `bpmn-map.json` är en test-version baserat på innehåll (referenser till test-filer)
- **Cleanup i afterEach**: Lägg till cleanup i `afterEach` hook som alltid körs, även om testet misslyckas

**Implementation**:
```typescript
// I setupBpmnMapMocking
let originalMapContent: string | null = null;

// Spara original-innehållet
originalMapContent = await loadFromStorage();

// I afterEach hook
afterEach(async ({ page }) => {
  // Återställ original-innehållet om test-versionen finns
  await restoreOriginalBpmnMap(page, originalMapContent);
});
```

### Problem 4: GET-anrop Timing

**Beskrivning**: Vi måste vänta på att POST-anropet är klart innan vi kan läsa via GET.

**Risk**: MEDEL - Kan leda till race conditions om vi läser för tidigt.

**Lösning**:
- Använd `route.continue()` för POST-anrop och vänta på response
- Fånga upp response från POST-anropet och extrahera innehållet därifrån
- Eller, vänta på att Storage-anropet är klart innan vi läser via GET

**Implementation**:
```typescript
// I POST/PUT handler
await route.continue();
// Vänta på response
const response = await route.request().response();
if (response) {
  // Försök läsa innehållet från response
  // Eller, vänta och läs via GET senare
}
```

### Problem 5: Cleanup Misslyckas

**Beskrivning**: Om cleanup misslyckas, kan test-versionen ligga kvar i Storage.

**Risk**: MEDEL - Kan påverka framtida tester eller produktionsfilen.

**Lösning**:
- Lägg till retry-logik i cleanup
- Lägg till fallback cleanup i `afterEach` hook
- Logga varningar om cleanup misslyckas

## Rekommenderad Implementation

### Steg 1: Låt POST/PUT Gå Genom till Storage

```typescript
if (method === 'POST' || method === 'PUT') {
  // Låt anropet gå igenom till Storage
  await route.continue();
  
  // Försök läsa innehållet via GET efter en kort delay
  // (eller fånga upp response om möjligt)
}
```

### Steg 2: Mocka GET-anropen för att Läsa från Storage

```typescript
if (method === 'GET') {
  if (testMapContent) {
    // Returnera test-versionen
    await route.fulfill({ body: testMapContent });
  } else {
    // Låt anropet gå igenom och fånga upp response
    const response = await route.continue();
    // Läsa innehållet från response och spara i testMapContent
  }
}
```

### Steg 3: Lägg till Cleanup

```typescript
// I cleanupTestFiles eller ny funktion
async function cleanupTestBpmnMap(page: Page, testFileNames: string[]): Promise<void> {
  // Läs bpmn-map.json från Storage
  // Kontrollera om den innehåller referenser till test-filer
  // Om ja, återställ till produktionsversionen
}
```

### Steg 4: Lägg till Backup och Restore

```typescript
// I setupBpmnMapMocking
let originalMapContent: string | null = null;

// Spara original-innehållet
originalMapContent = await loadFromStorage();

// Exportera funktion för att återställa
export async function restoreOriginalBpmnMap(page: Page, originalContent: string | null): Promise<void> {
  if (originalContent) {
    // Återställ original-innehållet till Storage
  }
}
```

## Sammanfattning

### Fördelar
- ✅ Vi kan faktiskt få JSON-innehåll
- ✅ Använder samma flöde som produktion
- ✅ Automatisk generering fungerar

### Risker
- ⚠️ Storage pollution (lösbart med cleanup)
- ⚠️ Race conditions (låg risk med `mode: 'serial'`)
- ⚠️ Produktionsfilen skrivs över (lösbart med backup/restore)
- ⚠️ GET-anrop timing (lösbart med response interception)
- ⚠️ Cleanup misslyckas (lösbart med retry och fallback)

### Rekommendation

**JA, detta är en bra lösning** om vi implementerar:
1. ✅ Backup och restore av original-innehållet
2. ✅ Cleanup av test-versionen efter testet
3. ✅ Fallback cleanup i `afterEach` hook
4. ✅ Response interception för att fånga upp innehållet direkt

**Konfidens**: MEDEL-HÖG - Lösningen bör fungera, men kräver noggrann implementation av backup/restore och cleanup.




