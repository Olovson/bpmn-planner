# Business Rule Mall - Före vs Efter

**Datum:** 2025-12-28

## Nuvarande Mall (FÖRE)

### Sektioner som alltid renderas:

1. **Header** (alltid synlig)
   ```html
   <section class="doc-section">
     <span class="doc-badge">Business Rule / DMN</span>
     <h1>${nodeName}</h1>
     <ul>
       <li><strong>Regel-ID:</strong> ${node.bpmnElementId}</li>
       <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
       <li><strong>Kreditprocess-steg:</strong> ${node.bpmnFile.replace('.bpmn', '')}</li>
     </ul>
   </section>
   ```

2. **Sammanfattning & scope** (alltid synlig)
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text
     ```
     "${nodeName} avgör om en ansökan ligger inom bankens riktlinjer för kreditgivning."
     "Regeln används för att automatisera delar av kreditbeslutet och säkerställa likabehandling."
     "Omfattar endast den aktuella kreditprodukten – andra produkter hanteras i separata regler."
     ```

3. **Förutsättningar & kontext** (alltid synlig, alltid fallback)
   - Finns INTE i modellen, men renderas alltid med fallback-text:
     ```
     "Triggas normalt efter <strong>${upstreamNode}</strong>."
     "Kräver att central kund- och ansökningsdata är komplett och validerad."
     "Förutsätter att nödvändiga externa registerslagningar (t.ex. UC, kreditupplysning) är gjorda."
     ```

4. **Inputs & datakällor** (alltid synlig)
   - Om LLM genererat: parsa inputs och visa som tabell
   - Om INTE LLM genererat: fallback-tabell med:
     - riskScore (Kreditmotor / UC, Tal 0-1000)
     - debtToIncomeRatio (Intern beräkning, Decimal)
     - loanToValue (Fastighetsvärdering, Procent)

5. **Beslutslogik (DMN / regler)** (alltid synlig)
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text
     ```
     "Hög riskScore och måttlig skuldsättning ger normalt auto-approve."
     "Mellanrisk eller ofullständig data leder till manuell granskning."
     "Tydliga exklusionskriterier (t.ex. betalningsanmärkningar eller sanktionsflaggor) ger auto-decline."
     ```

6. **Output & effekter** (alltid synlig)
   - Om LLM genererat: parsa outputs och visa som tabell
   - Om INTE LLM genererat: fallback-tabell med:
     - Beslut: APPROVE/REFER/DECLINE
     - Processpåverkan: fortsätter/pausas/avslutas
     - Flaggor: hög skuldsättning, etc.
     - Loggning: beslut, parametrar, regelversion

7. **Affärsregler & policystöd** (alltid synlig)
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text
     ```
     "Stödjer intern kreditpolicy och mandat för respektive produkt och segment."
     "Bygger på dokumenterade riskramverk och beslutsmodeller."
     "Tar hänsyn till regulatoriska krav (t.ex. konsumentkreditlag, AML/KYC) på en övergripande nivå."
     ```

8. **Relaterade regler & subprocesser** (alltid synlig)
   - Om LLM genererat: använd LLM-text
   - Om INTE LLM genererat: fallback-text med länkar (om de finns)
     ```
     "Relaterad DMN-modell: <a href="${dmnLink}">${dmnLabel}</a>" (om länk finns)
     "Ingen DMN-länk konfigurerad ännu..." (om länk saknas)
     "Relaterad BPMN-subprocess: <a href="${bpmnViewerLink}">Visa i BPMN viewer</a>" (om länk finns)
     "Subprocess-länk sätts via BPMN viewer." (om länk saknas)
     "Överordnad nod: ${parentNode}" (om finns)
     "Överordnad nod: Rotprocess" (om saknas)
     ```

**Totalt: 8 sektioner, alla alltid synliga**

---

## Efter Ändringar (EFTER)

### Sektioner som renderas (conditional):

1. **Header** (alltid synlig) ✅
   ```html
   <section class="doc-section">
     <span class="doc-badge">Business Rule / DMN</span>
     <h1>${nodeName}</h1>
     <ul>
       <li><strong>Regel-ID:</strong> ${node.bpmnElementId}</li>
       <li><strong>BPMN-element:</strong> ${node.bpmnElementId} (${node.type})</li>
       <li><strong>Kreditprocess-steg:</strong> ${node.bpmnFile.replace('.bpmn', '')}</li>
     </ul>
   </section>
   ```

2. **Sammanfattning & scope** (conditional - endast om `model.summary` finns) ✅
   ```html
   ${model.summary ? `
   <section class="doc-section" data-source-summary="llm">
     <h2>Sammanfattning &amp; scope</h2>
     <p>${model.summary}</p>
   </section>
   ` : ''}
   ```
   - **Ingen fallback-text** - visas endast om LLM genererat

3. ~~**Förutsättningar & kontext**~~ ❌ **TAS BORT**
   - Finns inte i modellen, bara fallback-text
   - Ingen anledning att behålla

4. **Inputs & datakällor** (conditional - endast om `model.inputs.length > 0`) ✅
   ```html
   ${model.inputs.length > 0 ? `
   <section class="doc-section" data-source-inputs="llm">
     <h2>Inputs &amp; datakällor</h2>
     ${renderInputsTable()} <!-- Parsar LLM-genererade inputs -->
   </section>
   ` : ''}
   ```
   - **Ingen fallback-tabell** - visas endast om LLM genererat inputs

5. **Beslutslogik (DMN / regler)** (conditional - endast om `model.decisionLogic.length > 0`) ✅
   ```html
   ${model.decisionLogic.length > 0 ? `
   <section class="doc-section" data-source-decision-logic="llm">
     <h2>Beslutslogik (DMN / regler)</h2>
     ${renderList(model.decisionLogic)}
   </section>
   ` : ''}
   ```
   - **Ingen fallback-text** - visas endast om LLM genererat

6. **Output & effekter** (conditional - endast om `model.outputs.length > 0`) ✅
   ```html
   ${model.outputs.length > 0 ? `
   <section class="doc-section" data-source-outputs="llm">
     <h2>Output &amp; effekter</h2>
     ${renderOutputsTable()} <!-- Parsar LLM-genererade outputs -->
   </section>
   ` : ''}
   ```
   - **Ingen fallback-tabell** - visas endast om LLM genererat outputs

7. **Affärsregler & policystöd** (conditional - endast om `model.businessRulesPolicy.length > 0`) ✅
   ```html
   ${model.businessRulesPolicy.length > 0 ? `
   <section class="doc-section" data-source-business-rules="llm">
     <h2>Affärsregler &amp; policystöd</h2>
     ${renderList(model.businessRulesPolicy)}
   </section>
   ` : ''}
   ```
   - **Ingen fallback-text** - visas endast om LLM genererat

8. **Relaterade regler & subprocesser** (conditional - endast om länkar finns ELLER LLM genererat) ✅
   ```html
   ${(model.relatedItems.length > 0 || links.dmnLink || links.bpmnViewerLink || context.parentChain.length > 0) ? `
   <section class="doc-section" data-source-related-items="${model.relatedItems.length > 0 ? 'llm' : 'links'}">
     <h2>Relaterade regler &amp; subprocesser</h2>
     ${renderList([
       ...(model.relatedItems.length > 0 ? model.relatedItems : []),
       ...(links.dmnLink ? [`Relaterad DMN-modell: <a href="${links.dmnLink}">${dmnLabel}</a>`] : []),
       ...(links.bpmnViewerLink ? [`Relaterad BPMN-subprocess: <a href="${links.bpmnViewerLink}">Visa i BPMN viewer</a>`] : []),
       ...(context.parentChain.length > 0 ? [`Överordnad nod: ${buildNodeLink(context.parentChain[context.parentChain.length - 1])}`] : [])
     ])}
   </section>
   ` : ''}
   ```
   - **Behåller länkar** om de finns (DMN, BPMN viewer, överordnad nod)
   - **Ingen fallback-text** om länkar saknas

**Totalt: 1-7 sektioner (Header + 0-6 conditional)**

---

## Vad Blir Kvar?

### Minimum (om LLM inte genererat något):
- **Header** (alltid synlig)
- **Relaterade regler** (endast om länkar finns: DMN, BPMN viewer, överordnad nod)

### Typiskt (om LLM genererat allt):
- **Header** (alltid synlig)
- **Sammanfattning & scope**
- **Inputs & datakällor** (som tabell)
- **Beslutslogik (DMN / regler)**
- **Output & effekter** (som tabell)
- **Affärsregler & policystöd**
- **Relaterade regler & subprocesser** (LLM-text + länkar)

### Maximum:
- Samma som "Typiskt" (7 sektioner totalt)

---

## Jämförelse: Före vs Efter

| Aspekt | Före | Efter |
|--------|------|-------|
| **Antal sektioner** | 8 (alla alltid synliga) | 1-7 (Header + 0-6 conditional) |
| **Fallback-texter** | ✅ Alla sektioner har fallback | ❌ Inga fallback-texter |
| **Conditional rendering** | ❌ Nej | ✅ Ja (som Epic) |
| **Minimum-mall** | ❌ Nej (många generiska texter) | ✅ Ja (endast värdefullt innehåll) |
| **Förutsättningar-sektion** | ✅ Finns (men bara fallback) | ❌ Tas bort (finns inte i modellen) |
| **Länkar** | ✅ Visas alltid (även med fallback-text) | ✅ Visas endast om de finns |
| **LLM-krav** | ⚠️ Kan fungera med fallback | ✅ Allt måste genereras av LLM |

---

## Exempel: Tom Business Rule (ingen LLM-generering)

### Före:
- Header
- Sammanfattning (fallback: "avgör om en ansökan ligger...")
- Förutsättningar (fallback: "Triggas normalt efter...")
- Inputs (fallback-tabell: riskScore, debtToIncomeRatio, loanToValue)
- Beslutslogik (fallback: "Hög riskScore ger auto-approve...")
- Outputs (fallback-tabell: APPROVE/REFER/DECLINE)
- Affärsregler (fallback: "Stödjer intern kreditpolicy...")
- Relaterade regler (fallback: "Ingen DMN-länk..." + länkar om de finns)

**Totalt: 8 sektioner med generiskt innehåll**

### Efter:
- Header
- Relaterade regler (endast om länkar finns)

**Totalt: 1-2 sektioner (endast värdefullt innehåll)**

---

## Exempel: Komplett Business Rule (LLM genererat allt)

### Före:
- Header
- Sammanfattning (LLM-genererad)
- Förutsättningar (fallback - finns alltid)
- Inputs (LLM-genererad tabell)
- Beslutslogik (LLM-genererad)
- Outputs (LLM-genererad tabell)
- Affärsregler (LLM-genererad)
- Relaterade regler (LLM-genererad + länkar)

**Totalt: 8 sektioner**

### Efter:
- Header
- Sammanfattning (LLM-genererad)
- Inputs (LLM-genererad tabell)
- Beslutslogik (LLM-genererad)
- Outputs (LLM-genererad tabell)
- Affärsregler (LLM-genererad)
- Relaterade regler (LLM-genererad + länkar)

**Totalt: 7 sektioner (samma innehåll, men utan "Förutsättningar")**

---

## Slutsats

**Efter ändringar kommer Business Rule-mallen att:**
- ✅ Ha minimum-mall (endast värdefullt innehåll)
- ✅ Vara konsistent med Epic-mall (conditional rendering, inga fallback-texter)
- ✅ Tvinga LLM att generera specifikt innehåll (ingen generisk text)
- ✅ Behålla värdefulla länkar (DMN, BPMN viewer, överordnad nod)
- ✅ Ta bort "Förutsättningar"-sektionen (finns inte i modellen)

**Minimum:** 1 sektion (Header)  
**Maximum:** 7 sektioner (Header + 6 conditional)  
**Typiskt:** 5-7 sektioner (beroende på om LLM genererat innehåll)

