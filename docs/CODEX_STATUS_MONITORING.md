# Codex Status Monitoring

## Hur du följer progress

När Codex bearbetar filer, uppdateras statusfilen `.codex-batch-status.json` automatiskt.

## Terminalkommandon

### Alternativ 1: Se status en gång (enkelt)

Öppna en terminal och kör:

```bash
cat .codex-batch-status.json
```

Detta visar statusfilen en gång. Kör kommandot igen för att se uppdateringar.

### Alternativ 2: Se status automatiskt (macOS)

Om du har `watch` installerat (via Homebrew: `brew install watch`):

```bash
watch -n 2 cat .codex-batch-status.json
```

Detta uppdaterar statusen var 2:e sekund automatiskt.

### Alternativ 3: Se status automatiskt (macOS utan watch)

Om du inte har `watch`, använd en loop istället:

```bash
while true; do clear; cat .codex-batch-status.json; sleep 2; done
```

Detta uppdaterar statusen var 2:e sekund och rensar skärmen varje gång.

### Alternativ 4: Öppna i editor

Du kan också öppna filen i din editor (t.ex. VS Code) och den kommer automatiskt att uppdateras när Codex ändrar filen:

```bash
code .codex-batch-status.json
```

Eller öppna den i Cursor direkt från filutforskaren.

## Statusfil-format

```json
{
  "total": 94,
  "completed": ["src/data/node-docs/epic/file1.doc.ts", "src/data/node-docs/epic/file2.doc.ts"],
  "current": "src/data/node-docs/epic/file3.doc.ts",
  "lastUpdated": "2024-11-26T20:15:30Z",
  "started": "2024-11-26T20:00:00Z"
}
```

## Vad betyder fälten?

- `total`: Totalt antal filer som ska bearbetas
- `completed`: Array med filer som är klara
- `current`: Filen som bearbetas just nu (eller `null` om alla är klara)
- `lastUpdated`: När statusfilen senast uppdaterades (ISO-format)
- `started`: När bearbetningen startade

## Hur vet jag att Codex arbetar?

1. **Kontrollera `lastUpdated`**: Om denna uppdateras regelbundet, arbetar Codex
2. **Kontrollera `completed`**: Om arrayen växer, bearbetas filer
3. **Kontrollera `current`**: Om denna ändras, bearbetas en ny fil

### Exempel på progress

**Start:**
```json
{
  "total": 94,
  "completed": [],
  "current": "src/data/node-docs/epic/file1.doc.ts",
  "lastUpdated": "2024-11-26T20:00:00Z"
}
```

**Efter 10 filer:**
```json
{
  "total": 94,
  "completed": ["file1.doc.ts", "file2.doc.ts", ..., "file10.doc.ts"],
  "current": "src/data/node-docs/epic/file11.doc.ts",
  "lastUpdated": "2024-11-26T20:05:00Z"
}
```

**När klart:**
```json
{
  "total": 94,
  "completed": ["file1.doc.ts", ..., "file94.doc.ts"],
  "current": null,
  "lastUpdated": "2024-11-26T20:30:00Z"
}
```

## Om statusfilen inte uppdateras

Om `lastUpdated` inte ändras på flera minuter:
- Codex kan ha kraschat eller stoppat
- Öppna Codex-chatten och kontrollera om den fortfarande arbetar
- Om Codex har stoppat, be den att fortsätta från där den var

## Tips

- Öppna statusfilen i en separat terminal/editor för att följa progress
- Om du ser att `completed.length` närmar sig `total`, är det nästan klart!
- När `current` är `null` och `completed.length === total`, är allt klart!
- Du kan också öppna filen i Cursor/VS Code och den kommer automatiskt att uppdateras
