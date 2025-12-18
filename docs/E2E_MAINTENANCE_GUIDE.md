# E2E Test Coverage - Underhållsguide

## Översikt

Detta dokument beskriver vad som är automatiskt vs manuellt när BPMN-filer uppdateras, och hur du kan använda valideringssystemet för att hålla dokumentationen uppdaterad.

## Automatiska komponenter

### 1. BPMN-parsing och Process Tree
- **Vad**: Automatisk parsing av BPMN-filer via `BpmnParser` och `useProcessTree`
- **Vad händer vid BPMN-uppdatering**: Process tree uppdateras automatiskt när BPMN-filer ändras
- **Ingen manuell åtgärd krävs**: ✅

### 2. Valideringssystem (`/e2e-quality-validation`)
- **Vad**: Automatisk validering av BPMN → Scenarios mapping
- **Vad det identifierar**:
  - ServiceTasks som finns i BPMN men saknas i `bankProjectTestSteps`
  - UserTasks som finns i BPMN men saknas i `bankProjectTestSteps`
  - BusinessRuleTasks som finns i BPMN men saknas i `bankProjectTestSteps`
  - Tasks som saknar API-anrop, UI-interaktioner eller DMN-beslut
  - Saknade mocks för dokumenterade API-anrop
  - Saknade fält i mock-responser jämfört med `backendState`
- **Vad händer vid BPMN-uppdatering**: Valideringssystemet identifierar automatiskt nya tasks som saknas i dokumentationen
- **Manuell åtgärd krävs**: ✅ (men systemet visar exakt vad som saknas)

### 3. Test Coverage-visualisering
- **Vad**: Automatisk visualisering baserat på BPMN-struktur och scenario-data
- **Vad händer vid BPMN-uppdatering**: Nya subprocesser/tasks visas automatiskt i trädet
- **Ingen manuell åtgärd krävs för strukturen**: ✅
- **Manuell åtgärd krävs för test-information**: ⚠️ (se nedan)

## Manuella komponenter

### 1. Scenario-dokumentation (`E2eTestsOverviewPage.tsx`)

#### `subprocessSteps` - Kräver manuell uppdatering
```typescript
{
  callActivityId: 'application',
  bpmnFile: 'mortgage-se-application.bpmn',
  description: 'Application',
  given: '...',  // ⚠️ Manuell text
  when: '...',   // ⚠️ Manuell text
  then: '...',   // ⚠️ Manuell text
  serviceTasksSummary: '...',  // ⚠️ Manuell text
  userTasksSummary: '...',     // ⚠️ Manuell text
  businessRulesSummary: '...',  // ⚠️ Manuell text
}
```

**Vad händer vid BPMN-uppdatering:**
- Om en ny callActivity läggs till i BPMN → måste läggas till manuellt i `subprocessSteps`
- Om en callActivity tas bort → bör tas bort från `subprocessSteps` (valideringen varnar)
- Om tasks ändras i en callActivity → `serviceTasksSummary`/`userTasksSummary`/`businessRulesSummary` behöver uppdateras manuellt

**Hur valideringen hjälper:**
- Identifierar nya callActivities som saknas i `subprocessSteps`
- Identifierar tasks som saknas i summaries

#### `bankProjectTestSteps` - Kräver manuell uppdatering
```typescript
{
  bpmnNodeId: 'fetch-credit-information',
  bpmnNodeName: 'Fetch Credit Information',
  bpmnNodeType: 'ServiceTask',
  apiCall: 'POST /api/application/fetch-credit-information',  // ⚠️ Manuell
  uiInteraction: '...',  // ⚠️ Manuell (för UserTasks)
  dmnDecision: '...',    // ⚠️ Manuell (för BusinessRuleTasks)
}
```

**Vad händer vid BPMN-uppdatering:**
- Om en ny ServiceTask/UserTask/BusinessRuleTask läggs till → måste läggas till manuellt i `bankProjectTestSteps`
- Om en task tas bort → bör tas bort från `bankProjectTestSteps` (valideringen varnar)
- Om task-namn ändras → `bpmnNodeId`/`bpmnNodeName` behöver uppdateras manuellt

**Hur valideringen hjälper:**
- Identifierar exakt vilka tasks som saknas
- Identifierar tasks som saknar API-anrop/UI-interaktion/DMN-beslut
- Ger förslag på vad som behöver läggas till

### 2. Mock-filer (`mortgageE2eMocks.ts`)

**Vad händer vid BPMN-uppdatering:**
- Om en ny ServiceTask läggs till → ny mock behöver läggas till manuellt
- Om API-endpoint ändras → mock behöver uppdateras manuellt
- Om backend state ändras → mock-response behöver uppdateras manuellt

**Hur valideringen hjälper:**
- Identifierar saknade mocks för dokumenterade API-anrop
- Identifierar saknade fält i mock-responser jämfört med `backendState`
- Ger förslag på vilka fält som saknas

### 3. Backend State-dokumentation

**Vad händer vid BPMN-uppdatering:**
- Om processen ändras → `backendState` i `subprocessSteps.then` behöver uppdateras manuellt
- Om nya entiteter/fält introduceras → måste dokumenteras manuellt

**Hur valideringen hjälper:**
- Identifierar saknade fält i mock-responser jämfört med dokumenterad `backendState`

## Arbetsflöde vid BPMN-uppdatering

### Steg 1: Uppdatera BPMN-filer
1. Uppdatera BPMN-filer i `src/data/bpmn/`
2. Process tree uppdateras automatiskt

### Steg 2: Kör validering
1. Gå till `/e2e-quality-validation`
2. Granska warnings/errors för varje scenario
3. Fokusera på:
   - **Errors**: Kritiska saknade komponenter
   - **Warnings**: Tasks som saknas i dokumentationen

### Steg 3: Uppdatera scenario-dokumentation
1. För varje ny callActivity:
   - Lägg till i `subprocessSteps` med `given`/`when`/`then`
   - Lägg till summaries för tasks
2. För varje ny task:
   - Lägg till i `bankProjectTestSteps` med API-anrop/UI-interaktion/DMN-beslut
3. Uppdatera `subprocessSteps` för ändrade callActivities

### Steg 4: Uppdatera mocks
1. För varje ny ServiceTask:
   - Lägg till mock i `mortgageE2eMocks.ts`
   - Se till att mock-response matchar `backendState`
2. Uppdatera befintliga mocks om API-endpoints ändras

### Steg 5: Verifiera
1. Kör validering igen
2. Kontrollera att alla warnings/errors är åtgärdade
3. Testa test-coverage-sidan för att se att allt visas korrekt

## Tips för effektivt underhåll

### 1. Använd valideringssystemet regelbundet
- Kör validering efter varje större BPMN-uppdatering
- Fokusera på warnings först (de är oftast enklare att fixa)

### 2. Dokumentera medan du går
- När du lägger till en ny callActivity, dokumentera den direkt i `subprocessSteps`
- När du lägger till en ny task, dokumentera den direkt i `bankProjectTestSteps`

### 3. Använd valideringens förslag
- Valideringssystemet ger ofta exakta förslag på vad som behöver läggas till
- Kopiera/redigera förslagen istället för att skriva från scratch

### 4. Testa test-coverage-sidan
- Efter uppdateringar, kontrollera att test-coverage-sidan visar allt korrekt
- Använd olika vyer (kondenserad, hierarkisk, fullständig) för att verifiera

## Exempel: Lägga till en ny subprocess

Anta att du lägger till en ny callActivity `risk-assessment` i `mortgage.bpmn`:

1. **BPMN uppdateras** → Process tree uppdateras automatiskt ✅

2. **Validering identifierar**:
   - ⚠️ Warning: `risk-assessment` saknas i `subprocessSteps`
   - ⚠️ Warning: ServiceTasks i `risk-assessment` saknas i `bankProjectTestSteps`

3. **Manuell åtgärd**:
   ```typescript
   // Lägg till i subprocessSteps
   {
     callActivityId: 'risk-assessment',
     bpmnFile: 'mortgage-se-risk-assessment.bpmn',
     description: 'Risk Assessment',
     given: '...',
     when: '...',
     then: '...',
     serviceTasksSummary: 'calculate-risk (ServiceTask)...',
     // etc.
   }
   
   // Lägg till i bankProjectTestSteps
   {
     bpmnNodeId: 'calculate-risk',
     bpmnNodeName: 'Calculate Risk',
     bpmnNodeType: 'ServiceTask',
     apiCall: 'POST /api/risk/calculate',
   }
   ```

4. **Lägg till mock**:
   ```typescript
   await page.route('**/api/risk/calculate', async (route) => {
     await route.fulfill({ ... });
   });
   ```

5. **Verifiera**: Kör validering igen, kontrollera test-coverage-sidan

## Sammanfattning

**Automatiskt (ingen åtgärd krävs):**
- ✅ BPMN-parsing och process tree
- ✅ Validering identifierar vad som saknas
- ✅ Test coverage-visualisering (struktur)

**Manuellt (kräver åtgärd):**
- ⚠️ Scenario-dokumentation (`subprocessSteps`, `bankProjectTestSteps`)
- ⚠️ Mock-filer
- ⚠️ Backend state-dokumentation

**Valideringssystemet hjälper genom att:**
- Identifiera exakt vad som saknas
- Ge förslag på vad som behöver läggas till
- Verifiera att mocks matchar dokumentation

**Rekommendation:** Använd valideringssystemet som din guide - det visar exakt vad som behöver uppdateras när BPMN-filer ändras.

