# Svar på frågor - Projektkonfiguration

## 1. Timeline-beräkning: Sekventiellt eller parallellt?

**Svar: Sekventiellt (som nuvarande implementation)**

**Motivering:**
- Nuvarande timeline använder sekventiell beräkning (se `timelineScheduling.ts`)
- Varje aktivitet startar när den föregående slutar
- Detta håller det enkelt och förutsägbart

**Implementation:**
```
1. Förberedande aktiviteter (sekventiellt, i ordning)
2. Extra arbetsmoment för bank-integrationer (sekventiellt, per integration)
3. Standard ProcessTree-tasks (sekventiellt, befintlig logik)
```

**Framtida förbättring:** Parallellism kan läggas till senare om behov uppstår (t.ex. "Design & Arkitektur" kan köras parallellt med "Plattformsetablering").

---

## 2. Integration ownership - vad händer när man ändrar Stacc → Banken?

**Svar: Extra arbetsmoment läggs till FÖRE integrationen (projektet blir längre)**

**Implementation:**
- När användaren ändrar "Stacc" → "Banken" för en integration:
  1. De 4 default-arbetsmomenten läggs till (totalt 8 veckor)
  2. Dessa placeras FÖRE integrationens standard-tasks i timeline
  3. Integrationens standard-tasks behålls (de kommer efter extra arbetsmomenten)
  4. Total projekt-tid ökar med 8 veckor

**Exempel:**
```
Före (Stacc):
├─ Integration X (2 veckor)

Efter (Banken):
├─ Gemensam analys (2 veckor)
├─ Gemensam work breakdown (2 veckor)
├─ Banken implementerar (2 veckor)
├─ Gemensam felsökning (2 veckor)
└─ Integration X (2 veckor)  ← Standard-tasks behålls
```

**Timeline-uppdatering:**
- Timeline uppdateras automatiskt när konfiguration ändras
- Användaren ser direkt effekten på total projekt-tid

---

## 3. UI-bibliotek

**Svar: shadcn/ui (Radix UI + Tailwind) + lucide-react**

**Befintliga komponenter vi kan använda:**
- `Button` - för knappar
- `Input` - för text-input
- `Label` - för labels
- `Textarea` - för beskrivningar
- `Table` - för listor (valfritt)
- `Card` - för sektioner
- `Tabs` - för att separera förberedande aktiviteter och integrationer
- `Dialog` - för modaler (t.ex. "Lägg till från mall")
- `Select` - för dropdowns
- `Checkbox` / `RadioGroup` - för Stacc/Banken-val
- `Toast` - för feedback

**Ikoner:** `lucide-react` (t.ex. `Plus`, `Trash`, `Edit`, `Settings`)

---

## 4. Routing

**Svar: `/configuration`**

**Motivering:**
- Konsistent med nuvarande routing-struktur (`/timeline`, `/files`, etc.)
- Kort och tydlig
- Lätt att komma ihåg

**Implementation:**
```typescript
// I App.tsx
<Route path="/configuration" element={<ProjectConfigurationPage />} />

// I TimelinePage.tsx - lägg till knapp
<Button onClick={() => navigate('/configuration')}>
  <Settings className="h-4 w-4 mr-2" />
  Projektkonfiguration
</Button>
```

---

## 5. Integration-lista - varifrån hämtar vi integrationer?

**Svar: Kombination av `STACC_INTEGRATION_MAPPING` + ProcessTree**

**Förslag på approach:**

1. **Primär källa: `STACC_INTEGRATION_MAPPING`**
   - Detta är den hårdkodade listan med alla kända integrationer
   - Används redan i `IntegrationsPage.tsx`
   - Innehåller: `bpmnFile`, `elementId`, `elementName`, `description`, `integrationSource`

2. **Sekundär källa: ProcessTree (alla serviceTasks)**
   - För att hitta integrationer som inte finns i `STACC_INTEGRATION_MAPPING`
   - Extrahera alla `serviceTask`-noder från ProcessTree
   - Visa dessa också (med default "Stacc")

3. **Befintlig konfiguration: `integration_overrides`**
   - Läsa befintliga val från Supabase
   - Visa aktuellt val (Stacc/Banken) för varje integration

**Implementation:**
```typescript
// I ProjectConfigurationPage.tsx
const integrations = useMemo(() => {
  // 1. Hämta från STACC_INTEGRATION_MAPPING
  const mappedIntegrations = STACC_INTEGRATION_MAPPING.map(mapping => ({
    bpmnFile: mapping.bpmnFile,
    elementId: mapping.elementId,
    name: mapping.elementName,
    description: mapping.description,
    integrationSource: mapping.integrationSource,
    // Hämta befintligt val från IntegrationContext
    implementedBy: useStaccIntegration(mapping.bpmnFile, mapping.elementId) 
      ? 'stacc' 
      : 'bank',
  }));
  
  // 2. Hämta från ProcessTree (serviceTasks som inte finns i mapping)
  // ... implementation ...
  
  return mappedIntegrations;
}, [processTree, useStaccIntegration]);
```

**Fördelar:**
- ✅ Använder befintlig data
- ✅ Visar alla kända integrationer
- ✅ Stödjer även nya integrationer från BPMN-filer
- ✅ Konsistent med nuvarande `IntegrationsPage`

---

## Ytterligare förtydliganden

### Förberedande aktiviteter - Template-val

**Bekräftelse: Alternativ B - "Lägg till från mall"-val**

**Implementation:**
- Användaren börjar med tom lista
- Knapp: "Lägg till från mall" → Dialog med 3 templates
- Användaren kan välja en eller flera templates
- Templates läggs till med default-värden som kan justeras

**UI-förslag:**
```typescript
<Button onClick={() => setShowTemplateDialog(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Lägg till från mall
</Button>

// Dialog med checkboxes för varje template
<Dialog>
  <DialogTitle>Välj mallar att lägga till</DialogTitle>
  {defaultPreparatoryActivities.map(template => (
    <Checkbox
      checked={selectedTemplates.includes(template.name)}
      onCheckedChange={...}
    >
      {template.name} ({template.estimatedWeeks} veckor)
    </Checkbox>
  ))}
  <Button onClick={addSelectedTemplates}>Lägg till</Button>
</Dialog>
```

---

## Sammanfattning - Klar att börja!

**Alla frågor besvarade:**
- ✅ Timeline-beräkning: Sekventiellt
- ✅ Integration ownership: Extra arbetsmoment FÖRE (projektet blir längre)
- ✅ UI-bibliotek: shadcn/ui + lucide-react
- ✅ Routing: `/configuration`
- ✅ Integration-lista: `STACC_INTEGRATION_MAPPING` + ProcessTree
- ✅ Förberedande aktiviteter: Alternativ B (mall-val)

**Nästa steg:**
1. Börja med Fas 1: Grundläggande struktur
2. Använd Local Storage för prototyp (enklare att börja med)
3. Skapa ProjectConfigurationContext
4. Skapa konfigurationssida med UI

**Klar att börja implementera!** 🚀

