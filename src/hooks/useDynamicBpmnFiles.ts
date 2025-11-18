import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DynamicBpmnFile {
  file_name: string;
  file_type: 'bpmn' | 'dmn';
  storage_path: string;
}

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

      // If no files in DB, fallback to default files
      if (!data || data.length === 0) {
        return [
          'mortgage.bpmn',
          'mortgage-se-application.bpmn',
          'mortgage-se-credit-evaluation.bpmn',
          'mortgage-se-household.bpmn',
          'mortgage-se-internal-data-gathering.bpmn',
          'mortgage-se-object-information.bpmn',
          'mortgage-se-object.bpmn',
          'mortgage-se-stakeholder.bpmn',
        ];
      }

      return data.map(f => f.file_name);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * Get the full storage URL for a BPMN file
 * This is async to check if file exists in storage before returning URL
 */
export const getBpmnFileUrl = async (fileName: string): Promise<string> => {
  // Check if file exists in database (means it's in storage)
  const { data: fileRecord } = await supabase
    .from('bpmn_files')
    .select('storage_path')
    .eq('file_name', fileName)
    .maybeSingle();

  if (fileRecord) {
    // File exists in storage, return storage URL
    const { data } = supabase.storage
      .from('bpmn-files')
      .getPublicUrl(fileRecord.storage_path);
    
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Fallback to public folder (for files not yet migrated to storage)
  return `/bpmn/${fileName}`;
};
