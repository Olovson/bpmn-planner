import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';
import { getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
// Removed testMapping import - no longer using fallback logic

export interface FileArtifactStatus {
  file_name: string;
  has_dor_dod: boolean;
  has_tests: boolean;
  has_docs: boolean;
  dor_dod_count: number;
  test_count: number;
  doc_count: number;
}

export const useFileArtifactStatus = (fileName?: string) => {
  return useQuery({
    queryKey: ['file-artifact-status', fileName],
    queryFn: async (): Promise<FileArtifactStatus | null> => {
      if (!fileName) return null;

      const [dorDodResult, testResult] = await Promise.all([
        supabase
          .from('dor_dod_status')
          .select('id')
          .eq('bpmn_file', fileName),
        supabase
          .from('test_results')
          .select('id, test_count')
          .eq('test_file', fileName.replace('.bpmn', '.spec.ts')),
      ]);

      const dorDodCount = dorDodResult.data?.length || 0;
      const testCount = testResult.data?.reduce((sum, t) => sum + (t.test_count || 0), 0) || 0;

      // Check if doc exists in Supabase Storage (node-level documentation)
      // Documentation is stored at node level: docs/{provider}/{fileName}/{versionHash}/nodes/{fileBaseName}/*.html
      let hasDoc = false;
      try {
        const versionHash = await getCurrentVersionHash(fileName);
        const fileBaseName = fileName.replace('.bpmn', '');
        
        // Try multiple paths: versioned paths with hash, then legacy paths
        // Check for any files in the nodes/{fileBaseName}/ directory
        const pathsToTry = versionHash
          ? [
              `docs/slow/chatgpt/${fileName}/${versionHash}/nodes/${fileBaseName}`,
              `docs/slow/ollama/${fileName}/${versionHash}/nodes/${fileBaseName}`,
              `docs/local/${fileName}/${versionHash}/nodes/${fileBaseName}`,
              `docs/nodes/${fileBaseName}`, // Legacy
            ]
          : [
              `docs/nodes/${fileBaseName}`, // Legacy
            ];
        
        // Check if any files exist in the nodes directory
        for (const path of pathsToTry) {
          const { data, error } = await supabase.storage
            .from('bpmn-files')
            .list(path, {
              limit: 1,
            });
          
          if (!error && data && data.length > 0) {
            hasDoc = true;
            break;
          }
        }
      } catch (error) {
        console.warn(`[useFileArtifactStatus] Error checking docs for ${fileName}:`, error);
        hasDoc = false;
      }

      return {
        file_name: fileName,
        has_dor_dod: dorDodCount > 0,
        has_tests: testCount > 0,
        has_docs: hasDoc,
        dor_dod_count: dorDodCount,
        test_count: testCount,
        doc_count: hasDoc ? 1 : 0,
      };
    },
    enabled: !!fileName,
  });
};

export const useAllFilesArtifactStatus = () => {
  return useQuery({
    queryKey: ['all-files-artifact-status'],
    queryFn: async (): Promise<Map<string, FileArtifactStatus>> => {
      const [dorDodResult, testResult, filesResult] = await Promise.all([
        supabase
          .from('dor_dod_status')
          .select('bpmn_file'),
        supabase
          .from('test_results')
          .select('test_file, test_count'),
        supabase
          .from('bpmn_files')
          .select('file_name, file_type')
          .eq('file_type', 'bpmn'),
      ]);

      const statusMap = new Map<string, FileArtifactStatus>();

      // Count DoR/DoD per file
      const dorDodCounts = new Map<string, number>();
      dorDodResult.data?.forEach(row => {
        if (row.bpmn_file) {
          dorDodCounts.set(row.bpmn_file, (dorDodCounts.get(row.bpmn_file) || 0) + 1);
        }
      });

      // Count tests per file - only use database, no fallback
      // This makes it clear when tests are missing and need to be generated
      const testCounts = new Map<string, number>();
      testResult.data?.forEach(row => {
        const bpmnFile = row.test_file.replace('.spec.ts', '.bpmn');
        testCounts.set(bpmnFile, (testCounts.get(bpmnFile) || 0) + (row.test_count || 0));
      });

      // Check docs for each BPMN file in Supabase Storage (node-level documentation)
      // Documentation is stored at node level: docs/{provider}/{fileName}/{versionHash}/nodes/{fileBaseName}/*.html
      const docChecks = await Promise.all(
        (filesResult.data || []).map(async (file) => {
          let hasDoc = false;
          try {
            const versionHash = await getCurrentVersionHash(file.file_name);
            const fileBaseName = file.file_name.replace('.bpmn', '');
            
            // Try multiple paths: versioned paths with hash, then legacy paths
            // Check for any files in the nodes/{fileBaseName}/ directory
            const pathsToTry = versionHash
              ? [
                  `docs/slow/chatgpt/${file.file_name}/${versionHash}/nodes/${fileBaseName}`,
                  `docs/slow/ollama/${file.file_name}/${versionHash}/nodes/${fileBaseName}`,
                  `docs/local/${file.file_name}/${versionHash}/nodes/${fileBaseName}`,
                  `docs/nodes/${fileBaseName}`, // Legacy
                ]
              : [
                  `docs/nodes/${fileBaseName}`, // Legacy
                ];
            
            // Check if any files exist in the nodes directory
            for (const path of pathsToTry) {
              const { data, error } = await supabase.storage
                .from('bpmn-files')
                .list(path, {
                  limit: 1,
                });
              
              if (!error && data && data.length > 0) {
                hasDoc = true;
                break;
              }
            }
          } catch (error) {
            console.warn(`[useAllFilesArtifactStatus] Error checking docs for ${file.file_name}:`, error);
            hasDoc = false;
          }
          
          return { fileName: file.file_name, hasDoc };
        })
      );

      const docsMap = new Map<string, boolean>();
      docChecks.forEach(({ fileName, hasDoc }) => {
        docsMap.set(fileName, hasDoc);
      });

      // Combine results
      const allFiles = new Set([
        ...dorDodCounts.keys(),
        ...testCounts.keys(),
        ...(filesResult.data || []).map(f => f.file_name),
      ]);
      
      allFiles.forEach(fileName => {
        const dorDodCount = dorDodCounts.get(fileName) || 0;
        const testCount = testCounts.get(fileName) || 0;
        const hasDoc = docsMap.get(fileName) || false;
        
        statusMap.set(fileName, {
          file_name: fileName,
          has_dor_dod: dorDodCount > 0,
          has_tests: testCount > 0,
          has_docs: hasDoc,
          dor_dod_count: dorDodCount,
          test_count: testCount,
          doc_count: hasDoc ? 1 : 0,
        });
      });

      return statusMap;
    },
  });
};
