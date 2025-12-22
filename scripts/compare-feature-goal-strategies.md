# Jämförelse: Feature Goal Strategier

## Strategi 1: Hierarchical Naming (54 totalt)
**En feature goal per call activity-instans**

### Fördelar ✅
1. **Matchar Jira-struktur**: 
   - Namnformat: `mortgage-se-application-internal-data-gathering.html`
   - Matchar Jira: "Application - Internal data gathering"
   - Bättre integration med Jira

2. **Kontext-specifik dokumentation**:
   - Samma subprocess kan ha olika kontext beroende på var den anropas
   - Exempel: "Credit Evaluation" när den anropas från "Mortgage Commitment" vs "Manual Credit Evaluation"
   - LLM kan generera mer relevant dokumentation baserat på parent-kontext

3. **Bättre spårbarhet**:
   - Tydligt varje anrop kommer från
   - Lättare att hitta dokumentation för specifika användningsfall
   - Bättre för debugging och förståelse av processflödet

4. **Redan implementerat**:
   - Koden är byggd för detta
   - Kommentarer i koden säger att detta är avsiktligt för Jira-integration

### Nackdelar ❌
1. **Mer filer**: 54 vs 40 (14 fler filer)
2. **Potentiell duplicering**: Samma subprocess dokumenterad flera gånger
3. **Mer komplexitet**: Fler filer att hantera och underhålla

---

## Strategi 2: En per Unik Subprocess (40 totalt)
**En feature goal per subprocess-fil**

### Fördelar ✅
1. **Enklare struktur**:
   - Färre filer (40 vs 54)
   - Enklare att navigera
   - Mindre komplexitet

2. **Ingen duplicering**:
   - Subprocessen dokumenteras en gång
   - Centraliserad dokumentation
   - Mindre risk för inkonsistens

3. **Lättare underhåll**:
   - Färre filer att uppdatera
   - Enklare att hålla synkroniserat

### Nackdelar ❌
1. **Förlorar kontext**:
   - Ingen information om hur subprocessen används i olika sammanhang
   - Exempel: "Credit Evaluation" dokumenteras en gång, men används i 5 olika kontexter
   - Mindre detaljerad dokumentation

2. **Matchar inte Jira-struktur**:
   - Jira har hierarchical naming (Project → Initiative → Feature Goal → Epic)
   - Strategi 2 bryter mot denna struktur

3. **Mindre spårbarhet**:
   - Svårare att hitta dokumentation för specifika användningsfall
   - Måste läsa samma dokumentation oavsett kontext

---

## Rekommendation: **Strategi 1 (Hierarchical Naming)**

### Varför?
1. **Jira-integration är viktig**: Koden är redan byggd för detta och matchar Jira-struktur
2. **Kontext-specifik dokumentation är värdefullt**: 
   - Samma subprocess kan ha olika betydelse beroende på var den anropas
   - LLM kan generera mer relevant dokumentation med parent-kontext
3. **Bättre för stora processer**: 
   - När en subprocess anropas många gånger (t.ex. 5 gånger), är det värdefullt att ha kontext-specifik dokumentation
4. **Redan implementerat**: 
   - Koden är byggd för detta, skulle kräva refactoring att ändra

### När Strategi 2 skulle vara bättre:
- Om Jira-integration inte är viktig
- Om kontext-specifik dokumentation inte ger värde
- Om du vill ha enklare struktur och är OK med att förlora kontext

---

## Exempel: Credit Evaluation

**Strategi 1** (hierarchical naming):
- `mortgage-se-manual-credit-evaluation-Activity_1gzlxx4.html` (anropas från Manual Credit Evaluation)
- `mortgage-se-mortgage-commitment-credit-evaluation-1.html` (anropas från Mortgage Commitment, första gången)
- `mortgage-se-mortgage-commitment-credit-evaluation-2.html` (anropas från Mortgage Commitment, andra gången)
- `mortgage-se-object-control-credit-evaluation-2.html` (anropas från Object Control)
- `mortgage-se-mortgage-credit-evaluation.html` (anropas från root process)

**Strategi 2** (en per subprocess):
- `mortgage-se-credit-evaluation.html` (en fil för hela subprocessen)

Strategi 1 ger mer kontext och matchar Jira-struktur, men kräver 5 filer istället för 1.
