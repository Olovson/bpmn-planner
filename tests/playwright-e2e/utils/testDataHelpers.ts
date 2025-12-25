/**
 * Test Data Helpers - Säkerställer att testdata är isolerad från produktionsdata
 * 
 * Alla testdata ska prefixas med "test-" och timestamp för att undvika konflikter
 * och för att kunna identifiera och rensa testdata.
 */

/**
 * Genererar ett unikt test-filnamn med prefix och timestamp
 */
export function generateTestFileName(baseName: string = 'test-file'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  // Ta bort .bpmn om det redan finns, vi lägger till det senare
  const cleanBase = baseName.replace(/\.bpmn$/, '');
  return `test-${timestamp}-${random}-${cleanBase}.bpmn`;
}

/**
 * Kontrollerar om ett filnamn är testdata (börjar med "test-")
 */
export function isTestFileName(fileName: string): boolean {
  return fileName.startsWith('test-');
}

/**
 * Kontrollerar om ett filnamn är testdata baserat på mönster
 * (test-{timestamp}-{random}-{name}.bpmn)
 */
export function isTestDataFile(fileName: string): boolean {
  // Matchar mönster: test-{timestamp}-{random}-{name}.bpmn
  const testPattern = /^test-\d+-\d+-.+\.bpmn$/;
  return testPattern.test(fileName) || fileName.startsWith('test-');
}

/**
 * Extraherar timestamp från test-filnamn (för cleanup baserat på ålder)
 */
export function extractTimestampFromTestFileName(fileName: string): number | null {
  const match = fileName.match(/^test-(\d+)-\d+-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Kontrollerar om testdata är äldre än X minuter (för cleanup)
 */
export function isTestDataOlderThan(fileName: string, minutes: number): boolean {
  const timestamp = extractTimestampFromTestFileName(fileName);
  if (!timestamp) return false;
  
  const ageInMs = Date.now() - timestamp;
  const ageInMinutes = ageInMs / (1000 * 60);
  return ageInMinutes > minutes;
}

