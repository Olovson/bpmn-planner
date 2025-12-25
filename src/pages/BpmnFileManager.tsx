import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, FileCode, Upload, Trash2, Download, CheckCircle2, XCircle, AlertCircle, GitBranch, Loader2, Sparkles, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Search, Filter, History, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBpmnFiles, useUploadBpmnFile, useDeleteBpmnFile, BpmnFile } from '@/hooks/useBpmnFiles';
import { useSyncFromGithub, SyncResult } from '@/hooks/useSyncFromGithub';
import { supabase } from '@/integrations/supabase/client';
import { useAllFilesArtifactCoverage } from '@/hooks/useFileArtifactCoverage';
import { pickRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { ArtifactStatusBadge } from '@/components/ArtifactStatusBadge';
import { GenerationDialog, type GenerationPlan, type GenerationProgress, type GenerationResult } from '@/components/GenerationDialog';
import { buildBpmnProcessGraph, createGraphSummary, getTestableNodes } from '@/lib/bpmnProcessGraph';
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
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';
import { isPGRST204Error, getSchemaErrorMessage } from '@/lib/schemaVerification';
import { useLlmHealth } from '@/hooks/useLlmHealth';
import { getAllUnresolvedDiffs } from '@/lib/bpmnDiffRegeneration';
import { VersionSelector } from '@/components/VersionSelector';
import { useVersionSelection } from '@/hooks/useVersionSelection';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite hanterar JSON-import enligt bundler-konfigurationen.
import userTaskEpicsList from '../../user-task-epics-list.json';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { useFileUpload } from '@/pages/BpmnFileManager/hooks/useFileUpload';
import { FileUploadArea } from '@/pages/BpmnFileManager/components/FileUploadArea';
import { useFileGeneration } from '@/pages/BpmnFileManager/hooks/useFileGeneration';
import { useTestGeneration } from '@/pages/BpmnFileManager/hooks/useTestGeneration';
import { buildHierarchySilently } from '@/pages/BpmnFileManager/utils/hierarchyHelpers';
import type { DetailedGenerationResult, AggregatedGenerationResult, HierarchyBuildResult } from '@/pages/BpmnFileManager/types';

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
  
  const uploadMutation = useUploadBpmnFile();
  const deleteMutation = useDeleteBpmnFile();
  const syncMutation = useSyncFromGithub();
  const { data: coverageMap } = useAllFilesArtifactCoverage();
  const { data: generationJobs = [] } = useGenerationJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { selection, setSelection, getVersionHashForFile } = useVersionSelection();
  const { hasTests } = useArtifactAvailability();
  const { data: llmHealth, isLoading: llmHealthLoading } = useLlmHealth();
  const [deleteFile, setDeleteFile] = useState<BpmnFile | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncReport, setShowSyncReport] = useState(false);
  const [generatingFile, setGeneratingFile] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<'llm' | 'hierarchy' | null>(null);
  const [bpmnMapValidation, setBpmnMapValidation] = useState<{ valid: boolean; error?: string; details?: string; source?: string } | null>(null);
  const [regeneratingMap, setRegeneratingMap] = useState(false);
  
  
  const [generationResult, setGenerationResult] = useState<DetailedGenerationResult | null>(null);
  const [showGenerationReport, setShowGenerationReport] = useState(false);
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generationPlan, setGenerationPlan] = useState<GenerationPlan | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [generationDialogResult, setGenerationDialogResult] = useState<GenerationResult | null>(null);
  const [hierarchyResult, setHierarchyResult] = useState<HierarchyBuildResult | null>(null);
  const [showHierarchyReport, setShowHierarchyReport] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  const [overlayDescription, setOverlayDescription] = useState('');
  const [currentGenerationStep, setCurrentGenerationStep] = useState<{ step: string; detail?: string } | null>(null);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [fileFilter, setFileFilter] = useState<'all' | 'bpmn' | 'dmn'>('all');
  const [fileSortBy, setFileSortBy] = useState<{
    column: 'name' | 'size' | 'updated' | 'artifacts';
    direction: 'asc' | 'desc';
  }>({ column: 'name', direction: 'asc' });
  const [hierarchyBuilt, setHierarchyBuilt] = useState(false);
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
  // Playwright-testfiler har tagits bort - testUploadProgress används inte längre
  const testUploadProgress = { planned: 0, completed: 0 }; // Placeholder för kompatibilitet
  const cancelGenerationRef = useRef(false);
  const [cancelGeneration, setCancelGeneration] = useState(false);
  // Global AbortController för att avbryta pågående LLM-anrop
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasGenerationResultRef = useRef(false); // Track if result was set
  const [llmMode, setLlmMode] = useState<LlmGenerationMode>(() => getLlmGenerationMode());
  const llmModeDetails = getLlmModeConfig(llmMode);
  type GenerationMode = LlmGenerationMode; // 'slow'
  const [generationMode, setGenerationMode] = useState<GenerationMode>('slow');
  const [llmProvider, setLlmProvider] = useState<LlmProvider>(() => {
    // Läs från localStorage om det finns, annars default till 'cloud'
    const stored = localStorage.getItem('llmProvider');
    return (stored === 'cloud' || stored === 'ollama') ? stored : 'cloud';
  });
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<BpmnFile | null>(null);
  const [rootFileName, setRootFileName] = useState<string | null>(null);
  const [validatingMap, setValidatingMap] = useState(false);
  const [unresolvedDiffsCount, setUnresolvedDiffsCount] = useState(0);
  const [mapSuggestions, setMapSuggestions] = useState<MapSuggestion[]>([]);
  const [showMapSuggestionsDialog, setShowMapSuggestionsDialog] = useState(false);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  // Use file upload hook
  const fileUpload = useFileUpload(
    setMapSuggestions,
    setShowMapSuggestionsDialog,
    setAcceptedSuggestions,
  );

  // Use file generation hook
  const { handleGenerateArtifacts, handleGenerateAllArtifacts, handleGenerateSelectedFile } = useFileGeneration({
    files,
    rootFileName,
    generationMode,
    llmProvider,
    getVersionHashForFile,
    refreshGenerationJobs,
    setGeneratingFile,
    setActiveOperation,
    setShowGenerationDialog,
    setGenerationPlan,
    setGenerationProgress,
    setGenerationDialogResult,
    setCurrentGenerationStep,
    setGraphTotals,
    setDocgenProgress,
    setDocUploadProgress,
    setOverlayMessage,
    setOverlayDescription,
    setShowTransitionOverlay,
    cancelGenerationRef,
    hasGenerationResultRef,
    abortControllerRef,
    generationPlan,
    docgenProgress,
    currentGenerationStep,
    overlayDescription,
    setCancelGeneration,
    selectedFile,
  });

  // Use test generation hook
  const { handleGenerateTestsForSelectedFile, handleGenerateTestsForAllFiles } = useTestGeneration({
    files,
    rootFileName,
    generationMode,
    selectedFile,
    setGeneratingFile,
    setCurrentGenerationStep,
  });

  // Load unresolved diffs count
  const loadUnresolvedDiffsCount = useCallback(async () => {
    try {
      const unresolvedDiffs = await getAllUnresolvedDiffs();
      const totalCount = Array.from(unresolvedDiffs.values()).reduce((sum, set) => sum + set.size, 0);
      setUnresolvedDiffsCount(totalCount);
    } catch (error) {
      console.warn('[BpmnFileManager] Error loading unresolved diffs count:', error);
    }
  }, []);

  useEffect(() => {
    loadUnresolvedDiffsCount();
    // Refresh when files change
  }, [files, loadUnresolvedDiffsCount]);

  // Validera bpmn-map.json när komponenten mountar eller när filer laddas
  // OBS: Vi validerar även när det inte finns filer, men visar bara varningar om det finns filer
  useEffect(() => {
    const validateBpmnMap = async () => {
      try {
        const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
        const result = await loadBpmnMapFromStorage();
        setBpmnMapValidation({
          valid: result.valid,
          error: result.error,
          details: result.details,
          source: result.source,
        });
        
        // Visa bara felmeddelanden om det finns filer (annars är det inte relevant)
        if (!result.valid && files.length > 0) {
          // Visa tydligt felmeddelande om filen är korrupt
          toast({
            title: '⚠️ bpmn-map.json har problem',
            description: result.error || 'Filen kan inte användas för generering',
            variant: 'destructive',
            duration: 10000, // Visa längre tid för viktiga meddelanden
          });
        }
      } catch (error) {
        console.error('[BpmnFileManager] Error validating bpmn-map:', error);
      }
    };
    validateBpmnMap();
    const interval = setInterval(loadUnresolvedDiffsCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [files, loadUnresolvedDiffsCount]);

  // Check if hierarchy has been built when files or rootFileName changes
  useEffect(() => {
    const checkHierarchyStatus = async () => {
      if (!rootFileName || files.length === 0) {
        setHierarchyBuilt(false);
        return;
      }

      try {
        // Check if we have Jira mappings for the root file (indicates hierarchy was built)
        const { data: mappings, error } = await supabase
          .from('bpmn_element_mappings')
          .select('bpmn_file')
          .eq('bpmn_file', rootFileName)
          .limit(1);

        if (!error && mappings && mappings.length > 0) {
          setHierarchyBuilt(true);
        } else {
          setHierarchyBuilt(false);
        }
      } catch (err) {
        console.warn('[BpmnFileManager] Error checking hierarchy status:', err);
        setHierarchyBuilt(false);
      }
    };

    checkHierarchyStatus();
  }, [rootFileName, files.length]);
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
    mode: 'slow' | null;
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
      mode: 'slow' | null;
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
        job.operation === 'llm_generation'
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
      const { loadBpmnMapFromStorageSimple } = await import('@/lib/bpmn/bpmnMapStorage');
      const currentMap = await loadBpmnMapFromStorageSimple();
      const mapProcesses = currentMap.processes;

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
        typeof currentMap.orchestration?.root_process === 'string'
          ? `${currentMap.orchestration.root_process}.bpmn`
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
    cancelGenerationRef.current = false;
    hasGenerationResultRef.current = false; // Reset result ref
    setCurrentGenerationStep(null);
    setGraphTotals({ files: 0, nodes: 0 });
    setDocgenProgress({ completed: 0, total: 0 });
    setDocUploadProgress({ planned: 0, completed: 0 });
    // Playwright-testfiler har tagits bort - setTestUploadProgress används inte längre
    // setTestUploadProgress({ planned: 0, completed: 0 });
    setGenerationPlan(null);
    setGenerationProgress(null);
    setGenerationDialogResult(null);
    // Skapa ny AbortController för nästa generering
    abortControllerRef.current = new AbortController();
  };

  const checkCancellation = () => {
    if (cancelGenerationRef.current) {
      throw new Error('Avbrutet av användaren');
    }
  };

  const logGenerationProgress = (modeLabel: string, step: string, detail?: string) => {
    setCurrentGenerationStep({ step, detail });
  };

  const createGenerationJob = async (
    fileName: string,
    operation: GenerationOperation,
    mode?: 'slow',
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
    
    // Abort alla pågående LLM-anrop
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      // Markera aktuellt jobb som avbrutet i databasen om vi hittar det.
      // Detta kan misslyckas (t.ex. nätverksfel), men UI ska ändå lämna
      // "kör"-läget och popupen ska stängas.
      if (generatingFile) {
        const runningJob = generationJobs.find(
          (job) =>
            job.status === 'running' &&
            job.operation === 'llm_generation' &&
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
      // - stäng overlay och generation dialog
      // - lämna running-läget
      // - återställ all generation state
      // Själva generatorn i bakgrunden får sedan själv hantera isCancelled.
      setGeneratingFile(null);
      setActiveOperation(null);
      setShowTransitionOverlay(false);
      setShowGenerationDialog(false); // Stäng den nya generation dialogen
      setOverlayMessage('');
      setOverlayDescription('');
      setCurrentGenerationStep(null);
      resetGenerationState(); // Återställ all generation state
    }
  };

  // handleGenerateArtifacts, handleGenerateAllArtifacts, and handleGenerateSelectedFile
  // are now provided by the useFileGeneration hook (see line 243)

  // buildHierarchySilently is now imported from hierarchyHelpers.ts (see line 89)

  // handleGenerateAllArtifacts and handleGenerateSelectedFile are now provided by the useFileGeneration hook

  // buildHierarchySilently, handleGenerateAllArtifacts, and handleGenerateSelectedFile
  // are now provided by the useFileGeneration hook and hierarchyHelpers.ts (see line 89 and 243)
  
  // handleGenerateTestsForSelectedFile and handleGenerateTestsForAllFiles
  // are now provided by the useTestGeneration hook (see line 276)

  // handleGenerateArtifacts, handleGenerateAllArtifacts, and handleGenerateSelectedFile
  // are now provided by the useFileGeneration hook (see line 243)

  // Create nodeFilter for User Task epics from the list
  const createUserTaskEpicFilter = (): ((node: BpmnProcessNode) => boolean) => {
    // Create a Set for fast lookup: "bpmnFile:elementId"
    const epicKeys = new Set(
      (userTaskEpicsList as Array<{ bpmnFile: string; elementId: string }>).map(
        epic => `${epic.bpmnFile}:${epic.elementId}`
      )
    );

    return (node: BpmnProcessNode): boolean => {
      // Only process User Tasks
      if (node.type !== 'userTask') {
        return false;
      }
      
      // Check if this epic is in our list
      const key = `${node.bpmnFile}:${node.bpmnElementId}`;
      return epicKeys.has(key);
    };
  };

  // buildHierarchySilently, handleGenerateAllArtifacts, and handleGenerateSelectedFile
  // are now provided by the useFileGeneration hook and hierarchyHelpers.ts (see line 89 and 243)

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
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          toast({
            title: 'Användare saknas',
            description: 'Din användare finns inte i databasen. Logga in igen.',
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Error checking user:', error);
        toast({
          title: 'Fel vid användarkontroll',
          description: 'Kunde inte verifiera användare. Försök igen.',
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

      // Invalidate queries to refresh UI
      invalidateStructureQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
      ]);

      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'succeeded', {
          finished_at: new Date().toISOString(),
          progress: 3,
          total: 3,
        });
      }

      toast({
        title: 'Hierarki byggd',
        description: `Hierarkin för ${file.file_name.replace('.bpmn', '')} har byggts och sparats.`,
      });
    } catch (error) {
      console.error('Error building hierarchy:', error);
      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'failed', {
          error: error instanceof Error ? error.message : 'Okänt fel',
          finished_at: new Date().toISOString(),
        });
      }
      toast({
        title: 'Fel vid hierarkibyggnad',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setGeneratingFile(null);
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
      }, 200);
    }
  };

  // buildHierarchySilently, handleGenerateAllArtifacts, and handleGenerateSelectedFile
  // are now provided by the useFileGeneration hook and hierarchyHelpers.ts (see line 89 and 243)

  const analyzeAndSuggestMapUpdates = async () => {
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

      // Invalidate queries to refresh UI
      invalidateStructureQueries(queryClient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-element-mappings'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
      ]);

      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'succeeded', {
          finished_at: new Date().toISOString(),
          progress: 3,
          total: 3,
        });
      }

      toast({
        title: 'Hierarki byggd',
        description: `Hierarkin för ${file.file_name.replace('.bpmn', '')} har byggts och sparats.`,
      });
    } catch (error) {
      console.error('Error building hierarchy:', error);
      if (hierarchyJob) {
        await setJobStatus(hierarchyJob.id, 'failed', {
          error: error instanceof Error ? error.message : 'Okänt fel',
          finished_at: new Date().toISOString(),
        });
      }
      toast({
        title: 'Fel vid hierarkibyggnad',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setGeneratingFile(null);
        setShowTransitionOverlay(false);
        setOverlayMessage('');
        setOverlayDescription('');
      }, 200);
    }
  };

  const handleSaveUpdatedMap = async (syncToGitHub: boolean = false) => {
    try {
      const { loadBpmnMapFromStorageSimple, saveBpmnMapToStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const { generateUpdatedBpmnMap } = await import('@/lib/bpmn/bpmnMapSuggestions');
      const currentMap = await loadBpmnMapFromStorageSimple();
      const updatedMap = generateUpdatedBpmnMap(currentMap, mapSuggestions, acceptedSuggestions, undefined);
      
      const result = await saveBpmnMapToStorage(updatedMap, syncToGitHub);
      
      if (result.success) {
        toast({
          title: 'bpmn-map.json uppdaterad',
          description: result.githubSynced
            ? 'Filen har uppdaterats i Supabase storage och synkats till GitHub.'
            : 'Filen har uppdaterats i Supabase storage.',
        });
        
        // Invalidera queries så att ny mappning laddas
        invalidateStructureQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        await queryClient.invalidateQueries({ queryKey: ['process-graph'] });
        
        setShowMapSuggestionsDialog(false);
      } else {
        toast({
          title: 'Uppdatering misslyckades',
          description: result.error || 'Kunde inte spara bpmn-map.json',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[BpmnFileManager] Error saving map:', error);
      toast({
        title: 'Uppdatering misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    }
  };
  
  const handleRegenerateBpmnMap = async () => {
    try {
      setRegeneratingMap(true);
      
      const { generateBpmnMapFromFiles } = await import('@/lib/bpmn/bpmnMapAutoGenerator');
      const generatedMap = await generateBpmnMapFromFiles();
      
      const { saveBpmnMapToStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const result = await saveBpmnMapToStorage(generatedMap, false);
      
      if (result.success) {
        toast({
          title: 'bpmn-map.json genererad',
          description: `Map genererad från ${generatedMap.processes.length} processer. ${generatedMap.processes.reduce((sum, p) => sum + (p.call_activities?.filter(ca => ca.needs_manual_review).length || 0), 0)} matchningar behöver granskning.`,
        });
        
        // Invalidera queries och validera map igen
        invalidateStructureQueries(queryClient);
        await queryClient.invalidateQueries({ queryKey: ['process-tree'] });
        await queryClient.invalidateQueries({ queryKey: ['process-graph'] });
        
        // Validera map igen
        const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
        const validationResult = await loadBpmnMapFromStorage();
        setBpmnMapValidation({
          valid: validationResult.valid,
          error: validationResult.error,
          details: validationResult.details,
          source: validationResult.source,
        });
      } else {
        toast({
          title: 'Generering misslyckades',
          description: result.error || 'Kunde inte spara den genererade map:en',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[BpmnFileManager] Error regenerating map:', error);
      toast({
        title: 'Generering misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingMap(false);
    }
  };

  const handleExportUpdatedMap = async () => {
    // Fallback: exportera som fil om användaren vill ha det manuellt
    const { loadBpmnMapFromStorageSimple } = await import('@/lib/bpmn/bpmnMapStorage');
    const { generateUpdatedBpmnMap } = await import('@/lib/bpmn/bpmnMapSuggestions');
    const currentMap = await loadBpmnMapFromStorageSimple();
    const updatedMap = generateUpdatedBpmnMap(currentMap, mapSuggestions, acceptedSuggestions, undefined);
    
    const jsonStr = JSON.stringify(updatedMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bpmn-map-updated.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'bpmn-map.json exporterad',
      description: 'Den uppdaterade filen har laddats ner.',
    });
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
    llmProvider === 'cloud'
      ? 'Claude (moln-LLM)'
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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">BPMN & DMN Filhantering</h1>
              <p className="text-muted-foreground">
                Hantera dina BPMN- och DMN-filer, registrera status och generera artefakter för hela hierarkin.
              </p>
            </div>
            {unresolvedDiffsCount > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate('/bpmn-diff')}
                className="gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Diff-översikt
                <Badge variant="destructive" className="ml-1">
                  {unresolvedDiffsCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Version Selector - Global version selection for all BPMN files */}
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Versionsval</h3>
                  <p className="text-xs text-muted-foreground">
                    Välj vilken version av BPMN-filer som ska användas i hela appen
                  </p>
                </div>
              </div>
              <VersionSelector
                selectedFileName={selection.selectedFileName}
                onVersionChange={(versionHash, fileName) => {
                  setSelection({
                    selectedVersionHash: versionHash,
                    selectedFileName: fileName,
                  });
                }}
              />
            </div>
          </Card>

      {/* Upload Area */}
      <FileUploadArea
        dragActive={fileUpload.dragActive}
        pendingFiles={fileUpload.pendingFiles}
        onDrag={fileUpload.handleDrag}
        onDrop={fileUpload.handleDrop}
        onFiles={fileUpload.handleFiles}
        onUploadPending={() => fileUpload.uploadFiles(fileUpload.pendingFiles)}
        onCancelPending={() => fileUpload.setPendingFiles([])}
        onSyncFromGithub={handleSyncFromGithub}
        syncPending={syncMutation.isPending}
      />

      {/* Varning om bpmn-map.json har problem - visa bara om det finns filer */}
      {bpmnMapValidation && !bpmnMapValidation.valid && files.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ bpmn-map.json har problem</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="font-medium mb-1">{bpmnMapValidation.error}</p>
            {bpmnMapValidation.details && (
              <p className="text-sm mb-2">{bpmnMapValidation.details}</p>
            )}
            <p className="text-sm mb-3">
              <strong>Viktigt:</strong> Generering kan misslyckas eller ge felaktiga resultat om filen är korrupt.
              Kontrollera filen i storage eller använd projektfilen som fallback.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateBpmnMap}
              disabled={regeneratingMap}
            >
              {regeneratingMap ? 'Genererar...' : 'Generera bpmn-map.json automatiskt'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
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
            {/* Primary actions will be moved below */}
          </div>
          
          {/* Advanced Tools - Collapsible */}
          <Collapsible open={showAdvancedTools} onOpenChange={setShowAdvancedTools}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 gap-2 text-muted-foreground hover:text-foreground"
              >
                {showAdvancedTools ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Dölj avancerade verktyg
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Visa avancerade verktyg
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="flex flex-wrap gap-2 pt-2 border-t">
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
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="flex flex-wrap gap-2 mt-4">
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
              Claude (moln-LLM)
            </Button>
            <Button
              size="sm"
              variant={generationMode === 'slow' && llmProvider === 'ollama' ? 'default' : 'outline'}
              className={`gap-2 ${
                generationMode === 'slow' && llmProvider === 'ollama'
                  ? 'ring-2 ring-primary shadow-sm'
                  : 'opacity-80'
              }`}
              onClick={() => {
                setLlmMode('slow');
                setGenerationMode('slow');
                setLlmProvider('ollama');
              }}
              aria-pressed={generationMode === 'slow' && llmProvider === 'ollama'}
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
              title={!selectedFile ? 'Välj en BPMN-fil i listan för att generera dokumentation' : 'Generera dokumentation och DoR/DoD för vald fil. Testgenerering sker i separat steg.'}
            >
              {generatingFile && selectedFile ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Genererar information…
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Generera information för vald fil
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={generatingFile !== null || isLoading || files.length === 0 || !rootFileName}
              onClick={handleGenerateAllArtifacts}
              className="gap-2"
              title="Generera dokumentation och DoR/DoD för alla BPMN-filer. Hierarkin byggs automatiskt först. Testgenerering sker i separat steg."
            >
              <Sparkles className="w-4 h-4" />
              Generera information (alla filer)
            </Button>
          </div>
          
          {/* User Task Epic Regeneration Button */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              variant="secondary"
              disabled={
                generatingFile !== null ||
                isLoading ||
                files.length === 0 ||
                !rootFileName ||
                !userTaskEpicsList ||
                (userTaskEpicsList as any[]).length === 0
              }
              onClick={handleRegenerateUserTaskEpics}
              className="gap-2"
              title={
                !userTaskEpicsList || (userTaskEpicsList as any[]).length === 0
                  ? 'Kör "node scripts/list-all-user-task-epics.mjs" först för att skapa listan'
                  : `Regenerera ${(userTaskEpicsList as any[]).length} User Task epics med uppdaterad lane inference-logik. Detta genererar endast User Tasks, inte alla noder.`
              }
            >
              {generatingFile === 'user-task-epics' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Regenererar User Task epics…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Regenerera User Task epics
                </>
              )}
            </Button>
          </div>
          
          {/* Test Generation Buttons */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              disabled={
                generatingFile !== null ||
                isLoading ||
                !selectedFile ||
                selectedFile.file_type !== 'bpmn'
              }
              onClick={handleGenerateTestsForSelectedFile}
              className="gap-2"
              title={!selectedFile ? 'Välj en BPMN-fil i listan för att generera tester' : 'Generera testfiler och testscenarion för vald fil. Kräver att dokumentation redan är genererad.'}
            >
              {generatingFile && selectedFile ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Genererar tester…
                </>
              ) : (
                <>
                  <FileCode className="w-3 h-3" />
                  Generera testinformation för vald fil
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={generatingFile !== null || isLoading || files.length === 0}
              onClick={handleGenerateTestsForAllFiles}
              className="gap-2"
              title="Generera E2E-scenarios och Feature Goal-test scenarios för alla BPMN-filer. Kräver att dokumentation redan är genererad."
            >
              <FileCode className="w-4 h-4" />
              Generera testinformation (alla filer)
            </Button>
          </div>
        </div>
      </Card>

      {/* Generation Dialog - Consolidated popup */}
      <GenerationDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        plan={generationPlan || undefined}
        progress={generationProgress || undefined}
        result={generationDialogResult || undefined}
        onStart={undefined}
        onCancel={handleCancelGeneration}
        onClose={() => {
          setShowGenerationDialog(false);
          resetGenerationState();
          // Rensa också result när dialogen stängs
          setGenerationDialogResult(null);
        }}
        showCancel={!!generationProgress}
      />

      {/* Legacy overlay - only show if generation dialog is not open */}
      {showTransitionOverlay && !showGenerationDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border shadow-lg rounded-lg p-8 flex flex-col items-center gap-4 text-center max-w-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-lg">{overlayMessage || 'Arbetar...'}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {overlayDescription || 'Vi synkar struktur och artefakter.'}
              </p>
            </div>
            {currentGenerationStep && (
              <div className="w-full text-left text-sm bg-muted/30 rounded-md p-3">
                <p className="font-medium text-foreground">Pågående steg</p>
                <p className="text-muted-foreground">{currentGenerationStep.step}</p>
                {currentGenerationStep.detail && (
                  <p className="text-xs text-muted-foreground/80 mt-1">{currentGenerationStep.detail}</p>
                )}
              </div>
            )}
            {(graphTotals.nodes > 0 ||
              docUploadProgress.planned > 0) && ( // Playwright-testfiler har tagits bort
              <div className="w-full text-xs bg-muted/30 rounded-md p-3 space-y-3">
                {graphTotals.nodes > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dokumentation</span>
                      <span className="font-medium">
                        {docgenProgress.completed} av {Math.max(docgenProgress.total || 0, graphTotals.nodes)} noder
                        {docgenProgress.total > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((docgenProgress.completed / Math.max(docgenProgress.total, 1)) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    {docgenProgress.total > 0 && (
                      <Progress 
                        value={(docgenProgress.completed / Math.max(docgenProgress.total, 1)) * 100} 
                        className="h-2"
                      />
                    )}
                  </div>
                )}
                {docUploadProgress.planned > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dokumentation (HTML-filer)</span>
                      <span className="font-medium">
                        {docUploadProgress.completed}/{docUploadProgress.planned}
                        {docUploadProgress.planned > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((docUploadProgress.completed / docUploadProgress.planned) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <Progress 
                      value={(docUploadProgress.completed / docUploadProgress.planned) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
                {/* Playwright-testfiler har tagits bort - testUploadProgress används inte längre */}
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

      {/* Generation Report Dialog - REMOVED: GenerationDialog visar redan resultatet */}

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
        {/* Filter and Sort Controls */}
        {files.length > 0 && (
          <div className="p-4 border-b flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrera:</span>
              <Select value={fileFilter} onValueChange={(value: 'all' | 'bpmn' | 'dmn') => setFileFilter(value)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla filer</SelectItem>
                  <SelectItem value="bpmn">BPMN</SelectItem>
                  <SelectItem value="dmn">DMN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              Visar {files.filter(f => fileFilter === 'all' || f.file_type === fileFilter).length} av {files.length} filer
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => {
                  setFileSortBy(prev => ({
                    column: 'name',
                    direction: prev.column === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
                  }));
                }}
              >
                <div className="flex items-center gap-2">
                  Filnamn
                  {fileSortBy.column === 'name' && (
                    fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => {
                  setFileSortBy(prev => ({
                    column: 'size',
                    direction: prev.column === 'size' && prev.direction === 'asc' ? 'desc' : 'asc'
                  }));
                }}
              >
                <div className="flex items-center gap-2">
                  Storlek
                  {fileSortBy.column === 'size' && (
                    fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => {
                  setFileSortBy(prev => ({
                    column: 'updated',
                    direction: prev.column === 'updated' && prev.direction === 'asc' ? 'desc' : 'asc'
                  }));
                }}
              >
                <div className="flex items-center gap-2">
                  Senast uppdaterad
                  {fileSortBy.column === 'updated' && (
                    fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => {
                  setFileSortBy(prev => ({
                    column: 'artifacts',
                    direction: prev.column === 'artifacts' && prev.direction === 'asc' ? 'desc' : 'asc'
                  }));
                }}
              >
                <div className="flex items-center gap-2">
                  Struktur & artefakter
                  {fileSortBy.column === 'artifacts' && (
                    fileSortBy.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Laddar filer...
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Inga filer uppladdade ännu
                </TableCell>
              </TableRow>
            ) : (() => {
              // Filter and sort files
              let filteredFiles = files.filter(f => fileFilter === 'all' || f.file_type === fileFilter);
              
              filteredFiles = [...filteredFiles].sort((a, b) => {
                let comparison = 0;
                
                switch (fileSortBy.column) {
                  case 'name':
                    comparison = a.file_name.localeCompare(b.file_name);
                    break;
                  case 'size':
                    comparison = (a.size_bytes || 0) - (b.size_bytes || 0);
                    break;
                  case 'updated':
                    comparison = new Date(a.last_updated_at).getTime() - new Date(b.last_updated_at).getTime();
                    break;
                  case 'artifacts': {
                    // Sortera efter antal dokumentation + tester
                    const aCoverage = coverageMap?.get(a.file_name);
                    const bCoverage = coverageMap?.get(b.file_name);
                    const aTotal = (aCoverage?.docs.covered || 0) + (aCoverage?.tests.covered || 0);
                    const bTotal = (bCoverage?.docs.covered || 0) + (bCoverage?.tests.covered || 0);
                    comparison = aTotal - bTotal;
                    break;
                  }
                  default:
                    return 0;
                }
                
                // Applicera sorteringsriktning
                return fileSortBy.direction === 'asc' ? comparison : -comparison;
              });

              return filteredFiles.map((file) => {
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
                  <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(file.last_updated_at)}
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
                                  ? 'Claude'
                                  : (snap as any).llmProvider === 'local'
                                  ? 'Ollama'
                                  : undefined;
                              const modeLabel =
                                snap.mode === 'slow'
                                  ? providerLabel
                                    ? `LLM (${providerLabel})`
                                    : 'Slow LLM'
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
                                  ? 'Claude'
                                  : (snap as any).llmProvider === 'local'
                                  ? 'Ollama'
                                  : undefined;
                              const modeLabel =
                                snap.mode === 'slow'
                                  ? providerLabel
                                    ? `LLM (${providerLabel})`
                                    : 'Slow LLM'
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
                          title="Generera dokumentation för denna fil (testgenerering sker i separat steg)"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">Dokumentation</span>
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
              );
              });
            })()}
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
                        llmProvider?: 'cloud' | 'local';
                      };
                      const providerLabel =
                        jobResult.llmProvider === 'cloud'
                          ? 'Claude'
                          : jobResult.llmProvider === 'ollama'
                          ? 'Ollama'
                          : undefined;
                      const modeLabel =
                        job.mode === 'slow'
                          ? providerLabel
                            ? `LLM (${providerLabel})`
                            : 'Slow LLM'
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
            </AlertDialogDescription>
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
            </AlertDialogDescription>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Detta kommer att:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ta bort alla filer från databasen</li>
                <li>Ta bort alla filer från Supabase Storage</li>
                <li>Ta bort alla filer från GitHub</li>
              </ul>
              <p className="mt-4">
              <strong className="text-destructive">Denna åtgärd kan inte ångras!</strong>
              </p>
            </div>
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
            </AlertDialogDescription>
            <div className="text-sm text-muted-foreground">
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Genererad dokumentation, tester, DoR/DoD, node references, llm-debug, testresultat</li>
                <li>Jobbkön och jobbhistorik (generation_jobs, llm_generation_logs m.fl.)</li>
                <li>Element-mappningar, Jira-metadata och beroenden</li>
                <li>Cache/session rensas – du loggas ut efter reset</li>
              </ul>
              <p className="mt-4">
              BPMN- och DMN-källfiler sparas. Använd “Radera alla filer” om källfiler också ska tas bort.
              </p>
              <p className="mt-4">
                <strong className="text-destructive">Denna åtgärd stoppar alla jobb och kan inte ångras!</strong>
              </p>
            </div>
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

      <Dialog open={showMapSuggestionsDialog} onOpenChange={setShowMapSuggestionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Föreslagna uppdateringar till bpmn-map.json</DialogTitle>
            <DialogDescription>
              Nya filer har analyserats och matchningar har gjorts automatiskt. Välj vilka uppdateringar du vill inkludera.
            </DialogDescription>
          </DialogHeader>
          {mapSuggestions.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {mapSuggestions.length} föreslagna matchningar
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allKeys = new Set(mapSuggestions.map(s => `${s.bpmn_file}::${s.bpmn_id}`));
                      setAcceptedSuggestions(allKeys);
                    }}
                  >
                    Välj alla
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAcceptedSuggestions(new Set())}
                  >
                    Avmarkera alla
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mapSuggestions.map((suggestion, idx) => {
                  const key = `${suggestion.bpmn_file}::${suggestion.bpmn_id}`;
                  const isAccepted = acceptedSuggestions.has(key);
                  const confidenceColor = 
                    suggestion.matchStatus === 'matched' ? 'text-green-600' :
                    suggestion.matchStatus === 'ambiguous' ? 'text-yellow-600' :
                    'text-orange-600';
                  
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 ${isAccepted ? 'bg-muted' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isAccepted}
                          onChange={(e) => {
                            const newSet = new Set(acceptedSuggestions);
                            if (e.target.checked) {
                              newSet.add(key);
                            } else {
                              newSet.delete(key);
                            }
                            setAcceptedSuggestions(newSet);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1 rounded">{suggestion.bpmn_file}</code>
                            <span className="text-sm font-medium">{suggestion.name}</span>
                            <Badge variant="outline" className={confidenceColor}>
                              {suggestion.matchStatus === 'matched' ? 'Hög konfidens' :
                               suggestion.matchStatus === 'ambiguous' ? 'Tvetydig' :
                               'Låg konfidens'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            → <code>{suggestion.suggested_subprocess_bpmn_file}</code>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.reason} (konfidens: {(suggestion.confidence * 100).toFixed(0)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowMapSuggestionsDialog(false)}
                >
                  Avbryt
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportUpdatedMap}
                  disabled={acceptedSuggestions.size === 0}
                >
                  Exportera som fil
                </Button>
                <Button
                  onClick={() => handleSaveUpdatedMap(false)}
                  disabled={acceptedSuggestions.size === 0}
                >
                  Spara i storage ({acceptedSuggestions.size} valda)
                </Button>
                <Button
                  onClick={() => handleSaveUpdatedMap(true)}
                  disabled={acceptedSuggestions.size === 0}
                >
                  Spara + synka till GitHub ({acceptedSuggestions.size} valda)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
      </main>
    </div>
  );
}
