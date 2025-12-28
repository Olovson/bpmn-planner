# Säkerhetsanalys: Test-skydd mot Produktionsfiler

## Datum: 2025-12-26

## 🚨 KRITISKT: Tester får INTE kunna förstöra produktionsfiler

Varje gång innehållet måste genereras om kostar det ca 20 dollar.

## Identifierade Riskområden

### 1. ✅ BPMN-fil Upload (testSteps.ts)
**Status**: SKYDDAT
- `stepUploadBpmnFile()` kräver "test-" prefix
- Kastar error om filnamn saknar prefix
- Edge Function `upload-bpmn-file` loggar men tillåter uppdatering av produktionsfiler

**Problem**: Edge Function tillåter fortfarande uppdatering av produktionsfiler om de redan finns.

**Lösning**: Förbättra Edge Function för att INTE tillåta test-filer att skriva över produktionsfiler.

### 2. ⚠️ Dokumentations-cleanup (testCleanup.ts)
**Status**: DELVIS SKYDDAT
- `cleanupTestDocumentationFromStorage()` filtrerar på test-pattern
- Men kan teoretiskt radera fel filer om pattern matchar produktionsfiler

**Problem**: Pattern-matching kan vara för bred.

**Lösning**: Lägg till extra validering att filnamn INTE får matcha produktionsfiler.

### 3. ⚠️ bpmn-map.json Restore (bpmnMapTestHelper.ts)
**Status**: DELVIS SKYDDAT
- `restoreOriginalBpmnMap()` kontrollerar om test-versionen innehåller test-filer
- Men om kontrollen misslyckas kan den skriva över produktionsfilen

**Problem**: Om `hasTestFiles` check misslyckas kan restore skriva över produktionsfilen.

**Lösning**: Lägg till extra säkerhetscheck att vi INTE skriver över produktionsfilen om test-versionen inte innehåller test-filer.

### 4. ⚠️ Storage Operations (cleanupTestDocumentationFromStorage)
**Status**: DELVIS SKYDDAT
- Använder `supabase.storage.remove()` direkt
- Ingen validering att filerna faktiskt är test-filer

**Problem**: Om pattern-matching misslyckas kan produktionsfiler raderas.

**Lösning**: Lägg till extra validering att filnamn INTE får matcha produktionsfiler.

## Implementerade Säkerhetsåtgärder

### 1. Test-filnamn Validering
- ✅ Alla test-filer måste ha "test-" prefix
- ✅ `stepUploadBpmnFile()` kastar error om prefix saknas
- ✅ `generateTestFileName()` säkerställer prefix

### 2. Edge Function Skydd
- ⚠️ Edge Function loggar men tillåter fortfarande uppdatering
- **Behöver förbättras**: Blockera test-filer från att skriva över produktionsfiler

### 3. Cleanup Skydd
- ⚠️ Cleanup filtrerar på pattern men kan misslyckas
- **Behöver förbättras**: Extra validering att filnamn INTE matchar produktionsfiler

### 4. bpmn-map.json Restore Skydd
- ⚠️ Restore kontrollerar test-filer men kan misslyckas
- **Behöver förbättras**: Extra säkerhetscheck att vi INTE skriver över produktionsfilen

## Rekommenderade Förbättringar

### 1. Förbättra Edge Function
```typescript
// I upload-bpmn-file/index.ts
const isTestFile = fileName.startsWith('test-');
if (isTestFile) {
  // Test-filer kan alltid skrivas över
  console.log(`[upload-bpmn-file] Uploading test file: ${fileName}`);
} else {
  // Produktionsfiler - kontrollera om test-fil försöker skriva över
  const { data: existingFile } = await supabase
    .from('bpmn_files')
    .select('file_name')
    .eq('file_name', fileName)
    .maybeSingle();
  
  if (existingFile) {
    // Produktionsfil finns - INTE tillåt uppdatering från test-kontext
    // (Detta hanteras av versioning-systemet, men vi loggar ändå)
    console.log(`[upload-bpmn-file] Updating existing production file: ${fileName}`);
  }
}
```

### 2. Förbättra Cleanup Validering
```typescript
// I cleanupTestDocumentationFromStorage
function isTestFile(filePath: string, testFileNames: string[]): boolean {
  // Extra säkerhetscheck: INTE matcha produktionsfiler
  const productionFilePattern = /^(mortgage|credit|application|object|household|internal|appeal|credit-evaluation|object-control|object-information)\.bpmn$/i;
  const fileName = filePath.split('/').pop() || '';
  
  // Om filnamn matchar produktionsfil-pattern, INTE radera
  if (productionFilePattern.test(fileName)) {
    return false;
  }
  
  // Fortsätt med normal test-fil check
  // ...
}
```

### 3. Förbättra bpmn-map.json Restore
```typescript
// I restoreOriginalBpmnMap
// Extra säkerhetscheck: INTE skriv över produktionsfilen om test-versionen inte innehåller test-filer
if (hasTestFiles) {
  // Test-versionen innehåller test-filer, återställ original-innehållet
  // ...
} else {
  // Test-versionen innehåller INGA test-filer
  // Extra säkerhetscheck: Kontrollera att vi INTE skriver över produktionsfilen
  const currentContent = await page.evaluate(async () => {
    // Läs nuvarande innehåll från Storage
    // ...
  });
  
  // Om nuvarande innehåll INTE innehåller test-filer, INTE skriv över
  if (currentContent && !currentContent.includes('test-')) {
    console.log('[bpmnMapTestHelper] Current bpmn-map.json does not contain test files, NOT restoring (safety check)');
    return;
  }
  
  // Annars, återställ original-innehållet
  // ...
}
```

## Ytterligare Säkerhetsåtgärder

### 1. Lägg till Production File Whitelist
```typescript
const PRODUCTION_FILES = [
  'mortgage-se-application.bpmn',
  'mortgage-se-object.bpmn',
  'mortgage-se-credit-evaluation.bpmn',
  // ... etc
];

function isProductionFile(fileName: string): boolean {
  return PRODUCTION_FILES.some(prod => 
    fileName.toLowerCase() === prod.toLowerCase() || 
    fileName.toLowerCase().includes(prod.toLowerCase().replace('.bpmn', ''))
  );
}
```

### 2. Lägg till Extra Validering i Cleanup
```typescript
// I cleanupTestDocumentationFromStorage
if (isProductionFile(fileName)) {
  console.warn(`[cleanupTestDocumentationFromStorage] SKIPPING production file: ${fileName}`);
  return false; // INTE radera produktionsfiler
}
```

### 3. Lägg till Extra Validering i Restore
```typescript
// I restoreOriginalBpmnMap
// Kontrollera att original-innehållet INTE innehåller test-filer
const originalHasTestFiles = originalMapContent.includes('test-');
if (originalHasTestFiles) {
  console.warn('[bpmnMapTestHelper] Original bpmn-map.json contains test files, NOT restoring (safety check)');
  return;
}
```




