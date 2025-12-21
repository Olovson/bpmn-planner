# Integrationer

BPMN Planner innehåller en dedikerad sida för att hantera integrationer mellan Stacc och bankens integrationskällor.

## Integrationer-sidan (`#/integrations`)

- **Path**: `#/integrations`
- **Syfte**: Hantera vilka Service Tasks som använder Staccs integrationskälla vs. bankens integrationskälla.
- **Funktionalitet**:
  - Visar alla Service Tasks från `staccIntegrationMapping.ts` (statisk mappning).
  - Kolumner: BPMN Fil, Element, Element ID, Typ, Beskrivning, Staccs integrationskälla (read-only), Ersätts med bankens integrationskälla (checkbox).
  - Checkboxen är **ikryssad som standard** (använder Staccs integrationskälla).
  - När checkboxen **kryssas ur** betyder det att noden ska ersättas med bankens integrationskälla.
  - Val sparas i `integration_overrides`-tabellen i Supabase och är persistent över sessioner.

## Visualisering i andra vyer

- **Timeline** (`#/timeline`): Service Tasks som använder bankens integrationskälla visas i **grön färg** (istället för standard blå).
- **Process Explorer** (`#/process-explorer`): Service Tasks med bankens integrationskälla markeras med grön färg i trädvyn och har en egen legend-typ "Bankens integrationskälla (Service Task)".

## Statisk mappning

Mappningen mellan Service Tasks och Staccs integrationskällor definieras i `src/data/staccIntegrationMapping.ts`:
- 20 fördefinierade Service Tasks med sina integrationskällor.
- Används för att auto-populera "Staccs integrationskälla"-kolumnen.
- Kan utökas med fler Service Tasks vid behov.
