// Re-exports for backward compatibility
// All exports from bpmnGenerators.ts are now available through this barrel export

// For now, we export everything from the original file to maintain backward compatibility
// As we complete the refactoring, we'll gradually move exports to the new modules

// Re-export everything from the original bpmnGenerators.ts file
export * from '../bpmnGenerators';

// Also export from new modules for direct access
export type {
  GenerationPhaseKey,
  HierarchicalTestNode,
  SubprocessSummary,
  NodeArtifactEntry,
  GenerationResult,
  ProgressReporter,
  PlannedScenarioProvider,
} from './types';

export {
  generateNodeTests,
  generateExportReadyTestFromUserStory,
  generateTestSkeleton,
  generateHierarchicalTestFileFromTree,
  generateDocumentationFromTree,
} from './testGenerators';

export {
  generateDocumentationHTML,
  parseSubprocessFile,
  parseDmnSummary,
  type SubprocessSummary as SubprocessSummaryType,
} from './documentationGenerator';

export {
  renderDocWithLlm,
  extractDocInfoFromJson,
  loadChildDocFromStorage,
  insertGenerationMeta,
} from './docRendering';

export {
  buildScenariosFromEpicUserStories,
  buildScenariosFromDocJson,
  buildTestSkeletonScenariosFromDocJson,
  mapProviderToScenarioProvider,
  mapTestScenarioToSkeleton,
  FALLBACK_PROVIDER_ORDER,
  type PlannedScenarioMap,
} from './batchHelpers';

