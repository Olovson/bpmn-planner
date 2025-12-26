# Analys: Vänstermenyn Navigation Problem

## Problembeskrivning

Knapparna i vänstermenyn fungerar inkonsekvent - ibland hoppar de till fel sida, ibland fungerar de korrekt. Detta tyder på flera underliggande problem med hur navigationen är implementerad.

## Identifierade Problem

### 1. Inkonsekvent Navigation i AppHeaderWithTabs

**Problem:** I `AppHeaderWithTabs.tsx` använder vissa knappar `handleTabChange` som anropar `onViewChange`, medan andra knappar använder `navigate` direkt.

**Exempel:**
- `diagram`, `tree`, `listvy`, `timeline`, `tests`, `test-coverage`, `bpmn-folder-diff`, `files` → använder `handleTabChange` → `onViewChange`
- `configuration` → använder `navigate('/configuration')` direkt
- `styleguide` → använder `navigate('/styleguide')` direkt

**Konsekvens:** Detta skapar race conditions där:
- När en knapp använder `navigate` direkt, hoppar den över `onViewChange` callback
- Om sidan har state eller logik i `onViewChange`, körs den inte
- Det kan leda till inkonsekvent beteende

**Kod:**
```typescript:src/components/AppHeaderWithTabs.tsx
// Rad 177 - configuration använder navigate direkt
onClick={() => navigate('/configuration')}

// Rad 234 - styleguide använder navigate direkt  
onClick={() => navigate('/styleguide')}

// Men andra knappar använder handleTabChange
onClick={() => handleTabChange('diagram')}
```

### 2. Olika Implementationer av handleViewChange

**Problem:** Varje sida har sin egen implementation av `handleViewChange`, och de hanterar inte alla routes konsekvent.

**Exempel på olika implementationer:**

**TimelinePage:**
```typescript
const handleViewChange = (view: string) => {
  if (view === 'diagram') navigate('/');
  else if (view === 'tree') navigate('/process-explorer');
  else if (view === 'listvy') navigate('/node-matrix');
  else if (view === 'tests') navigate('/test-report');
  else if (view === 'configuration') navigate('/configuration');
  else if (view === 'files') navigate('/files');
  else if (view === 'timeline') navigate('/timeline');
  // Ingen fallback!
};
```

**ProjectConfigurationPage:**
```typescript
const handleViewChange = (view: string) => {
  if (view === 'timeline') navigate('/timeline');
  else if (view === 'listvy') navigate('/node-matrix');
  else if (view === 'tree') navigate('/process-explorer');
  else if (view === 'tests') navigate('/test-report');
  else if (view === 'configuration') navigate('/configuration');
  else if (view === 'files') navigate('/files');
  else {
    navigate('/'); // Fallback
  }
};
```

**TestCoverageExplorerPage:**
```typescript
const handleViewChange = (view: string) => {
  if (view === 'diagram') navigate('/');
  else if (view === 'tree') navigate('/process-explorer');
  else if (view === 'listvy') navigate('/node-matrix');
  else if (view === 'tests') navigate('/test-report');
  else if (view === 'test-coverage') navigate('/test-coverage');
  else if (view === 'files') navigate('/files');
  else if (view === 'timeline') navigate('/timeline');
  else if (view === 'configuration') navigate('/configuration');
  else if (view === 'styleguide') navigate('/styleguide');
  else navigate('/test-coverage'); // Fallback till sig själv
};
```

**BpmnDiffOverviewPage:**
```typescript
onViewChange={(v) => {
  if (v === 'files') navigate('/files');
  else if (v === 'diagram') navigate('/');
  // Bara 2 routes hanterade!
}}
```

**Konsekvens:**
- Om en användare klickar på en knapp som inte är implementerad i den specifika sidans `handleViewChange`, händer ingenting eller navigerar till fel sida
- Olika sidor har olika fallback-beteenden
- Det är svårt att veta vilka routes som faktiskt fungerar från varje sida

### 3. Problem med currentView Bestämning

**Problem:** `currentView` bestäms på olika sätt på olika sidor.

**Exempel:**
- **Index.tsx:** Använder `getHashRoute(location)` för att bestämma `currentView` dynamiskt
- **TimelinePage:** Hårdkodad: `const currentView: 'timeline' = 'timeline';`
- **Andra sidor:** Hårdkodad baserat på sidan

**Konsekvens:**
- Om `currentView` inte matchar den faktiska routen, kan knappar markeras som aktiva när de inte är det
- Det kan leda till förvirring om vilken sida som faktiskt är aktiv

### 4. Race Conditions vid Snabb Navigation

**Problem:** Om en användare klickar snabbt på flera knappar, kan det finnas race conditions där navigationen inte hinner slutföras innan nästa navigation startar.

**Konsekvens:**
- Navigation kan gå till fel sida
- State kan bli inkonsekvent
- URL kan bli felaktig

### 5. HashRouter-specifika Problem

**Problem:** Eftersom appen använder HashRouter, finns det specifika problem med hur navigation hanteras.

**Konsekvens:**
- `location.pathname` är alltid `/` i HashRouter
- Navigation måste använda hash-baserade routes (`/#/files` istället för `/files`)
- Vissa komponenter kanske inte hanterar hash-routes korrekt

## Lösningsförslag

### 1. Centraliserad Navigation Logic

Skapa en centraliserad navigation-funktion som alla sidor kan använda:

```typescript
// src/utils/navigation.ts
export const NAVIGATION_ROUTES: Record<ViewKey, string> = {
  'diagram': '/',
  'tree': '/process-explorer',
  'listvy': '/node-matrix',
  'tests': '/test-report',
  'test-coverage': '/test-coverage',
  'e2e-quality-validation': '/e2e-quality-validation',
  'timeline': '/timeline',
  'configuration': '/configuration',
  'files': '/files',
  'styleguide': '/styleguide',
  'bpmn-folder-diff': '/bpmn-folder-diff',
};

export function navigateToView(navigate: NavigateFunction, view: ViewKey) {
  const route = NAVIGATION_ROUTES[view];
  if (route) {
    navigate(route);
  } else {
    console.warn(`Unknown view: ${view}`);
    navigate('/');
  }
}
```

### 2. Konsekvent Användning av onViewChange

Uppdatera `AppHeaderWithTabs` så att ALLA knappar använder `handleTabChange` → `onViewChange`:

```typescript
// Alla knappar ska använda handleTabChange
onClick={() => handleTabChange('configuration')}
onClick={() => handleTabChange('styleguide')}
```

### 3. Standardiserad handleViewChange

Alla sidor ska använda samma implementation av `handleViewChange`:

```typescript
import { navigateToView } from '@/utils/navigation';

const handleViewChange = (view: string) => {
  navigateToView(navigate, view as ViewKey);
};
```

### 4. Dynamisk currentView Bestämning

Alla sidor ska bestämma `currentView` dynamiskt baserat på den faktiska routen:

```typescript
import { getHashRoute } from '@/utils/hashRouterHelpers';
import { useLocation } from 'react-router-dom';

const location = useLocation();
const currentRoute = getHashRoute(location);
const currentView = getViewFromRoute(currentRoute); // Helper function
```

### 5. Debouncing av Navigation

Lägg till debouncing för att förhindra race conditions:

```typescript
import { useCallback, useRef } from 'react';

const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const handleViewChange = useCallback((view: string) => {
  // Avbryt tidigare navigation om den pågår
  if (navigationTimeoutRef.current) {
    clearTimeout(navigationTimeoutRef.current);
  }
  
  // Debounce navigation
  navigationTimeoutRef.current = setTimeout(() => {
    navigateToView(navigate, view as ViewKey);
    navigationTimeoutRef.current = null;
  }, 100);
}, [navigate]);
```

## Prioritering

1. **Högsta prioritet:** Fixa inkonsekvent navigation i `AppHeaderWithTabs` (alla knappar ska använda `onViewChange`)
2. **Hög prioritet:** Skapa centraliserad navigation logic
3. **Medel prioritet:** Standardisera `handleViewChange` på alla sidor
4. **Låg prioritet:** Lägg till debouncing för att förhindra race conditions

## Testning

Efter fixen ska:
- Alla knappar i vänstermenyn navigera till rätt sida konsekvent
- Inga race conditions när användaren klickar snabbt
- `currentView` matchar alltid den faktiska routen
- Navigation fungerar från alla sidor till alla andra sidor

## Implementerade Fixar

### ✅ Fixat: Inkonsekvent Navigation i AppHeaderWithTabs

**Ändringar:**
- Alla knappar i `AppHeaderWithTabs` använder nu `handleTabChange` → `onViewChange` konsekvent
- `configuration` och `styleguide` knappar använder nu `handleTabChange('configuration')` och `handleTabChange('styleguide')` istället för `navigate()` direkt
- Tog bort oanvända imports (`useNavigate`, `useLocation`, `isHashRoute`)

**Filer ändrade:**
- `src/components/AppHeaderWithTabs.tsx`

### ✅ Fixat: Centraliserad Navigation Logic

**Ändringar:**
- Skapade `src/utils/navigation.ts` med:
  - `NAVIGATION_ROUTES`: Centraliserad mapping av alla routes
  - `navigateToView()`: Funktion för konsekvent navigation
  - `getViewFromRoute()`: Funktion för att bestämma `currentView` från route

**Filer skapade:**
- `src/utils/navigation.ts`

### ✅ Fixat: Standardiserad handleViewChange (Delvis)

**Ändringar:**
- Uppdaterade `TimelinePage`, `ProjectConfigurationPage`, och `TestCoverageExplorerPage` för att använda `navigateToView()`

**Filer ändrade:**
- `src/pages/TimelinePage.tsx`
- `src/pages/ProjectConfigurationPage.tsx`
- `src/pages/TestCoverageExplorerPage.tsx`

### ⚠️ Återstående: Standardisera Övriga Sidor

Följande sidor behöver fortfarande uppdateras för att använda `navigateToView()`:
- `src/pages/BpmnFileManager.tsx`
- `src/pages/NodeMatrix.tsx`
- `src/pages/ProcessExplorer.tsx`
- `src/pages/Index.tsx`
- `src/pages/TestReport.tsx`
- `src/pages/TestScriptsPage.tsx`
- `src/pages/E2eTestsOverviewPage.tsx`
- `src/pages/E2eQualityValidationPage.tsx`
- `src/pages/BpmnDiffOverviewPage.tsx`
- `src/pages/BpmnVersionHistoryPage.tsx`
- `src/pages/BpmnFolderDiffPage.tsx`
- `src/pages/DocViewer.tsx`
- `src/pages/NodeTestScriptViewer.tsx`
- `src/pages/NodeTestsPage.tsx`
- `src/pages/ConfigurationPage.tsx`
- `src/pages/StyleGuidePage.tsx`
- `src/pages/JiraNamingDebug.tsx`

### ⚠️ Återstående: Dynamisk currentView Bestämning

Flera sidor har hårdkodad `currentView` (t.ex. `TimelinePage` har `const currentView: 'timeline' = 'timeline'`). Dessa bör uppdateras för att använda `getViewFromRoute()` för att bestämma `currentView` dynamiskt baserat på den faktiska routen.

### ⚠️ Återstående: Debouncing av Navigation

Debouncing för att förhindra race conditions är inte implementerat ännu. Detta kan läggas till senare om problemet kvarstår.

