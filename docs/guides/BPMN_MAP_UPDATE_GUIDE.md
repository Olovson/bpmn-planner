# Guide: Uppdatera bpmn-map.json från Template Handlers

> **⚠️ LÄS DETTA FÖRST!**  
> Detta är en guide för att uppdatera `bpmn-map.json` från `mortgage-template-main` call activity handlers.  
> **Handlers är INTE kompletta** - du måste alltid kombinera med BPMN-parsing eller manuell granskning.  
> Se [`docs/analysis/BPMN_MAP_HANDLER_VS_BPMN_ANALYSIS.md`](../analysis/BPMN_MAP_HANDLER_VS_BPMN_ANALYSIS.md) för detaljerad analys av varför.

## Snabbstart: Testprocess för Validering

**Efter att ha uppdaterat `bpmn-map.json`, kör ALLTID testprocessen för att validera:**

**"Testprocessen"** är vår kompletta A-Ö valideringsprocess som validerar att allt fungerar hela vägen från parsing till appens UI.

```bash
# 1. Hitta filer och analysera diff
npm test -- tests/integration/local-folder-diff.test.ts

# 2. Validera parsing, graph, tree och dokumentationsgenerering
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**Se "Validering"-sektionen nedan för detaljer och [`docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`](../validation/VALIDATE_NEW_BPMN_FILES.md) för komplett guide.**

## Översikt

`bpmn-map.json` mappar call activities till subprocess BPMN-filer. Vi kan extrahera mappningar från `mortgage-template-main` call activity handlers, men handlers täcker INTE alla call activities i BPMN-filerna.

## Varför Handlers Inte Räcker

1. **Handlers är runtime-mappningar** - de definierar vad som körs vid runtime, inte allt som finns i BPMN-filer
2. **Call activities kan sakna handlers** - nya call activities som lagts till i BPMN-filer men inte implementerats ännu
3. **ID-mismatch** - handler-namn matchar inte alltid call activity ID (t.ex. `Activity_1gzlxx4` använder `calledElement="credit-evaluation"`)

**Exempel på saknade call activities:**
- `documentation-assessment` - finns i BPMN-filer men saknar handler
- `sales-contract-credit-decision` - finns i BPMN-filer men saknar handler
- `Activity_1gzlxx4` - finns i BPMN-fil men använder `calledElement` istället för direkt ID-matchning

## Steg-för-steg Process

### Steg 1: Generera från Handlers

```bash
npm run generate:bpmn-map:template
```

Detta genererar `bpmn-map-from-template.json` med call activities som har handlers.

**Förväntat resultat:**
- ~22 processer
- ~34 call activities (från handlers)
- **Saknas:** 4-5 call activities som finns i BPMN-filer men saknar handlers

### Steg 2: Jämför med Befintlig

```bash
# Jämför filerna
diff bpmn-map.json bpmn-map-from-template.json

# Eller använd Python för detaljerad jämförelse
python3 << 'EOF'
import json

with open('bpmn-map.json', 'r') as f:
    existing = json.load(f)
with open('bpmn-map-from-template.json', 'r') as f:
    generated = json.load(f)

existing_ca = sum(len(p.get('call_activities', [])) for p in existing['processes'])
generated_ca = sum(len(p.get('call_activities', [])) for p in generated['processes'])

print(f"Befintlig: {existing_ca} call activities")
print(f"Genererad: {generated_ca} call activities")
print(f"Saknas: {existing_ca - generated_ca} call activities")
EOF
```

### Steg 3: Identifiera Saknade Call Activities

Saknade call activities är vanligtvis:
- `documentation-assessment` i flera processer
- `sales-contract-credit-decision` i offer-processen
- `Activity_1gzlxx4` i manual-credit-evaluation (använder `calledElement`)

### Steg 4: Kombinera Resultaten

**Alternativ A: Manuell Kombinering**

1. Öppna båda filerna
2. För varje process i `bpmn-map.json`:
   - Kopiera call activities från `bpmn-map-from-template.json` (de har korrekta handler-mappningar)
   - Lägg till saknade call activities från befintlig `bpmn-map.json`
   - Markera saknade call activities med `needs_manual_review: true`

**Alternativ B: Automatiserad Kombinering**

Använd Python-script (se exempel i `BPMN_MAP_HANDLER_VS_BPMN_ANALYSIS.md`):

```python
# Kombinera handler-mappningar med befintliga call activities
# Prioritera handlers, lägg till saknade från befintlig
```

### Steg 5: Verifiera

Efter uppdatering, verifiera:

1. **Alla call activities finns:**
   ```bash
   # Räkna call activities
   python3 -c "import json; f=open('bpmn-map.json'); d=json.load(f); print(sum(len(p.get('call_activities',[])) for p in d['processes'])))"
   ```

2. **Korrekta mappningar:**
   - Call activities med handlers ska ha korrekta `subprocess_bpmn_file`
   - Call activities utan handlers ska vara markerade för review

3. **Processer:**
   - Alla processer från template ska finnas
   - Processer som saknas i template (t.ex. `documentation-assessment`) ska behållas

## Checklista

- [ ] Kör `npm run generate:bpmn-map:template`
- [ ] Jämför `bpmn-map-from-template.json` med `bpmn-map.json`
- [ ] Identifiera saknade call activities
- [ ] Kombinera handler-mappningar med befintliga call activities
- [ ] Verifiera att alla call activities finns
- [ ] Verifiera korrekta mappningar
- [ ] Uppdatera `generated_at` och `note` i `bpmn-map.json`
- [ ] **Validera att bpmn-map.json fungerar korrekt** (se "Validering" nedan)
- [ ] Commit ändringar med beskrivande meddelande

## Validering

Efter att ha uppdaterat `bpmn-map.json`, **MÅSTE du validera att den fungerar korrekt:**

### Testprocess: A-Ö Validering

**"Testprocessen"** är vår kompletta A-Ö valideringsprocess som validerar att allt fungerar hela vägen från parsing till appens UI. Detta är inte bara ett test, utan en komplett valideringsprocess.

**Se [`docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`](../validation/VALIDATE_NEW_BPMN_FILES.md) för komplett guide.**

**Snabbstart - kör dessa kommandon i ordning:**

```bash
# 1. Hitta filer och analysera diff
npm test -- tests/integration/local-folder-diff.test.ts

# 2. Validera parsing, graph, tree och dokumentationsgenerering
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**Vad testprocessen validerar (A-Ö):**
1. ✅ **Hitta alla BPMN-filer** (rekursivt)
2. ✅ **Analysera diff** mot befintliga filer
3. ✅ **Validera parsing** av alla filer
4. ✅ **Validera process graph building** (med `bpmn-map.json`)
5. ✅ **Validera process tree building**
6. ✅ **Validera dokumentationsgenerering** (Feature Goals & Epics)
   - Feature Goals genereras för call activities och process-noder
   - Epics genereras för tasks
   - Inga tasks genereras som Feature Goals (kritiskt!)
   - Call activities mappas korrekt till subprocesser (via `bpmn-map.json`)
7. ✅ **Validera uppladdning** (valfritt, om du vill testa upload)

**Förväntat resultat:**
- Alla tester ska passera utan fel
- Feature Goals ska matcha förväntningar baserat på `bpmn-map.json`
- Inga varningar om saknade mappningar
- Process graph byggs korrekt med `bpmn-map.json`

**Om testet misslyckas:**
- Kontrollera att alla call activities i `bpmn-map.json` har korrekt `subprocess_bpmn_file`
- Verifiera att `bpmn_id` matchar element-id i BPMN-filerna
- Se felsökningssektionen nedan och [`VALIDATE_NEW_BPMN_FILES.md`](../validation/VALIDATE_NEW_BPMN_FILES.md)

### Alternativ: Validera mot Supabase (om filer är uppladdade)

Om BPMN-filerna redan är uppladdade till Supabase, kan du också köra:

```bash
node scripts/validate-bpmn-map.mjs
```

Detta validerar `bpmn-map.json` mot faktiska BPMN-filer i Supabase och genererar en rapport.

## Vanliga Problem

### Problem: Call Activity Saknas

**Symptom:** Call activity finns i BPMN-fil men saknas i genererad fil.

**Lösning:** 
- Lägg till från befintlig `bpmn-map.json`
- Markera med `needs_manual_review: true`
- Verifiera att processen faktiskt finns

### Problem: Fel Mappning

**Symptom:** Call activity har fel `subprocess_bpmn_file`.

**Lösning:**
- Använd handler-mappning som primär källa (de är korrekta)
- Verifiera mot faktiska BPMN-filer
- Kolla specialfall (t.ex. `document-signing` → `signing.bpmn`)

### Problem: Process Saknas

**Symptom:** Process finns i befintlig map men saknas i template.

**Lösning:**
- Behåll processen från befintlig map
- Verifiera att processen faktiskt används
- Överväg att ta bort om den inte längre behövs

## Referenser

- **Detaljerad Analys:** [`docs/analysis/BPMN_MAP_HANDLER_VS_BPMN_ANALYSIS.md`](../analysis/BPMN_MAP_HANDLER_VS_BPMN_ANALYSIS.md) - Varför handlers inte räcker
- **Template Analys:** [`docs/analysis/BPMN_MAP_FROM_TEMPLATE_ANALYSIS.md`](../analysis/BPMN_MAP_FROM_TEMPLATE_ANALYSIS.md) - Hur handlers fungerar
- **Script:** `scripts/generate-bpmn-map-from-template.ts` - Script för att extrahera från handlers

## Snabbreferens

**Kör detta:**
```bash
npm run generate:bpmn-map:template
```

**Sedan:**
1. Jämför `bpmn-map-from-template.json` med `bpmn-map.json`
2. Kombinera handler-mappningar med befintliga call activities
3. Lägg till saknade call activities (markera med `needs_manual_review: true`)
4. Verifiera att alla call activities finns
5. **Validera att bpmn-map.json fungerar:**
   ```bash
   npm test -- tests/integration/validate-feature-goals-generation.test.ts
   ```

**⚠️ KOMMA IHÅG:** Handlers täcker bara ~34 av ~39 call activities. Du MÅSTE alltid kombinera!

**⚠️ KOMMA IHÅG:** Efter uppdatering av `bpmn-map.json`, kör ALLTID valideringstestet för att säkerställa att mappningen fungerar korrekt!

## Nästa Steg

För framtida förbättringar:
- Implementera hybrid-approach i scriptet (handlers + BPMN-parsing)
- Automatisera kombineringsprocessen
- Verifiera automatiskt att alla call activities inkluderas

## Testprocess: Validera efter Uppdatering

**När du har uppdaterat `bpmn-map.json`, kör ALLTID testprocessen:**

**"Testprocessen"** är vår kompletta A-Ö valideringsprocess som validerar att allt fungerar hela vägen från parsing till appens UI.

```bash
# 1. Hitta filer och analysera diff
npm test -- tests/integration/local-folder-diff.test.ts

# 2. Validera parsing, graph, tree och dokumentationsgenerering
BPMN_TEST_DIR=/path/to/your/bpmn/files npm test -- tests/integration/validate-feature-goals-generation.test.ts
```

**Vad testprocessen validerar:**
1. Hitta alla BPMN-filer (rekursivt)
2. Analysera diff mot befintliga filer
3. Validera parsing av alla filer
4. Validera process graph building (med `bpmn-map.json`)
5. Validera process tree building
6. Validera dokumentationsgenerering (Feature Goals & Epics)
   - Feature Goals genereras korrekt baserat på `bpmn-map.json`
   - Call activities mappas korrekt till subprocesser
   - Process graph byggs korrekt
   - Inga tasks genereras som Feature Goals
7. Validera uppladdning (valfritt)

**Se [`docs/guides/validation/VALIDATE_NEW_BPMN_FILES.md`](../validation/VALIDATE_NEW_BPMN_FILES.md) för komplett guide.**

**Om någon säger "kör din testprocess igen efter uppdatering av bpmn-map.json", menar de hela A-Ö valideringsprocessen ovan.**
