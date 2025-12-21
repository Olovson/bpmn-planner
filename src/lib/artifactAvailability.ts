import { storageFileExists } from './artifactUrls';

type StorageExistsFn = (path: string) => Promise<boolean>;
type UrlExistsFn = (url: string) => Promise<boolean>;

const isSupabaseStorageUrl = (url: string) =>
  url.includes('/storage/v1/object/public/');

/**
 * Extract storage path from Supabase Storage public URL
 * Example: http://127.0.0.1:54321/storage/v1/object/public/bpmn-files/docs/test.html
 * Returns: docs/test.html
 */
const extractStoragePathFromUrl = (url: string): string | null => {
  try {
    // Match pattern: /storage/v1/object/public/bpmn-files/<path>
    const match = url.match(/\/storage\/v1\/object\/public\/bpmn-files\/(.+?)(?:\?|$)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    return null;
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
    for (let i = 0; i < additionalPaths.length; i++) {
      const path = additionalPaths[i];
      const exists = await storageExists(path);
      if (exists) {
        if (import.meta.env.DEV) {
          console.debug(`[checkDocsAvailable] ✓ Found documentation at: ${path}`);
        }
        return true;
      }
      // Don't log every missing path - only log when found or if all paths fail
    }
    
    // Only log warning if we checked multiple paths and none were found
    if (import.meta.env.DEV && additionalPaths.length > 1) {
      console.debug(`[checkDocsAvailable] No documentation found in ${additionalPaths.length} paths`);
    }
  }
  
  return false;
};

export const checkTestReportAvailable = async (
  testReportUrl?: string | null,
  storageExists: StorageExistsFn = storageFileExists,
) => {
  if (!testReportUrl) return false;
  
  // For Supabase Storage URLs, extract path and use list() method instead of HEAD requests
  // This avoids v1 API endpoints and 400 errors
  if (isSupabaseStorageUrl(testReportUrl)) {
    const storagePath = extractStoragePathFromUrl(testReportUrl);
    if (storagePath) {
      return await storageExists(storagePath);
    }
    // If we can't extract path, fall back to assuming it exists (for external URLs)
    return true;
  }
  
  // For non-Supabase URLs, assume they exist (external test reports)
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

