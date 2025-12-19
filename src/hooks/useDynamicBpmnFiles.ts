import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVersionByHash } from '@/lib/bpmnVersioning';

export interface DynamicBpmnFile {
  file_name: string;
  file_type: 'bpmn' | 'dmn';
  storage_path: string;
}

const buildStorageUrl = (path: string) => {
  const { data } = supabase.storage.from('bpmn-files').getPublicUrl(path);
  return data?.publicUrl || '';
};

const fetchFileRecord = async (fileName: string, fileType: 'bpmn' | 'dmn') => {
  const { data } = await supabase
    .from('bpmn_files')
    .select('storage_path')
    .eq('file_name', fileName)
    .eq('file_type', fileType)
    .maybeSingle();

  return data?.storage_path ? buildStorageUrl(data.storage_path) : null;
};

/**
 * Hook to fetch all BPMN/DMN files from the database
 * Returns file names in the format needed by other hooks
 */
export const useDynamicBpmnFiles = () => {
  return useQuery({
    queryKey: ['dynamic-bpmn-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bpmn_files')
        .select('file_name, file_type, storage_path')
        .eq('file_type', 'bpmn')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(f => f.file_name);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * Get BPMN XML content from a specific version (by hash)
 * Returns the XML content directly, not a URL
 */
export const getBpmnXmlFromVersion = async (fileName: string, versionHash: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('bpmn_file_versions')
    .select('content')
    .eq('file_name', fileName)
    .eq('content_hash', versionHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.content;
};

/**
 * Get the full storage URL for a BPMN file
 * This is async to check if file exists in storage before returning URL
 * If versionHash is provided, returns a data URL with the versioned content
 */
export const getBpmnFileUrl = async (fileName: string, versionHash?: string | null): Promise<string> => {
  // If a specific version is requested, return XML content as data URL
  if (versionHash) {
    const xml = await getBpmnXmlFromVersion(fileName, versionHash);
    if (xml) {
      return `data:text/xml;base64,${btoa(xml)}`;
    }
    // Fall through to current version if specific version not found
  }

  const storageUrl = await fetchFileRecord(fileName, 'bpmn');
  if (storageUrl) return storageUrl;

  // Fall back to direct storage path (same as uploaded file name)
  const directStorageUrl = buildStorageUrl(fileName);
  if (directStorageUrl) return directStorageUrl;

  // Fallback to public folder (for files not yet migrated to storage)
  return `/bpmn/${fileName}`;
};

export const useDynamicDmnFiles = () => {
  return useQuery({
    queryKey: ['dynamic-dmn-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bpmn_files')
        .select('file_name')
        .eq('file_type', 'dmn')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(f => f.file_name);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const getDmnFileUrl = async (fileName: string): Promise<string> => {
  const storageUrl = await fetchFileRecord(fileName, 'dmn');
  if (storageUrl) return storageUrl;
  return `/dmn/${fileName}`;
};
