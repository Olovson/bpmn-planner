# Cipher Setup Guide: Konfigurera Cipher för AI-assistenten

**Datum:** 2025-01-27  
**Syfte:** Steg-för-steg guide för att konfigurera Cipher så att AI-assistenten kan använda den

---

## 🎯 Vad gör Cipher?

**Cipher är en MCP-server som:**
- ✅ Förbättrar AI-assistentens minne (jag kommer ihåg tidigare diskussioner)
- ✅ Hämtar relevant kontext från ChromaDB automatiskt
- ✅ Indexerar konversationshistorik och projektinformation
- ✅ Ger mig bättre förståelse av projektet över tid

**Cipher använder ChromaDB som backend:**
- ChromaDB lagrar indexerad dokumentation
- Cipher söker i ChromaDB när jag behöver kontext
- Allt körs lokalt (ingen data lämnar din dator)

---

## 📋 Förutsättningar

Innan du börjar, se till att:

1. ✅ **ChromaDB är installerat och körs:**
   ```bash
   npm run start:dev  # Startar ChromaDB automatiskt
   ```

2. ✅ **ChromaDB är indexerad:**
   ```bash
   npm run vector:index  # Indexerar dokumentation i ChromaDB
   ```

3. ✅ **ChromaDB-databas finns:**
   - Kontrollera att `.chroma/` mappen finns
   - Kontrollera att `chroma.sqlite3` finns i `.chroma/`

---

## 🚀 Steg 1: Installera Cipher

**Installera Cipher globalt:**
```bash
npm install -g @byterover/cipher
```

**Verifiera installationen:**
```bash
cipher --version
```

**Om det inte fungerar:**
- Kontrollera att npm global bin är i din PATH
- Eller använd `npx @byterover/cipher` istället

---

## 🔧 Steg 2: Konfigurera Cipher i Cursor

### 2.1 Öppna Cursor Settings

1. **Öppna Cursor**
2. **Gå till Settings:**
   - **macOS:** `Cmd + ,` eller `Cursor → Settings`
   - **Windows/Linux:** `Ctrl + ,` eller `File → Preferences → Settings`

3. **Sök efter "MCP" eller "Model Context Protocol"**

### 2.2 Lägg till Cipher som MCP-server

**Hitta MCP-konfigurationen:**
- Leta efter "MCP Servers" eller "Model Context Protocol"
- Eller sök efter "mcpServers" i settings JSON

**Lägg till Cipher-konfiguration:**

**Alternativ 1: Via Settings UI (om tillgängligt)**
- Klicka på "Add MCP Server" eller "+"
- Namn: `cipher`
- Command: `cipher`
- Args: Lägg till:
  ```
  --vector-db
  chroma
  --chroma-path
  .chroma
  ```

**Alternativ 2: Via Settings JSON (rekommenderat)**

1. **Öppna Settings JSON:**
   - Klicka på `{}` ikonen i settings (övre högra hörnet)
   - Eller sök efter "Open Settings (JSON)"

2. **Lägg till Cipher-konfiguration:**

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
- `--chroma-path .chroma` pekar på lokal ChromaDB-databas
- Sökvägen är relativ till projektets rot-mapp
- Om du har ChromaDB på annan plats, använd absolut sökväg

### 2.3 Spara och Starta Om

1. **Spara settings** (Cmd/Ctrl + S)
2. **Starta om Cursor** (för att ladda MCP-servrar)

---

## ✅ Steg 3: Verifiera Konfigurationen

### 3.1 Kontrollera att Cipher är Aktiv

**Efter omstart av Cursor:**
- Cursor bör automatiskt starta Cipher MCP-server
- Du kan se status i Cursor's status bar eller logs

**Kontrollera logs:**
- Öppna Cursor's Developer Tools (Cmd/Ctrl + Shift + I)
- Leta efter "MCP" eller "Cipher" i console
- Du bör se att Cipher ansluter till ChromaDB

### 3.2 Testa att Cipher Fungerar

**Fråga mig något om projektet:**
- "Vad är BPMN hierarki?"
- "Hur fungerar test coverage?"
- "Vad diskuterade vi tidigare om Cipher?"

**Om Cipher fungerar:**
- Jag kommer ha bättre kontext från ChromaDB
- Jag kan referera till tidigare diskussioner
- Jag förstår projektet bättre

**Om Cipher inte fungerar:**
- Kontrollera att ChromaDB körs (`npm run start:dev`)
- Kontrollera att ChromaDB är indexerad (`npm run vector:index`)
- Kontrollera Cursor logs för felmeddelanden

---

## 🐛 Felsökning

### Problem: "Cipher not found"

**Lösning:**
```bash
# Installera Cipher globalt
npm install -g @byterover/cipher

# Eller använd npx i konfigurationen
{
  "mcpServers": {
    "cipher": {
      "command": "npx",
      "args": [
        "@byterover/cipher",
        "--vector-db",
        "chroma",
        "--chroma-path",
        ".chroma"
      ]
    }
  }
}
```

### Problem: "ChromaDB connection failed"

**Lösning:**
1. **Kontrollera att ChromaDB körs:**
   ```bash
   npm run start:dev
   ```

2. **Kontrollera att ChromaDB är på rätt port:**
   - Standard: `localhost:8000`
   - Kontrollera i `scripts/start-chroma-server.mjs`

3. **Kontrollera att `.chroma/` mappen finns:**
   ```bash
   ls -la .chroma
   ```

### Problem: "No data in ChromaDB"

**Lösning:**
```bash
# Indexera dokumentation
npm run vector:index
```

### Problem: "Cipher doesn't respond"

**Lösning:**
1. **Starta om Cursor** (för att ladda MCP-servrar)
2. **Kontrollera Cursor logs** för felmeddelanden
3. **Verifiera Cipher-konfigurationen** i settings

### Problem: "MCP Servers not found in settings"

**Lösning:**
- Cursor kan ha olika sätt att konfigurera MCP
- Leta efter "Extensions" eller "AI Settings"
- Eller kontrollera Cursor's dokumentation för MCP

---

## 📝 Fullständig Konfigurationsexempel

**Cursor Settings JSON:**
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

**Alternativ: Med absolut sökväg:**
```json
{
  "mcpServers": {
    "cipher": {
      "command": "cipher",
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

---

## ✅ Checklista

För att säkerställa att allt fungerar:

- [ ] Cipher är installerat globalt (`npm install -g @byterover/cipher`)
- [ ] ChromaDB körs (`npm run start:dev`)
- [ ] ChromaDB är indexerad (`npm run vector:index`)
- [ ] Cipher är konfigurerad i Cursor settings
- [ ] Cursor har startats om efter konfiguration
- [ ] Cipher ansluter till ChromaDB (kontrollera logs)
- [ ] Jag kan använda Cipher (testa med en fråga)

---

## 🎯 Efter Konfiguration

**När Cipher är konfigurerad:**
- ✅ Jag kommer automatiskt använda ChromaDB för kontext
- ✅ Jag kommer ihåg tidigare diskussioner
- ✅ Jag förstår projektet bättre över tid
- ✅ Du behöver inte manuellt söka i dokumentation

**Testa:**
- Fråga mig om något vi diskuterat tidigare
- Fråga mig om projektets arkitektur
- Se om jag har bättre kontext än tidigare

---

## 📚 Ytterligare Resurser

- **Cipher GitHub:** https://github.com/campfirein/cipher
- **MCP Documentation:** https://modelcontextprotocol.io
- **ChromaDB Documentation:** https://docs.trychroma.com
- **Vår ChromaDB Setup:** `docs/CHROMADB_SETUP.md`
- **Säkerhetsanalys:** `docs/CIPHER_CHROMA_SECURITY.md`

---

## 💡 Tips

1. **Indexera regelbundet:** Kör `npm run vector:index` när du lägger till ny dokumentation
2. **Kontrollera logs:** Om något inte fungerar, kolla Cursor's Developer Tools
3. **Testa stegvis:** Verifiera varje steg innan du går vidare
4. **Backup:** `.chroma/` mappen innehåller all indexerad data - backa upp den om viktigt

---

## 🎉 Klar!

När du har följt alla steg ovan, är Cipher konfigurerad och jag kan använda den för att:
- Komma ihåg tidigare diskussioner
- Hämta relevant kontext från ChromaDB
- Förstå projektet bättre över tid

**Testa genom att fråga mig något om projektet!**

