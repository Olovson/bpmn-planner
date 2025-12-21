import { storageFileExists } from './artifactUrls';

type StorageExistsFn = (path: string) => Promise<boolean>;
type UrlExistsFn = (url: string) => Promise<boolean>;

const isSupabaseStorageUrl = (url: string) =>
  url.includes('/storage/v1/object/public/');

const defaultUrlExists: UrlExistsFn = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('[artifactAvailability] HEAD check failed', url, error);
    return false;
  }
};

export const checkDocsAvailable = async (
  confluenceUrl?: string | null,
  docStoragePath?: string | null,
  storageExists: StorageExistsFn = storageFileExists,
  additionalPaths?: string[], // ✅ Ny parameter för flera sökvägar (t.ex. Feature Goals)
) => {
  if (confluenceUrl) return true;
  
  // Kolla huvud-sökvägen
  if (docStoragePath) {
    const exists = await storageExists(docStoragePath);
    if (import.meta.env.DEV && additionalPaths && additionalPaths.length > 0) {
      console.debug(`[checkDocsAvailable] Main path ${docStoragePath}: ${exists ? '✓' : '✗'}`);
    }
    if (exists) return true;
  }
  
  // Kolla ytterligare sökvägar (för call activities/Feature Goals)
  if (additionalPaths && additionalPaths.length > 0) {
    if (import.meta.env.DEV) {
      console.debug(`[checkDocsAvailable] Checking ${additionalPaths.length} additional paths...`);
    }
    for (let i = 0; i < additionalPaths.length; i++) {
      const path = additionalPaths[i];
      const exists = await storageExists(path);
      if (import.meta.env.DEV) {
        console.debug(`[checkDocsAvailable] Path ${i + 1}/${additionalPaths.length}: ${exists ? '✓ FOUND' : '✗'} ${path}`);
      }
      if (exists) {
        if (import.meta.env.DEV) {
          console.log(`[checkDocsAvailable] ✓ Found documentation at: ${path}`);
        }
        return true;
      }
    }
  }
  
  if (import.meta.env.DEV && additionalPaths && additionalPaths.length > 0) {
    console.warn(`[checkDocsAvailable] ✗ No documentation found in ${additionalPaths.length} paths`);
  }
  
  return false;
};

export const checkTestReportAvailable = async (
  testReportUrl?: string | null,
  urlExists: UrlExistsFn = defaultUrlExists,
) => {
  if (!testReportUrl) return false;
  // Only run a HEAD request for Supabase hosted URLs to keep things lightweight
  if (isSupabaseStorageUrl(testReportUrl)) {
    return urlExists(testReportUrl);
  }
  return true;
};

export const checkDorDodAvailable = (
  rows: Array<{ bpmn_element_id?: string | null; subprocess_name?: string | null }> | null | undefined,
  elementId?: string | null,
  elementName?: string | null,
) => {
  if (!rows?.length || (!elementId && !elementName)) return false;
  return rows.some(
    (row) =>
      (elementId && row.bpmn_element_id === elementId) ||
      (elementName && row.subprocess_name === elementName),
  );
};

