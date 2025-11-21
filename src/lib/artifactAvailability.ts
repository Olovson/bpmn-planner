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
) => {
  if (confluenceUrl) return true;
  if (!docStoragePath) return false;
  return storageExists(docStoragePath);
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

