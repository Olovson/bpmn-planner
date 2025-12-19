# Cursor MCP-konfiguration: Steg-för-steg

**Datum:** 2025-01-27  
**Syfte:** Hitta och konfigurera MCP-servrar i Cursor

---

## 🔍 Problem: Hittar inte Settings JSON

Om du söker efter "Open Settings (JSON)" och bara får alternativ som "workbench settings", "commands to skip" etc, följ dessa steg istället:

---

## ✅ Metod 1: Via Command Palette (Enklast)

### Steg 1: Öppna Command Palette

**macOS:** `Cmd + Shift + P`  
**Windows/Linux:** `Ctrl + Shift + P`

### Steg 2: Sök efter MCP eller Settings JSON

**Alternativ A: Sök efter "MCP"**
```
Skriv: MCP
```
Leta efter:
- "MCP: Configure Servers"
- "MCP: Open Settings"
- "Preferences: Open User Settings (JSON)"

**Alternativ B: Sök efter "Settings JSON"**
```
Skriv: settings json
```
Leta efter:
- "Preferences: Open User Settings (JSON)"
- "Preferences: Open Workspace Settings (JSON)"

### Steg 3: Öppna Settings JSON

Välj "Preferences: Open User Settings (JSON)" och filen öppnas.

---

## ✅ Metod 2: Öppna Filen Direkt

### Steg 1: Hitta Settings JSON-filen

**macOS:**
```bash
open ~/Library/Application\ Support/Cursor/User/settings.json
```

**Windows:**
```
%APPDATA%\Cursor\User\settings.json
```

**Linux:**
```bash
~/.config/Cursor/User/settings.json
```

### Steg 2: Öppna i Cursor

1. **Via Command Palette:**
   - `Cmd/Ctrl + Shift + P`
   - Skriv: `File: Open File`
   - Navigera till ovanstående sökväg

2. **Eller via Terminal:**
   ```bash
   # macOS
   code ~/Library/Application\ Support/Cursor/User/settings.json
   
   # Eller öppna Cursor och dra filen in
   ```

---

## ✅ Metod 3: Via Settings UI

### Steg 1: Öppna Settings

**macOS:** `Cmd + ,`  
**Windows/Linux:** `Ctrl + ,`

### Steg 2: Sök efter MCP

I sökfältet i settings, skriv:
```
MCP
```

Leta efter:
- "MCP Servers"
- "Model Context Protocol"
- "MCP Configuration"

### Steg 3: Lägg till MCP-server

Om du hittar MCP-inställningar:
- Klicka på "Add MCP Server" eller "+"
- Fyll i:
  - **Name:** `cipher`
  - **Command:** `cipher`
  - **Args:** 
    ```
    --vector-db
    chroma
    --chroma-path
    .chroma
    ```

---

## 📝 Lägg till Cipher-konfiguration

När du har öppnat Settings JSON, lägg till:

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
- Om filen redan har `mcpServers`, lägg till `cipher` i den befintliga objektet
- Om filen inte har `mcpServers`, lägg till hela objektet
- Se till att JSON är korrekt formaterad (kommatecken, etc.)

---

## 🔍 Exempel på Settings JSON

**Före (utan Cipher):**
```json
{
  "editor.fontSize": 14,
  "workbench.colorTheme": "Default Dark+"
}
```

**Efter (med Cipher):**
```json
{
  "editor.fontSize": 14,
  "workbench.colorTheme": "Default Dark+",
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

---

## 🐛 Felsökning

### Problem: "mcpServers is not a valid setting"

**Lösning:**
- Cursor kan ha olika versioner med olika MCP-stöd
- Kontrollera Cursor's version och dokumentation
- MCP kan kräva en nyare version av Cursor

### Problem: "Cannot find settings.json"

**Lösning:**
1. **Skapa filen manuellt:**
   ```bash
   # macOS
   mkdir -p ~/Library/Application\ Support/Cursor/User
   touch ~/Library/Application\ Support/Cursor/User/settings.json
   ```

2. **Lägg till grundläggande JSON:**
   ```json
   {}
   ```

3. **Lägg sedan till Cipher-konfigurationen**

### Problem: "Command palette doesn't show MCP options"

**Lösning:**
- Cursor kan ha olika namn på MCP-inställningar
- Prova att söka efter:
  - "settings"
  - "preferences"
  - "configure"
  - "json"

---

## ✅ Verifiera Konfigurationen

Efter att ha lagt till Cipher-konfigurationen:

1. **Spara filen** (`Cmd/Ctrl + S`)
2. **Starta om Cursor** (viktigt!)
3. **Kontrollera att Cipher startar:**
   - Öppna Developer Tools (`Cmd/Ctrl + Shift + I`)
   - Leta efter "MCP" eller "Cipher" i console
   - Du bör se att Cipher ansluter till ChromaDB

---

## 📚 Ytterligare Hjälp

Om inget av ovanstående fungerar:

1. **Kontrollera Cursor's dokumentation:**
   - Leta efter "MCP" eller "Model Context Protocol"
   - Kontrollera version och stöd

2. **Kontrollera Cursor's version:**
   - `Help → About` (eller `Cmd/Ctrl + ,` → sök "version")
   - MCP kan kräva en nyare version

3. **Kontakta Cursor support:**
   - Om MCP inte stöds i din version
   - Eller om konfigurationen inte fungerar

---

## 💡 Tips

- **Backup:** Backa upp `settings.json` innan du ändrar den
- **JSON-validering:** Använd en JSON-validator för att kontrollera syntax
- **Testa stegvis:** Lägg till Cipher, starta om, testa, sedan justera om nödvändigt

