# Codex Status Monitoring

## Hur du följer progress

När Codex bearbetar filer, uppdateras statusfilen `.codex-batch-status.json` automatiskt.

### Öppna statusfilen

```bash
# Se status i realtid
cat .codex-batch-status.json

# Eller i en annan terminal, watch filen:
watch -n 2 cat .codex-batch-status.json
```

### Statusfil-format

```json
{
  "total": 94,
  "completed": ["src/data/node-docs/epic/file1.doc.ts", "src/data/node-docs/epic/file2.doc.ts"],
  "current": "src/data/node-docs/epic/file3.doc.ts",
  "lastUpdated": "2024-11-26T20:15:30Z",
  "started": "2024-11-26T20:00:00Z"
}
```

### Vad betyder fälten?

- `total`: Totalt antal filer som ska bearbetas
- `completed`: Array med filer som är klara
- `current`: Filen som bearbetas just nu (eller `null` om alla är klara)
- `lastUpdated`: När statusfilen senast uppdaterades (ISO-format)
- `started`: När bearbetningen startade

### Hur vet jag att Codex arbetar?

1. **Kontrollera `lastUpdated`**: Om denna uppdateras regelbundet, arbetar Codex
2. **Kontrollera `completed`**: Om arrayen växer, bearbetas filer
3. **Kontrollera `current`**: Om denna ändras, bearbetas en ny fil

### Om statusfilen inte uppdateras

Om `lastUpdated` inte ändras på flera minuter:
- Codex kan ha kraschat eller stoppat
- Öppna Codex-chatten och kontrollera om den fortfarande arbetar
- Om Codex har stoppat, be den att fortsätta från där den var

### Tips

- Öppna statusfilen i en separat terminal/editor för att följa progress
- Om du ser att `completed.length` närmar sig `total`, är det nästan klart!
- När `current` är `null` och `completed.length === total`, är allt klart!

