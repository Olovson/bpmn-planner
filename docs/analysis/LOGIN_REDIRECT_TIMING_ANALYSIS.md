# Analys: När sker redirecten till /auth?

## Problem

Tester redirectas till `/auth` trots att login fungerar. Frågan är: **när exakt sker redirecten?**

## ProtectedRoute-logik

```typescript
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Laddar...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
```

## Timing-problem

1. **När vi navigerar till `/files` efter login:**
   - `ProtectedRoute` renderas med `loading = true`, `authenticated = false`
   - `useEffect` körs och anropar `supabase.auth.getSession()`
   - Medan `useEffect` väntar på svar, visar den "Laddar..."
   - Om `getSession()` inte hittar sessionen (t.ex. pga timing), sätts `authenticated = false`
   - Då redirectar den till `/auth`

2. **Varför hittar `getSession()` inte sessionen?**
   - Sessionen sparas i `localStorage` av Supabase client
   - Men `ProtectedRoute` använder en annan Supabase client-instans (samma, men React kan ha timing-problem)
   - `useEffect` körs EFTER att komponenten renderats, så det finns en liten delay
   - Om vi navigerar för snabbt, kan `getSession()` köras innan sessionen är helt etablerad i `localStorage`

## Lösning

Vi behöver vänta på att `ProtectedRoute` faktiskt har laddat klart och verifierat sessionen innan vi fortsätter. Vi kan göra detta genom att:

1. Vänta på att "Laddar..." försvinner (ProtectedRoute är klar med loading)
2. Verifiera att vi INTE redirectas till `/auth`
3. Eventuellt vänta på att faktiskt innehåll visas (t.ex. "Filer" eller file upload area)

