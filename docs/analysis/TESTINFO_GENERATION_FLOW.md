# Testinfo-generering: Vad händer egentligen?

## Problem: Systemet är för komplext och ogenomträngligt

### Nuvarande flöde (förvirrande)

1. **Användaren klickar "Generera testinformation (alla filer)"**
   - Systemet bygger hierarki tyst i bakgrunden
   - Systemet hittar alla BPMN-filer i hierarkin

2. **För varje BPMN-fil:**
   
   **A. Om filen HAR callActivities (Feature Goals):**
   - Kontrollerar om Feature Goal-dokumentation finns för varje callActivity
   - Om dokumentation saknas → hoppar över den callActivity
   - Om dokumentation finns → fortsätter
   
   **B. E2E-scenario-generering:**
   - Kontrollerar om E2E-scenarios redan finns i storage
   - Om de finns → hoppar över E2E-generering (för att undvika duplicering)
   - Om de inte finns → genererar E2E-scenarios med Claude
     - Men: Filtrerar bort paths som inte matchar "tre prioriterade scenarios"
     - Resultat: Många paths genereras aldrig E2E-scenarios
   
   **C. Feature Goal-test-generering:**
   - Om E2E-scenarios redan finns → försöker extrahera Feature Goal-tester från befintliga E2E-scenarios
   - Om nya E2E-scenarios genererades → extraherar Feature Goal-tester från nya E2E-scenarios
   - Sparar Feature Goal-tester i `node_planned_scenarios` tabellen
   
   **D. Om filen SAKNAR callActivities (t.ex. internal-data-gathering):**
   - Genererar E2E-scenarios för processen själv (alla paths)
   - Resultat: Många liknande E2E-scenarios för samma process

### Problem

1. **E2E-scenarios genereras inte för application/mortgage:**
   - Paths matchar inte "tre prioriterade scenarios"
   - `checkIfPathMatchesPrioritizedScenario` filtrerar bort dem
   - Resultat: Inga E2E-scenarios → Inga Feature Goal-tester

2. **Många liknande E2E-scenarios för internal-data-gathering:**
   - Processer utan callActivities genererar E2E-scenarios för alla paths
   - Paths är mycket lika → många duplicerade scenarios

3. **Feature Goal-tester saknar given/when/then:**
   - Vi tog bort given/when/then-fälten (eftersom de bara var omformatering av dokumentation)
   - Men nu finns inget värde i Feature Goal-testerna

4. **Förvirrande flöde:**
   - E2E-scenarios → Feature Goal-tester → men varför?
   - Vad är skillnaden mellan E2E-scenarios och Feature Goal-tester?
   - Varför genereras E2E-scenarios för processer utan callActivities?

## Vad vi faktiskt försöker uppnå

### Mål
- **Testledare ska kunna se testinformation för varje Feature Goal (callActivity)**
- **Testinformation ska innehålla:**
  - Vad ska testas (given/when/then)
  - Vilka aktiviteter ingår (UI, API, DMN)
  - Gateway-conditions (när testas detta)

### Nuvarande problem
- Feature Goal-tester saknar given/when/then (vi tog bort dem)
- E2E-scenarios genereras inte för application/mortgage (filtreras bort)
- Processer utan callActivities genererar för många liknande E2E-scenarios

## Lösningsförslag

### Alternativ 1: Förenkla helt
1. **Ta bort E2E-scenario-generering helt**
   - Generera Feature Goal-tester direkt från Feature Goal-dokumentation
   - Använd Claude för att generera given/when/then från dokumentation
   - Spara direkt i `node_planned_scenarios`

2. **Fördelar:**
   - Enklare flöde
   - Mindre förvirring
   - Direkt koppling mellan dokumentation och tester

3. **Nackdelar:**
   - Förlorar E2E-scenarios (men de används bara för att extrahera Feature Goal-tester)

### Alternativ 2: Fixa nuvarande flöde
1. **Ta bort `checkIfPathMatchesPrioritizedScenario`-filtret**
   - Generera E2E-scenarios för alla paths (inte bara tre prioriterade)
   
2. **Deduplicera E2E-scenarios för processer utan callActivities**
   - Max 1-2 E2E-scenarios per process utan callActivities
   
3. **Implementera Claude-generering för given/when/then**
   - Använd Claude för att generera meningsfulla given/when/then
   - Spara i Feature Goal-tester

### Alternativ 3: Hybrid
1. **För processer MED callActivities:**
   - Generera Feature Goal-tester direkt från dokumentation (med Claude)
   - Hoppa över E2E-scenario-generering
   
2. **För processer Utan callActivities:**
   - Generera E2E-scenarios (max 1-2 per process)
   - Använd för att testa processen som helhet

## Rekommendation

**Alternativ 1: Förenkla helt**

Varför:
- E2E-scenarios används bara för att extrahera Feature Goal-tester
- Vi kan generera Feature Goal-tester direkt från dokumentation
- Enklare att förstå och underhålla
- Mindre risk för buggar

Vad behöver göras:
1. Ta bort E2E-scenario-generering
2. Generera Feature Goal-tester direkt från Feature Goal-dokumentation med Claude
3. Implementera Claude-generering för given/when/then (ordentligt denna gång)
4. Spara direkt i `node_planned_scenarios`

