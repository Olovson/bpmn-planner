# Cipher + Chroma Integration

Cipher är ett minneslager för AI-kodningsagenter (Cursor) via MCP. Vi använder Cipher TILLSAMMANS med vår Chroma vektordatabas - Cipher använder Chroma som backend för att lagra och söka i projektminne.

## Arkitektur

```
Cursor (AI Assistant)
    ↓
Cipher (MCP Server) - Körs automatiskt av Cursor
    ↓
Chroma (Vektordatabas) ← Vår indexerade dokumentation
```

**Cipher** hanterar:
- MCP-integration med Cursor
- Automatisk kontext-hämtning
- Konversationshistorik

**Chroma** hanterar:
- Vektordatabas för embeddings
- Semantisk sökning
- Indexerad dokumentation

## Installation

1. **Installera Cipher globalt:**
   ```bash
   npm install -g @byterover/cipher
   ```

2. **Indexera dokumentation i Chroma:**
   ```bash
   npm run vector:index  # Indexerar i Chroma
   ```

3. **Starta ChromaDB server (automatiskt med `npm run start:dev`):**
   ```bash
   npm run chroma:start
   ```

## Konfiguration för Cursor

### Steg 1: Konfigurera Cipher MCP

Cipher behöver konfigureras att använda vår Chroma-databas. Lägg till i Cursor's `settings.json`:

**Sökväg till settings.json:**
- **macOS:** `~/Library/Application Support/Cursor/User/settings.json`
- **Windows:** `%APPDATA%\Cursor\User\settings.json`
- **Linux:** `~/.config/Cursor/User/settings.json`

**Konfiguration:**
```json
{
  "mcpServers": {
    "cipher": {
      "command": "cipher",
      "args": [
        "--vector-db",
        "chroma",
        "--chroma-path",
        ".chroma"
      ]
    }
  }
}
```

**Viktigt:**
- Om `settings.json` redan har `mcpServers`, lägg till `cipher` i det befintliga objektet
- Om `settings.json` inte har `mcpServers`, lägg till hela objektet
- Se till att JSON är korrekt formaterad

**Om relativa sökvägar inte fungerar, använd absoluta sökvägar:**
```json
{
  "mcpServers": {
    "cipher": {
      "command": "/Users/magnusolovson/.nvm/versions/node/v20.19.5/bin/cipher",
      "args": [
        "--vector-db",
        "chroma",
        "--chroma-path",
        "/Users/magnusolovson/Documents/Projects/bpmn-planner/.chroma"
      ]
    }
  }
}
```

### Steg 2: Starta om Cursor

Efter att ha konfigurerat Cipher:
1. **Spara** `settings.json`
2. **Starta om Cursor** (viktigt!)
3. Cursor startar automatiskt Cipher MCP-server

### Steg 3: Verifiera

Efter omstart:
- Öppna Developer Tools: `Cmd/Ctrl + Shift + I`
- Leta efter "MCP" eller "Cipher" i console
- Inga felmeddelanden = bra tecken

## Användning

### Indexera dokumentation (Chroma)
```bash
npm run vector:index
```

### Söka manuellt (Chroma)
```bash
npm run vector:search "din fråga"
```

### Cursor använder automatiskt Cipher
När Cipher är konfigurerad i Cursor kommer AI-assistenten automatiskt att:
- Hämta relevant kontext från Chroma
- Komma ihåg tidigare diskussioner
- Använda projektets dokumentation som kontext

## Automatisk Start

ChromaDB startar automatiskt med `npm run start:dev`:
- ChromaDB server startas i bakgrunden
- Cipher använder ChromaDB via MCP (körs av Cursor)
- Allt är redo när projektet startar

## Fördelar med Kombinationen

✅ **Cipher (MCP):**
- Integrerat med Cursor
- Automatisk kontext-hämtning
- Konversationshistorik
- Körs automatiskt av Cursor

✅ **Chroma (Vektordatabas):**
- Semantisk sökning
- Indexerad dokumentation
- Kontroll över vad som indexeras
- Lokal databas (ingen data lämnar datorn)

✅ **Tillsammans:**
- Cursor får automatiskt relevant kontext
- Vi kan manuellt söka i Chroma
- Både automatisk och manuell sökning

## Mer Information

- Cipher GitHub: https://github.com/campfirein/cipher
- MCP Documentation: https://modelcontextprotocol.io
- Chroma Documentation: https://docs.trychroma.com
- Detaljerad konfigurationsguide: `docs/CURSOR_MCP_CONFIGURATION.md`
