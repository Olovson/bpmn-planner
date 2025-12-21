/**
 * Chroma DB Indexer
 * 
 * Automatisk indexering av dokumentation i Chroma DB för att förbättra AI-assistentens minne.
 * Detta är INTE för appens funktionalitet, utan för att ge AI-assistenten bättre kontext.
 * 
 * NOTERA: Eftersom Chroma DB körs lokalt och indexeringen kräver Node.js-miljö,
 * kan vi inte köra den direkt från webbläsaren. Istället loggar vi att indexering
 * behövs och användaren kan köra `npm run vector:index` manuellt, eller så kan
 * en lokal process lyssna på dessa events och köra indexeringen automatiskt.
 */

/**
 * Trigger Chroma DB indexering i bakgrunden
 * 
 * Detta körs automatiskt när relevanta ändringar sker i projektet:
 * - När dokumentation genereras
 * - När BPMN-filer laddas upp
 * - När projektstruktur ändras
 * 
 * Indexeringen körs i bakgrunden och blockerar inte användaren.
 * 
 * NOTERA: Eftersom detta körs i webbläsaren kan vi inte köra npm-kommandon direkt.
 * Istället loggar vi att indexering behövs. En lokal process kan lyssna på dessa
 * events och köra indexeringen automatiskt, eller så kan användaren köra
 * `npm run vector:index` manuellt.
 */
export async function triggerChromaIndexing(): Promise<void> {
  // Kör endast i utvecklingsmiljö (inte i produktion)
  if (import.meta.env.PROD) {
    return;
  }

  // Kontrollera om Chroma DB server är tillgänglig
  // NOTERA: Om servern inte körs kommer webbläsaren att logga CORS-fel.
  // Detta är förväntat beteende och kan ignoreras.
  try {
    const response = await fetch('http://localhost:8000/api/v1/heartbeat', {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 sekunder timeout
    });
    
    if (!response.ok) {
      // Server svarar men endpoint är inte tillgänglig (t.ex. 410 Gone för deprecated v1 API)
      // Detta är okej - vi hoppar bara över indexering
      return;
    }
  } catch (error) {
    // Chroma DB server körs inte, är inte tillgänglig, eller CORS-blockad
    // Detta är förväntat om servern inte körs - inget behöver loggas
    // (CORS-fel loggas automatiskt av webbläsaren, vi behöver inte logga igen)
    return;
  }

  // Logga att indexering behövs (endast om servern är tillgänglig)
  // En lokal process kan lyssna på dessa events och köra indexeringen automatiskt
  console.log('[ChromaIndexer] ⚠️  Chroma DB indexering behövs för att uppdatera AI-assistentens minne.');
  console.log('[ChromaIndexer] 💡 Kör "npm run vector:index" för att uppdatera indexeringen.');
  
  // Försök anropa en lokal webhook/API om den finns (för framtida automatisk indexering)
  try {
    // Försök anropa lokal indexering-service om den finns
    await fetch('http://localhost:3001/index-chroma', {
      method: 'POST',
      signal: AbortSignal.timeout(1000),
    }).catch(() => {
      // Ignorera om service inte finns - det är okej
    });
  } catch (error) {
    // Ignorera fel - indexering är inte kritisk
    // CORS-fel loggas automatiskt av webbläsaren, vi behöver inte logga igen
  }
}

/**
 * Debounced version av triggerChromaIndexing
 * Väntar en kort stund innan indexering för att undvika för många anrop
 */
let indexingTimeout: NodeJS.Timeout | null = null;

export function triggerChromaIndexingDebounced(delay: number = 5000): void {
  if (indexingTimeout) {
    clearTimeout(indexingTimeout);
  }
  
  indexingTimeout = setTimeout(() => {
    triggerChromaIndexing();
    indexingTimeout = null;
  }, delay);
}

