# Logiska problem med att behålla bpmn-map.json

## Identifierade problem

### 1. ⚠️ Orphaned entries när filer raderas

**Problem:**
- När en BPMN-fil raderas via "Radera alla filer", rensas INTE `bpmn-map.json` från referenser till den filen
- Detta skapar:
  - **Orphaned processes**: Processer i map som inte längre finns i databasen
  - **Orphaned call activities**: Call activities som refererar till raderade subprocess-filer
  - **Missing subprocess files**: `subprocess_bpmn_file` som pekar på raderade filer

**Exempel:**
```json
// bpmn-map.json innehåller:
{
  "processes": [
    {
      "bpmn_file": "deleted-file.bpmn",  // ← Filen finns inte längre!
      "call_activities": [
        {
          "subprocess_bpmn_file": "another-deleted-file.bpmn"  // ← Denna finns inte heller!
        }
      ]
    }
  ]
}
```

**Konsekvenser:**
- Validering visar problem, men de åtgärdas inte automatiskt
- Systemet kan försöka ladda filer som inte finns
- Förvirring när användare ser mappningar till raderade filer

**Kod:**
- `supabase/functions/delete-bpmn-file/index.ts`: Raderar INTE från `bpmn-map.json`
- `src/pages/BpmnFileManager/hooks/useBpmnMapManagement.ts`: Validering identifierar problem men fixar inte dem

### 2. ⚠️ Auto-generering kan skapa problem

**Problem:**
- När `bpmn-map.json` saknas, skapas den från projektfilen (`bpmn-map.json` i repo)
- Om projektfilen är gammal eller innehåller referenser till filer som inte längre finns, kan det skapa problem

**Exempel:**
1. Användare raderar alla filer
2. `bpmn-map.json` i Storage raderas (vid reset)
3. Systemet skapar ny `bpmn-map.json` från projektfilen
4. Projektfilen innehåller referenser till filer som inte längre finns

**Konsekvenser:**
- Orphaned entries skapas automatiskt
- Systemet kan försöka ladda filer som inte finns

**Kod:**
- `src/lib/bpmn/bpmnMapStorage.ts` rad 183-236: Skapar `bpmn-map.json` från projektfilen om den saknas
- `src/lib/bpmn/bpmnMapAutoGenerator.ts`: Genererar från databasen, men används bara vid explicit generering

### 3. ⚠️ Inkonsistens mellan Storage och projektfil

**Problem:**
- Storage-filen kan vara gammal medan projektfilen är ny (eller vice versa)
- Systemet prioriterar Storage-filen, men fallback till projektfilen kan skapa förvirring

**Exempel:**
1. Storage-filen innehåller gammal mappning
2. Projektfilen innehåller ny mappning
3. Systemet använder Storage-filen (gammal)
4. Användare uppdaterar projektfilen, men Storage-filen uppdateras inte automatiskt

**Konsekvenser:**
- Förvirring om vilken version som används
- Manuell synkning krävs

**Kod:**
- `src/lib/bpmn/bpmnMapStorage.ts` rad 88-298: Prioriterar Storage-filen, fallback till projektfilen

### 4. ✅ Reset raderar bpmn-map.json (bra!)

**Status:** Fungerar korrekt
- I `reset-generated-data/index.ts` rad 333-353 raderas `bpmn-map.json` om `shouldDeleteAllTables || !safeMode`
- Detta triggar auto-generering från databasen (eller projektfilen om databasen är tom)

### 5. ⚠️ Ingen automatisk cleanup vid filradering

**Problem:**
- När en fil raderas, borde `bpmn-map.json` rensas från referenser till den filen
- Detta görs INTE automatiskt

**Konsekvenser:**
- Orphaned entries ackumuleras över tid
- Validering visar problem, men de åtgärdas inte automatiskt

## Lösningar

### Lösning 1: Automatisk cleanup vid filradering (INTE REKOMMENDERAD)

**Problem med denna lösning:**
- ⚠️ Kan radera manuellt skapade mappningar
- ⚠️ Användare kan ha granskat och godkänt mappningar
- ⚠️ Mappningar kan vara mer korrekta än vad auto-generering skulle skapa
- ⚠️ Risk för att förlora viktig konfiguration

**Implementering:**
- Uppdatera `supabase/functions/delete-bpmn-file/index.ts` för att:
  1. Ladda `bpmn-map.json` från Storage
  2. Rensa alla referenser till den raderade filen:
     - Ta bort processer där `bpmn_file === deletedFileName`
     - Ta bort call activities där `subprocess_bpmn_file === deletedFileName`
     - Uppdatera `orchestration.root_process` om den pekar på raderad fil
  3. Spara uppdaterad `bpmn-map.json` till Storage

**Fördelar:**
- Automatisk rensning, inga orphaned entries
- Konsistent state

**Nackdelar:**
- ⚠️ **RISK**: Kan radera manuellt skapade mappningar
- Ytterligare logik i delete-funktionen
- Kan ta längre tid att radera filer

### Lösning 2: Validering + manuell rensning (REKOMMENDERAD)

**Implementering:**
- Behåll nuvarande validering
- Lägg till knapp för att "Rensa orphaned entries" i valideringsdialogen
- Användare kan manuellt rensa problem
- Visa tydliga varningar om orphaned entries

**Fördelar:**
- ✅ Användare har full kontroll
- ✅ Manuellt skapade mappningar bevaras
- ✅ Enkel implementering
- ✅ Användare kan granska innan rensning

**Nackdelar:**
- Kräver manuell åtgärd
- Orphaned entries ackumuleras (men det är okej eftersom användaren kan rensa när de vill)

### Lösning 3: Auto-generera från databasen vid reset

**Implementering:**
- När `bpmn-map.json` raderas vid reset, generera den automatiskt från databasen
- Använd `generateBpmnMapFromFiles()` istället för projektfilen

**Fördelar:**
- Alltid konsistent med databasen
- Inga orphaned entries

**Nackdelar:**
- Kräver att databasen innehåller filer
- Kan ta tid att generera

### Lösning 4: Periodisk validering och cleanup

**Implementering:**
- Kör validering automatiskt vid vissa händelser (t.ex. vid filuppladdning)
- Automatisk cleanup av orphaned entries

**Fördelar:**
- Proaktiv rensning
- Konsistent state

**Nackdelar:**
- Ytterligare komplexitet
- Kan påverka prestanda

## Rekommendation

**Kombinera Lösning 2 + Lösning 3:**

1. **Validering + manuell rensning** (Lösning 2) - **PRIMÄR LÖSNING**
   - Behåll nuvarande validering
   - Lägg till knapp för att "Rensa orphaned entries" i valideringsdialogen
   - Användare har full kontroll och kan granska innan rensning
   - **VIKTIGT**: Manuellt skapade mappningar bevaras

2. **Auto-generera från databasen vid reset** (Lösning 3)
   - När `bpmn-map.json` raderas vid reset, generera från databasen
   - Säkerställer konsistens när användaren explicit startar om
   - **VIKTIGT**: Bara vid reset, inte vid individuell filradering

3. **Förbättrad validering**
   - Visa tydliga varningar om orphaned entries
   - Föreslå rensning men låt användaren bestämma
   - Markera entries som "orphaned" så användaren ser problemen tydligt

## Sammanfattning

| Problem | Allvarlighet | Lösning | Status |
|---------|--------------|---------|--------|
| Orphaned entries vid filradering | ⚠️ MEDEL | Validering + manuell rensning | ⚠️ Delvis implementerad (validering finns, rensning saknas) |
| Auto-generering från gammal projektfil | ⚠️ LÅG | Generera från databasen vid reset | ❌ Inte implementerad |
| Inkonsistens Storage vs projektfil | ⚠️ LÅG | Dokumentation | ✅ Dokumenterat |
| Reset raderar bpmn-map.json | ✅ BRA | - | ✅ Fungerar |
| Risk för att radera manuella mappningar | ⚠️ HÖG | Undvik automatisk cleanup | ✅ Undviks genom manuell rensning |

## Nästa steg

1. ✅ **Behåll nuvarande beteende** - Ingen automatisk cleanup vid filradering
2. **Förbättra validering** - Lägg till knapp för manuell rensning av orphaned entries
3. **Uppdatera reset-funktionen** - Generera från databasen istället för projektfilen vid reset
4. **Dokumentera beteendet** - Förklara för användare att orphaned entries kan finnas och hur de rensas

## Viktigt: Varför INTE automatisk cleanup?

**Användaren har rätt** - automatisk cleanup kan vara problematiskt eftersom:
- Användare kan ha manuellt skapat/uppdaterat `bpmn-map.json` med specifika mappningar
- Mappningar kan vara granskade och godkända
- Mappningar kan vara mer korrekta än vad auto-generering skulle skapa
- Vi vill inte förlora viktig konfiguration

**Orphaned länkar är faktiskt hanterbara:**
- ✅ Systemet hanterar saknade filer gracefully
- ✅ Fallback till automatisk matchning fungerar
- ✅ Inga kritiska fel eller kraschar
- ⚠️ Varningar och missing dependencies kan visas (men påverkar inte funktionalitet)
- ⚠️ Kan ge annorlunda matchningar än förväntat (men fungerar ändå)

**Se `docs/analysis/ORPHANED_LINKS_IMPACT.md` för detaljerad analys.**

**Bättre approach:**
- Visa problem via validering (redan implementerat)
- Låt användaren bestämma om de vill rensa
- Ge tydliga varningar om orphaned entries
- Möjlighet att manuellt rensa när användaren vill
- **Orphaned länkar är mer hanterbara än risken att radera manuellt skapade mappningar**

