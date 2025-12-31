import type { CriterionCategory, CriterionType } from '@/hooks/useDorDodStatus';
import type { ProcessTreeNode } from '@/lib/processTree';
import type { TestScenario } from '@/data/testMapping';
import type { BpmnElement, BpmnSubprocess } from '@/lib/bpmnParser';
import type { LlmProvider } from '../llmClientAbstraction';

/**
 * Progress reporting phases for generation
 */
export type GenerationPhaseKey =
  | 'graph:start'
  | 'graph:complete'
  | 'hier-tests:start'
  | 'hier-tests:file'
  | 'hier-tests:complete'
  | 'node-analysis:start'
  | 'node-analysis:node'
  | 'node-analysis:complete'
  | 'docgen:start'
  | 'docgen:file'
  | 'docgen:complete'
  | 'total:init';

/**
 * Node for hierarchical test structure
 */
export interface HierarchicalTestNode {
  name: string;
  type: string;
  id: string;
  parentPath?: string[];
  children?: HierarchicalTestNode[];
}

// Re-export for backward compatibility
export type { HierarchicalTestNode };

/**
 * DoR/DoD Criterion interface
 */
export interface DorDodCriterion {
  criterion_type: CriterionType;
  criterion_category: CriterionCategory;
  criterion_key: string;
  criterion_text: string;
}

/**
 * Generated Criterion with metadata
 */
export interface GeneratedCriterion {
  criterion_type: CriterionType;
  criterion_category: CriterionCategory;
  criterion_key: string;
  criterion_text: string;
  node_type?: string; // BPMN node type (UserTask, ServiceTask, etc.)
  bpmn_element_id?: string; // BPMN element ID
  bpmn_file?: string; // BPMN file name
}

/**
 * Subprocess summary information
 */
export interface SubprocessSummary {
  fileName: string;
  totalNodes: number;
  userTasks: number;
  serviceTasks: number;
  businessRuleTasks: number;
  gateways: number;
  keyNodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

/**
 * Node artifact entry
 */
export interface NodeArtifactEntry {
  bpmnFile: string;
  elementId: string;
  elementName: string;
  docFileName?: string;
  testFileName?: string;
}

/**
 * Generation result containing all generated artifacts
 */
export interface GenerationResult {
  tests: Map<string, string>;
  docs: Map<string, string>;
  dorDod: Map<string, DorDodCriterion[]>;
  subprocessMappings: Map<string, string | null>;
  nodeArtifacts?: NodeArtifactEntry[];
  metadata?: {
    hierarchyUsed: boolean;
    totalFilesAnalyzed?: number;
    filesIncluded?: string[];
    hierarchyDepth?: number;
    missingDependencies?: { parent: string; childProcess: string }[];
    skippedSubprocesses?: string[];
    llmFallbackUsed?: boolean;
    llmFinalProvider?: LlmProvider;
  };
}

/**
 * Progress reporter callback
 */
export type ProgressReporter = (
  phase: GenerationPhaseKey,
  label: string,
  detail?: string
) => void | Promise<void>;

/**
 * Planned scenario provider type
 */
export type PlannedScenarioProvider = 'claude' | 'chatgpt' | 'ollama';

/**
 * Map of planned scenarios by node and provider
 */
export type PlannedScenarioMap = Map<string, Map<PlannedScenarioProvider, TestScenario[]>>;

