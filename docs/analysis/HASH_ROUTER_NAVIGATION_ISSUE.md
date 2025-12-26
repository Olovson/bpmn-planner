# Analys: HashRouter Navigation Problem

## Problem

När vi navigerar till `/files` så blir URL:en `http://localhost:8080/files#/?file=mortgage.bpmn` istället för `http://localhost:8080/#/files`. Detta tyder på att HashRouter inte hanterar navigering korrekt.

## HashRouter-beteende

I HashRouter:
- `/files` ska bli `#/files` (hash-baserad routing)
- Men när vi navigerar till `/files` så verkar det som att något redirectar till `#/` istället

## Möjliga orsaker

1. **ProtectedRoute redirectar:**
   - Om `ProtectedRoute` inte hittar sessionen, redirectar den till `/auth`
   - Men i HashRouter blir `/auth` till `#/auth`
   - Men vi ser `#/` istället, så det kan vara något annat

2. **Index.tsx redirectar:**
   - `Index.tsx` har en `useEffect` som redirectar till `/auth` om användaren inte är inloggad
   - Men detta borde inte påverka `/files`-sidan

3. **HashRouter path-matching:**
   - HashRouter kan ha problem med path-matching
   - `/files` kanske matchas mot `/` istället

4. **Navigering i AppHeaderWithTabs:**
   - Vissa knappar använder `navigate()` direkt
   - Andra använder `onViewChange()` callback
   - Detta kan orsaka inkonsekvent beteende

## Lösning

Vi behöver:
1. Verifiera att HashRouter matchar paths korrekt
2. Se till att ProtectedRoute inte redirectar när sessionen finns
3. Se till att navigering i AppHeaderWithTabs är konsekvent

