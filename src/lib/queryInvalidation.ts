import { QueryClient } from '@tanstack/react-query';

/**
 * Helper function to invalidate all structure-related queries
 * Use this whenever BPMN files, dependencies, or structure changes
 */
export const invalidateStructureQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['process-tree'] });
  queryClient.invalidateQueries({ queryKey: ['bpmn-files'] });
  queryClient.invalidateQueries({ queryKey: ['dynamic-bpmn-files'] });
  queryClient.invalidateQueries({ queryKey: ['all-bpmn-elements'] });
  queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] });
};

/**
 * Helper function to invalidate artifact-related queries
 * Use this when tests or documentation change
 */
export const invalidateArtifactQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['node-test-links'] });
  queryClient.invalidateQueries({ queryKey: ['test-results'] });
  queryClient.invalidateQueries({ queryKey: ['file-artifact-status'] });
  queryClient.invalidateQueries({ queryKey: ['all-subprocesses'] });
  // Invalidate coverage queries (single-file and all-files)
  queryClient.invalidateQueries({ queryKey: ['file-artifact-coverage'] });
  queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] });
};

/**
 * Helper function to invalidate all queries related to BPMN structure and artifacts
 * Use this after major operations like reset, regenerate, or batch updates
 */
export const invalidateAllBpmnQueries = (queryClient: QueryClient) => {
  invalidateStructureQueries(queryClient);
  invalidateArtifactQueries(queryClient);
};
