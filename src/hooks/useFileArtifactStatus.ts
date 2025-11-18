import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { testMapping } from '@/data/testMapping';

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

      // Check if doc exists (static HTML file)
      const elementId = fileName.replace('.bpmn', '').replace('mortgage-se-', '');
      const docPath = `${import.meta.env.BASE_URL || '/'}docs/${elementId}.html`;
      let hasDoc = false;
      try {
        const response = await fetch(docPath, { method: 'HEAD' });
        hasDoc = response.ok;
      } catch {
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

      // Count tests per file - use database or fallback to testMapping
      const testCounts = new Map<string, number>();
      testResult.data?.forEach(row => {
        const bpmnFile = row.test_file.replace('.spec.ts', '.bpmn');
        testCounts.set(bpmnFile, (testCounts.get(bpmnFile) || 0) + (row.test_count || 0));
      });

      // Fallback to testMapping if database is empty
      if (testCounts.size === 0) {
        Object.entries(testMapping).forEach(([nodeId, testInfo]) => {
          // Try to match nodeId to BPMN file name
          const possibleFiles = [
            `${nodeId}.bpmn`,
            `mortgage-se-${nodeId}.bpmn`,
          ];
          
          possibleFiles.forEach(fileName => {
            if ((filesResult.data || []).some(f => f.file_name === fileName)) {
              testCounts.set(fileName, testInfo.testCount);
            }
          });
        });
      }

      // Check docs for each BPMN file
      const docChecks = await Promise.all(
        (filesResult.data || []).map(async (file) => {
          const elementId = file.file_name.replace('.bpmn', '').replace('mortgage-se-', '');
          const docPath = `${import.meta.env.BASE_URL || '/'}docs/${elementId}.html`;
          try {
            const response = await fetch(docPath, { method: 'HEAD' });
            return { fileName: file.file_name, hasDoc: response.ok };
          } catch {
            return { fileName: file.file_name, hasDoc: false };
          }
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
