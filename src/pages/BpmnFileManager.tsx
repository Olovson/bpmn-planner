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
import { savePlannedScenarios } from '@/lib/plannedScenariosHelper';
import { useGenerationJobs, type GenerationJob, type GenerationOperation, type GenerationStatus } from '@/hooks/useGenerationJobs';
import { AppHeaderWithTabs, type ViewKey } from '@/components/AppHeaderWithTabs';
import { navigateToView } from '@/utils/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { buildDocStoragePaths, buildTestStoragePaths } from '@/lib/artifactPaths';
import { getCurrentVersionHash } from '@/lib/bpmnVersioning';
import { isPGRST204Error, getSchemaErrorMessage } from '@/lib/schemaVerification';
import { useLlmHealth } from '@/hooks/useLlmHealth';
import { getAllUnresolvedDiffs } from '@/lib/bpmnDiffRegeneration';
import { VersionSelector } from '@/components/VersionSelector';
import { useVersionSelection } from '@/hooks/useVersionSelection';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import { useFileUpload } from '@/pages/BpmnFileManager/hooks/useFileUpload';
import { FileUploadArea } from '@/pages/BpmnFileManager/components/FileUploadArea';
import { FileTable } from '@/pages/BpmnFileManager/components/FileTable';
import { GenerationControls } from '@/pages/BpmnFileManager/components/GenerationControls';
import { useFileGeneration } from '@/pages/BpmnFileManager/hooks/useFileGeneration';
import { useTestGeneration } from '@/pages/BpmnFileManager/hooks/useTestGeneration';
import { useHierarchyBuilding } from '@/pages/BpmnFileManager/hooks/useHierarchyBuilding';
import { useBpmnMapManagement } from '@/pages/BpmnFileManager/hooks/useBpmnMapManagement';
import { useFileOperations } from '@/pages/BpmnFileManager/hooks/useFileOperations';
import { useReset } from '@/pages/BpmnFileManager/hooks/useReset';
import { useJobManagement } from '@/pages/BpmnFileManager/hooks/useJobManagement';
import { buildHierarchySilently } from '@/pages/BpmnFileManager/utils/hierarchyHelpers';
import { JobQueue } from '@/pages/BpmnFileManager/components/JobQueue';
import { SyncReport } from '@/pages/BpmnFileManager/components/SyncReport';
import { TransitionOverlay } from '@/pages/BpmnFileManager/components/TransitionOverlay';
import { HierarchyReportDialog } from '@/pages/BpmnFileManager/components/HierarchyReportDialog';
import { MapValidationDialog } from '@/pages/BpmnFileManager/components/MapValidationDialog';
import { MapSuggestionsDialog } from '@/pages/BpmnFileManager/components/MapSuggestionsDialog';
import { DeleteFileDialog } from '@/pages/BpmnFileManager/components/DeleteFileDialog';
import { DeleteAllFilesDialog } from '@/pages/BpmnFileManager/components/DeleteAllFilesDialog';
import { ResetRegistryDialog } from '@/pages/BpmnFileManager/components/ResetRegistryDialog';
import type { DetailedGenerationResult, AggregatedGenerationResult, HierarchyBuildResult } from '@/pages/BpmnFileManager/types';
import type { MapSuggestion } from '@/lib/bpmn/bpmnMapSuggestions';

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
  
  // Use job management hook
  const { refreshGenerationJobs, createJob, updateJob, abortJob, setStatus } = useJobManagement({ generationJobs });
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
  const [mapSuggestionTotalFiles, setMapSuggestionTotalFiles] = useState<number | undefined>(undefined);
  const [mapSuggestionHasEnoughFiles, setMapSuggestionHasEnoughFiles] = useState<boolean>(true);
  const [showMapValidationDialog, setShowMapValidationDialog] = useState(false);
  const [mapValidationResult, setMapValidationResult] = useState<any | null>(null);

  // Callback för att hantera map suggestions med filinformation
  const handleMapSuggestions = useCallback((suggestions: MapSuggestion[], result?: { totalFiles?: number; hasEnoughFilesForReliableMatching?: boolean }) => {
    setMapSuggestions(suggestions);
    if (result) {
      setMapSuggestionTotalFiles(result.totalFiles);
      setMapSuggestionHasEnoughFiles(result.hasEnoughFilesForReliableMatching ?? true);
    }
  }, []);

  // Use file upload hook
  const fileUpload = useFileUpload(
    handleMapSuggestions,
    setShowMapSuggestionsDialog,
    setAcceptedSuggestions,
  );

  // Define resetGenerationState BEFORE it's used in hooks
  const resetGenerationState = useCallback(() => {
    cancelGenerationRef.current = false;
    setCancelGeneration(false);
    hasGenerationResultRef.current = false;
    setCurrentGenerationStep(null);
    setGraphTotals({ files: 0, nodes: 0 });
    setDocgenProgress({ completed: 0, total: 0 });
    setDocUploadProgress({ planned: 0, completed: 0 });
    setGenerationPlan(null);
    setGenerationProgress(null);
    setGenerationDialogResult(null);
    // Skapa ny AbortController för nästa generering
    abortControllerRef.current = new AbortController();
  }, [
    setCancelGeneration,
    setCurrentGenerationStep,
    setGraphTotals,
    setDocgenProgress,
    setDocUploadProgress,
    setGenerationPlan,
    setGenerationProgress,
    setGenerationDialogResult,
    cancelGenerationRef,
    hasGenerationResultRef,
    abortControllerRef,
  ]);

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
    setShowGenerationDialog,
    setGenerationProgress,
    setGenerationDialogResult,
  });

  // Use hierarchy building hook
  const { handleBuildHierarchy } = useHierarchyBuilding({
    refreshGenerationJobs,
    resetGenerationState,
    setGeneratingFile,
    setOverlayMessage,
    setOverlayDescription,
    setShowTransitionOverlay,
    setHierarchyResult,
    setShowHierarchyReport,
  });

  // Use BPMN map management hook
  const { handleValidateBpmnMap, handleSaveUpdatedMap, handleRegenerateBpmnMap, handleExportUpdatedMap } = useBpmnMapManagement({
    setValidatingMap,
    setMapValidationResult,
    setShowMapValidationDialog,
    mapSuggestions,
    acceptedSuggestions,
    setBpmnMapValidation,
    setRegeneratingMap,
    setShowMapSuggestionsDialog,
  });

  // Use file operations hook
  const { handleDownload, handleDeleteAllFiles } = useFileOperations({
    files,
    setDeletingAll,
    setDeleteProgress,
    setShowDeleteAllDialog,
  });

  // Use reset hook
  const { handleReset } = useReset({
    setShowResetDialog,
    setOverlayMessage,
    setOverlayDescription,
    setShowTransitionOverlay,
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

  // Invalidera och refetch coverage cache när komponenten mountar för att säkerställa korrekt räkning
  // Detta behövs efter kodändringar som påverkar coverage-räkningen
  useEffect(() => {
    // Invalidera och refetch coverage queries för att hämta ny data med korrekt räkning
    // Använd removeQueries för att tvinga bort gammal cache, sedan refetch
    queryClient.removeQueries({ queryKey: ['all-files-artifact-coverage'] });
    queryClient.removeQueries({ queryKey: ['file-artifact-coverage'] });
    // Force refetch för att säkerställa att ny data hämtas
    queryClient.refetchQueries({ queryKey: ['all-files-artifact-coverage'] });
  }, []); // Kör bara en gång när komponenten mountar

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
        // Error checking hierarchy status - non-critical
        setHierarchyBuilt(false);
      }
    };

    checkHierarchyStatus();
  }, [rootFileName, files.length]);
  // showMapValidationDialog and mapValidationResult are now defined above, before useBpmnMapManagement

  const handleViewChange = (view: string) => {
    navigateToView(navigate, view as ViewKey);
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

  // handleValidateBpmnMap is now provided by the useBpmnMapManagement hook (see line 300)
  // resetGenerationState is now defined above, before useHierarchyBuilding (see line 203)

  const checkCancellation = () => {
    if (cancelGenerationRef.current) {
      throw new Error('Avbrutet av användaren');
    }
  };

  const logGenerationProgress = (modeLabel: string, step: string, detail?: string) => {
    setCurrentGenerationStep({ step, detail });
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
          await abortJob(runningJob);
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



  // buildHierarchySilently, handleGenerateAllArtifacts, and handleGenerateSelectedFile
  // are now provided by the useFileGeneration hook and hierarchyHelpers.ts (see line 89 and 243)
  // handleBuildHierarchy is now provided by the useHierarchyBuilding hook (see line 288)

  // handleSaveUpdatedMap, handleRegenerateBpmnMap, and handleExportUpdatedMap
  // are now provided by the useBpmnMapManagement hook (see line 300)

  // handleDownload and handleDeleteAllFiles are now provided by the useFileOperations hook (see line 313)


  // handleReset is now provided by the useReset hook (see line 323)

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
      
      <GenerationControls
        generationMode={generationMode}
        llmProvider={llmProvider}
        onModeChange={(mode, provider) => {
          setLlmMode(mode);
          setGenerationMode(mode);
          setLlmProvider(provider);
        }}
        generatingFile={generatingFile}
        isLoading={isLoading}
        selectedFile={selectedFile}
        files={files}
        rootFileName={rootFileName}
        onGenerateSelected={handleGenerateSelectedFile}
        onGenerateAll={handleGenerateAllArtifacts}
        onGenerateTestsSelected={handleGenerateTestsForSelectedFile}
        onGenerateTestsAll={handleGenerateTestsForAllFiles}
        llmHealth={llmHealth}
        llmHealthLoading={llmHealthLoading}
        showAdvancedTools={showAdvancedTools}
        onToggleAdvancedTools={setShowAdvancedTools}
        onValidateBpmnMap={handleValidateBpmnMap}
        onReset={() => setShowResetDialog(true)}
        onDeleteAll={() => setShowDeleteAllDialog(true)}
        validatingMap={validatingMap}
        isResetting={isResetting}
        currentGenerationLabel={currentGenerationLabel}
      />

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

      <TransitionOverlay
        show={showTransitionOverlay && !showGenerationDialog}
        message={overlayMessage}
        description={overlayDescription}
        currentStep={currentGenerationStep}
        graphTotals={graphTotals}
        docgenProgress={docgenProgress}
        docUploadProgress={docUploadProgress}
        activeOperation={activeOperation}
        cancelGeneration={cancelGeneration}
        onCancel={handleCancelGeneration}
      />

      <SyncReport
        syncResult={syncResult}
        showSyncReport={showSyncReport}
        onToggle={setShowSyncReport}
      />

      <HierarchyReportDialog
        open={showHierarchyReport}
        onOpenChange={setShowHierarchyReport}
        hierarchyResult={hierarchyResult}
      />

      {/* Files */}
      <FileTable
        files={files}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
        isLoading={isLoading}
        fileFilter={fileFilter}
        onFilterChange={setFileFilter}
        fileSortBy={fileSortBy}
        onSortChange={setFileSortBy}
        coverageMap={coverageMap}
        artifactStatusByFile={artifactStatusByFile}
        generatingFile={generatingFile}
        generationMode={generationMode}
        onBuildHierarchy={handleBuildHierarchy}
        onGenerateArtifacts={handleGenerateArtifacts}
        onDownload={handleDownload}
        onDelete={setDeleteFile}
      />

      <JobQueue generationJobs={generationJobs} onAbortJob={abortJob} />

      <DeleteFileDialog
        deleteFile={deleteFile}
        onOpenChange={(open) => !open && setDeleteFile(null)}
        onConfirm={() => {
          if (deleteFile) {
            deleteMutation.mutate(deleteFile.id);
            setDeleteFile(null);
          }
        }}
      />

      <DeleteAllFilesDialog
        open={showDeleteAllDialog}
        onOpenChange={setShowDeleteAllDialog}
        filesCount={files.length}
        deletingAll={deletingAll}
        deleteProgress={deleteProgress}
        onConfirm={handleDeleteAllFiles}
      />

      <ResetRegistryDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        isResetting={isResetting}
        onConfirm={handleReset}
      />

      <MapValidationDialog
        open={showMapValidationDialog}
        onOpenChange={setShowMapValidationDialog}
        mapValidationResult={mapValidationResult}
      />

      <MapSuggestionsDialog
        open={showMapSuggestionsDialog}
        onOpenChange={setShowMapSuggestionsDialog}
        mapSuggestions={mapSuggestions}
        acceptedSuggestions={acceptedSuggestions}
        onAcceptedSuggestionsChange={setAcceptedSuggestions}
        onExport={handleExportUpdatedMap}
        onSave={handleSaveUpdatedMap}
      />
      </div>
      </main>
    </div>
  );
}
