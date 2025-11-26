import { useQuery } from '@tanstack/react-query';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { supabase } from '@/integrations/supabase/client';
import { useBpmnFiles } from './useBpmnFiles';
import { getBpmnFileUrl } from './useDynamicBpmnFiles';
import { sanitizeElementId } from '@/lib/nodeArtifactPaths';

export type CoverageStatus = 'none' | 'partial' | 'full' | 'noApplicableNodes';

export interface ArtifactCoverage {
  status: CoverageStatus;
  total: number;
  covered: number;
}
export interface FileArtifactCoverage {
  bpmn_file: string;
  total_nodes: number;
  docs: ArtifactCoverage;
  tests: ArtifactCoverage;
  dorDod: ArtifactCoverage;
  hierarchy: ArtifactCoverage;
}

const getCoverageStatus = (covered: number, total: number): CoverageStatus => {
  if (total === 0) return 'noApplicableNodes';
  if (covered === 0) return 'none';
  if (covered === total) return 'full';
  return 'partial';
};

const isRelevantNodeType = (type: string) => {
  // Accept both 'UserTask' and 'bpmn:UserTask' style types
  return /(?:^|:)(UserTask|ServiceTask|BusinessRuleTask|CallActivity)$/.test(type);
};

export const getHierarchicalTestFileName = (fileName: string) =>
  fileName.replace('.bpmn', '.hierarchical.spec.ts');

export const hasHierarchicalTestsForFile = async (fileName: string): Promise<boolean> => {
  const hierarchicalFileName = getHierarchicalTestFileName(fileName);
  try {
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .list('tests', {
        search: hierarchicalFileName,
        limit: 1,
      });

    if (error) {
      console.error(`[Coverage Debug] Error listing hierarchical tests for ${fileName}:`, error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error(`[Coverage Debug] Error checking hierarchical tests for ${fileName}:`, error);
    return false;
  }
};

export const useFileArtifactCoverage = (fileName: string) => {

  return useQuery({
    queryKey: ['file-artifact-coverage', fileName],
    queryFn: async (): Promise<FileArtifactCoverage> => {
      // Parse BPMN file to get all nodes (from Supabase Storage or fallback)
      const fileUrl = await getBpmnFileUrl(fileName);
      const parseResult = await parseBpmnFile(fileUrl);
      
      // Filter relevant node types for coverage calculation
      const relevantNodes = parseResult.elements.filter(
        el => isRelevantNodeType(el.type)
      );

      const total_nodes = relevantNodes.length;

      if (import.meta.env.DEV) {
        console.log(`[Coverage Debug] ${fileName}:`, {
          total_nodes,
          relevant_node_ids: relevantNodes.map(n => n.id),
        });
      }

      // Get DoR/DoD coverage from database
      const { data: dorDodData } = await supabase
        .from('dor_dod_status')
        .select('bpmn_element_id, subprocess_name')
        .eq('bpmn_file', fileName);

      // Count unique nodes with DoR/DoD
      const uniqueDoRDoDNodes = new Set(dorDodData?.map(d => d.bpmn_element_id).filter(Boolean));
      const dorDod_covered = uniqueDoRDoDNodes.size;

      // Check test coverage from node_test_links
      const { data: testLinksData } = await supabase
        .from('node_test_links')
        .select('bpmn_element_id')
        .eq('bpmn_file', fileName);

      const uniqueTestNodes = new Set(testLinksData?.map(t => t.bpmn_element_id).filter(Boolean));
      const tests_covered = uniqueTestNodes.size;

      if (import.meta.env.DEV) {
        console.log(`[Coverage Debug] ${fileName} - Tests:`, {
          test_links_found: testLinksData?.length || 0,
          unique_test_nodes: Array.from(uniqueTestNodes),
          tests_covered,
          coverage_status: getCoverageStatus(tests_covered, total_nodes),
        });
      }

      const hasHierarchyTests = await hasHierarchicalTestsForFile(fileName);
      const hierarchyCovered = hasHierarchyTests ? 1 : 0;

      // Docs: one HTML per BPMN file. Consider all nodes covered if file doc exists.
      let docs_covered = 0;
      try {
        const docFolder = `docs/nodes/${fileName.replace('.bpmn', '')}`;
        const { data: docEntries } = await supabase.storage
          .from('bpmn-files')
          .list(docFolder, { limit: 1000 });
        const docNames = new Set(docEntries?.map(entry => entry.name));
        for (const node of relevantNodes) {
          const safeId = sanitizeElementId(node.id);
          if (docNames.has(`${safeId}.html`)) {
            docs_covered++;
          }
        }
      } catch (error) {
        console.error(`[Coverage Debug] Error checking docs for ${fileName}:`, error);
      }

      return {
        bpmn_file: fileName,
        total_nodes,
        docs: {
          status: getCoverageStatus(docs_covered, total_nodes),
          total: total_nodes,
          covered: docs_covered,
        },
        tests: {
          status: getCoverageStatus(tests_covered, total_nodes),
          total: total_nodes,
          covered: tests_covered,
        },
        dorDod: {
          status: getCoverageStatus(dorDod_covered, total_nodes),
          total: total_nodes,
          covered: dorDod_covered,
        },
        hierarchy: {
          status: getCoverageStatus(hierarchyCovered, 1),
          total: 1,
          covered: hierarchyCovered,
        },
      };
    },
    enabled: !!fileName && fileName.endsWith('.bpmn'),
  });
};

export const useAllFilesArtifactCoverage = () => {
  const { data: files = [] } = useBpmnFiles();
  const bpmnFiles = files.filter(f => f.file_type === 'bpmn');

  return useQuery({
    queryKey: ['all-files-artifact-coverage', bpmnFiles.map(f => f.file_name).join(',')],
    queryFn: async (): Promise<Map<string, FileArtifactCoverage>> => {
      const coverageMap = new Map<string, FileArtifactCoverage>();

      // Get all DoR/DoD data in one query
      const { data: allDorDodData } = await supabase
        .from('dor_dod_status')
        .select('bpmn_file, bpmn_element_id, subprocess_name');

      // Get all test link data
      const { data: allTestLinksData } = await supabase
        .from('node_test_links')
        .select('bpmn_file, bpmn_element_id');

      for (const file of bpmnFiles) {
        try {
          // Parse BPMN file to get all nodes (from Supabase Storage or fallback)
          const fileUrl = await getBpmnFileUrl(file.file_name);
          const parseResult = await parseBpmnFile(fileUrl);
          
          // Filter relevant node types
          const relevantNodes = parseResult.elements.filter(
            el => isRelevantNodeType(el.type)
          );

          const total_nodes = relevantNodes.length;

          // Count DoR/DoD coverage
          const fileDoRDoD = allDorDodData?.filter(d => d.bpmn_file === file.file_name) || [];
          const uniqueDoRDoDNodes = new Set(fileDoRDoD.map(d => d.bpmn_element_id).filter(Boolean));
          const dorDod_covered = uniqueDoRDoDNodes.size;

          // Check test coverage
          const fileTestLinks = allTestLinksData?.filter(t => t.bpmn_file === file.file_name) || [];
          const uniqueTestNodes = new Set(fileTestLinks.map(t => t.bpmn_element_id).filter(Boolean));
          const tests_covered = uniqueTestNodes.size;

          // Debug logging only for specific files or when explicitly needed
          // Removed verbose logging to reduce console noise

          let docs_covered = 0;
          try {
            const docFolder = `docs/nodes/${file.file_name.replace('.bpmn', '')}`;
            const { data: docEntries } = await supabase.storage
              .from('bpmn-files')
              .list(docFolder, { limit: 1000 });
            const docNames = new Set(docEntries?.map(entry => entry.name));
            for (const node of relevantNodes) {
              const safeId = sanitizeElementId(node.id);
              if (docNames.has(`${safeId}.html`)) {
                docs_covered++;
              }
            }
          } catch (error) {
            console.error(`[Coverage Debug] Error checking docs for ${file.file_name}:`, error);
          }

          // Debug logging only for specific files or when explicitly needed
          // Removed verbose logging to reduce console noise

          const hasHierarchyTests = await hasHierarchicalTestsForFile(file.file_name);
          const hierarchyCovered = hasHierarchyTests ? 1 : 0;

          coverageMap.set(file.file_name, {
            bpmn_file: file.file_name,
            total_nodes,
            docs: {
              status: getCoverageStatus(docs_covered, total_nodes),
              total: total_nodes,
              covered: docs_covered,
            },
            tests: {
              status: getCoverageStatus(tests_covered, total_nodes),
              total: total_nodes,
              covered: tests_covered,
            },
            dorDod: {
              status: getCoverageStatus(dorDod_covered, total_nodes),
              total: total_nodes,
              covered: dorDod_covered,
            },
            hierarchy: {
              status: getCoverageStatus(hierarchyCovered, 1),
              total: 1,
              covered: hierarchyCovered,
            },
          });
        } catch (error) {
          console.error(`Error parsing ${file.file_name}:`, error);
        }
      }

      return coverageMap;
    },
    enabled: bpmnFiles.length > 0,
  });
};
