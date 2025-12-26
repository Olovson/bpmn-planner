# HashRouter Fix Plan

## Problem

I HashRouter är `location.pathname` alltid `/`, men koden använder `location.pathname.includes('/node-matrix')` för att bestämma `currentView`, vilket inte fungerar.

## Lösning

Vi behöver skapa en helper-funktion som extraherar den faktiska routen från HashRouter:

```typescript
// I HashRouter: location.pathname är alltid '/', location.hash är '#/files', etc.
function getHashRoute(location: Location): string {
  if (location.hash) {
    // Ta bort '#' och eventuella query params
    return location.hash.replace(/^#/, '').split('?')[0];
  }
  return location.pathname;
}
```

Sedan använda denna funktion istället för `location.pathname.includes()`.

## Filer att uppdatera

1. `src/pages/Index.tsx` - Använd `getHashRoute()` istället för `location.pathname.includes()`
2. `src/components/AppHeaderWithTabs.tsx` - Uppdatera active state check
3. Andra komponenter som använder `location.pathname` för routing

## Test

Efter fixen ska:
- Navigering till `/files` ge URL:en `http://localhost:8080/#/files`
- `currentView` i `AppHeaderWithTabs` ska matcha korrekt route
- `ProtectedRoute` ska inte redirecta när sessionen finns

