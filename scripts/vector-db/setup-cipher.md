# Cipher + Chroma Integration

Cipher är ett minneslager för AI-kodningsagenter (Cursor) via MCP. Vi använder Cipher TILLSAMMANS med vår Chroma vektordatabas - Cipher använder Chroma som backend för att lagra och söka i projektminne.

## Arkitektur

```
Cursor (AI Assistant)
    ↓
Cipher (MCP Server)
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

2. **Våra scripts använder Chroma:**
   ```bash
   npm run vector:index  # Indexerar i Chroma
   ```

## Konfiguration för Cursor

### Steg 1: Konfigurera Cipher MCP

Cipher behöver konfigureras att använda vår Chroma-databas. Skapa en MCP-konfiguration:

**För Cursor:** Lägg till i Cursor settings (MCP configuration):

```json
{
  "mcpServers": {
    "cipher": {
      "command": "cipher",
      "args": ["--vector-db", "chroma", "--chroma-path", ".chroma"]
    }
  }
}
```

Eller via Cipher's egen konfiguration (om det stöds).

### Steg 2: Indexera projektet

Först indexera dokumentation i Chroma:
```bash
npm run vector:index
```

Sedan låt Cipher använda Chroma:
```bash
cipher index --use-existing-vector-db
```

## Användning

### Indexera dokumentation (Chroma)
```bash
npm run vector:index
```

### Indexera projektet (Cipher + Chroma)
```bash
npm run cipher:index
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

## Fördelar med Kombinationen

✅ **Cipher (MCP):**
- Integrerat med Cursor
- Automatisk kontext-hämtning
- Konversationshistorik

✅ **Chroma (Vektordatabas):**
- Semantisk sökning
- Indexerad dokumentation
- Kontroll över vad som indexeras

✅ **Tillsammans:**
- Cursor får automatiskt relevant kontext
- Vi kan manuellt söka i Chroma
- Både automatisk och manuell sökning

## Mer Information

- Cipher GitHub: https://github.com/campfirein/cipher
- MCP Documentation: https://modelcontextprotocol.io
- Chroma Documentation: https://docs.trychroma.com
