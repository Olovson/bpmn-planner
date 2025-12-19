# Cipher Automatisk Indexering

**Datum:** 2025-01-27  
**Status:** ✅ Klar

---

## 🎯 Syfte

**Cipher indexerar nu automatiskt projektet när du startar projektet!**

**Cipher är en MCP-server som körs via Cursor, inte som en separat process.**

---

## ✅ Vad som är gjort

### Automatisk Indexering

**När du kör:**
```bash
npm run start:dev
```

**Indexerar automatiskt:**
1. ✅ ChromaDB server startas
2. ✅ ChromaDB indexeras (om inte redan gjort)
3. ✅ Cipher indexerar projektet (använder ChromaDB)

**Du behöver inte komma ihåg att indexera med Cipher längre!**

---

## 🔧 Hur det fungerar

### Cipher är en MCP-server

**Cipher körs INTE som en separat process:**
- Cipher är en MCP-server som Cursor anropar
- Cursor startar Cipher automatiskt när den behövs
- Cipher använder ChromaDB som backend

### Automatisk Indexering

**`scripts/index-with-cipher.mjs`** indexerar automatiskt:
- Kontrollerar om ChromaDB är indexerad
- Indexerar projektet med Cipher
- Cipher använder befintlig ChromaDB-databas

**`scripts/start-dev.mjs`** anropar automatiskt:
- Indexerar med Cipher efter att ChromaDB är redo
- Om Cipher inte är konfigurerad ännu, hoppas det över (okej)

---

## 📋 Användning

### Starta Allt (Automatiskt)

```bash
npm run start:dev
```

**Detta gör automatiskt:**
1. Startar Supabase
2. Startar ChromaDB server
3. Indexerar ChromaDB (om inte redan gjort)
4. Indexerar med Cipher (använder ChromaDB)
5. Startar edge functions
6. Startar dev-server

### Manuell Indexering

**Om du vill indexera med Cipher manuellt:**
```bash
npm run cipher:index
```

**Detta kommer:**
- Kontrollera om ChromaDB är indexerad
- Indexera projektet med Cipher
- Cipher använder befintlig ChromaDB-databas

---

## ⚠️ Viktigt: Cipher MCP-konfiguration

**Cipher behöver fortfarande konfigureras i Cursor för att fungera automatiskt:**

1. **Installera Cipher globalt:**
   ```bash
   npm install -g @byterover/cipher
   ```

2. **Konfigurera i Cursor:**
   - Öppna Cursor settings
   - Gå till MCP/Extensions
   - Lägg till Cipher som MCP-server:
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

3. **Efter konfiguration:**
   - Cursor anropar Cipher automatiskt
   - Cipher använder ChromaDB för kontext-hämtning
   - Jag får bättre minne automatiskt!

---

## 🔄 Workflow

### Med Automatisk Indexering

```
npm run start:dev
  ↓
ChromaDB server startas
  ↓
ChromaDB indexeras (om inte redan gjort)
  ↓
Cipher indexerar projektet (använder ChromaDB)
  ↓
Cursor använder Cipher → ChromaDB automatiskt
  ↓
Jag får bättre minne! 🎉
```

### Utan Automatisk Indexering

```
npm run start:dev
  ↓
ChromaDB server startas
  ↓
Manuellt: npm run vector:index
  ↓
Manuellt: npm run cipher:index
  ↓
Manuellt: Konfigurera Cipher i Cursor
  ↓
Jag får bättre minne (efter manuell setup)
```

---

## 💡 Fördelar

**Med Automatisk Indexering:**
- ✅ ChromaDB indexeras automatiskt
- ✅ Cipher indexerar automatiskt
- ✅ Allt är redo när projektet startar
- ✅ Jag får bättre minne automatiskt

**Utan Automatisk Indexering:**
- ⚠️ Måste komma ihåg att indexera manuellt
- ⚠️ Lätt att glömma
- ⚠️ Mindre effektivt

---

## 🐛 Felsökning

### Problem: "Cipher indexering misslyckades"

**Lösning:**
- Det är okej! Cipher behöver konfiguration i Cursor först
- Indexeringen fungerar när Cipher är konfigurerad
- ChromaDB är redo att användas

### Problem: "ChromaDB är inte indexerad"

**Lösning:**
- Kör `npm run vector:index` först
- Sedan fungerar Cipher-indexering

---

## ✅ Sammanfattning

**Nu indexerar Cipher automatiskt projektet när du startar projektet!**

- ✅ ChromaDB startar automatiskt
- ✅ ChromaDB indexeras automatiskt
- ✅ Cipher indexerar automatiskt (använder ChromaDB)
- ⚠️ Cipher MCP behöver fortfarande konfiguration i Cursor

**Bara kör `npm run start:dev` så är allt igång!**

