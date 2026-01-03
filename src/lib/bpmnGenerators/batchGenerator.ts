// This file contains the main batch generation functions
// It imports from the refactored modules for better organization

// Import all necessary dependencies
import { BpmnElement, BpmnSubprocess, parseBpmnFile } from '@/lib/bpmnParser';
import { buildNodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { getNodeDocFileKey, getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';
import type { DocumentationDocType, ChildNodeDocumentation } from '@/lib/llmDocumentation';
import type { LlmProvider } from '../llmClientAbstraction';
import { wrapLlmContentAsDocument } from '../wrapLlmContent';
import { storageFileExists } from '@/lib/artifactUrls';
import { buildDocStoragePaths } from '@/lib/artifactPaths';
import {
  buildBpmnProcessGraph,
  createGraphSummary,
  getTestableNodes,
} from '@/lib/bpmnProcessGraph';
import {
  savePlannedScenarios,
  type PlannedScenarioRow,
} from '@/lib/plannedScenariosHelper';
import type { TestScenario } from '@/data/testMapping';

// Import from refactored modules
import type {
  GenerationResult,
  GenerationPhaseKey,
  ProgressReporter,
  NodeArtifactEntry,
  PlannedScenarioProvider,
} from './types';
// DoR/DoD generation has been removed - no longer used
import {
  generateDocumentationHTML,
  parseSubprocessFile,
  parseDmnSummary,
  type SubprocessSummary,
} from './documentationGenerator';
import {
  renderDocWithLlm,
  extractDocInfoFromJson,
  loadChildDocFromStorage,
  insertGenerationMeta,
} from './docRendering';
import {
  mapProviderToScenarioProvider,
  type PlannedScenarioMap,
} from './batchHelpers';

// Re-export the main functions - they will be implemented by copying from the original file
// For now, we'll keep the original implementation and gradually refactor

