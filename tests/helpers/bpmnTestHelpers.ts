/**
 * Test helpers för att ladda BPMN-filer från fixtures och skapa data URLs.
 * Detta använder faktisk kod (parseBpmnFile kan hantera data URLs) utan stubbar.
 * 
 * Stödjer även läsning från en konfigurerbar lokal katalog via environment variable:
 * - BPMN_TEST_DIR: Sökväg till en lokal katalog med BPMN-filer (rekursiv sökning)
 */

import { readFile, readdir } from 'fs/promises';
import { resolve, join } from 'path';
import { parseBpmnFile, parseBpmnFileContent } from '@/lib/bpmnParser';
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
    // VIKTIGT: mortgage-se 2025.12.11 18:11 måste komma FÖRE analytics
    // eftersom analytics-versionen av vissa filer saknar callActivities (t.ex. object-control)
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.11 18:11'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.11 17:44'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.12.08'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'mortgage-se 2025.11.29'),
    resolve(__dirname, '..', 'fixtures', 'bpmn', 'analytics'),
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
 * Recursively find a BPMN file in a directory
 */
async function findBpmnFileInDirectory(fileName: string, dirPath: string): Promise<string | null> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }
      
      if (entry.isDirectory()) {
        const found = await findBpmnFileInDirectory(fileName, fullPath);
        if (found) return found;
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return null;
}

/**
 * Load BPMN file from local directory (if BPMN_TEST_DIR is set) or fixtures
 * Uses actual production code: parseBpmnFileContent
 */
async function loadAndParseBpmnFromLocalDirOrFixtures(
  fileName: string,
  fixtureDirs: string[] = []
): Promise<BpmnParseResult> {
  // Check if BPMN_TEST_DIR environment variable is set
  const localTestDir = process.env.BPMN_TEST_DIR;
  
  if (localTestDir) {
    try {
      const filePath = await findBpmnFileInDirectory(fileName, localTestDir);
      if (filePath) {
        const xml = await readFile(filePath, 'utf-8');
        // Use actual production code: parseBpmnFileContent
        return await parseBpmnFileContent(xml, fileName);
      }
    } catch (error) {
      console.warn(`Failed to load ${fileName} from BPMN_TEST_DIR (${localTestDir}), falling back to fixtures:`, error);
      // Fall through to fixtures
    }
  }
  
  // Fall back to fixtures
  return loadAndParseBpmnFromFixtures(fileName, fixtureDirs);
}

/**
 * Load and parse multiple BPMN files from local directory (if BPMN_TEST_DIR is set) or fixtures
 * Returns a Map of fileName -> BpmnParseResult
 * 
 * Usage:
 *   BPMN_TEST_DIR=/path/to/bpmn/files npm test -- validate-feature-goals-generation.test.ts
 */
export async function loadAndParseMultipleBpmnFiles(
  fileNames: string[],
  fixtureDirs: string[] = []
): Promise<Map<string, BpmnParseResult>> {
  const results = new Map<string, BpmnParseResult>();
  const localTestDir = process.env.BPMN_TEST_DIR;
  
  if (localTestDir) {
    console.log(`📁 Using BPMN_TEST_DIR: ${localTestDir}`);
  }
  
  for (const fileName of fileNames) {
    try {
      const result = await loadAndParseBpmnFromLocalDirOrFixtures(fileName, fixtureDirs);
      results.set(fileName, result);
    } catch (error) {
      console.error(`Failed to load ${fileName}:`, error);
      // Continue with other files
    }
  }
  
  return results;
}
