# Analys: Realism i UI-tester

## Problem identifierade

### 1. Testgenerering kräver dokumentation - men vi genererar inte dokumentation först

**Problem:**
- I `test-generation-from-scratch.spec.ts` försöker vi generera tester direkt
- Men enligt `useTestGeneration.ts` kräver testgenerering att dokumentation redan är genererad
- Appen visar varning: "Dokumentation saknas för X nod(er). Generera dokumentation först."

**Verklig app-funktionalitet:**
```typescript
// useTestGeneration.ts:167-180
if (result.missingDocumentation && result.missingDocumentation.length > 0) {
  toast({
    title: 'Dokumentation saknas',
    description: `Dokumentation saknas för ${result.missingDocumentation.length} nod(er): ${missingNames}${moreText}. Generera dokumentation först.`,
    variant: 'destructive',
  });
}
```

**Vad vi gör i testet:**
- Vi genererar INTE dokumentation först
- Vi hoppar över detta steg helt
- Testet kan passera även om dokumentation saknas (vilket är fel)

### 2. För många try/catch som döljer fel

**Problem:**
- Många tester använder `try { ... } catch { console.log('⚠️  ...') }` 
- Detta döljer faktiska fel och gör att tester kan passera även när saker inte fungerar

**Exempel:**
```typescript
// Steg 3: Bygg hierarki
try {
  await stepBuildHierarchy(ctx);
} catch (error) {
  console.log('⚠️  Could not build hierarchy, might already be built');
}
```

**Vad vi borde göra:**
- Verifiera att hierarki faktiskt byggdes (kolla Process Explorer eller hierarki-rapport)
- Om hierarki inte byggdes, faila testet med tydligt felmeddelande

### 3. Hierarki byggs automatiskt - men vi försöker bygga den manuellt

**Verklig app-funktionalitet:**
- Appen bygger automatiskt hierarki innan generering (`useFileGeneration.ts:483-500`)
- Appen bygger automatiskt hierarki innan testgenerering (`useTestGeneration.ts:123-140`)

**Vad vi gör i testet:**
- Vi försöker bygga hierarki manuellt först
- Detta är onödigt men inte skadligt
- Men vi borde verifiera att hierarki faktiskt byggdes automatiskt

### 4. För många `.catch(() => {})` som döljer fel

**Problem:**
- Många tester använder `.catch(() => {})` vilket döljer fel
- Detta gör att tester kan passera även när saker inte fungerar

**Exempel:**
```typescript
await Promise.race([
  page.waitForSelector('text=/success/i', { timeout: 30000 }),
  page.waitForTimeout(5000),
]).catch(() => {
  // Timeout är acceptabelt - generering kan ta längre tid
});
```

**Vad vi borde göra:**
- Verifiera att operationen faktiskt slutfördes
- Om timeout, faila testet med tydligt felmeddelande

### 5. Validering saknas - vi verifierar inte att saker faktiskt hände

**Problem:**
- Vi verifierar inte att dokumentation faktiskt genererades
- Vi verifierar inte att tester faktiskt genererades
- Vi verifierar inte att hierarki faktiskt byggdes

**Vad vi borde göra:**
- Verifiera att dokumentation finns i Doc Viewer
- Verifiera att tester finns i Test Report och Test Coverage
- Verifiera att hierarki finns i Process Explorer

### 6. Testgenerering kräver dokumentation - men vi testar inte detta

**Verklig app-funktionalitet:**
- Testgenerering kräver att dokumentation redan är genererad
- Om dokumentation saknas, visar appen varning

**Vad vi gör i testet:**
- Vi genererar INTE dokumentation först
- Vi testar INTE att varning visas när dokumentation saknas
- Vi hoppar över detta helt

## Lösningar

### 1. Fixa testgenerering-testet

**Före:**
```typescript
// Steg 3: Bygg hierarki
try {
  await stepBuildHierarchy(ctx);
} catch (error) {
  console.log('⚠️  Could not build hierarchy, might already be built');
}

// Steg 5: Välj fil för testgenerering
const fileName = await ensureFileCanBeSelected(ctx);
await stepSelectFile(ctx, fileName);

// Steg 6: Starta testgenerering
await generateTestsButton.click();
```

**Efter:**
```typescript
// Steg 3: Bygg hierarki (verifiera att det fungerade)
await stepBuildHierarchy(ctx);
await verifyHierarchyBuilt(ctx); // NY: Verifiera att hierarki byggdes

// Steg 4: Generera dokumentation FÖRST (krav för testgenerering)
await stepSelectFile(ctx, fileName);
await stepStartGeneration(ctx);
await stepWaitForGenerationComplete(ctx, 30000);
await verifyDocumentationGenerated(ctx); // NY: Verifiera att dokumentation genererades

// Steg 5: Välj fil för testgenerering
await stepSelectFile(ctx, fileName);

// Steg 6: Starta testgenerering
await generateTestsButton.click();
await verifyTestsGenerated(ctx); // NY: Verifiera att tester genererades
```

### 2. Ta bort onödiga try/catch

**Före:**
```typescript
try {
  await stepBuildHierarchy(ctx);
} catch (error) {
  console.log('⚠️  Could not build hierarchy, might already be built');
}
```

**Efter:**
```typescript
await stepBuildHierarchy(ctx);
// Verifiera att hierarki faktiskt byggdes
await verifyHierarchyBuilt(ctx);
```

### 3. Verifiera att operationer faktiskt slutfördes

**Före:**
```typescript
await Promise.race([
  page.waitForSelector('text=/success/i', { timeout: 30000 }),
  page.waitForTimeout(5000),
]).catch(() => {
  // Timeout är acceptabelt
});
```

**Efter:**
```typescript
const successMessage = await page.waitForSelector(
  'text=/success/i, text=/klar/i, text=/complete/i',
  { timeout: 30000 }
).catch(() => null);

if (!successMessage) {
  throw new Error('Operation did not complete successfully - no success message found');
}
```

### 4. Lägg till verifieringssteg

**Nya helper-funktioner:**
- `verifyHierarchyBuilt(ctx)` - Verifiera att hierarki finns i Process Explorer
- `verifyDocumentationGenerated(ctx, fileName)` - Verifiera att dokumentation finns i Doc Viewer
- `verifyTestsGenerated(ctx)` - Verifiera att tester finns i Test Report och Test Coverage

## Prioritering

### Hög prioritet (kritiskt)
1. ✅ Fixa testgenerering-testet - generera dokumentation först
2. ✅ Verifiera att dokumentation faktiskt genererades
3. ✅ Verifiera att tester faktiskt genererades

### Medel prioritet (viktigt)
4. ✅ Ta bort onödiga try/catch som döljer fel
5. ✅ Verifiera att hierarki faktiskt byggdes
6. ✅ Verifiera att operationer faktiskt slutfördes

### Låg prioritet (förbättringar)
7. ⚠️ Testa att varning visas när dokumentation saknas
8. ⚠️ Testa edge cases (ingen fil vald, fel filtyp, etc.)

