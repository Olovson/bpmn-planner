# Codex Pipeline Status

## ✅ Vad som fungerar

1. **Samma prompt**: Codex använder exakt samma prompt som ChatGPT/Ollama via `getPromptForDocType()`
2. **Samma struktur**: Codex använder `buildLlmRequestStructure()` - samma funktion som ChatGPT/Ollama
3. **Samma mapping**: Codex använder `mapLlmResponseToModel()` - samma funktion som ChatGPT/Ollama
4. **Terminal-kommandon**: Fungerar via `npm run codex:batch:auto`

## ❌ Vad som INTE fungerar (känd begränsning)

**Full kontext i batch-kontexten**: 

`buildFullNodeContext()` fungerar INTE i Node.js batch-kontexten eftersom:
- `parseBpmnFile()` använder `fetch()` för web-URLs (`/bpmn/...`)
- `fetch()` fungerar inte med filsystem-paths i Node.js
- Därför fallback till minimal kontext i batch-kontexten

## 🔧 Lösning som behövs

För att få full kontext i batch-kontexten behöver vi:

1. **Node.js-variant av `parseBpmnFile`** som läser från filsystemet istället för web-URLs
2. **Eller en adapter** som konverterar filsystem-paths till web-URLs och hanterar filsystem-läsning

## 📊 Nuvarande beteende

- **Batch-kontext (terminal)**: Använder minimal kontext (endast nod-metadata)
- **Web-kontext (app)**: ChatGPT/Ollama använder full kontext (hierarki, flows, relaterade noder)

## ⚠️ Varning i genererat innehåll

När minimal kontext används läggs en varning till i `userPrompt` som syns i genererat innehåll:

```
⚠️ OBS: Denna dokumentation genererades med minimal kontext (endast nod-metadata). 
Full kontext med hierarki, flows och relaterade noder kunde inte byggas i batch-kontexten. 
För bästa kvalitet, generera via ChatGPT/Ollama-pipelinen i appen där full kontext är tillgänglig.
```

## 🎯 Rekommendation

För bästa kvalitet:
- **Använd ChatGPT/Ollama-pipelinen i appen** för full kontext
- **Använd Codex batch** för snabb initial generering med minimal kontext
- **Granska och förbättra** genererat innehåll manuellt eller via ChatGPT/Ollama

