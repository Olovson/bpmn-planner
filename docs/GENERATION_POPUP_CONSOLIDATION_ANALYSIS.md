# Analys: Konsolidering av Generation Popups

## Problem

Användaren vill ha **EN enda popup** som visar:
1. **Total översikt** över vad som ska genereras (innan start)
2. **Status** under generering
3. Allt på ett ställe, inte flera olika popups

## Nuvarande Situation

### Identifierade Popups/Overlays/Dialogs

#### 1. **showTransitionOverlay** (Huvudoverlay under generering)
**Plats:** `src/pages/BpmnFileManager.tsx` (rad 3563-3660)

**Vad den visar:**
- `overlayMessage`: "Steg X av Y" (uppdateras kontinuerligt)
- `overlayDescription`: Beskrivning av aktuellt steg
- `generationProgress`: { step, detail } - Pågående steg med detaljer
- `graphTotals`: { files, nodes } - Totalt antal filer och noder
- `docgenProgress`: { completed, total } - Progress för dokumentationsgenerering
- `docUploadProgress`: { planned, completed } - Progress för HTML-filuppladdning
- `testUploadProgress`: { planned, completed } - Progress för testfiler
- Progress bars för varje kategori
- "Avbryt körning" knapp

**Problem:**
- Visar "Steg X av Y" vilket är förvirrande (vad är steg X?)
- Visar flera olika progress-mätningar samtidigt (dokumentation, HTML-upload, testfiler)
- Saknar översikt över vad som ska genereras INNAN start
- Uppdateras kontinuerligt med olika meddelanden

**När den visas:**
- Under hela genereringsprocessen
- Stängs när generering är klar eller avbruten

---

#### 2. **showGenerationReport** (Dialog EFTER generering)
**Plats:** `src/pages/BpmnFileManager.tsx` (rad 3755-3933)

**Vad den visar:**
- Detaljerad rapport över vad som genererades
- Summary cards: Filer, Tester, Dokumentation
- Lista över analyserade BPMN-filer
- Lista över testfiler med element
- Lista över dokumentationsfiler
- Jira-mappningar
- Subprocess-mappningar
- Saknade subprocesser

**Problem:**
- Visas EFTER generering är klar
- Användaren ser inte vad som ska genereras INNAN start
- Separerad från progress-overlay

**När den visas:**
- Efter generering är klar
- Öppnas manuellt eller automatiskt efter generering

---

#### 3. **Toast Notifications** (Från useBpmnGenerator)
**Plats:** `src/hooks/useBpmnGenerator.ts` (rad 438-441)

**Vad den visar:**
- "Generering klar!" med sammanfattning
- Visar antal tester, dokumentation, DoR/DoD-kriterier

**Problem:**
- Ytterligare popup/notification
- Visas samtidigt som Generation Report Dialog
- Kan vara förvirrande med flera meddelanden

**När den visas:**
- Efter generering är klar

---

#### 4. **BpmnGeneratorDialog** (Dialog för att starta generering)
**Plats:** `src/components/BpmnGeneratorDialog.tsx`

**Vad den visar:**
- Valideringsomfång
- Alternativ för generering
- Valideringsresultat

**Problem:**
- Verkar inte användas i BpmnFileManager (används troligen på annan sida)
- Separerad från huvudgenereringsprocessen

**När den visas:**
- När användaren klickar på "Generera" knapp (på annan sida)

---

## Identifierade Problem

### Problem 1: Flera Separerade Popups
- **showTransitionOverlay**: Visar progress under generering
- **showGenerationReport**: Visar rapport efter generering
- **Toast notifications**: Visar sammanfattning efter generering
- **BpmnGeneratorDialog**: Visar alternativ för att starta generering

**Resultat:** Användaren ser flera olika popups vid olika tidpunkter, vilket är förvirrande.

### Problem 2: Saknar Översikt INNAN Start
- Ingen popup visar vad som ska genereras INNAN generering startar
- Användaren vet inte vad som kommer att genereras förrän det är klart
- showTransitionOverlay visar bara progress, inte plan

### Problem 3: Förvirrande Progress-visning
- "Steg X av Y" är inte tydligt (vad är steg X?)
- Flera olika progress-mätningar visas samtidigt (dokumentation, HTML-upload, testfiler)
- Saknar total översikt över hela processen

### Problem 4: Separerad Rapport
- Generation Report Dialog visas EFTER generering
- Användaren måste öppna den separat för att se vad som genererades
- Saknar koppling till progress-overlay

---

## Önskat Beteende

### EN Enda Popup som visar:

#### 1. **INNAN Generering Startar:**
- **Plan/Översikt:**
  - Antal filer som ska analyseras
  - Antal noder som ska genereras (dokumentation, tester, DoR/DoD)
  - Vilka filer som ingår
  - Hierarki-djup
  - LLM-läge (om tillämpligt)
- **"Starta generering" knapp**

#### 2. **UNDER Generering:**
- **Total Progress:**
  - Total procent klar (baserat på alla steg)
  - Tydlig progress bar
- **Aktuellt Steg:**
  - Tydlig beskrivning av vad som händer nu
  - Ex: "Genererar dokumentation för nod X av Y"
- **Detaljerad Progress (kollapsbar/sektioner):**
  - Dokumentation: X av Y noder (Z%)
  - HTML-upload: X av Y filer (Z%)
  - Testfiler: X av Y filer (Z%)
  - DoR/DoD: X av Y noder (Z%)
- **"Avbryt" knapp**

#### 3. **EFTER Generering:**
- **Sammanfattning:**
  - Antal filer analyserade
  - Antal dokumentationsfiler skapade
  - Antal testfiler skapade
  - Antal DoR/DoD-kriterier skapade
  - Jira-mappningar
  - Subprocess-mappningar
  - Saknade subprocesser (om några)
- **"Stäng" knapp**
- **"Visa detaljerad rapport" knapp** (valfritt, öppnar expanderad vy)

---

## Rekommenderad Lösning

### Konsolidera till EN Dialog

**Struktur:**
```
<Dialog open={showGenerationDialog}>
  {/* Tab 1: Plan (innan start) */}
  {!generating && !completed && (
    <GenerationPlanView 
      files={filesToGenerate}
      nodes={nodesToGenerate}
      hierarchyDepth={depth}
      llmMode={llmMode}
      onStart={handleStartGeneration}
    />
  )}

  {/* Tab 2: Progress (under generering) */}
  {generating && (
    <GenerationProgressView
      totalProgress={totalProgress}
      currentStep={currentStep}
      detailedProgress={{
        docs: { completed, total },
        htmlUpload: { completed, total },
        tests: { completed, total },
        dorDod: { completed, total }
      }}
      onCancel={handleCancel}
    />
  )}

  {/* Tab 3: Result (efter generering) */}
  {completed && (
    <GenerationResultView
      result={generationResult}
      onClose={handleClose}
      onShowDetails={handleShowDetails}
    />
  )}
</Dialog>
```

### Fördelar:
1. **EN enda popup** - Allt på ett ställe
2. **Tydlig översikt** - Användaren ser vad som ska genereras INNAN start
3. **Tydlig progress** - Total progress + detaljerad progress
4. **Tydlig resultat** - Sammanfattning efter generering
5. **Bättre UX** - Användaren förstår hela processen från början till slut

---

## Implementation Plan

### Steg 1: Skapa Ny Konsoliderad Dialog
- Skapa `GenerationDialog` komponent
- Ersätt `showTransitionOverlay` med `showGenerationDialog`
- Ta bort `showGenerationReport` (integrera i dialog)

### Steg 2: Plan View (Innan Start)
- Visa översikt över vad som ska genereras
- Använd `buildBpmnProcessGraph` för att räkna noder
- Visa filer, noder, hierarki-djup
- "Starta generering" knapp

### Steg 3: Progress View (Under Generering)
- Visa total progress (procent)
- Visa aktuellt steg (tydlig beskrivning)
- Visa detaljerad progress (kollapsbar)
- "Avbryt" knapp

### Steg 4: Result View (Efter Generering)
- Visa sammanfattning
- Visa detaljerad rapport (kollapsbar)
- "Stäng" knapp

### Steg 5: Ta Bort Gamla Popups
- Ta bort `showTransitionOverlay`
- Ta bort `showGenerationReport` (integrera i dialog)
- Ta bort eller reducera toast notifications

---

## Jämförelse: Nuvarande vs Önskat

| Aspekt | Nuvarande | Önskat |
|--------|-----------|--------|
| **Antal popups** | 3-4 olika (overlay, dialog, toast) | 1 enda dialog |
| **Översikt innan start** | Nej | Ja (Plan View) |
| **Progress under generering** | Ja (men förvirrande) | Ja (tydlig total + detaljerad) |
| **Resultat efter generering** | Ja (separerad dialog) | Ja (integrerad i samma dialog) |
| **Tydlighet** | Förvirrande (flera popups) | Tydlig (allt på ett ställe) |
| **UX** | Dålig (flera popups) | Bra (EN popup med olika vyer) |

---

## Sammanfattning

### Nuvarande Problem:
1. **Flera separerade popups** (overlay, dialog, toast)
2. **Saknar översikt INNAN start** (användaren vet inte vad som ska genereras)
3. **Förvirrande progress-visning** ("Steg X av Y" är inte tydligt)
4. **Separerad rapport** (visas efter generering, inte kopplad till progress)

### Önskad Lösning:
1. **EN enda dialog** med tre vyer: Plan → Progress → Result
2. **Tydlig översikt** INNAN generering startar
3. **Tydlig progress** UNDER generering (total + detaljerad)
4. **Tydlig resultat** EFTER generering (sammanfattning + detaljer)

### Nästa Steg:
Implementera `GenerationDialog` komponent som konsoliderar alla popups till EN enda dialog med tre vyer.
