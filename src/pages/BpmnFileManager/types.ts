/**
 * Types and interfaces for BpmnFileManager
 */

export type GenerationScope = 'file' | 'node';

export interface DetailedGenerationResult {
  fileName: string;
  filesAnalyzed: string[];
  dorDodCriteria: Array<{ subprocess: string; category: string; type: string; text: string }>;
  docFiles: string[];
  jiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }>;
  subprocessMappings: Array<{ callActivity: string; subprocessFile: string }>;
  nodeArtifacts?: Array<{ bpmnFile: string; elementId: string; elementName: string; docFileName?: string; testFileName?: string }>;
  missingDependencies?: { parent: string; childProcess: string }[];
  skippedSubprocesses?: string[];
}

export interface AggregatedGenerationResult {
  totalFiles: number;
  allFilesAnalyzed: Set<string>;
  allDorDodCriteria: Array<{ subprocess: string; category: string; type: string; text: string }>;
  allDocFiles: string[];
  allJiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }>;
  allSubprocessMappings: Array<{ callActivity: string; subprocessFile: string }>;
  allNodeArtifacts: Array<{ bpmnFile: string; elementId: string; elementName: string; docFileName?: string; testFileName?: string }>;
  allMissingDependencies: { parent: string; childProcess: string }[];
  allSkippedSubprocesses: Set<string>;
  fileResults: Array<{ fileName: string; success: boolean; error?: string }>;
}

export interface HierarchyBuildResult {
  fileName: string;
  filesAnalyzed: string[];
  totalNodes: number;
  totalFiles: number;
  hierarchyDepth: number;
  missingDependencies: { parent: string; childProcess: string }[];
}

export type ArtifactStatus = 'missing' | 'complete' | 'partial' | 'error';

export interface ArtifactSnapshot {
  status: ArtifactStatus;
  mode: 'slow' | null;
  generatedAt: string | null;
  jobId: string | null;
  outdated: boolean;
  durationMs?: number;
}

export interface FileArtifactStatusSummary {
  fileName: string;
  doc: ArtifactSnapshot;
  test: ArtifactSnapshot;
  hierarchy: ArtifactSnapshot;
  latestJob: {
    jobId: string;
    mode: 'slow' | null;
    status: string;
    finishedAt: string | null;
    startedAt: string | null;
  } | null;
}











