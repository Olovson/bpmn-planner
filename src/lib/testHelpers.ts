/**
 * Test helpers - Exponera produktionsfunktioner via window för Playwright-tester
 * 
 * VIKTIGT: Detta exponeras endast för att underlätta E2E-testning.
 * Testerna ska använda faktisk produktionskod, inte duplicerad logik.
 */

import { getCurrentVersionHash } from './bpmnVersioning';
import { getFeatureGoalDocFileKey } from './nodeArtifactPaths';
import { buildDocStoragePaths } from './artifactPaths';
import { storageFileExists } from './artifactUrls';

// Exponera funktioner via window för Playwright-tester
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__TEST_HELPERS__ = {
    getCurrentVersionHash,
    getFeatureGoalDocFileKey,
    buildDocStoragePaths,
    storageFileExists,
  };
}

