# Snabb Status-kontroll - För Nybörjare

## Ett enkelt kommando

Öppna Terminal (på Mac: tryck `Cmd + Space`, skriv "Terminal", tryck Enter).

Navigera till projektet:
```bash
cd /Users/magnusolovson/Documents/Projects/bpmn-planner
```

Se status:
```bash
cat .codex-batch-status.json
```

**Det är allt!** Detta visar statusfilen.

## Vad betyder siffrorna?

När du kör kommandot ser du något sånt här:

```json
{
  "total": 94,
  "completed": ["fil1", "fil2"],
  "current": "fil3",
  "lastUpdated": "2024-11-26T20:15:30Z"
}
```

**Vad betyder det?**
- `total: 94` = Totalt 94 filer ska bearbetas
- `completed: ["fil1", "fil2"]` = 2 filer är klara
- `current: "fil3"` = Fil 3 bearbetas just nu
- `lastUpdated: "2024-11-26T20:15:30Z"` = Senast uppdaterad kl 20:15:30

## Hur vet jag att Codex arbetar?

1. **Kör kommandot igen** (bara tryck upp-pilen och Enter)
2. **Kolla `lastUpdated`** - om tiden ändrats, arbetar Codex!
3. **Kolla `completed`** - om listan växer, arbetas filer!

## Exempel

**Första gången du kör:**
```json
{
  "total": 94,
  "completed": [],
  "current": "fil1",
  "lastUpdated": "2024-11-26T20:00:00Z"
}
```

**5 minuter senare (kör kommandot igen):**
```json
{
  "total": 94,
  "completed": ["fil1", "fil2", "fil3"],
  "current": "fil4",
  "lastUpdated": "2024-11-26T20:05:00Z"  ← Tiden ändrats!
}
```

Om `lastUpdated` är samma tid som för 10 minuter sedan → Codex har troligen stoppat.

## Automatisk uppdatering (valfritt)

Om du vill att det uppdateras automatiskt var 2:e sekund:

```bash
while true; do clear; echo "=== Codex Status ==="; cat .codex-batch-status.json; echo ""; echo "Uppdateras var 2:e sekund. Tryck Ctrl+C för att stoppa."; sleep 2; done
```

Tryck `Ctrl+C` för att stoppa.

## Sammanfattning

**Enklast:**
1. Öppna Terminal
2. Skriv: `cd /Users/magnusolovson/Documents/Projects/bpmn-planner`
3. Skriv: `cat .codex-batch-status.json`
4. Kör kommandot igen om några minuter för att se om det uppdaterats

**Det är allt!**

