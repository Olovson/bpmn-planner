/**
 * Rate Limiter för Claude API
 * 
 * Claude Sonnet 4.5 rate limits:
 * - Output tokens per minute: 8K
 * - Requests per minute: 50
 * 
 * Vi behöver throttla requests för att undvika rate limit-fel.
 */

// Track output tokens användning per minut
interface TokenUsage {
  timestamp: number;
  tokens: number;
}

let tokenUsageHistory: TokenUsage[] = []; // Array av token-användningar med timestamps
let requestTimestamps: number[] = []; // Array av timestamps för requests

const OUTPUT_TOKENS_PER_MINUTE = 8000;
const REQUESTS_PER_MINUTE = 50;
const SAFETY_MARGIN = 0.1; // 10% säkerhetsmarginal

// Rensa gamla entries (äldre än 1 minut)
function cleanupOldEntries() {
  const oneMinuteAgo = Date.now() - 60000;
  tokenUsageHistory = tokenUsageHistory.filter(entry => entry.timestamp > oneMinuteAgo);
  requestTimestamps = requestTimestamps.filter(ts => ts > oneMinuteAgo);
}

/**
 * Beräknar hur länge vi behöver vänta innan nästa request
 * @param estimatedOutputTokens - Uppskattade output tokens för nästa request
 * @returns Antal millisekunder att vänta, eller 0 om ingen väntan behövs
 */
export function calculateWaitTime(estimatedOutputTokens: number): number {
  cleanupOldEntries();
  
  // Räkna totala output tokens använda den senaste minuten
  const tokensInLastMinute = tokenUsageHistory.reduce((sum, entry) => sum + entry.tokens, 0);
  const requestsInLastMinute = requestTimestamps.length;
  
  // Kontrollera om vi skulle överskrida output tokens limit
  const maxTokensWithMargin = OUTPUT_TOKENS_PER_MINUTE * (1 - SAFETY_MARGIN);
  const wouldExceedTokens = tokensInLastMinute + estimatedOutputTokens > maxTokensWithMargin;
  
  // Kontrollera om vi skulle överskrida requests limit
  const maxRequestsWithMargin = REQUESTS_PER_MINUTE * (1 - SAFETY_MARGIN);
  const wouldExceedRequests = requestsInLastMinute >= maxRequestsWithMargin;
  
  if (!wouldExceedTokens && !wouldExceedRequests) {
    return 0; // Ingen väntan behövs
  }
  
  // Beräkna hur länge vi behöver vänta
  // Hitta den äldsta entryn som fortfarande räknas
  const oldestTokenTime = tokenUsageHistory.length > 0 
    ? Math.min(...tokenUsageHistory.map(e => e.timestamp)) 
    : Date.now();
  const oldestRequestTime = requestTimestamps.length > 0 
    ? Math.min(...requestTimestamps) 
    : Date.now();
  
  // Vänta tills den äldsta entryn är äldre än 1 minut
  const waitForTokens = wouldExceedTokens 
    ? Math.max(0, 60000 - (Date.now() - oldestTokenTime)) 
    : 0;
  const waitForRequests = wouldExceedRequests 
    ? Math.max(0, 60000 - (Date.now() - oldestRequestTime)) 
    : 0;
  
  return Math.max(waitForTokens, waitForRequests);
}

/**
 * Registrerar att en request har gjorts med givna output tokens
 * @param outputTokens - Antal output tokens som användes
 */
export function recordRequest(outputTokens: number): void {
  cleanupOldEntries();
  
  const now = Date.now();
  
  // Lägg till token-användning
  tokenUsageHistory.push({
    timestamp: now,
    tokens: outputTokens,
  });
  
  requestTimestamps.push(now);
  
  if (import.meta.env.DEV) {
    const tokensInLastMinute = tokenUsageHistory.reduce((sum, entry) => sum + entry.tokens, 0);
    const requestsInLastMinute = requestTimestamps.length;
    console.log(`[Rate Limiter] Recorded: ${outputTokens} output tokens, ${requestsInLastMinute} requests in last minute`);
    console.log(`[Rate Limiter] Usage: ${((tokensInLastMinute / OUTPUT_TOKENS_PER_MINUTE) * 100).toFixed(1)}% of output tokens, ${((requestsInLastMinute / REQUESTS_PER_MINUTE) * 100).toFixed(1)}% of requests`);
  }
}

/**
 * Väntar om nödvändigt för att undvika rate limits
 * @param estimatedOutputTokens - Uppskattade output tokens för nästa request
 */
export async function waitIfNeeded(estimatedOutputTokens: number): Promise<void> {
  const waitTime = calculateWaitTime(estimatedOutputTokens);
  
  if (waitTime > 0) {
    if (import.meta.env.DEV) {
      console.log(`[Rate Limiter] Waiting ${(waitTime / 1000).toFixed(1)}s to avoid rate limit...`);
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

/**
 * Återställer rate limiter (användbart för tester)
 */
export function resetRateLimiter(): void {
  tokenUsageHistory = [];
  requestTimestamps = [];
}

