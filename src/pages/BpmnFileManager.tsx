import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileCode, Upload, Trash2, Download, CheckCircle2, XCircle, AlertCircle, GitBranch, Loader2, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBpmnFiles, useUploadBpmnFile, useDeleteBpmnFile, BpmnFile } from '@/hooks/useBpmnFiles';
import { useSyncFromGithub, SyncResult } from '@/hooks/useSyncFromGithub';
import { supabase } from '@/integrations/supabase/client';
import { useAllFilesArtifactCoverage } from '@/hooks/useFileArtifactCoverage';
import { pickRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { ArtifactStatusBadge } from '@/components/ArtifactStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { generateAllFromBpmnWithGraph, type GenerationPhaseKey } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';
import { invalidateArtifactQueries, invalidateStructureQueries } from '@/lib/queryInvalidation';
import { useResetAndRegenerate } from '@/hooks/useResetAndRegenerate';
import {
  getLlmGenerationMode,
  getLlmModeConfig,
  setLlmGenerationMode as persistLlmGenerationMode,
  LLM_MODE_OPTIONS,
  type LlmGenerationMode,
} from '@/lib/llmMode';
import type { LlmProvider } from '@/lib/llmClientAbstraction';
import { buildProcessGraph } from '@/lib/bpmn/processGraphBuilder';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/processTreeBuilder';
import { loadAllBpmnParseResults, loadBpmnMap } from '@/lib/bpmn/debugDataLoader';
import type { ProcessGraph } from '@/lib/bpmn/processGraph';
import type { ProcessTreeNode } from '@/lib/bpmn/processTreeTypes';
import { buildJiraName, buildParentPath } from '@/lib/jiraNaming';
import {
  createPlannedScenariosFromTree,
  savePlannedScenarios,
} from '@/lib/plannedScenariosHelper';
import { useGenerationJobs, type GenerationJob, type GenerationOperation, type GenerationStatus } from '@/hooks/useGenerationJobs';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { buildDocStoragePaths, buildTestStoragePaths } from '@/lib/artifactPaths';
import { isPGRST204Error, getSchemaErrorMessage } from '@/lib/schemaVerification';
import { useLlmHealth } from '@/hooks/useLlmHealth';
import bpmnMap from '../../bpmn-map.json';

/**
 * Creates a summary from ProcessGraph and ProcessTree
 */
const createGraphSummaryFromNewGraph = (
  graph: ProcessGraph,
  tree: ProcessTreeNode,
): {
  totalFiles: number;
  totalNodes: number;
  filesIncluded: string[];
  hierarchyDepth: number;
} => {
  const filesIncluded = new Set<string>();
  let totalNodes = 0;

  // Collect files from graph nodes
  for (const node of graph.nodes.values()) {
    filesIncluded.add(node.bpmnFile);
    if (node.type !== 'process') {
      totalNodes++;
    }
  }

  // Calculate hierarchy depth from tree
  const calculateDepth = (node: ProcessTreeNode): number => {
    if (node.children.length === 0) return 1;
    const childDepths = node.children.map((child) => calculateDepth(child));
    return 1 + Math.max(...childDepths, 0);
  };

  return {
    totalFiles: filesIncluded.size,
    totalNodes,
    filesIncluded: Array.from(filesIncluded),
    hierarchyDepth: calculateDepth(tree),
  };
};

const formatFileRootName = (fileName: string) =>
  fileName
    .replace('.bpmn', '')
    .replace(/^mortgage-se-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

const JOB_PHASES = ['graph', 'hierTests', 'dor', 'dependencies', 'mappings'] as const;
type JobPhaseKey = typeof JOB_PHASES[number];
const JOB_PHASE_TOTAL = JOB_PHASES.length;

type GenerationScope = 'file' | 'node';

export default function BpmnFileManager() {
  // TODO: Add a UI test to assert AppHeaderWithTabs renders on /files and stays visible across navigations.
  const { data: files = [], isLoading } = useBpmnFiles();
  
  // Debug logging to verify files are loaded correctly
  useEffect(() => {
    if (files.length > 0) {
      console.log('[BpmnFileManager] Files loaded:', {
        count: files.length,
        fileNames: files.map(f => f.file_name),
      });
    }
  }, [files]);
  const uploadMutation = useUploadBpmnFile();
  const deleteMutation = useDeleteBpmnFile();
  const syncMutation = useSyncFromGithub();
  const { data: coverageMap } = useAllFilesArtifactCoverage();
  const { data: generationJobs = [] } = useGenerationJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: llmHealth, isLoading: llmHealthLoading } = useLlmHealth();
  const [dragActive, setDragActive] = useState(false);
  const [deleteFile, setDeleteFile] = useState<BpmnFile | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncReport, setShowSyncReport] = useState(false);
  const [generatingFile, setGeneratingFile] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<'llm' | 'local' | 'hierarchy' | null>(null);
  
  interface DetailedGenerationResult {
    fileName: string;
    filesAnalyzed: string[];
    dorDodCriteria: Array<{ subprocess: string; category: string; type: string; text: string }>;
    testFiles: Array<{ fileName: string; elements: Array<{ id: string; name: string }> }>;
    docFiles: string[];
    jiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }>;
    subprocessMappings: Array<{ callActivity: string; subprocessFile: string }>;
    nodeArtifacts?: Array<{ bpmnFile: string; elementId: string; elementName: string; docFileName?: string; testFileName?: string }>;
    missingDependencies?: { parent: string; childProcess: string }[];
    skippedSubprocesses?: string[];
  }

  interface AggregatedGenerationResult {
    totalFiles: number;
    allFilesAnalyzed: Set<string>;
    allDorDodCriteria: Array<{ subprocess: string; category: string; type: string; text: string }>;
    allTestFiles: Array<{ fileName: string; elements: Array<{ id: string; name: string }> }>;
    allDocFiles: string[];
    allJiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }>;
    allSubprocessMappings: Array<{ callActivity: string; subprocessFile: string }>;
    allNodeArtifacts: Array<{ bpmnFile: string; elementId: string; elementName: string; docFileName?: string; testFileName?: string }>;
    allMissingDependencies: { parent: string; childProcess: string }[];
    allSkippedSubprocesses: Set<string>;
    fileResults: Array<{ fileName: string; success: boolean; error?: string }>;
  }
  
  interface HierarchyBuildResult {
    fileName: string;
    filesAnalyzed: string[];
    totalNodes: number;
    totalFiles: number;
    hierarchyDepth: number;
    missingDependencies: { parent: string; childProcess: string }[];
  }
  
  const [generationResult, setGenerationResult] = useState<DetailedGenerationResult | null>(null);
  const [showGenerationReport, setShowGenerationReport] = useState(false);
  const [hierarchyResult, setHierarchyResult] = useState<HierarchyBuildResult | null>(null);
  const [showHierarchyReport, setShowHierarchyReport] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  const [overlayDescription, setOverlayDescription] = useState('');
  const [generationProgress, setGenerationProgress] = useState<{ step: string; detail?: string } | null>(null);
  const [graphTotals, setGraphTotals] = useState<{ files: number; nodes: number }>({
    files: 0,
    nodes: 0,
  });
  const [docgenProgress, setDocgenProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [docUploadProgress, setDocUploadProgress] = useState<{ planned: number; completed: number }>({
    planned: 0,
    completed: 0,
  });
  const [testUploadProgress, setTestUploadProgress] = useState<{ planned: number; completed: number }>({
    planned: 0,
    completed: 0,
  });
  const cancelGenerationRef = useRef(false);
  const [cancelGeneration, setCancelGeneration] = useState(false);
  const [llmMode, setLlmMode] = useState<LlmGenerationMode>(() => getLlmGenerationMode());
  const llmModeDetails = getLlmModeConfig(llmMode);
  type GenerationMode = 'local' | LlmGenerationMode; // 'local' | 'slow'
  const [generationMode, setGenerationMode] = useState<GenerationMode>('local');
  const [llmProvider, setLlmProvider] = useState<LlmProvider>(() => {
    // Läs från localStorage om det finns, annars default till 'cloud'
    const stored = localStorage.getItem('llmProvider');
    return (stored === 'local' || stored === 'cloud') ? stored : 'cloud';
  });
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<BpmnFile | null>(null);
  const [rootFileName, setRootFileName] = useState<string | null>(null);
  const [validatingMap, setValidatingMap] = useState(false);
  const [showMapValidationDialog, setShowMapValidationDialog] = useState(false);
  const [mapValidationResult, setMapValidationResult] = useState<any | null>(null);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'timeline') navigate('/timeline');
    else navigate('/files');
  };
  
  const { resetGeneratedData, isResetting } = useResetAndRegenerate();
  
  useEffect(() => {
    persistLlmGenerationMode(llmMode);
  }, [llmMode]);

  useEffect(() => {
    // Spara provider-val i localStorage
    localStorage.setItem('llmProvider', llmProvider);
  }, [llmProvider]);

  // Resolve root BPMN-fil för att kunna markera toppnod i fil-listan och detaljpanelen.
  useEffect(() => {
    let cancelled = false;
    const resolveRootForUi = async () => {
      if (!files.length) {
        if (!cancelled) setRootFileName(null);
        return;
      }
      try {
        const root = await resolveRootBpmnFile();
        if (!cancelled) {
          setRootFileName(root?.file_name ?? null);
        }
      } catch (error) {
        console.error('Failed to resolve root BPMN file for UI:', error);
        if (!cancelled) {
          setRootFileName(null);
        }
      }
    };
    resolveRootForUi();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const refreshGenerationJobs = () => {
    queryClient.invalidateQueries({ queryKey: ['generation-jobs'] });
  };

  type ArtifactStatus = 'missing' | 'complete' | 'partial' | 'error';
  interface ArtifactSnapshot {
    status: ArtifactStatus;
    mode: 'local' | 'slow' | null;
    generatedAt: string | null;
    jobId: string | null;
    outdated: boolean;
    durationMs?: number;
  }
  interface FileArtifactStatusSummary {
    fileName: string;
    doc: ArtifactSnapshot;
    test: ArtifactSnapshot;
    hierarchy: ArtifactSnapshot;
    latestJob: {
      jobId: string;
      mode: 'local' | 'slow' | null;
      status: GenerationStatus;
      finishedAt: string | null;
      startedAt: string | null;
    } | null;
  }

  const artifactStatusByFile = useMemo(() => {
    const map = new Map<string, FileArtifactStatusSummary>();
    const jobsByFile = new Map<string, GenerationJob[]>();

    for (const job of generationJobs) {
      const list = jobsByFile.get(job.file_name) ?? [];
      list.push(job);
      jobsByFile.set(job.file_name, list);
    }

    const resolveLatestJob = (fileName: string): GenerationJob | null => {
      const list = jobsByFile.get(fileName);
      if (!list || list.length === 0) return null;
      return list.reduce((latest, job) => {
        const latestTime = latest.created_at ? new Date(latest.created_at).getTime() : 0;
        const jobTime = job.created_at ? new Date(job.created_at).getTime() : 0;
        return jobTime > latestTime ? job : latest;
      }, list[0]);
    };

    const resolveLatestGenerationJob = (fileName: string): GenerationJob | null => {
      const list = jobsByFile.get(fileName);
      if (!list || list.length === 0) return null;
      const candidates = list.filter((job) =>
        job.operation === 'local_generation' || job.operation === 'llm_generation'
      );
      if (candidates.length === 0) return null;
      return candidates.reduce((latest, job) => {
        const latestTime = latest.created_at ? new Date(latest.created_at).getTime() : 0;
        const jobTime = job.created_at ? new Date(job.created_at).getTime() : 0;
        return jobTime > latestTime ? job : latest;
      }, candidates[0]);
    };

    const rootCoverage = rootFileName ? coverageMap?.get(rootFileName) : undefined;
    const hasRootHierarchy = !!(rootCoverage && rootCoverage.hierarchy.covered > 0);

    for (const file of files) {
      if (file.file_type !== 'bpmn') continue;

      const coverage = coverageMap?.get(file.file_name);
      const latestJob = resolveLatestJob(file.file_name);
      const latestGenJob = resolveLatestGenerationJob(file.file_name);

      const computeStatus = (covered: number, total: number): ArtifactStatus => {
        if (total === 0) return 'missing';
        if (covered === 0) return 'missing';
        if (covered === total) return 'complete';
        return 'partial';
      };

      const lastChange = file.last_updated_at ? new Date(file.last_updated_at).getTime() : 0;
      const genTime = latestGenJob?.finished_at
        ? new Date(latestGenJob.finished_at).getTime()
        : latestGenJob?.created_at
        ? new Date(latestGenJob.created_at).getTime()
        : 0;
      const durationMs =
        latestGenJob?.started_at && latestGenJob.finished_at
          ? new Date(latestGenJob.finished_at).getTime() -
            new Date(latestGenJob.started_at).getTime()
          : undefined;

      const baseMode = latestGenJob?.mode ?? null;
      const baseGeneratedAt = latestGenJob?.finished_at ?? latestGenJob?.created_at ?? null;
      const outdatedBase = !!(baseGeneratedAt && lastChange && lastChange > genTime);

      const docsCovered = coverage?.docs.covered ?? 0;
      const docsTotal = coverage?.docs.total ?? 0;
      const testsCovered = coverage?.tests.covered ?? 0;
      const testsTotal = coverage?.tests.total ?? 0;
      const hierarchyCovered = coverage?.hierarchy.covered ?? 0;

      const docStatus: ArtifactStatus = latestGenJob && latestGenJob.status === 'failed'
        ? 'error'
        : computeStatus(docsCovered, docsTotal);
      const testStatus: ArtifactStatus = latestGenJob && latestGenJob.status === 'failed'
        ? 'error'
        : computeStatus(testsCovered, testsTotal);
      let hierarchyStatus: ArtifactStatus;
      if (latestGenJob && latestGenJob.status === 'failed') {
        hierarchyStatus = 'error';
      } else if (hierarchyCovered > 0) {
        // Denna fil har egna hierarkiska tester
        hierarchyStatus = 'complete';
      } else if (hasRootHierarchy && file.file_name !== rootFileName) {
        // Root har hierarki och denna fil ingår i projektet,
        // men har inga egna hierarkiska tester – visa som "delvis" istället för "saknas".
        hierarchyStatus = 'partial';
      } else {
        hierarchyStatus = 'missing';
      }

      const doc: ArtifactSnapshot = {
        status: docStatus,
        mode: baseMode,
        generatedAt: baseGeneratedAt,
        jobId: latestGenJob?.id ?? null,
        outdated: outdatedBase,
        durationMs,
      };
      const test: ArtifactSnapshot = {
        status: testStatus,
        mode: baseMode,
        generatedAt: baseGeneratedAt,
        jobId: latestGenJob?.id ?? null,
        outdated: outdatedBase,
        durationMs,
      };
      const hierarchy: ArtifactSnapshot = {
        status: hierarchyStatus,
        mode: baseMode,
        generatedAt: baseGeneratedAt,
        jobId: latestGenJob?.id ?? null,
        outdated: outdatedBase,
      };

      const latestJobSummary = latestJob
        ? {
            jobId: latestJob.id,
            mode: latestJob.mode ?? null,
            status: latestJob.status,
            finishedAt: latestJob.finished_at,
            startedAt: latestJob.started_at,
          }
        : null;

      map.set(file.file_name, {
        fileName: file.file_name,
        doc,
        test,
        hierarchy,
        latestJob: latestJobSummary,
      });
    }

    return map;
  }, [files, coverageMap, generationJobs, rootFileName]);

  const handleValidateBpmnMap = async () => {
    try {
      setValidatingMap(true);
      setMapValidationResult(null);

      const { data: filesData, error } = await supabase
        .from('bpmn_files')
        .select('file_name, meta')
        .eq('file_type', 'bpmn');

      if (error) {
        console.error('[BpmnFileManager] validate-bpmn-map error', error);
        toast({
          title: 'Validering misslyckades',
          description: error.message || 'Kunde inte hämta BPMN-metadata.',
          variant: 'destructive',
        });
        return;
      }

      const files = filesData ?? [];
      const mapProcesses = Array.isArray((bpmnMap as any).processes) ? (bpmnMap as any).processes : [];

      const bpmnFilesSet = new Set<string>(files.map((f: any) => f.file_name));
      const unmappedCallActivities: any[] = [];
      const callActivitiesMissingInMap: any[] = [];
      const missingSubprocessFiles: any[] = [];
      const mapInconsistencies: any[] = [];
      const orphanProcesses: any[] = [];

      const fileMetaByName = new Map<string, any>();
      for (const file of files) {
        fileMetaByName.set(file.file_name, file.meta || {});
      }

      const mapCallsByKey = new Map<string, { proc: any; entry: any }>();
      for (const proc of mapProcesses) {
        const bpmnFile = proc.bpmn_file;
        const calls = Array.isArray(proc.call_activities) ? proc.call_activities : [];
        for (const ca of calls) {
          if (!ca || !ca.bpmn_id) continue;
          const key = `${bpmnFile}::${ca.bpmn_id}`;
          mapCallsByKey.set(key, { proc, entry: ca });
        }
      }

      for (const proc of mapProcesses) {
        const bpmnFile = proc.bpmn_file;
        const meta = fileMetaByName.get(bpmnFile) || {};
        const processesMeta = Array.isArray(meta.processes) ? meta.processes : [];

        if (!bpmnFilesSet.has(bpmnFile)) {
          mapInconsistencies.push({
            type: 'bpmn_file_not_found',
            bpmn_file: bpmnFile,
            process_id: proc.process_id,
          });
          continue;
        }

        const metaProcess =
          processesMeta.find((p: any) => p.id === proc.process_id) ||
          processesMeta[0] ||
          null;

        const metaSubprocesses = Array.isArray(meta.subprocesses) ? meta.subprocesses : [];
        const metaCallActivities =
          (metaProcess?.callActivities as any[]) ||
          (meta.callActivities as any[]) ||
          [];
        const metaTasks =
          (metaProcess?.tasks as any[]) ||
          (meta.tasks as any[]) ||
          [];

        const metaIds = new Set<string>([
          ...metaCallActivities.map((ca: any) => ca.id),
          ...metaSubprocesses.map((sp: any) => sp.id),
          ...metaTasks.map((t: any) => t.id),
        ]);

        const calls = Array.isArray(proc.call_activities) ? proc.call_activities : [];
        for (const ca of calls) {
          if (!ca || !ca.bpmn_id) continue;

          if (!metaIds.has(ca.bpmn_id)) {
            mapInconsistencies.push({
              type: 'map_bpmn_id_not_in_meta',
              bpmn_file: bpmnFile,
              process_id: proc.process_id,
              bpmn_id: ca.bpmn_id,
            });
          }

          if (ca.subprocess_bpmn_file) {
            if (!bpmnFilesSet.has(ca.subprocess_bpmn_file)) {
              missingSubprocessFiles.push({
                bpmn_file: bpmnFile,
                bpmn_id: ca.bpmn_id,
                subprocess_bpmn_file: ca.subprocess_bpmn_file,
              });
            }
          } else {
            unmappedCallActivities.push({
              bpmn_file: bpmnFile,
              process_id: proc.process_id,
              bpmn_id: ca.bpmn_id,
              name: ca.name || ca.bpmn_id,
              reason: 'subprocess_bpmn_file_missing',
            });
          }
        }
      }

      for (const file of files) {
        const bpmnFile = file.file_name;
        const meta = file.meta || {};
        const processesMeta = Array.isArray(meta.processes) ? meta.processes : [];

        for (const procMeta of processesMeta) {
          const procId = procMeta.id || bpmnFile;
          const callActivities = procMeta.callActivities || [];

          for (const ca of callActivities) {
            const key = `${bpmnFile}::${ca.id}`;
            if (!mapCallsByKey.has(key)) {
              callActivitiesMissingInMap.push({
                bpmn_file: bpmnFile,
                process_id: procId,
                bpmn_id: ca.id,
                name: ca.name || ca.id,
              });
            }
          }
        }
      }

      const referencedSubprocessFiles = new Set<string>(
        mapProcesses
          .flatMap((p: any) => p.call_activities || [])
          .map((ca: any) => ca?.subprocess_bpmn_file)
          .filter((f: any) => typeof f === 'string'),
      );

      const rootFileNameFromMap: string | null =
        typeof (bpmnMap as any).orchestration?.root_process === 'string'
          ? `${(bpmnMap as any).orchestration.root_process}.bpmn`
          : null;

      for (const file of files) {
        const bpmnFile = file.file_name;
        if (!referencedSubprocessFiles.has(bpmnFile) && bpmnFile !== rootFileNameFromMap) {
          orphanProcesses.push({
            bpmn_file: bpmnFile,
            hint: 'Aldrig refererad som subprocess_bpmn_file i bpmn-map.json',
          });
        }
      }

      const result = {
        generated_at: new Date().toISOString(),
        summary: {
          unmapped_call_activities: unmappedCallActivities.length,
          call_activities_missing_in_map: callActivitiesMissingInMap.length,
          missing_subprocess_files: missingSubprocessFiles.length,
          map_inconsistencies: mapInconsistencies.length,
          orphan_processes: orphanProcesses.length,
        },
        unmapped_call_activities: unmappedCallActivities,
        call_activities_missing_in_map: callActivitiesMissingInMap,
        missing_subprocess_files: missingSubprocessFiles,
        map_inconsistencies: mapInconsistencies,
        orphan_processes: orphanProcesses,
      };

      setMapValidationResult(result);
      setShowMapValidationDialog(true);

      toast({
        title: 'Validering klar',
        description: `Omatchade call activities: ${result.summary.unmapped_call_activities}, saknas i map: ${result.summary.call_activities_missing_in_map}.`,
      });
    } catch (err) {
      console.error('[BpmnFileManager] validate-bpmn-map unexpected error', err);
      toast({
        title: 'Validering misslyckades',
        description: err instanceof Error ? err.message : 'Okänt fel vid BPMN-kartvalidering.',
        variant: 'destructive',
      });
    } finally {
      setValidatingMap(false);
    }
  };

  const resetGenerationState = () => {
    cancelGenerationRef.current = false;
    setCancelGeneration(false);
    setGenerationProgress(null);
    setGraphTotals({ files: 0, nodes: 0 });
    setDocgenProgress({ completed: 0, total: 0 });
    setDocUploadProgress({ planned: 0, completed: 0 });
    setTestUploadProgress({ planned: 0, completed: 0 });
  };

  const checkCancellation = () => {
    if (cancelGenerationRef.current) {
      throw new Error('Avbrutet av användaren');
    }
  };

  const logGenerationProgress = (modeLabel: string, step: string, detail?: string) => {
    const message = `[Generation][${modeLabel}] ${step}${detail ? ` – ${detail}` : ''}`;
    console.log(message);
    setGenerationProgress({ step, detail });
  };

  const createGenerationJob = async (
    fileName: string,
    operation: GenerationOperation,
    mode?: 'local' | 'slow',
  ) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) {
      throw new Error('Ingen användarsession hittades. Logga in och försök igen.');
    }

    const { data, error } = await supabase
      .from('generation_jobs')
      .insert({
        file_name: fileName,
        operation,
        mode: mode || null,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) {
      const isSchemaModeError =
        typeof error.code === 'string' &&
        error.code === 'PGRST204' &&
        typeof error.message === 'string' &&
        error.message.includes("'mode' column of 'generation_jobs'");

      if (isSchemaModeError) {
        console.warn(
          '[GenerationJobs] generation_jobs.mode saknas i det aktiva schemat – försöker fallback-insert utan mode-kolumn. ' +
            'För full funktionalitet, kör Supabase-migrationerna (t.ex. supabase db reset eller supabase migration up) enligt README.'
        );

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('generation_jobs')
          .insert({
            file_name: fileName,
            operation,
            created_by: userData.user.id,
          })
          .select()
          .single();

        if (fallbackError) {
          console.error(
            '[GenerationJobs] Fallback-insert utan mode misslyckades också:',
            fallbackError
          );
          throw new Error(
            'Kolumnen mode saknas på generation_jobs i din lokala Supabase-databas och fallback utan mode misslyckades. ' +
              'Kontrollera din Supabase-instans och kör migrationerna enligt README.'
          );
        }

        refreshGenerationJobs();
        return fallbackData as GenerationJob;
      }

      throw error;
    }

    refreshGenerationJobs();
    return data as GenerationJob;
  };

  const updateGenerationJob = async (
    jobId: string,
    updates: Partial<Pick<GenerationJob, 'status' | 'progress' | 'total' | 'result' | 'error' | 'started_at' | 'finished_at'>>
  ) => {
    const { error } = await supabase
      .from('generation_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Failed updating generation job', error);
    } else {
      refreshGenerationJobs();
    }
  };

  const resolveRootBpmnFile = async (): Promise<BpmnFile | null> => {
    if (!files.length) {
      toast({
        title: 'Inga BPMN-filer',
        description: 'Ladda upp minst en BPMN-fil innan du genererar artefakter.',
        variant: 'destructive',
      });
      return null;
    }

    const allFileRows = files.map((f) => ({ file_name: f.file_name }));
    const { data: deps, error } = await supabase
      .from('bpmn_dependencies')
      .select('parent_file, child_file');

    if (error) {
      console.error('Error fetching dependencies for root selection:', error);
    }

    const rootName = pickRootBpmnFile(allFileRows, deps || []);
    if (!rootName) {
      toast({
        title: 'Kunde inte hitta toppnod',
        description:
          'Systemet kunde inte avgöra en BPMN-rotfil. Kontrollera hierarkin och försök igen.',
        variant: 'destructive',
      });
      return null;
    }

    const rootFile = files.find((f) => f.file_name === rootName) ?? null;
    if (!rootFile) {
      toast({
        title: 'Kunde inte hitta toppnod',
        description: `Rotfilen ${rootName} finns inte i den aktuella fil-listan.`,
        variant: 'destructive',
      });
    }
    return rootFile;
  };

  const setJobStatus = async (jobId: string, status: GenerationStatus, extra: Record<string, unknown> = {}) => {
    await updateGenerationJob(jobId, {
      status,
      ...extra,
    });
  };

  const abortGenerationJob = async (job: GenerationJob) => {
    try {
      await updateGenerationJob(job.id, {
        status: 'cancelled',
        error: 'Avbruten av användare',
        finished_at: new Date().toISOString(),
      });
      toast({
        title: 'Jobb stoppat',
        description: `${job.file_name} (${formatOperationLabel(job.operation)}) markerat som avbrutet`,
      });
    } catch (error) {
      console.error('Abort job error:', error);
      toast({
        title: 'Kunde inte stoppa jobb',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeClasses = (status: GenerationStatus) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'succeeded':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatStatusLabel = (status: GenerationStatus) => {
    switch (status) {
      case 'running':
        return 'Pågår';
      case 'succeeded':
        return 'Klar';
      case 'failed':
        return 'Fel';
      case 'cancelled':
        return 'Avbruten';
      default:
        return 'Köad';
    }
  };

  const formatOperationLabel = (operation: GenerationOperation) => {
    switch (operation) {
      case 'hierarchy':
        return 'Hierarki';
      case 'local_generation':
        return 'Dok/Test (lokal)';
      case 'llm_generation':
      case 'generation':
        return 'Dok/Test (LLM)';
      default:
        return 'Artefakter';
    }
  };

  const handleSyncFromGithub = async () => {
    const result = await syncMutation.mutateAsync();
    setSyncResult(result);
    setShowSyncReport(true);
  };

  const handleCancelGeneration = async () => {
    if (cancelGenerationRef.current) return;
    cancelGenerationRef.current = true;
    setCancelGeneration(true);
    setOverlayDescription('Avbryter pågående körning …');

    try {
      // Markera aktuellt jobb som avbrutet i databasen om vi hittar det.
      // Detta kan misslyckas (t.ex. nätverksfel), men UI ska ändå lämna
      // "kör"-läget och popupen ska stängas.
      if (generatingFile) {
        const runningJob = generationJobs.find(
          (job) =>
            job.status === 'running' &&
            (job.operation === 'local_generation' || job.operation === 'llm_generation') &&
            job.file_name === generatingFile,
        );
        if (runningJob) {
          await abortGenerationJob(runningJob);
        }
      }
    } catch (error) {
      console.error('Cancel generation error:', error);
      toast({
        title: 'Kunde inte avbryta jobb',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      // Oavsett om backend-jobbet hann stoppas eller inte behandlar vi
      // detta som en "avsluta väntan på resultat" i UI:t:
      // - stäng overlay
      // - lämna running-läget
      // Själva generatorn i bakgrunden får sedan själv hantera isCancelled.
      setGeneratingFile(null);
      setActiveOperation(null);
      setShowTransitionOverlay(false);
      setOverlayMessage('');
      setOverlayDescription('');
      setGenerationProgress(null);
    }
  };

  const handleGenerateArtifacts = async (
    file: BpmnFile,
    mode: GenerationMode = 'slow',
    scope: GenerationScope = 'file',
    showReport: boolean = true,
  ): Promise<DetailedGenerationResult | null> => {
    if (file.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för generering',
        variant: 'destructive',
      });
      return;
    }
    if (!file.storage_path) {
      toast({
        title: 'Filen är inte uppladdad än',
        description: 'Ladda upp BPMN-filen via files-sidan innan du genererar artefakter.',
        variant: 'destructive',
      });
      return;
    }

    const isLocalMode = mode === 'local';
    const generationScope: GenerationScope = scope;
    const modeLabel = isLocalMode ? 'local' : mode;
    // Progress model bookkeeping for this run
    let totalGraphFiles = 0;
    let totalGraphNodes = 0;
    let docgenCompleted = 0;
    let testUploadsPlanned = 0;
    let testUploadsCompleted = 0;
    let docUploadsPlanned = 0;
    let docUploadsCompleted = 0;
    resetGenerationState();
    const effectiveLlmMode: LlmGenerationMode | null = !isLocalMode
      ? 'slow'
      : null;
    if (!isLocalMode && effectiveLlmMode) {
      persistLlmGenerationMode(effectiveLlmMode);
    }
    setGeneratingFile(file.file_name);
    setActiveOperation(isLocalMode ? 'local' : 'llm');
    setOverlayMessage(
      `${isLocalMode ? 'Genererar lokalt' : 'Genererar'} ${file.file_name.replace('.bpmn', '')}`
    );
    setOverlayDescription(
      isLocalMode
        ? 'Skapar dokumentation och tester med lokala mallar. Kör separat LLM-läge när du behöver förbättrad text.'
        : `LLM-läge: ${llmModeDetails.label}. ${llmModeDetails.runHint} Vi uppdaterar dokumentation och testfiler.`
    );
    setShowTransitionOverlay(true);
    
    let activeJob: GenerationJob | null = null;
    let jobProgressCount = 0;
    let jobTotalCount = JOB_PHASE_TOTAL;
    const syncOverlayProgress = (label?: string) => {
      setOverlayMessage(`Steg ${Math.min(jobProgressCount, jobTotalCount)} av ${jobTotalCount}`);
      if (label) {
        setOverlayDescription(label);
      }
    };
    const ensureJobTotal = async (newTotal: number) => {
      if (newTotal <= jobTotalCount) return;
      jobTotalCount = newTotal;
      if (activeJob) {
        await updateGenerationJob(activeJob.id, { total: jobTotalCount });
      }
      syncOverlayProgress();
    };
    const incrementJobProgress = async (label?: string) => {
      jobProgressCount = Math.min(jobProgressCount + 1, jobTotalCount);
      if (activeJob) {
        await updateGenerationJob(activeJob.id, { progress: jobProgressCount });
      }
      syncOverlayProgress(label);
    };

    const handleGeneratorPhase = async (phase: GenerationPhaseKey, label: string, detail?: string) => {
      logGenerationProgress(modeLabel, label, detail);
      switch (phase) {
        case 'graph:start':
          syncOverlayProgress('Analyserar BPMN-struktur');
          break;
        case 'graph:complete':
          await incrementJobProgress('Processträd klart');
          break;
        case 'hier-tests:start':
          syncOverlayProgress('Genererar hierarkiska tester');
          break;
        case 'hier-tests:file':
          await incrementJobProgress(`Hierarkitest: ${detail || ''}`);
          break;
        case 'node-analysis:start':
          syncOverlayProgress(`Analyserar noder (${detail || ''})`);
          break;
        case 'node-analysis:node':
          // Nodanalyser används främst som förberedelse – räkna inte varje nod som ett eget framsteg,
          // utan visa bara status i overlayen.
          syncOverlayProgress(`Analyserar nod: ${detail || ''}`);
          break;
        case 'docgen:start':
          syncOverlayProgress('Genererar dokumentation/testinstruktioner');
          break;
        case 'docgen:file':
          // Här sker den tunga logiken (mallar/LLM per nod), så koppla framsteg till verkligt antal noder.
          docgenCompleted += 1;
          setDocgenProgress((prev) => ({
            completed: docgenCompleted,
            total: totalGraphNodes || prev.total || docgenCompleted,
          }));
          if (totalGraphNodes > 0) {
            await incrementJobProgress(
              `Dokumentation ${docgenCompleted} av ${totalGraphNodes} noder`
            );
          } else {
            await incrementJobProgress(`Dokumentation: ${detail || ''}`);
          }
          break;
        case 'total:init':
          if (detail) {
            try {
              const parsed = JSON.parse(detail) as { files?: number; nodes?: number };
              const extraFiles = Number(parsed.files) || 0;
              const extraNodes = Number(parsed.nodes) || 0;
              totalGraphFiles = extraFiles;
              totalGraphNodes = extraNodes;
              setGraphTotals({ files: extraFiles, nodes: extraNodes });
              setDocgenProgress({ completed: 0, total: extraNodes });
              // Lägg till ett steg per fil och ett steg per nod (docgen),
              // tidiga faser (graf/nodanalyser) förblir en liten del av den totala bilden.
              const extraSteps = extraFiles + extraNodes;
              await ensureJobTotal(JOB_PHASE_TOTAL + extraSteps);
            } catch (error) {
              console.warn('Failed to parse total:init detail', detail);
            }
          }
          break;
        default:
          break;
      }
    };
    syncOverlayProgress('Förbereder generering');

    try {
      // Kolla om användaren är autentiserad mot Supabase
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Error getting Supabase session:', authError);
      }
      const isAuthenticated = !!authData?.session;

      if (!isAuthenticated) {
        // Visa tydligt meddelande och avbryt innan vi börjar skriva något
        toast({
          title: 'Inloggning krävs',
          description: 'Du är inte inloggad i Supabase. Logga in via Auth-sidan för att kunna generera och spara dokumentation och tester till registret.',
          variant: 'destructive',
        });

        console.warn(
          `Skipping artifact generation for ${file.file_name} because user is not authenticated against Supabase.`
        );
        return;
      }
      checkCancellation();
      const jobOperation: GenerationOperation = isLocalMode ? 'local_generation' : 'llm_generation';
      activeJob = await createGenerationJob(file.file_name, jobOperation, mode);
      checkCancellation();
      await setJobStatus(activeJob.id, 'running', {
        started_at: new Date().toISOString(),
        progress: 0,
        total: JOB_PHASE_TOTAL,
      });
      checkCancellation();

      // Hämta alla tillgängliga BPMN-filer
      const { data: allFiles, error: filesError } = await supabase
        .from('bpmn_files')
        .select('file_name, file_type, storage_path')
        .eq('file_type', 'bpmn');

      if (filesError) throw filesError;
      checkCancellation();

      const missingUploads = (allFiles || []).filter(f => !f.storage_path).map(f => f.file_name);
      // Only show this warning if showReport is true (single file generation)
      // For batch generation, this is less critical and can be logged instead
      if (showReport && missingUploads.length) {
        toast({
          title: 'BPMN-filer saknar uppladdning',
          description: `Hoppar över ${missingUploads.length} filer som inte finns i Supabase Storage: ${missingUploads.join(', ')}.`,
          variant: 'destructive',
        });
      } else if (!showReport && missingUploads.length) {
        // Log for batch generation instead of showing toast
        console.warn(`[Batch generation] Hoppar över ${missingUploads.length} filer som inte finns i Supabase Storage: ${missingUploads.join(', ')}`);
      }

      const existingBpmnFiles = (allFiles || [])
        .filter(f => !!f.storage_path)
        .map(f => f.file_name);
      const existingDmnFiles: string[] = []; // DMN files kan läggas till senare

      // Använd full hierarkisk analys endast för toppfilen (root).
      // Övriga filer genereras med enklare per-fil-analys för att undvika
      // att browsern bygger tunga grafer för varje enskild subprocess-fil.
      const isRootFile = rootFileName && file.file_name === rootFileName;
      const useHierarchy = isRootFile;

      console.log(`Generating for ${file.file_name} (hierarchy: ${useHierarchy})`);

      logGenerationProgress(modeLabel, 'Analyserar BPMN-struktur');
      checkCancellation();

      // Generera alla artefakter med hierarkisk analys
      const generationSourceLabel = isLocalMode
        ? 'local-fallback'
        : llmProvider === 'cloud'
        ? 'llm-slow-chatgpt'
        : 'llm-slow-ollama';
      const localAvailable = llmHealth?.local.available ?? false;
      const graphFiles =
        isRootFile && useHierarchy
          ? existingBpmnFiles
          : [file.file_name];
      const result = await generateAllFromBpmnWithGraph(
        file.file_name,
        graphFiles,
        existingDmnFiles,
        useHierarchy,
        !isLocalMode,
        handleGeneratorPhase,
        generationSourceLabel,
        !isLocalMode ? llmProvider : undefined,
        localAvailable
      );
      checkCancellation();

      // Only show warnings if showReport is true (single file generation)
      // For batch generation, warnings are collected and shown in the summary
      if (showReport) {
        if (result.metadata?.llmFallbackUsed && result.metadata.llmFinalProvider === 'local') {
          toast({
            title: 'LLM-fallback använd',
            description:
              'ChatGPT (moln-LLM) var inte tillgänglig. Dokumentationen genererades i stället via lokal LLM (Ollama).',
          });
        }
      }
      const nodeArtifacts = result.nodeArtifacts || [];
      const missingDependencies = result.metadata?.missingDependencies || [];
      const skippedSubprocesses = new Set<string>(result.metadata?.skippedSubprocesses || []);
      if (showReport && skippedSubprocesses.size) {
        const skippedArray = Array.from(skippedSubprocesses);
        const preview = skippedArray.slice(0, 3).join(', ');
        const more = skippedArray.length > 3 ? ` … och ${skippedArray.length - 3} till` : '';
        toast({
          title: 'Ofullständig subprocess-täckning',
          description: `Följande subprocesser saknar BPMN-fil: ${preview}${more}. Artefakter genereras utan dem.`,
          variant: 'destructive',
        });
      }
      // Spara DoR/DoD till databasen (endast för dokumentations-HTML, ingen separat UI-visning)
      let dorDodCount = 0;
      const detailedDorDod: Array<{ subprocess: string; category: string; type: string; text: string }> = [];
      
      logGenerationProgress(modeLabel, 'Skapar DoR/DoD-kriterier', file.file_name);
      checkCancellation();

      if (result.dorDod.size > 0) {
        console.log('[Local generation] DoR/DoD: bearbetar', result.dorDod.size, 'subprocesser');
        const criteriaToInsert: any[] = [];
        
        result.dorDod.forEach((criteria, subprocessName) => {
          checkCancellation();
          if (missingDependencies.some(dep => dep.childProcess === subprocessName)) {
            skippedSubprocesses.add(subprocessName);
            console.warn('[Local generation] Hoppar över DoR/DoD för', subprocessName, '- saknar BPMN-fil');
            return;
          }
          criteria.forEach(criterion => {
            criteriaToInsert.push({
              subprocess_name: subprocessName,
              ...criterion,
            });
            detailedDorDod.push({
              subprocess: subprocessName,
              category: criterion.criterion_category,
              type: criterion.criterion_type,
              text: criterion.criterion_text,
            });
          });
        });

        console.log('[Local generation] DoR/DoD: skriver', criteriaToInsert.length, 'kriterier till databasen');
        const { error: dbError } = await supabase
          .from('dor_dod_status')
          .upsert(criteriaToInsert, {
            onConflict: 'subprocess_name,criterion_key,criterion_type',
            ignoreDuplicates: false,
          });

        if (dbError) {
          console.error('Auto-save DoR/DoD error:', dbError);
        } else {
          dorDodCount = criteriaToInsert.length;
          console.log('[Local generation] DoR/DoD klart:', dorDodCount);
        }
        checkCancellation();
      } else {
        console.log('[Local generation] DoR/DoD: inga kriterier skapades');
      }
      await incrementJobProgress('Skapar DoR/DoD-kriterier');

      // Spara subprocess mappings (dependencies) till databasen.
      // Detta steg är gemensamt för lokal och LLM‑generering men beter sig olika
      // beroende på scope: för node‑scope hoppar vi över global synk och använder
      // endast mappings i minnet.
      const detailedSubprocessMappings: Array<{ callActivity: string; subprocessFile: string }> = [];
      
      logGenerationProgress(modeLabel, 'Synkar subprocess-kopplingar', file.file_name);
      checkCancellation();

      if (generationScope === 'file') {
        if (result.subprocessMappings.size > 0) {
          const dependenciesToInsert: any[] = [];

          checkCancellation();
          result.subprocessMappings.forEach((childFile, elementId) => {
            dependenciesToInsert.push({
              parent_file: file.file_name,
              child_process: elementId,
              child_file: childFile,
            });
            detailedSubprocessMappings.push({
              callActivity: elementId,
              subprocessFile: childFile,
            });
          });

          if (dependenciesToInsert.length > 0) {
            try {
              checkCancellation();
              const { error: depError } = await supabase
                .from('bpmn_dependencies')
                .upsert(dependenciesToInsert, {
                  onConflict: 'parent_file,child_process',
                  ignoreDuplicates: false,
                });

              if (depError) {
                console.error('Save dependencies error:', depError);
              }
            } catch (error) {
              console.error('Unexpected error while saving subprocess mappings:', error);
            }
          }
          checkCancellation();
        } else {
          // Inga mappings att synka i fil-scope – behandla som no-op men behåll framsteg.
          console.log(
            '[Generation] Synkar subprocess-kopplingar: inga mappings att spara för fil-scope',
          );
        }
      } else {
        // Node-scope: global subprocess-synk är best-effort och kan hoppas över
        // eftersom vi primärt genererar artefakter för ett nod-centrerat flöde.
        if (result.subprocessMappings.size > 0) {
          result.subprocessMappings.forEach((childFile, elementId) => {
            detailedSubprocessMappings.push({
              callActivity: elementId,
              subprocessFile: childFile,
            });
          });
          console.log(
            '[Generation] Synkar subprocess-kopplingar: hoppar över skrivning till bpmn_dependencies i node-scope',
          );
        } else {
          console.log(
            '[Generation] Synkar subprocess-kopplingar: inget att göra i node-scope',
          );
        }
      }

      await incrementJobProgress('Synkar subprocess-kopplingar');

      // Spara BPMN element mappings med Jira-information
      // Detta behövs för att listvyn ska kunna visa jira_type och jira_name
      console.log('Building element mappings with Jira metadata...');
      const mappingsToInsert: any[] = [];
      const detailedJiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }> = [];
      
      // Hämta dependencies för att bygga fullständig hierarki
      const { data: dependencies } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file, child_process, child_file');
      
      const depsMap = new Map<string, { parentFile: string; callActivityName: string }>();
      if (dependencies) {
        for (const dep of dependencies) {
          if (dep.child_file) {
            depsMap.set(dep.child_file, {
              parentFile: dep.parent_file,
              callActivityName: dep.child_process,
            });
          }
        }
      }
      
      // Helper: Bygg parentPath rekursivt från dependencies.
      // Robust mot saknade subprocess-filer och eventuella cycles i bpmn_dependencies.
      const buildParentPath = async (
        fileName: string,
        visited: Set<string> = new Set(),
      ): Promise<string[]> => {
        if (visited.has(fileName)) {
          console.warn(
            '[Generation] Cykel upptäckt i bpmn_dependencies när parentPath byggdes för',
            fileName,
          );
          return [];
        }
        visited.add(fileName);

        const dep = depsMap.get(fileName);
        if (!dep) return []; // Toppnivåfil utan registrerad parent

        const parentRoot = dep.parentFile
          .replace('.bpmn', '')
          .replace(/^mortgage-se-/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const capitalizedRoot =
          parentRoot.charAt(0).toUpperCase() + parentRoot.slice(1);

        const grandparentPath = await buildParentPath(dep.parentFile, visited);

        return [...grandparentPath, capitalizedRoot];
      };
      
      // NOTE: Jira-namn (jira_name) genereras INTE här längre.
      // De genereras istället av handleBuildHierarchy() som använder hela ProcessTree
      // och kan bygga korrekta paths. Här skriver vi bara jira_type för noder som saknar det.
      // 
      // Om jira_name behövs, använd "Bygg/uppdatera hierarki från root" först.
      
      if (useHierarchy && result.metadata) {
        // För hierarkiska filer: extrahera jira_type för noder som saknar det
        for (const bpmnFileName of result.metadata.filesIncluded) {
          try {
            const bpmnUrl = `/bpmn/${bpmnFileName}`;
            const { buildBpmnHierarchy } = await import('@/lib/bpmnHierarchy');
            
            // Bygg parentPath från dependencies
            const parentPath = await buildParentPath(bpmnFileName);
            const hierarchy = await buildBpmnHierarchy(bpmnFileName, bpmnUrl, parentPath);
            
            // Extrahera alla noder från hierarkin (hierarchy.allNodes är redan en flat lista)
            const allNodes = hierarchy.allNodes;
            
            // Skapa mappings för varje nod (bara jira_type, inte jira_name)
            for (const node of allNodes) {
              mappingsToInsert.push({
                bpmn_file: node.bpmnFile,
                element_id: node.id,
                jira_type: node.jiraType || null,
                // jira_name: INTE satt här - genereras av handleBuildHierarchy istället
              });
              
              if (node.jiraType) {
                detailedJiraMappings.push({
                  elementId: node.id,
                  elementName: node.name,
                  jiraType: node.jiraType,
                  jiraName: '', // Tomt - kommer från handleBuildHierarchy
                });
              }
            }
          } catch (error) {
            console.error(`Error building mappings for ${bpmnFileName}:`, error);
          }
        }
      } else {
        // För icke-hierarkiska filer: bygg basic hierarki för denna fil
        try {
          const bpmnUrl = `/bpmn/${file.file_name}`;
          const { buildBpmnHierarchy } = await import('@/lib/bpmnHierarchy');
          
          // Bygg parentPath från dependencies
          const parentPath = await buildParentPath(file.file_name);
          const hierarchy = await buildBpmnHierarchy(file.file_name, bpmnUrl, parentPath);
          
          // Extrahera alla noder från hierarkin (hierarchy.allNodes är redan en flat lista)
          const allNodes = hierarchy.allNodes;
          
          // Skapa mappings för varje nod (bara jira_type, inte jira_name)
          for (const node of allNodes) {
            mappingsToInsert.push({
              bpmn_file: node.bpmnFile,
              element_id: node.id,
              jira_type: node.jiraType || null,
              // jira_name: INTE satt här - genereras av handleBuildHierarchy istället
            });
            
            if (node.jiraType) {
              detailedJiraMappings.push({
                elementId: node.id,
                elementName: node.name,
                jiraType: node.jiraType,
                jiraName: '', // Tomt - kommer från handleBuildHierarchy
              });
            }
          }
        } catch (error) {
          console.error(`Error building mappings for ${file.file_name}:`, error);
        }
      }
      
      if (mappingsToInsert.length > 0) {
        const { error: mappingsError } = await supabase
          .from('bpmn_element_mappings')
          .upsert(mappingsToInsert, {
            onConflict: 'bpmn_file,element_id',
            ignoreDuplicates: false,
          });

        if (mappingsError) {
          console.error('Save element mappings error:', mappingsError);
        } else {
          console.log(`Saved ${mappingsToInsert.length} element mappings with Jira metadata`);
        }
      }
      await incrementJobProgress('Bygger Jira-mappningar');

      // Spara genererade testfiler till Supabase Storage
      let testsCount = 0;
      const testLinksToInsert: any[] = [];
      const detailedTestFiles: Array<{ fileName: string; elements: Array<{ id: string; name: string }> }> = [];
      const testArtifactMap = new Map(
        nodeArtifacts
          .filter(artifact => artifact.testFileName)
          .map(artifact => [artifact.testFileName!, artifact])
      );
      
      logGenerationProgress(modeLabel, 'Genererar testfiler', file.file_name);
      testUploadsPlanned = result.tests.size;
      testUploadsCompleted = 0;
      setTestUploadProgress({
        planned: testUploadsPlanned,
        completed: 0,
      });
      setOverlayDescription(
        testUploadsPlanned > 0
          ? `Genererar testfiler – laddar upp och mappar tester (0 av ${testUploadsPlanned})`
          : 'Genererar testfiler – laddar upp och mappar tester'
      );
      checkCancellation();

      await ensureJobTotal(jobTotalCount + result.tests.size);
      if (result.tests.size > 0) {
        for (const [testFileName, testContent] of result.tests.entries()) {
          const { modePath: testPath, legacyPath: legacyTestPath } = buildTestStoragePaths(
            testFileName,
            effectiveLlmMode ?? (isLocalMode ? 'local' : null)
          );
          const testFileElements: Array<{ id: string; name: string }> = [];
          
          checkCancellation();

          // Upload test file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(testPath, new Blob([testContent], { type: 'text/plain' }), {
              upsert: true,
              contentType: 'text/plain',
            });

          // Skriv även till legacy-path för bakåtkompatibilitet
          if (!uploadError && legacyTestPath !== testPath) {
            const { error: legacyUploadError } = await supabase.storage
              .from('bpmn-files')
              .upload(legacyTestPath, new Blob([testContent], { type: 'text/plain' }), {
                upsert: true,
                contentType: 'text/plain',
              });
            if (legacyUploadError) {
              console.warn(
                'Kunde inte skriva legacy-testfil för bakåtkompatibilitet:',
                legacyTestPath,
                legacyUploadError
              );
            }
          }

          if (uploadError) {
            console.error(`Error uploading test file ${testFileName}:`, uploadError);
          } else {
            testsCount++;
          }
          checkCancellation();

          // För noder med explicita testfiler
          const nodeArtifact = testArtifactMap.get(testFileName);
          if (nodeArtifact) {
            const providerLabel =
              isLocalMode
                ? 'local-fallback'
                : llmProvider === 'cloud'
                ? 'chatgpt'
                : llmProvider === 'local'
                ? 'ollama'
                : null;
            testLinksToInsert.push({
              bpmn_file: nodeArtifact.bpmnFile || file.file_name,
              bpmn_element_id: nodeArtifact.elementId,
              test_file_path: testPath,
              test_name: `Test for ${nodeArtifact.elementName || nodeArtifact.elementId}`,
              provider: providerLabel,
            });
            testFileElements.push({
              id: nodeArtifact.elementId,
              name: nodeArtifact.elementName || nodeArtifact.elementId,
            });
          } else if (testFileName.includes('.hierarchical.spec.ts')) {
            continue;
          } else {
            console.warn(
              '[Generation] Hittade ingen nodeArtifact för testfil, hoppar node_test_links:',
              testFileName
            );
          }
          if (testFileElements.length > 0) {
            detailedTestFiles.push({
              fileName: testFileName,
              elements: testFileElements,
            });
          }
          testUploadsCompleted += 1;
          setTestUploadProgress((prev) => ({
            planned: prev.planned || testUploadsPlanned,
            completed: testUploadsCompleted,
          }));
          const label =
            testUploadsPlanned > 0
              ? `Testfil ${testUploadsCompleted} av ${testUploadsPlanned}`
              : `Testfil: ${testFileName}`;
          await incrementJobProgress(label);
        }

        if (testLinksToInsert.length > 0) {
          const linksWithMode = testLinksToInsert.map((link) => ({
            ...link,
            mode: effectiveLlmMode ?? (isLocalMode ? 'local' : null),
          }));

          let testLinksData: unknown = null;
          let testError: unknown = null;

          // Första försök: upsert med mode-kolumn (normalläget när schemat är uppdaterat)
          const firstAttempt = await supabase
            .from('node_test_links')
            .upsert(linksWithMode, {
              onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
              ignoreDuplicates: false,
            })
            .select();

          if (firstAttempt.error) {
            testError = firstAttempt.error;

            // Om det är ett schema-cache / saknad kolumn-fel (PGRST204) försöker vi
            // en gång till utan mode-kolumn så att lokal utveckling kan fortsätta.
            if (isPGRST204Error(firstAttempt.error)) {
              console.warn(
                '[Generation] node_test_links.mode saknas i aktivt schema eller cache – försöker fallback-upsert utan mode. ' +
                  'För full funktionalitet, kör Supabase-migrationerna (t.ex. supabase db reset eller supabase migration up) enligt README.'
              );

              const linksWithoutMode = testLinksToInsert.map((link) => ({
                bpmn_file: link.bpmn_file,
                bpmn_element_id: link.bpmn_element_id,
                test_file_path: link.test_file_path,
                test_name: link.test_name,
              }));

              const fallbackAttempt = await supabase
                .from('node_test_links')
                .upsert(linksWithoutMode, {
                  onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
                  ignoreDuplicates: false,
                })
                .select();

              if (fallbackAttempt.error) {
                testError = fallbackAttempt.error;
              } else {
                testLinksData = fallbackAttempt.data;
                testError = null;
              }
            }
          } else {
            testLinksData = firstAttempt.data;
            testError = null;
          }

          if (testError) {
            console.error('[Generation] Save test links error:', testError);

            // Only show toast warnings if showReport is true (single file generation)
            if (showReport) {
              if (isPGRST204Error(testError)) {
                // Testfilerna är genererade, men länkning till databasen misslyckades på grund av schema-problem.
                toast({
                  title: 'Tester genererade – men länkning till DB misslyckades',
                  description:
                    'Testfilerna har skapats, men kunde inte kopplas i tabellen node_test_links. ' +
                    'Om du kör lokalt och nyligen ändrat DB-schemat: kör supabase-migrationerna (t.ex. supabase db reset) enligt README.',
                  variant: 'destructive',
                  duration: 10000,
                });
              } else {
                toast({
                  title: 'Kunde inte spara testlänkar',
                  description:
                    (testError as { message?: string }).message ||
                    'Okänt fel vid sparning av testlänkar',
                  variant: 'destructive',
                });
              }
            }
          } else {
            console.log(
              `[Generation] Sparade ${(testLinksData as { length?: number } | null)?.length ?? testLinksToInsert.length
              } testlänkar för ${file.file_name}`
            );
          }

          // Invalidera cache oavsett om det fanns fel eller inte (för att visa aktuell status)
          invalidateArtifactQueries(queryClient);
          checkCancellation();
        }
        }
      await ensureJobTotal(jobTotalCount + result.docs.size);

      // Spara dokumentation till Supabase Storage
      let docsCount = 0;
      const detailedDocFiles: string[] = [];
      
      logGenerationProgress(modeLabel, 'Publicerar dokumentation', file.file_name);
      docUploadsPlanned = result.docs.size;
      docUploadsCompleted = 0;
      setDocUploadProgress({
        planned: docUploadsPlanned,
        completed: 0,
      });
      setOverlayDescription(
        docUploadsPlanned > 0
          ? `Publicerar dokumentation – laddar upp HTML (0 av ${docUploadsPlanned})`
          : 'Publicerar dokumentation – laddar upp HTML'
      );
      checkCancellation();

      if (result.docs.size > 0) {
        for (const [docFileName, docContent] of result.docs.entries()) {
          checkCancellation();
          const { modePath: docPath, legacyPath: legacyDocPath } = buildDocStoragePaths(
            docFileName,
            effectiveLlmMode ?? (isLocalMode ? 'local' : null),
            isLocalMode ? 'fallback' : llmProvider
          );
          const htmlBlob = new Blob([docContent], { type: 'text/html; charset=utf-8' });
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(docPath, htmlBlob, {
              upsert: true,
              contentType: 'text/html; charset=utf-8',
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error(`Error uploading ${docFileName}:`, uploadError);
          } else {
            docsCount++;
            detailedDocFiles.push(docFileName);
            if (legacyDocPath !== docPath) {
              const { error: legacyUploadError } = await supabase.storage
                .from('bpmn-files')
                .upload(legacyDocPath, htmlBlob, {
                  upsert: true,
                  contentType: 'text/html; charset=utf-8',
                  cacheControl: '3600',
                });
              if (legacyUploadError) {
                console.warn(
                  'Kunde inte skriva legacy-dokumentation för bakåtkompatibilitet:',
                  legacyDocPath,
                  legacyUploadError
                );
              }
            }
          }
          checkCancellation();
          docUploadsCompleted += 1;
          setDocUploadProgress((prev) => ({
            planned: prev.planned || docUploadsPlanned,
            completed: docUploadsCompleted,
          }));
          const label =
            docUploadsPlanned > 0
              ? `Dokumentation ${docUploadsCompleted} av ${docUploadsPlanned} filer`
              : `Dokumentation: ${docFileName}`;
          await incrementJobProgress(label);
        }
      }

      // Clear structure change flag after successful generation
      if (file.has_structure_changes) {
        await supabase
          .from('bpmn_files')
          .update({ has_structure_changes: false })
          .eq('file_name', file.file_name);
      }

      // Set generation result for display
      const filesAnalyzed = useHierarchy && result.metadata 
        ? result.metadata.filesIncluded 
        : [file.file_name];
      
      const skippedList = Array.from(skippedSubprocesses);
      const nodeDocCount = nodeArtifacts.filter(a => a.docFileName).length;
      const nodeTestCount = nodeArtifacts.filter(a => a.testFileName).length;
      const totalDocCount = nodeDocCount || docsCount;
      const totalTestCount = nodeTestCount || testsCount;

      const resultMessage: string[] = [];
      if (isLocalMode) {
        resultMessage.push('Lokal körning (ingen LLM)');
      } else {
        resultMessage.push(
          `LLM-provider: ${
            llmProvider === 'cloud'
              ? 'ChatGPT (moln)'
              : 'Ollama (lokal)'
          }`,
        );
      }
      if (useHierarchy && result.metadata) {
        resultMessage.push(`Hierarkisk analys: ${result.metadata.totalFilesAnalyzed} filer`);
      }
      resultMessage.push(`${dorDodCount} DoR/DoD-kriterier`);
      resultMessage.push(`${totalTestCount} testfiler`);
      resultMessage.push(`${totalDocCount} dokumentationsfiler`);
      if (skippedList.length) {
        resultMessage.push(`Hoppade över ${skippedList.length} saknade subprocesser`);
      }

      if (showReport) {
        toast({
          title: 'Artefakter genererade!',
          description: resultMessage.join(', '),
        });
      }

      const generationResult: DetailedGenerationResult = {
        fileName: file.file_name,
        filesAnalyzed,
        dorDodCriteria: detailedDorDod,
        testFiles: detailedTestFiles,
        docFiles: detailedDocFiles,
        jiraMappings: detailedJiraMappings,
        subprocessMappings: detailedSubprocessMappings,
        nodeArtifacts,
        missingDependencies,
        skippedSubprocesses: skippedList,
      };
      
      if (showReport) {
        setGenerationResult(generationResult);
        setShowGenerationReport(true);
      }
      if (jobProgressCount < jobTotalCount) {
        jobProgressCount = jobTotalCount;
        if (activeJob) {
          await updateGenerationJob(activeJob.id, {
            progress: jobProgressCount,
            total: jobTotalCount,
          });
        }
      }
      syncOverlayProgress('Generering klar');
      if (activeJob) {
          await setJobStatus(activeJob.id, 'succeeded', {
            finished_at: new Date().toISOString(),
            progress: jobProgressCount,
            result: {
              dorDod: dorDodCount,
              tests: totalTestCount,
              docs: totalDocCount,
              filesAnalyzed,
              mode: isLocalMode ? 'local' : 'slow',
              llmProvider: isLocalMode ? 'fallback' : llmProvider,
              missingDependencies,
              skippedSubprocesses: skippedList,
            },
          });
      }

      // Refresh data (structure + artifacts) and give UI some time to re-render
      invalidateStructureQueries(queryClient);
      invalidateArtifactQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bpmn-files'] }),
        queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] }),
        queryClient.invalidateQueries({ queryKey: ['file-artifact-coverage'] }),
        queryClient.invalidateQueries({ queryKey: ['all-dor-dod-criteria'] }),
        queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
        queryClient.invalidateQueries({ queryKey: ['node-test-links'] }),
      ]);
      // Force immediate refetch of files list
      await queryClient.refetchQueries({ queryKey: ['bpmn-files'] });
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      return generationResult;
    } catch (error) {
      const isCancelled = error instanceof Error && error.message === 'Avbrutet av användaren';
      console.error('Generation error:', error);
      toast({
        title: isCancelled ? 'Generering avbruten' : 'Generering misslyckades',
        description: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
        variant: isCancelled ? 'default' : 'destructive',
      });
      if (activeJob) {
        await setJobStatus(activeJob.id, isCancelled ? 'cancelled' : 'failed', {
          error: error instanceof Error ? error.message : 'Okänt fel',
          finished_at: new Date().toISOString(),
        });
      }
      if (isCancelled) {
        setOverlayMessage('Generering avbruten');
        setOverlayDescription('Jobbet markerades som avbrutet och resterande steg hoppas över.');
      } else {
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
      }
      return null;
    } finally {
      setTimeout(() => {
        setGeneratingFile(null);
        setActiveOperation(null);
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
        resetGenerationState();
      }, 200);
    }
  };

  const handleGenerateAllArtifacts = async () => {
    const rootFile = await resolveRootBpmnFile();
    const allBpmnFiles = files.filter((f) => f.file_type === 'bpmn');

    if (!allBpmnFiles.length) {
      toast({
        title: 'Inga BPMN-filer',
        description: 'Ladda upp minst en BPMN-fil innan du genererar artefakter.',
        variant: 'destructive',
      });
      return;
    }

    const orderedFiles =
      rootFile != null
        ? [rootFile, ...allBpmnFiles.filter((f) => f.id !== rootFile.id)]
        : allBpmnFiles;

    toast({
      title: 'Startar generering för alla BPMN-filer',
      description:
        rootFile != null
          ? `Genererar dokumentation, tester och DoR/DoD med ${rootFile.file_name} som toppfil (${orderedFiles.length} filer totalt), baserat på befintlig hierarki.`
          : `Genererar dokumentation, tester och DoR/DoD för ${orderedFiles.length} BPMN-filer, baserat på befintlig hierarki.`,
    });

    // Samla resultat från alla filer
    const aggregatedResult: AggregatedGenerationResult = {
      totalFiles: orderedFiles.length,
      allFilesAnalyzed: new Set<string>(),
      allDorDodCriteria: [],
      allTestFiles: [],
      allDocFiles: [],
      allJiraMappings: [],
      allSubprocessMappings: [],
      allNodeArtifacts: [],
      allMissingDependencies: [],
      allSkippedSubprocesses: new Set<string>(),
      fileResults: [],
    };

    // Generera för varje fil utan att visa popup
    for (const file of orderedFiles) {
      try {
        const result = await handleGenerateArtifacts(file, generationMode, 'file', false);
        if (result) {
          // Aggregera resultat
          result.filesAnalyzed.forEach(f => aggregatedResult.allFilesAnalyzed.add(f));
          aggregatedResult.allDorDodCriteria.push(...result.dorDodCriteria);
          aggregatedResult.allTestFiles.push(...result.testFiles);
          aggregatedResult.allDocFiles.push(...result.docFiles);
          aggregatedResult.allJiraMappings.push(...result.jiraMappings);
          aggregatedResult.allSubprocessMappings.push(...result.subprocessMappings);
          if (result.nodeArtifacts) {
            aggregatedResult.allNodeArtifacts.push(...result.nodeArtifacts);
          }
          if (result.missingDependencies) {
            aggregatedResult.allMissingDependencies.push(...result.missingDependencies);
          }
          if (result.skippedSubprocesses) {
            result.skippedSubprocesses.forEach(s => aggregatedResult.allSkippedSubprocesses.add(s));
          }
          aggregatedResult.fileResults.push({ fileName: file.file_name, success: true });
        }
      } catch (error) {
        aggregatedResult.fileResults.push({
          fileName: file.file_name,
          success: false,
          error: error instanceof Error ? error.message : 'Okänt fel',
        });
      }
    }

    // Konvertera till DetailedGenerationResult-format för visning
    const summaryResult: DetailedGenerationResult = {
      fileName: `Alla filer (${aggregatedResult.totalFiles})`,
      filesAnalyzed: Array.from(aggregatedResult.allFilesAnalyzed),
      dorDodCriteria: aggregatedResult.allDorDodCriteria,
      testFiles: aggregatedResult.allTestFiles,
      docFiles: aggregatedResult.allDocFiles,
      jiraMappings: aggregatedResult.allJiraMappings,
      subprocessMappings: aggregatedResult.allSubprocessMappings,
      nodeArtifacts: aggregatedResult.allNodeArtifacts,
      missingDependencies: aggregatedResult.allMissingDependencies,
      skippedSubprocesses: Array.from(aggregatedResult.allSkippedSubprocesses),
    };

    // Visa sammanfattning när alla filer är klara
    setGenerationResult(summaryResult);
    setShowGenerationReport(true);
  };

  const handleGenerateSelectedFile = async () => {
    if (!selectedFile) {
      toast({
        title: 'Ingen fil vald',
        description: 'Välj en fil i tabellen först.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för generering',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Startar generering',
      description: `Genererar artefakter för ${selectedFile.file_name} med ${generationMode === 'local' ? 'Local' : 'Slow LLM'} läge.`,
    });

    await handleGenerateArtifacts(selectedFile, generationMode, 'file');
  };

  const handleBuildHierarchy = async (file: BpmnFile) => {
    if (file.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för hierarkibyggnad',
        variant: 'destructive',
      });
      return;
    }
    if (!file.storage_path) {
      toast({
        title: 'Filen är inte uppladdad än',
        description: 'Ladda upp BPMN-filen innan du bygger hierarkin.',
        variant: 'destructive',
      });
      return;
    }

    resetGenerationState();
    setGeneratingFile(file.file_name);
    setOverlayMessage(`Bygger hierarki för ${file.file_name.replace('.bpmn', '')}`);
    setOverlayDescription('Vi uppdaterar endast strukturen så att du kan verifiera processträdet innan artefakter genereras.');
    setShowTransitionOverlay(true);

    let hierarchyJob: GenerationJob | null = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Error getting Supabase session:', authError);
      }
      const isAuthenticated = !!authData?.session;
      if (!isAuthenticated) {
        toast({
          title: 'Inloggning krävs',
          description: 'Logga in via Auth-sidan för att kunna uppdatera hierarkin.',
          variant: 'destructive',
        });
        return;
      }

      // Check if user still exists in database (common after db reset)
      try {
        const { data: userCheck, error: userError } = await supabase.auth.getUser();
        if (userError || !userCheck?.user) {
          // User doesn't exist - likely after db reset
          await supabase.auth.signOut();
          toast({
            title: 'Session ogiltig',
            description: 'Din session är ogiltig (troligen efter databasreset). Logga in igen.',
            variant: 'destructive',
          });
          return;
        }
      } catch (userCheckError) {
        // If getUser fails, try to sign out and show error
        console.error('Error checking user:', userCheckError);
        await supabase.auth.signOut();
        toast({
          title: 'Autentiseringsfel',
          description: 'Kunde inte verifiera din session. Logga in igen.',
          variant: 'destructive',
        });
        return;
      }
      hierarchyJob = await createGenerationJob(file.file_name, 'hierarchy');
      await setJobStatus(hierarchyJob.id, 'running', {
        started_at: new Date().toISOString(),
        progress: 0,
        total: 3,
      });

      // Load all BPMN parse results and bpmn-map
      const parseResults = await loadAllBpmnParseResults();
      const bpmnMap = await loadBpmnMap();

      // Build ProcessGraph using the new implementation
      const graph = buildProcessGraph(parseResults, {
        bpmnMap,
        preferredRootProcessId: file.file_name.replace('.bpmn', ''),
      });

      // Build ProcessTree from graph
      const tree = buildProcessTreeFromGraph(graph, {
        rootProcessId: file.file_name.replace('.bpmn', ''),
        preferredRootFile: file.file_name,
        artifactBuilder: () => [],
      });

      // Create summary
      const summary = createGraphSummaryFromNewGraph(graph, tree);
      if (hierarchyJob) {
        await updateGenerationJob(hierarchyJob.id, { progress: 1 });
      }

      // Extract dependencies from graph edges
      const dependenciesToInsert: Array<{ parent_file: string; child_process: string; child_file: string }> = [];
      for (const edge of graph.edges.values()) {
        if (edge.type === 'subprocess') {
          const fromNode = graph.nodes.get(edge.from);
          const toNode = graph.nodes.get(edge.to);
          if (fromNode && toNode && toNode.type === 'process') {
            dependenciesToInsert.push({
              parent_file: fromNode.bpmnFile,
              child_process: fromNode.bpmnElementId,
              child_file: toNode.bpmnFile,
            });
          }
        }
      }

      if (dependenciesToInsert.length > 0) {
        const { error: depError } = await supabase
          .from('bpmn_dependencies')
          .upsert(dependenciesToInsert, {
            onConflict: 'parent_file,child_process',
            ignoreDuplicates: false,
          });

        if (depError) {
          console.error('Save dependencies error:', depError);
        }
      }
      if (hierarchyJob) {
        await updateGenerationJob(hierarchyJob.id, { progress: 2 });
      }

      // Extract Jira mappings from ProcessTree
      const mappingsToInsert: any[] = [];

      // Traverse tree and collect mappings using new Jira naming scheme
      const collectMappings = (
        node: ProcessTreeNode,
        parentPath: string[] = [],
      ): void => {
        // Skip root process node itself
        if (node.type !== 'process') {
          // Determine Jira type based on node type
          const jiraType =
            node.type === 'callActivity'
              ? 'feature goal'
              : node.type === 'userTask' || node.type === 'serviceTask' || node.type === 'businessRuleTask'
                ? 'epic'
                : null;

          // Use new Jira naming scheme: full path from root to node (excluding root)
          const jiraName = buildJiraName(node, tree, []);

          // Debug logging for specific node
          if (import.meta.env.DEV && node.bpmnElementId === 'calculate-household-affordability') {
            const fullPath = buildParentPath(node, tree);
            console.log('[handleBuildHierarchy] Jira name generation for calculate-household-affordability:', {
              nodeLabel: node.label,
              nodeType: node.type,
              bpmnFile: node.bpmnFile,
              fullPath,
              jiraName,
              rootLabel: tree.label,
            });
          }

          mappingsToInsert.push({
            bpmn_file: node.bpmnFile,
            element_id: node.bpmnElementId,
            jira_type: jiraType,
            jira_name: jiraName,
          });
        }

        // Recursively process children
        // parentPath is no longer used for naming, but kept for backward compatibility
        for (const child of node.children) {
          collectMappings(child, parentPath);
        }
      };

      collectMappings(tree);

      // Create base planned scenarios for all testable nodes in ProcessTree
      const scenariosToInsert = createPlannedScenariosFromTree(tree);
      const result = await savePlannedScenarios(scenariosToInsert, 'handleBuildHierarchy');

      if (!result.success) {
        toast({
          title: 'Varning',
          description: `Kunde inte spara alla planerade scenarion: ${result.error?.message || 'Okänt fel'}`,
          variant: 'destructive',
        });
      } else if (result.count > 0) {
        // Invalidate planned scenarios queries
        queryClient.invalidateQueries({ queryKey: ['global-planned-scenarios'] });
      }

      // Deduplicate mappings by bpmn_file:element_id to avoid PostgreSQL error:
      // "ON CONFLICT DO UPDATE command cannot affect row a second time"
      // This can happen if the same node appears multiple times in the tree
      const uniqueMappings = new Map<string, typeof mappingsToInsert[0]>();
      for (const mapping of mappingsToInsert) {
        const key = `${mapping.bpmn_file}:${mapping.element_id}`;
        // Keep the first occurrence (or we could keep the last one)
        if (!uniqueMappings.has(key)) {
          uniqueMappings.set(key, mapping);
        }
      }
      const deduplicatedMappings = Array.from(uniqueMappings.values());

      if (deduplicatedMappings.length > 0) {
        const { error: mappingsError } = await supabase
          .from('bpmn_element_mappings')
          .upsert(deduplicatedMappings, {
            onConflict: 'bpmn_file,element_id',
            ignoreDuplicates: false,
          });

        if (mappingsError) {
          console.error('Save element mappings error:', mappingsError);
        }
      }
      if (hierarchyJob) {
        await updateGenerationJob(hierarchyJob.id, { progress: 3 });
      }

      // Convert missing dependencies to the expected format
      const missingDeps = graph.missingDependencies.map((dep) => {
        const fromNode = graph.nodes.get(dep.fromNodeId);
        return {
          parent: fromNode?.bpmnFile || 'unknown',
          childProcess: dep.missingProcessId || dep.missingFileName || 'unknown',
        };
      });

      setHierarchyResult({
        fileName: file.file_name,
        filesAnalyzed: summary.filesIncluded,
        totalNodes: summary.totalNodes,
        totalFiles: summary.totalFiles,
        hierarchyDepth: summary.hierarchyDepth,
        missingDependencies: missingDeps,
      });
      setShowHierarchyReport(true);

      queryClient.invalidateQueries({ queryKey: ['root-bpmn-file'] });

      toast({
        title: 'Hierarki uppdaterad',
        description: `${summary.filesIncluded.length} filer analyserade. Öppna processträdet för att verifiera resultatet.`,
      });
      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'succeeded', {
          finished_at: new Date().toISOString(),
          progress: 3,
          result: {
            filesAnalyzed: summary.filesIncluded.length,
            totalNodes: summary.totalNodes,
            hierarchyDepth: summary.hierarchyDepth,
          },
        });
      }

      invalidateStructureQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-files'] }),
        queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] }),
      ]);
      // Force immediate refetch of files list
      await queryClient.refetchQueries({ queryKey: ['bpmn-files'] });
    } catch (error) {
      console.error('Hierarchy build error:', error);
      
      // Check if this is an authentication error (common after db reset)
      const isAuthError = error instanceof Error && (
        error.message.includes('User from sub claim in JWT does not exist') ||
        error.message.includes('JWT') ||
        error.message.includes('401') ||
        error.message.includes('403') ||
        (error as any).status === 401 ||
        (error as any).status === 403
      );

      if (isAuthError) {
        // Sign out and redirect to auth page
        await supabase.auth.signOut();
        toast({
          title: 'Session ogiltig',
          description: 'Din session är ogiltig (troligen efter databasreset). Logga in igen.',
          variant: 'destructive',
        });
        // Optionally redirect to auth page
        setTimeout(() => {
          window.location.href = '/#/auth';
        }, 2000);
        return;
      }

      toast({
        title: 'Hierarkibyggnad misslyckades',
        description: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
        variant: 'destructive',
      });
      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'failed', {
          error: error instanceof Error ? error.message : 'Okänt fel',
          finished_at: new Date().toISOString(),
        });
      }
    } finally {
      setTimeout(() => {
        setGeneratingFile(null);
        setActiveOperation(null);
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
      }, 200);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Sequential file upload to avoid race conditions with multiple file uploads
  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).filter(file =>
      file.name.endsWith('.bpmn') || file.name.endsWith('.dmn')
    );

    console.debug(`Starting sequential upload of ${files.length} files`);
    
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file);
        console.debug(`Successfully uploaded: ${file.name}`);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }
    
    console.debug('All file uploads completed');
  };

  const handleDownload = async (file: BpmnFile) => {
    const { data } = await supabase.storage
      .from('bpmn-files')
      .download(file.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteAllFiles = async () => {
    if (files.length === 0) return;

    setDeletingAll(true);
    setDeleteProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        await deleteMutation.mutateAsync(files[i].id);
        setDeleteProgress({ current: i + 1, total: files.length });
      }

      toast({
        title: 'Alla filer raderade',
        description: `${files.length} filer har tagits bort från alla lokationer`,
      });

      setShowDeleteAllDialog(false);
    } catch (error) {
      toast({
        title: 'Fel vid radering',
        description: 'Ett fel uppstod när filerna skulle tas bort',
        variant: 'destructive',
      });
    } finally {
      setDeletingAll(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  };

  const handleReset = async () => {
    setShowResetDialog(false);
    setOverlayMessage('Återställer registret');
    setOverlayDescription('Alla genererade artefakter och jobbkön tas bort (BPMN/DMN-filer behålls).');
    setShowTransitionOverlay(true);
    
    await resetGeneratedData({
      safeMode: true,
      deleteBpmn: false,
      deleteDmn: false,
      deleteDocs: true,
      deleteTests: true,
      deleteReports: true,
      deleteDorDod: true,
      deleteMappings: true,
      deleteAllTables: true,
      deleteGitHub: false,
      deleteTestResults: true,
    });

    invalidateStructureQueries(queryClient);
    invalidateArtifactQueries(queryClient);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['node-test-links'] }),
      queryClient.resetQueries({ queryKey: ['all-files-artifact-coverage'] }, { exact: true }),
      queryClient.resetQueries({ queryKey: ['file-artifact-coverage'] }),
      queryClient.resetQueries({ queryKey: ['process-tree'] }),
      queryClient.resetQueries({ queryKey: ['generation-jobs'] }, { exact: true }),
      queryClient.setQueryData(['generation-jobs'], []),
      queryClient.resetQueries({ queryKey: ['node-matrix'] }),
    ]);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setShowTransitionOverlay(false);
    setOverlayMessage('');
    setOverlayDescription('');
  };

  const currentGenerationLabel =
    generationMode === 'local'
      ? 'Lokal fallback (ingen LLM)'
      : llmProvider === 'cloud'
      ? 'ChatGPT (moln-LLM)'
      : 'Ollama (lokal LLM)';

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="files"
        onViewChange={handleViewChange}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
        isTestsEnabled={hasTests}
      />

      {/* main med min-w-0 så att tabeller och paneler inte orsakar global horisontell scroll */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="container mx-auto py-8 px-4 relative">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">BPMN & DMN Filhantering</h1>
            <p className="text-muted-foreground">
              Hantera dina BPMN- och DMN-filer, registrera status och generera artefakter för hela hierarkin.
            </p>
          </div>

      {/* Upload Area */}
      <Card className="p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Ladda upp filer</h2>
            <p className="text-sm text-muted-foreground">
              Dra och släpp eller välj filer att ladda upp
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFromGithub}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4" />
            )}
            {syncMutation.isPending ? 'Synkar...' : 'Synka från GitHub'}
          </Button>
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Släpp .bpmn eller .dmn filer här
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            eller klicka för att välja filer
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".bpmn,.dmn"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Välj filer
            </label>
          </Button>
        </div>
      </Card>
      
      <Card className="p-6 mb-8 border-dashed border-muted-foreground/40 bg-muted/10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold">Genereringsläge</h2>
            <Badge variant="outline">
              {currentGenerationLabel}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.hash = '/registry-status')}
              className="gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Registry Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.hash = '/graph-debug')}
              className="gap-2"
              title="Debug ProcessGraph (nodes, edges, cycles, missing dependencies)"
            >
              <GitBranch className="w-4 h-4" />
              Graph Debug
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.hash = '/tree-debug')}
              className="gap-2"
              title="Debug ProcessTree (hierarchy, orderIndex, diagnostics)"
            >
              <GitBranch className="w-4 h-4" />
              Tree Debug
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              disabled={isResetting}
              className="gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Återställer...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reset registret
                </>
              )}
            </Button>
            {files.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAllDialog(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Radera alla filer
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={generatingFile !== null || isLoading || !rootFileName}
              onClick={async () => {
                if (!rootFileName) return;
                const root = files.find((f) => f.file_name === rootFileName);
                if (!root) return;
                await handleBuildHierarchy(root);
              }}
              className="gap-2"
            >
              <GitBranch className="w-4 h-4" />
              Bygg/uppdatera hierarki från root
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={validatingMap}
              onClick={handleValidateBpmnMap}
              className="gap-2"
              title="Validera bpmn-map.json mot aktuella BPMN-filer"
            >
              {validatingMap ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Validerar BPMN-karta…
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Validera BPMN-karta
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={generatingFile !== null || isLoading || files.length === 0 || !rootFileName}
              onClick={handleGenerateAllArtifacts}
              className="gap-2"
              title="Generera dokumentation, tester och DoR/DoD för alla BPMN-filer baserat på befintlig hierarki"
            >
              {generationMode === 'local' ? (
                <FileText className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Generera dokumentation/tester (alla filer)
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              size="sm"
              variant={generationMode === 'local' ? 'default' : 'outline'}
              className={`gap-2 ${
                generationMode === 'local'
                  ? 'ring-2 ring-primary shadow-sm'
                  : 'opacity-80'
              }`}
              onClick={() => setGenerationMode('local')}
              aria-pressed={generationMode === 'local'}
            >
              <FileText className="w-4 h-4" />
              Local (ingen LLM)
            </Button>
            <Button
              size="sm"
              variant={generationMode === 'slow' && llmProvider === 'cloud' ? 'default' : 'outline'}
              className={`gap-2 ${
                generationMode === 'slow' && llmProvider === 'cloud'
                  ? 'ring-2 ring-primary shadow-sm'
                  : 'opacity-80'
              }`}
              onClick={() => {
                setLlmMode('slow');
                setGenerationMode('slow');
                setLlmProvider('cloud');
              }}
              aria-pressed={generationMode === 'slow' && llmProvider === 'cloud'}
            >
              <Sparkles className="w-4 h-4" />
              ChatGPT (moln-LLM)
            </Button>
            <Button
              size="sm"
              variant={generationMode === 'slow' && llmProvider === 'local' ? 'default' : 'outline'}
              className={`gap-2 ${
                generationMode === 'slow' && llmProvider === 'local'
                  ? 'ring-2 ring-primary shadow-sm'
                  : 'opacity-80'
              }`}
              onClick={() => {
                setLlmMode('slow');
                setGenerationMode('slow');
                setLlmProvider('local');
              }}
              aria-pressed={generationMode === 'slow' && llmProvider === 'local'}
              title={
                !llmHealth?.local.available
                  ? `Kan inte nå lokal LLM-motor – kontrollera att Ollama körs. ${llmHealth?.local.error ? `Fel: ${llmHealth.local.error}` : ''}`
                  : undefined
              }
            >
              <FileCode className="w-4 h-4" />
              Ollama (lokal LLM)
              {llmHealthLoading ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : llmHealth?.local.available ? (
                <Badge variant="outline" className="ml-1 text-xs bg-green-50 text-green-700 border-green-200">
                  Tillgänglig
                  {llmHealth.local.latencyMs && ` (${llmHealth.local.latencyMs}ms)`}
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-1 text-xs bg-red-50 text-red-700 border-red-200">
                  Ej tillgänglig
                </Badge>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant={
                generatingFile !== null ||
                isLoading ||
                !selectedFile ||
                selectedFile.file_type !== 'bpmn'
                  ? 'outline'
                  : 'default'
              }
              disabled={
                generatingFile !== null ||
                isLoading ||
                !selectedFile ||
                selectedFile.file_type !== 'bpmn'
              }
              onClick={handleGenerateSelectedFile}
              className="gap-2"
              title={!selectedFile ? 'Välj en BPMN-fil i listan för att generera' : undefined}
            >
              {generatingFile && selectedFile ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Genererar artefakter…
                </>
              ) : (
                <>
                  {generationMode === 'local' ? (
                    <FileText className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Generera artefakter för vald fil
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {showTransitionOverlay && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border shadow-lg rounded-lg p-8 flex flex-col items-center gap-4 text-center max-w-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-lg">{overlayMessage || 'Arbetar...'}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {overlayDescription || 'Vi synkar struktur och artefakter.'}
              </p>
            </div>
            {generationProgress && (
              <div className="w-full text-left text-sm bg-muted/30 rounded-md p-3">
                <p className="font-medium text-foreground">Pågående steg</p>
                <p className="text-muted-foreground">{generationProgress.step}</p>
                {generationProgress.detail && (
                  <p className="text-xs text-muted-foreground/80 mt-1">{generationProgress.detail}</p>
                )}
              </div>
            )}
            {(graphTotals.nodes > 0 ||
              docUploadProgress.planned > 0 ||
              testUploadProgress.planned > 0) && (
              <div className="w-full text-xs bg-muted/30 rounded-md p-3 space-y-1">
                {graphTotals.nodes > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Noder i process (dokumentation)</span>
                    <span className="font-medium">
                      {docgenProgress.completed}/{graphTotals.nodes}
                    </span>
                  </div>
                )}
                {docUploadProgress.planned > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dokumentation (HTML-filer)</span>
                    <span className="font-medium">
                      {docUploadProgress.completed}/{docUploadProgress.planned}
                    </span>
                  </div>
                )}
                {testUploadProgress.planned > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Testfiler</span>
                    <span className="font-medium">
                      {testUploadProgress.completed}/{testUploadProgress.planned}
                    </span>
                  </div>
                )}
              </div>
            )}
            {(activeOperation === 'llm' || activeOperation === 'local') && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCancelGeneration}
                disabled={cancelGeneration}
              >
                {cancelGeneration ? 'Avbryter...' : 'Avbryt körning'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Du kan luta dig tillbaka under tiden.
            </p>
          </div>
        </div>
      )}

      {/* Sync Report */}
      {showSyncReport && syncResult && (
        <Card className="p-6 mb-8">
          <Collapsible open={showSyncReport} onOpenChange={setShowSyncReport}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <h3 className="text-lg font-semibold">Synk-rapport från GitHub</h3>
                <Button variant="ghost" size="sm">
                  {showSyncReport ? 'Dölj' : 'Visa'}
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {syncResult.added.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Tillagda filer ({syncResult.added.length})
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.added.map((f) => (
                      <li key={f.file_name}>• {f.file_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.updated.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" />
                    Uppdaterade filer ({syncResult.updated.length})
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.updated.map((f) => (
                      <li key={f.file_name}>• {f.file_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.unchanged.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                    Oförändrade filer ({syncResult.unchanged.length})
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {syncResult.unchanged.length} filer är redan uppdaterade
                  </p>
                </div>
              )}

              {syncResult.orphanedInDb.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Endast i databasen ({syncResult.orphanedInDb.length})
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Dessa filer finns i databasen men inte längre i GitHub:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.orphanedInDb.map((f) => (
                      <li key={f.file_name}>• {f.file_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Fel ({syncResult.errors.length})
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.errors.map((e) => (
                      <li key={e.file_name}>
                        • {e.file_name}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Generation Report Dialog */}
      <Dialog open={showGenerationReport} onOpenChange={setShowGenerationReport}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Genereringsrapport - {generationResult?.fileName}
              {generationResult?.fileName?.includes('Alla filer') && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Sammanfattning)
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {generationResult?.fileName?.includes('Alla filer')
                ? 'Sammanfattning över alla genererade artefakter för alla filer'
                : 'Detaljerad översikt över alla genererade artefakter'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold text-sm">Filer</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.filesAnalyzed.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Analyserade BPMN-filer</p>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold text-sm">Tester</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.testFiles.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Testfiler skapade</p>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <h4 className="font-semibold text-sm">Dokumentation</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.docFiles.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">HTML-filer skapade</p>
              </div>
            </div>

            {/* Analyzed Files */}
            {generationResult && generationResult.filesAnalyzed.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Analyserade BPMN-filer ({generationResult.filesAnalyzed.length})
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {generationResult.filesAnalyzed.map((file, i) => (
                    <li key={i}>• {file}</li>
                  ))}
                </ul>
              </div>
            )}
            {generationResult?.skippedSubprocesses && generationResult.skippedSubprocesses.length > 0 && (
              <div className="border rounded-lg p-4 bg-amber-50">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Saknade subprocesser ({generationResult.skippedSubprocesses.length})
                </h3>
                <p className="text-sm text-amber-800 mb-2">
                  Dessa Call Activities saknar BPMN-fil. Dokumentation och tester genererades inte för dem.
                </p>
                <ul className="text-sm space-y-1 text-amber-800">
                  {generationResult.skippedSubprocesses.slice(0, 15).map((subprocess, i) => (
                    <li key={i}>• {subprocess}</li>
                  ))}
                </ul>
                {generationResult.skippedSubprocesses.length > 15 && (
                  <p className="text-xs text-amber-700 mt-1">
                    ...och {generationResult.skippedSubprocesses.length - 15} till
                  </p>
                )}
              </div>
            )}

            {/* Test Files */}
            {generationResult && generationResult.testFiles.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Testfiler ({generationResult.testFiles.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {generationResult.testFiles.map((testFile, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                      <div className="font-medium mb-1">{testFile.fileName}</div>
                      {testFile.elements.length > 0 && (
                        <ul className="text-xs text-muted-foreground pl-4 space-y-0.5">
                          {testFile.elements.slice(0, 5).map((el, j) => (
                            <li key={j}>• {el.name} ({el.id})</li>
                          ))}
                          {testFile.elements.length > 5 && (
                            <li className="italic">...och {testFile.elements.length - 5} fler element</li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation Files */}
            {generationResult && generationResult.docFiles.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumentationsfiler ({generationResult.docFiles.length})
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {generationResult.docFiles.map((doc, i) => (
                    <li key={i}>• {doc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Jira Mappings */}
            {generationResult && generationResult.jiraMappings.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Jira-mappningar ({generationResult.jiraMappings.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {generationResult.jiraMappings.slice(0, 15).map((mapping, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                      <div className="font-medium">{mapping.elementName}</div>
                      <div className="text-xs text-muted-foreground">
                        Type: {mapping.jiraType} | Jira: {mapping.jiraName}
                      </div>
                    </div>
                  ))}
                  {generationResult.jiraMappings.length > 15 && (
                    <p className="text-xs text-muted-foreground italic">
                      ...och {generationResult.jiraMappings.length - 15} fler
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Subprocess Mappings */}
            {generationResult && generationResult.subprocessMappings.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Subprocess-mappningar ({generationResult.subprocessMappings.length})
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {generationResult.subprocessMappings.map((mapping, i) => (
                    <li key={i}>
                      • {mapping.callActivity} → {mapping.subprocessFile}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Alla artefakter har genererats och sparats!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hierarchy Report Dialog */}
      <Dialog open={showHierarchyReport} onOpenChange={setShowHierarchyReport}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Hierarkisammanställning - {hierarchyResult?.fileName}
            </DialogTitle>
            <DialogDescription>
              Uppdatera strukturdata separat och verifiera i processträdet innan du genererar dokumentation och tester.
            </DialogDescription>
          </DialogHeader>

          {hierarchyResult ? (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-xs text-muted-foreground uppercase">BPMN-filer</p>
                  <p className="text-2xl font-bold">{hierarchyResult.totalFiles}</p>
                  <p className="text-xs text-muted-foreground mt-1">Analyserade filer</p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-xs text-muted-foreground uppercase">Noder</p>
                  <p className="text-2xl font-bold">{hierarchyResult.totalNodes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Totalt i hierarkin</p>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                  <p className="text-xs text-muted-foreground uppercase">Djup</p>
                  <p className="text-2xl font-bold">{hierarchyResult.hierarchyDepth}</p>
                  <p className="text-xs text-muted-foreground mt-1">Maximala nivåer</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Filer i hierarkin ({hierarchyResult.filesAnalyzed.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {hierarchyResult.filesAnalyzed.map(fileName => (
                    <Badge key={fileName} variant="secondary">
                      {fileName}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Saknade subprocess-filer
                </h4>
                {hierarchyResult.missingDependencies.length > 0 ? (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {hierarchyResult.missingDependencies.map((dep, idx) => (
                      <li key={`${dep.parent}-${dep.childProcess}-${idx}`}>
                        • {dep.parent} refererar till "{dep.childProcess}" utan uppladdad fil
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Inga saknade subprocess-referenser hittades.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Öppna nod-matrisen eller registreringsstatusen i nya flikar för att dubbelkolla strukturen visuellt.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.open('#/node-matrix', '_blank')}>
                    Visa nod-matris
                  </Button>
                  <Button variant="outline" onClick={() => window.open('#/registry-status', '_blank')}>
                    Statusvy
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen hierarkidata att visa.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Files */}
      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filnamn</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Storlek</TableHead>
              <TableHead>Senast uppdaterad</TableHead>
              <TableHead>GitHub-status</TableHead>
              <TableHead>Struktur & artefakter</TableHead>
              <TableHead>Senaste jobb</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Laddar filer...
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Inga filer uppladdade ännu
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                <TableRow
                  key={file.id}
                  className={
                    isSelected
                      ? 'bg-muted/60 border-l-4 border-primary/70'
                      : 'hover:bg-muted/30 cursor-pointer'
                  }
                  onClick={() => setSelectedFile(file)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {file.file_name}
                      {file.has_structure_changes && (
                        <div className="relative group">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-50">
                            ⚠️ Nya subprocess-filer har upptäckts som påverkar denna process. 
                            Generera om artefakter för att inkludera dem.
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {file.file_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {file.file_type === 'bpmn' ? (
                      rootFileName && file.file_name === rootFileName ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <GitBranch className="w-3 h-3" />
                          Toppnod
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Övrig BPMN-fil
                        </Badge>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(file.last_updated_at)}
                  </TableCell>
                  <TableCell>
                    {file.github_synced ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Synkad
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Ej synkad
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {file.file_type === 'bpmn' && coverageMap?.get(file.file_name) ? (
                        <>
                          <ArtifactStatusBadge
                            icon="📄"
                            label="Dok"
                            status={coverageMap.get(file.file_name)!.docs.status}
                            covered={coverageMap.get(file.file_name)!.docs.covered}
                            total={coverageMap.get(file.file_name)!.docs.total}
                            title={(() => {
                              const summary = artifactStatusByFile.get(file.file_name);
                              if (!summary) return undefined;
                              const snap = summary.doc;
                              if (snap.status === 'missing') {
                                return 'Ingen dokumentation genererad ännu.';
                              }
                              const providerLabel =
                                (snap as any).llmProvider === 'cloud'
                                  ? 'ChatGPT'
                                  : (snap as any).llmProvider === 'local'
                                  ? 'Ollama'
                                  : (snap as any).llmProvider === 'fallback' || snap.mode === 'local'
                                  ? 'Lokal fallback'
                                  : undefined;
                              const modeLabel =
                                snap.mode === 'slow'
                                  ? providerLabel
                                    ? `LLM (${providerLabel})`
                                    : 'Slow LLM'
                                  : snap.mode === 'local'
                                  ? 'Lokal fallback'
                                  : 'Okänt läge';
                              const timeStr = snap.generatedAt
                                ? new Date(snap.generatedAt).toLocaleString('sv-SE')
                                : '';
                              const durationText =
                                snap.durationMs !== undefined && snap.durationMs > 0
                                  ? ` · Körtid: ${formatDuration(snap.durationMs)}`
                                  : '';
                              const outdatedText = snap.outdated
                                ? ' (inaktuell – BPMN har ändrats efter generering)'
                                : '';
                              return `Dokumentation: ${modeLabel}${
                                timeStr ? ` · ${timeStr}` : ''
                              }${durationText}${outdatedText}`;
                            })()}
                          />
                          <ArtifactStatusBadge
                            icon="🧪"
                            label="Test"
                            status={coverageMap.get(file.file_name)!.tests.status}
                            covered={coverageMap.get(file.file_name)!.tests.covered}
                            total={coverageMap.get(file.file_name)!.tests.total}
                            title={(() => {
                              const summary = artifactStatusByFile.get(file.file_name);
                              if (!summary) return undefined;
                              const snap = summary.test;
                              if (snap.status === 'missing') {
                                return 'Inga tester genererade ännu.';
                              }
                              const providerLabel =
                                (snap as any).llmProvider === 'cloud'
                                  ? 'ChatGPT'
                                  : (snap as any).llmProvider === 'local'
                                  ? 'Ollama'
                                  : (snap as any).llmProvider === 'fallback' || snap.mode === 'local'
                                  ? 'Lokal fallback'
                                  : undefined;
                              const modeLabel =
                                snap.mode === 'slow'
                                  ? providerLabel
                                    ? `LLM (${providerLabel})`
                                    : 'Slow LLM'
                                  : snap.mode === 'local'
                                  ? 'Lokal fallback'
                                  : 'Okänt läge';
                              const timeStr = snap.generatedAt
                                ? new Date(snap.generatedAt).toLocaleString('sv-SE')
                                : '';
                              const outdatedText = snap.outdated ? ' (inaktuella – BPMN har ändrats efter generering)' : '';
                              return `Tester: ${modeLabel}${timeStr ? ` · ${timeStr}` : ''}${outdatedText}`;
                            })()}
                          />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {file.file_type === 'dmn' ? 'DMN-filer stöds ej' : 'Laddar...'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {file.file_type === 'bpmn' && artifactStatusByFile.get(file.file_name)?.latestJob ? (
                      (() => {
                        const latest = artifactStatusByFile.get(file.file_name)!.latestJob!;
                        const providerLabel =
                          (latest.result as any)?.llmProvider === 'cloud'
                            ? 'ChatGPT'
                            : (latest.result as any)?.llmProvider === 'local'
                            ? 'Ollama'
                            : (latest.result as any)?.llmProvider === 'fallback' || latest.mode === 'local'
                            ? 'Lokal fallback'
                            : undefined;
                        const modeLabel =
                          latest.mode === 'slow'
                            ? providerLabel
                              ? `LLM (${providerLabel})`
                              : 'Slow LLM'
                            : latest.mode === 'local'
                            ? 'Lokal fallback'
                            : 'Okänt';
                        const statusLabel = formatStatusLabel(latest.status);
                        const timeStr = (latest.finishedAt || latest.startedAt)
                          ? new Date(latest.finishedAt || latest.startedAt!).toLocaleTimeString('sv-SE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '';
                        return (
                          <div className="text-xs">
                            <Badge variant="outline" className="text-xs">
                              {modeLabel} · {statusLabel}
                              {timeStr ? ` · ${timeStr}` : ''}
                            </Badge>
                          </div>
                        );
                      })()
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Ingen körning
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {file.file_type === 'bpmn' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleBuildHierarchy(file);
                          }}
                          disabled={generatingFile !== null || isLoading}
                          title="Bygg/uppdatera hierarki för denna fil"
                        >
                          <GitBranch className="w-4 h-4" />
                          <span className="hidden sm:inline">Hierarki</span>
                        </Button>
                      )}
                      {file.file_type === 'bpmn' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleGenerateArtifacts(file, generationMode, 'file');
                          }}
                          disabled={generatingFile !== null || isLoading}
                          title="Generera dokumentation och tester för denna fil"
                        >
                          {generationMode === 'local' ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline ml-1">Docs/Test</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(file);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteFile(file);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Job Queue */}
      <Card className="mt-6">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Jobb & historik</h3>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {generationJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga aktiva jobb – alla genereringar är klara just nu.
              </p>
            ) : (
              <ul className="space-y-3">
                {generationJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-2 border rounded-lg p-3"
                  >
                    {(() => {
                      const jobResult = (job.result || {}) as {
                        docs?: number;
                        tests?: number;
                        dorDod?: number;
                        filesAnalyzed?: string[];
                        mode?: string;
                        skippedSubprocesses?: string[];
                        llmProvider?: 'cloud' | 'local' | 'fallback';
                      };
                      const providerLabel =
                        jobResult.llmProvider === 'cloud'
                          ? 'ChatGPT'
                          : jobResult.llmProvider === 'local'
                          ? 'Ollama'
                          : jobResult.llmProvider === 'fallback' || job.mode === 'local'
                          ? 'Lokal fallback'
                          : undefined;
                      const modeLabel =
                        job.mode === 'slow'
                          ? providerLabel
                            ? `LLM (${providerLabel})`
                            : 'Slow LLM'
                          : job.mode === 'local'
                          ? 'Lokal fallback'
                          : 'Okänt';
                      const statusLabel = formatStatusLabel(job.status);
                      const durationMs =
                        job.started_at && job.finished_at
                          ? new Date(job.finished_at).getTime() -
                            new Date(job.started_at).getTime()
                          : undefined;
                      return (
                        <>
                          <div className="flex-1">
                            <div className="text-sm font-semibold mb-1">
                              {job.file_name} · {modeLabel} · {statusLabel}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatOperationLabel(job.operation)} · Start:{' '}
                              {job.created_at
                                ? new Date(job.created_at).toLocaleTimeString('sv-SE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : 'okänd'}
                              {durationMs !== undefined && (
                                <> · Körtid: {formatDuration(durationMs)}</>
                              )}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1 space-y-1">
                              {job.status === 'running' && job.total ? (
                                <p>
                                  Steg {job.progress ?? 0} av {job.total}
                                </p>
                              ) : null}
                              {job.status === 'succeeded' && (
                                <p>
                                  {jobResult.docs ?? 0} dok · {jobResult.tests ?? 0} tester
                                </p>
                              )}
                              {jobResult.filesAnalyzed && jobResult.filesAnalyzed.length > 0 && (
                                <p className="line-clamp-1">
                                  Filer: {jobResult.filesAnalyzed.join(', ')}
                                </p>
                              )}
                              {Array.isArray(jobResult.skippedSubprocesses) &&
                                jobResult.skippedSubprocesses.length > 0 && (
                                  <p className="text-amber-600">
                                    Hoppade över {jobResult.skippedSubprocesses.length} subprocesser
                                  </p>
                                )}
                              {job.error && (
                                <p className="text-red-600">{job.error}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeClasses(job.status)}`}
                            >
                              {statusLabel}
                            </span>
                            {job.status === 'running' && (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                            {(job.status === 'running' || job.status === 'pending') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => abortGenerationJob(job)}
                              >
                                Stoppa
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort fil?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort <strong>{deleteFile?.file_name}</strong>?
              {deleteFile?.usage && (deleteFile.usage.dorDodCount > 0 || deleteFile.usage.testsCount > 0) && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                  <p className="font-medium text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Varning: Denna fil används av:
                  </p>
                  <ul className="mt-2 text-sm space-y-1">
                    {deleteFile.usage.testsCount > 0 && (
                      <li>• {deleteFile.usage.testsCount} tester</li>
                    )}
                    {deleteFile.usage.dorDodCount > 0 && (
                      <li>• {deleteFile.usage.dorDodCount} DoR/DoD-kriterier</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteFile) {
                  deleteMutation.mutate(deleteFile.id);
                  setDeleteFile(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Files Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera alla filer?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera <strong>alla {files.length} filer</strong>?
              <br /><br />
              Detta kommer att:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ta bort alla filer från databasen</li>
                <li>Ta bort alla filer från Supabase Storage</li>
                <li>Ta bort alla filer från GitHub</li>
              </ul>
              <br />
              <strong className="text-destructive">Denna åtgärd kan inte ångras!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingAll && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">
                  Raderar filer... ({deleteProgress.current} av {deleteProgress.total})
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-destructive h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllFiles}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Raderar...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Radera alla
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Registry Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset registret?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detta rensar genererade artefakter och jobbhistorik (BPMN/DMN-källfiler behålls) och loggar ut dig.
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Genererad dokumentation, tester, DoR/DoD, node references, llm-debug, testresultat</li>
                <li>Jobbkön och jobbhistorik (generation_jobs, llm_generation_logs m.fl.)</li>
                <li>Element-mappningar, Jira-metadata och beroenden</li>
                <li>Cache/session rensas – du loggas ut efter reset</li>
              </ul>
              <br />
              BPMN- och DMN-källfiler sparas. Använd “Radera alla filer” om källfiler också ska tas bort.
              <br /><br />
              <strong className="text-destructive">Denna åtgärd stoppar alla jobb och kan inte ångras!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Återställer...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset registret
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showMapValidationDialog} onOpenChange={setShowMapValidationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BPMN-kartvalidering</DialogTitle>
            <DialogDescription>
              Jämförelse mellan bpmn-map.json och aktuella BPMN-filer. Använd detta som checklista för att fylla i saknade subprocess-kopplingar.
            </DialogDescription>
          </DialogHeader>
          {mapValidationResult && (
            <div className="mt-4 space-y-6 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="rounded-md border bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Omatchade call activities</p>
                  <p className="font-semibold">
                    {mapValidationResult.summary.unmapped_call_activities}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Saknas i map</p>
                  <p className="font-semibold">
                    {mapValidationResult.summary.call_activities_missing_in_map}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Saknade subprocess-filer</p>
                  <p className="font-semibold">
                    {mapValidationResult.summary.missing_subprocess_files}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Map-inkonsekvenser</p>
                  <p className="font-semibold">
                    {mapValidationResult.summary.map_inconsistencies}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/60 p-2">
                  <p className="text-xs text-muted-foreground">Orphan-processer</p>
                  <p className="font-semibold">
                    {mapValidationResult.summary.orphan_processes}
                  </p>
                </div>
              </div>

              {mapValidationResult.unmapped_call_activities.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Call activities utan subprocess_bpmn_file:</p>
                  <ul className="space-y-1">
                    {mapValidationResult.unmapped_call_activities.slice(0, 20).map((item: any, idx: number) => (
                      <li key={`unmapped-${idx}`} className="text-xs text-muted-foreground">
                        <code>{item.bpmn_file}</code> · <code>{item.bpmn_id}</code> – {item.name}
                      </li>
                    ))}
                    {mapValidationResult.unmapped_call_activities.length > 20 && (
                      <li className="text-xs text-muted-foreground">
                        …och {mapValidationResult.unmapped_call_activities.length - 20} till
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {mapValidationResult.call_activities_missing_in_map.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Call activities som finns i BPMN men saknas i bpmn-map.json:</p>
                  <ul className="space-y-1">
                    {mapValidationResult.call_activities_missing_in_map.slice(0, 20).map((item: any, idx: number) => (
                      <li key={`missing-${idx}`} className="text-xs text-muted-foreground">
                        <code>{item.bpmn_file}</code> · <code>{item.bpmn_id}</code> – {item.name}
                      </li>
                    ))}
                    {mapValidationResult.call_activities_missing_in_map.length > 20 && (
                      <li className="text-xs text-muted-foreground">
                        …och {mapValidationResult.call_activities_missing_in_map.length - 20} till
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {mapValidationResult.missing_subprocess_files.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Subprocess-filer som anges i map men saknas i registret:</p>
                  <ul className="space-y-1">
                    {mapValidationResult.missing_subprocess_files.map((item: any, idx: number) => (
                      <li key={`miss-sub-${idx}`} className="text-xs text-muted-foreground">
                        <code>{item.bpmn_file}</code> · <code>{item.bpmn_id}</code> →{' '}
                        <code>{item.subprocess_bpmn_file}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {mapValidationResult.orphan_processes.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Orphan-processer:</p>
                  <ul className="space-y-1">
                    {mapValidationResult.orphan_processes.map((item: any, idx: number) => (
                      <li key={`orphan-${idx}`} className="text-xs text-muted-foreground">
                        <code>{item.bpmn_file}</code> – {item.hint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </main>
    </div>
  );
}
