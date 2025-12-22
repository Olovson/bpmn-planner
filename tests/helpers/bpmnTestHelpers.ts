/**
 * Test helpers för att ladda BPMN-filer från fixtures och skapa data URLs.
 * Detta använder faktisk kod (parseBpmnFile kan hantera data URLs) utan stubbar.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseBpmnFile } from '@/lib/bpmnParser';
import type { BpmnParseResult } from '@/lib/bpmnParser';

/**
 * Creates a data URL from XML content for parseBpmnFile to use
 * Detta är samma approach som appen använder för versioned files
 */
function createBpmnDataUrl(xml: string): string {
  const base64 = btoa(unescape(encodeURIComponent(xml)));
  return `data:application/xml;base64,${base64}`;
}

/**
 * Load BPMN file from fixtures and parse it using actual parseBpmnFile
 * This uses the same code path as the app (data URLs)
 */
export async function loadAndParseBpmnFromFixtures(
  fileName: string,
  fixtureDirs: string[] = []
): Promise<BpmnParseResult> {
  const defaultDirs = [
    resolve(__dirname, '..', 'fixtures', 'bpmn'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.11 18:11'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.11 17:44'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.08'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.11.29'),
  ];
  
  const allDirs = [...defaultDirs, ...fixtureDirs];
  
  for (const dir of allDirs) {
    try {
      const filePath = resolve(dir, fileName);
      const xml = await readFile(filePath, 'utf-8');
      const dataUrl = createBpmnDataUrl(xml);
      // Use actual parseBpmnFile - no stubs!
      return await parseBpmnFile(dataUrl);
    } catch {
      // File doesn't exist in this directory, try next
      continue;
    }
  }
  
  throw new Error(`BPMN file not found in fixtures: ${fileName}`);
}

/**
 * Load and parse multiple BPMN files from fixtures
 * Returns a Map of fileName -> BpmnParseResult
 */
export async function loadAndParseMultipleBpmnFiles(
  fileNames: string[],
  fixtureDirs: string[] = []
): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();
  
  for (const fileName of fileNames) {
    try {
      const result = await loadAndParseBpmnFromFixtures(fileName, fixtureDirs);
      results.set(fileName, result);
    } catch (error) {
      console.error(`Failed to load ${fileName}:`, error);
      // Continue with other files
    }
  }
  
  return results;
}
