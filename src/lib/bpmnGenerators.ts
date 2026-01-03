import { BpmnElement, BpmnSubprocess, parseBpmnFile } from '@/lib/bpmnParser';
import { generateTestCode } from '@/tests/meta/jiraBpmnMeta';
import { buildNodeDocumentationContext, type NodeDocumentationContext } from '@/lib/documentationContext';
import type { BpmnProcessNode } from '@/lib/bpmnProcessGraph';
import {
  renderFeatureGoalDoc,
  renderEpicDoc,
  renderBusinessRuleDoc,
  type TemplateLinks,
} from '@/lib/documentationTemplates';
import { wrapLlmContentAsDocument } from '@/lib/wrapLlmContent';
import { getNodeDocFileKey, getNodeTestFileKey, getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';
import { generateDocumentationWithLlm, type DocumentationDocType, type ChildNodeDocumentation } from '@/lib/llmDocumentation';
import { generateTestSpecWithLlm } from '@/lib/llmTests';
import type { LlmProvider } from './llmClientAbstraction';
import { getLlmClient, getDefaultLlmProvider } from './llmClients';
import { supabase } from '@/integrations/supabase/client';
import { storageFileExists, getDocumentationUrl } from '@/lib/artifactUrls';
import { buildDocStoragePaths } from '@/lib/artifactPaths';
import { isLlmEnabled } from '@/lib/llmClient';
import { logLlmFallback } from '@/lib/llmMonitoring';
import { saveLlmDebugArtifact } from '@/lib/llmDebugStorage';
import { CloudLlmAccountInactiveError } from '@/lib/llmClients/cloudLlmClient';
import {
  buildProcessHierarchy,
  type NormalizedProcessDefinition,
} from '@/lib/bpmn/buildProcessHierarchy';
import {
  buildProcessDefinitionsFromRegistry,
  type ProcessRegistryEntry,
} from '@/lib/bpmn/processDefinition';
import {
  resolveProcessFileName,
  resolveProcessFileNameByInternalId,
  traverseHierarchy,
} from '@/lib/bpmn/hierarchyTraversal';
import type { HierarchyNode, SubprocessLink } from '@/lib/bpmn/types';
import {
  buildBpmnProcessGraph,
  createGraphSummary,
  getTestableNodes,
} from '@/lib/bpmnProcessGraph';
import { compareNodesByVisualOrder } from '@/lib/ganttDataConverter';
import {
  buildFlowGraph,
  findStartEvents,
  findPathsThroughProcess,
  type ProcessPath,
  type FlowGraph,
} from '@/lib/bpmnFlowExtractor';
import { testMapping, type TestScenario } from '@/data/testMapping';
import {
  savePlannedScenarios,
  type PlannedScenarioRow,
} from '@/lib/plannedScenariosHelper';
import type { ProcessTreeNode } from '@/lib/processTree';
import { buildProcessTreeFromGraph } from '@/lib/bpmn/buildProcessTreeFromGraph';
import type { EpicUserStory } from './epicDocTypes';
import type {
  GenerationPhaseKey,
  SubprocessSummary,
  NodeArtifactEntry,
  GenerationResult,
  ProgressReporter,
  PlannedScenarioProvider,
  PlannedScenarioMap,
} from './bpmnGenerators/types';

export type { GenerationPhaseKey };
import { getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';

// Legacy test generators have been moved to bpmnGenerators/legacyTestGenerators.ts
// Import and re-export for backward compatibility
import {
  generateNodeTests,
  generateExportReadyTestFromUserStory,
  generateTestSkeleton,
} from './bpmnGenerators/legacyTestGenerators';

export { generateNodeTests, generateExportReadyTestFromUserStory, generateTestSkeleton };

// Documentation rendering functions moved to bpmnGenerators/docRendering.ts
import {
  renderDocWithLlm,
  extractDocInfoFromJson,
  loadChildDocFromStorage,
  insertGenerationMeta,
} from './bpmnGenerators/docRendering';

// Documentation generator functions moved to bpmnGenerators/documentationGenerator.ts
import {
  parseSubprocessFile,
  parseDmnSummary,
  generateDocumentationHTML,
} from './bpmnGenerators/documentationGenerator';

// Scenario builders moved to bpmnGenerators/scenarioBuilders.ts
import {
  mapProviderToScenarioProvider,
  buildScenariosFromEpicUserStories,
  buildScenariosFromDocJson,
  buildTestSkeletonScenariosFromDocJson,
} from './bpmnGenerators/scenarioBuilders';

// Re-export types for backward compatibility
export type {
  SubprocessSummary,
  GenerationResult,
  ProgressReporter,
};

const FALLBACK_PROVIDER_ORDER: PlannedScenarioProvider[] = [
  'claude',
  'chatgpt', // Legacy
  'ollama',
];
const mapTestScenarioToSkeleton = (scenario: TestScenario) => ({
  name:
    scenario.id && scenario.name && scenario.id !== scenario.name
      ? `${scenario.id} – ${scenario.name}`
      : scenario.name || scenario.id || 'Scenario',
  description: scenario.description || '',
});

/**
 * Genererar alla artefakter från en BPMN-processgraf.
 * Denna funktion använder en hierarkisk analys för att ge bättre kontext.
 * 
 * @param bpmnFileName - Fil att generera för
 * @param existingBpmnFiles - Alla tillgängliga BPMN-filer
 * @param existingDmnFiles - Alla tillgängliga DMN-filer
 * @param useHierarchy - Om true, bygg processgraf först (rekommenderat för toppnivåfiler)
 */

// Topological sort function moved to bpmnGenerators/fileSorting.ts
import { topologicalSortFiles } from './bpmnGenerators/fileSorting';

export async function generateAllFromBpmnWithGraph(
  bpmnFileName: string,
  existingBpmnFiles: string[],
  existingDmnFiles: string[] = [],
  useHierarchy: boolean = false,
  useLlm: boolean = true,
  progressCallback?: ProgressReporter,
  generationSource?: string,
  llmProvider?: LlmProvider,
  /**
   * Optional filter function to determine which nodes should be generated.
   * Returns true if node should be generated, false to skip.
   * If not provided, all nodes are generated (default behavior).
   */
  nodeFilter?: (node: BpmnProcessNode) => boolean,
  /**
   * Optional function to get version hash for a BPMN file.
   * If provided, uses selected version instead of current version.
   */
  getVersionHashForFile?: (fileName: string) => Promise<string | null>,
  /**
   * Optional function to check if generation should be cancelled.
   * Should throw an error if cancellation is requested.
   */
  checkCancellation?: () => void,
  /**
   * Optional AbortSignal for cancelling LLM API calls.
   * Used to abort ongoing fetch requests (local LLM) and check before cloud LLM calls.
   */
  abortSignal?: AbortSignal,
  /**
   * Optional flag to indicate if this is the actual root file of the entire hierarchy.
   * If not provided, will be inferred from graphFileScope length.
   */
  isActualRootFile?: boolean,
  /**
   * Optional flag to force regeneration even if documentation already exists in Storage.
   * When true, Storage existence checks are bypassed and all nodes matching nodeFilter are regenerated.
   * Default: false (respects Storage existence checks).
   */
  forceRegenerate?: boolean,
): Promise<GenerationResult> {
  // Check if LLM is enabled when useLlm is true
  if (useLlm && !isLlmEnabled()) {
    const errorMessage = 
      'LLM is required for documentation generation but is disabled. ' +
      'Please check: VITE_USE_LLM=true and VITE_ANTHROPIC_API_KEY is set in your .env file.';
    console.error(`[generateAllFromBpmnWithGraph] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const reportProgress = async (phase: GenerationPhaseKey, label: string, detail?: string) => {
    if (progressCallback) {
      await progressCallback(phase, label, detail);
    }
  };
  const generationSourceLabel = generationSource ?? (useLlm ? 'llm' : 'local');
  const graphFileScope =
    useHierarchy && existingBpmnFiles.length > 0 ? existingBpmnFiles : [bpmnFileName];

  try {
    await reportProgress('graph:start', 'Analyserar BPMN-struktur', bpmnFileName);
    
    // Get version hashes for all files in scope
    const versionHashes = new Map<string, string | null>();
    if (getVersionHashForFile) {
      for (const fileName of graphFileScope) {
        try {
          const versionHash = await getVersionHashForFile(fileName);
          versionHashes.set(fileName, versionHash);
        } catch (error) {
          console.warn(`[generateAllFromBpmnWithGraph] Failed to get version hash for ${fileName}:`, error);
          versionHashes.set(fileName, null);
        }
      }
    }
    const graph = await buildBpmnProcessGraph(bpmnFileName, graphFileScope, versionHashes);
    const summary = createGraphSummary(graph);
    
    // Ladda bpmn-map för att avgöra om en fil är root-process
    let rootProcessId: string | null = null;
    try {
      const { loadBpmnMap } = await import('@/lib/bpmn/bpmnMapLoader');
      const { loadBpmnMapFromStorage } = await import('@/lib/bpmn/bpmnMapStorage');
      const bpmnMapResult = await loadBpmnMapFromStorage();
      if (bpmnMapResult.valid && bpmnMapResult.map) {
        rootProcessId = bpmnMapResult.map.orchestration?.root_process || null;
      }
    } catch (error) {
      // Om bpmn-map inte kan laddas, använd fallback-logik
      console.warn('[bpmnGenerators] Could not load bpmn-map.json, using fallback root detection:', error);
    }
    
    // VIKTIGT: Validera rootProcessId mot bpmnFileName
    // Om rootProcessId inte matchar bpmnFileName, använd bpmnFileName som fallback
    // Detta säkerställer att root-filen alltid identifieras korrekt
    const rootFileBaseName = bpmnFileName.replace('.bpmn', '');
    const rootProcessIdMatchesRootFile = rootProcessId && (
      rootProcessId === rootFileBaseName || 
      rootProcessId === bpmnFileName ||
      rootFileBaseName === rootProcessId ||
      bpmnFileName === `${rootProcessId}.bpmn`
    );
    
    // Om rootProcessId finns men inte matchar root-filen, använd root-filen som fallback
    const effectiveRootProcessId = rootProcessIdMatchesRootFile ? rootProcessId : rootFileBaseName;
    
    if (import.meta.env.DEV && rootProcessId && !rootProcessIdMatchesRootFile) {
      console.warn(
        `[bpmnGenerators] ⚠️ rootProcessId från bpmn-map (${rootProcessId}) matchar inte root-filen (${bpmnFileName}). ` +
        `Använder ${rootFileBaseName} som fallback för root-identifiering.`
      );
    }
    
    if (import.meta.env.DEV) {
      console.log(`[bpmnGenerators] Root process identifiering:`, {
        rootProcessIdFromMap: rootProcessId,
        bpmnFileName,
        rootFileBaseName,
        rootProcessIdMatchesRootFile,
        effectiveRootProcessId,
      });
    }
    // OBS: Om nodeFilter finns, betyder det att vi bara vill generera för specifika noder.
    // I så fall, begränsa analyzedFiles till bara den fil som användaren valde,
    // även om useHierarchy = true (hierarki används för kontext, men vi genererar bara för vald fil).
    // VIKTIGT: analyzedFiles bestämmer vilka filer som får dokumentation genererad.
    // Om useHierarchy = true, används hierarkin för att bygga graf med kontext,
    // men dokumentation ska bara genereras för den valda filen (bpmnFileName),
    // inte för alla filer i hierarkin.
    // 
    // Undantag: Om nodeFilter saknas OCH useHierarchy = true OCH bpmnFileName är root-fil,
    // då kan vi generera för alla filer i hierarkin (fullständig generering).
    // 
    // För subprocesser (t.ex. Household): generera BARA för subprocess-filen,
    // även om parent-filen inkluderas i grafen för kontext.
    // 
    // VIKTIGT: När en subprocess genereras isolerat, blir den första filen i summary.filesIncluded
    // (eftersom grafen byggs med subprocess som root). Men det betyder INTE att det är root-fil-generering.
    // Vi måste kolla om filen faktiskt är root-filen i hela hierarkin, inte bara i den isolerade grafen.
    // 
    // Indikatorer för root-fil-generering:
    // 1. isActualRootFile flag är satt till true (explicit från anroparen)
    // 2. ELLER graphFileScope innehåller många filer (hela hierarkin, typ >5 filer)
    // 3. OCH summary.filesIncluded innehåller många filer (hela hierarkin)
    // 4. OCH bpmnFileName är första filen i summary.filesIncluded
    // 
    // Om graphFileScope bara innehåller 1-4 filer (subprocess + parent + siblings), är det isolerad generering.
    // Bestäm om detta är root-fil-generering (generera för hela hierarkin)
    // Detta sker när:
    // 1. useHierarchy = true (hierarki används)
    // 2. Ingen nodeFilter (generera allt)
    // 3. Root-filen matchar första filen i hierarkin
    // 4. Antingen isActualRootFile = true ELLER det finns flera filer i scope (hierarkisk struktur)
    // VIKTIGT: För batch-generering (alla filer laddas upp), vill vi generera för hela hierarkin
    // Om graphFileScope innehåller många filer (>5), är det sannolikt batch-generering
    // I så fall, sätt isRootFileGeneration = true även om summary.filesIncluded är tom eller filordningen är annorlunda
    const isLikelyBatchGeneration = graphFileScope.length > 5 && isActualRootFile === true;
    const isRootFileGeneration = useHierarchy && 
      !nodeFilter && 
      (
        // Standard villkor: summary.filesIncluded måste innehålla filer och root-filen måste vara först
        (summary.filesIncluded.length > 0 && summary.filesIncluded[0] === bpmnFileName) ||
        // Fallback för batch-generering: om många filer i scope och isActualRootFile = true
        isLikelyBatchGeneration
      ) &&
      (isActualRootFile === true || graphFileScope.length > 1); // Root-fil-generering = flera filer i scope (hierarki)
    
    // VIKTIGT: När isRootFileGeneration = true, vill vi generera för ALLA filer i hierarkin.
    // Men summary.filesIncluded kan bara innehålla filer som faktiskt har noder i grafen.
    // Om en fil bara har en process-nod (inga tasks/callActivities), så kommer den inte
    // att vara med i summary.filesIncluded, men vi måste fortfarande generera Feature Goal för den.
    // VIKTIGT: Använd ALLTID graphFileScope för isRootFileGeneration, eftersom den innehåller
    // alla filer som skickades in till buildBpmnProcessGraph, även de som bara har process-noder.
    const analyzedFiles = isRootFileGeneration
      ? graphFileScope // Använd ALLTID graphFileScope för att säkerställa att alla filer bearbetas
      : [bpmnFileName]; // Generera bara för vald fil (hierarki används bara för kontext)
    
    // Debug logging for analyzedFiles
    if (import.meta.env.DEV) {
      console.log(`[bpmnGenerators] analyzedFiles determined:`, {
        isRootFileGeneration,
        summaryFilesIncluded: summary.filesIncluded,
        graphFileScopeLength: graphFileScope.length,
        analyzedFiles,
        bpmnFileName,
      });
    }
    
    // Logga varning om hierarki används men inga filer hittades
    if (useHierarchy && summary.filesIncluded.length === 0) {
      console.warn(
        `[generateAllFromBpmnWithGraph] useHierarchy=true but no files found in summary.filesIncluded. Falling back to [${bpmnFileName}]`
      );
    }
    const totalAnalyzed = useHierarchy ? summary.totalFiles : analyzedFiles.length;
    await reportProgress(
      'graph:complete',
      'Processträd klart',
      `${totalAnalyzed} filer · djup ${summary.hierarchyDepth}`,
    );
    
    const testableNodes = getTestableNodes(graph);
    
    // Filtrera testableNodes till bara de som ska genereras (baserat på analyzedFiles)
    // Detta säkerställer att progress-räkningen matchar faktiskt antal noder som genereras
    // VIKTIGT: För callActivities, inkludera dem BARA om:
    // 1. CallActivity-filen är med i analyzedFiles
    // 2. Subprocess-filen finns (node.missingDefinition = false)
    // 3. Subprocess-filen finns i existingBpmnFiles (extra säkerhet)
    // Om subprocess-filen saknas, hoppa över callActivity (kan inte generera korrekt dokumentation)
    const nodesToGenerate = testableNodes.filter(node => {
      // Om nodeFilter finns, använd den först
      if (nodeFilter && !nodeFilter(node)) {
        return false;
      }
      
      // För callActivities: kolla både callActivity-filen OCH om subprocess-filen finns
      if (node.type === 'callActivity') {
        const callActivityFileIncluded = analyzedFiles.includes(node.bpmnFile);
        
        // VIKTIGT: Om subprocess-filen saknas (missingDefinition = true), hoppa över callActivity
        // Detta säkerställer att vi bara genererar Feature Goals när subprocess-filen faktiskt finns
        if (node.missingDefinition) {
          // Subprocess-filen saknas - hoppa över callActivity
          if (import.meta.env.DEV) {
            console.warn(
              `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} (${node.name}) ` +
              `- missingDefinition=true, subprocess file ${node.subprocessFile || 'unknown'} not found`
            );
          }
          return false;
        }
        
        // Verifiera också att subprocess-filen finns i existingBpmnFiles (extra säkerhet)
        if (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile)) {
          if (import.meta.env.DEV) {
            console.warn(
              `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} (${node.name}) ` +
              `- subprocess file ${node.subprocessFile} not in existingBpmnFiles`
            );
          }
          return false;
        }
        
        return callActivityFileIncluded;
      }
      
      // För tasks/epics: inkludera bara om filen är med i analyzedFiles
      return analyzedFiles.includes(node.bpmnFile);
    });

    // VIKTIGT: Räkna Process Feature Goals som kommer att genereras för subprocess-filer
    // Dessa genereras separat och måste inkluderas i progress-räkningen
    // VIKTIGT: Logiken måste matcha EXAKT logiken för när Process Feature Goals faktiskt genereras (rad 2198-2201)
    // 
    // Om nodeFilter används, räkna bara Process Feature Goals för filer som faktiskt har noder som ska genereras
    // Samla först vilka filer som har noder som ska genereras
    const filesWithNodesToGenerate = new Set<string>();
    for (const node of nodesToGenerate) {
      filesWithNodesToGenerate.add(node.bpmnFile);
    }
    
    let processNodesToGenerate = 0;
    const processNodesToGenerateDetails: Array<{ file: string; reason: string }> = [];
    for (const file of analyzedFiles) {
      // Om nodeFilter används, hoppa över filer som inte har noder som ska genereras
      if (nodeFilter && !filesWithNodesToGenerate.has(file)) {
        continue;
      }
      
      const hasCallActivityPointingToFile = Array.from(testableNodes.values()).some(
        node => node.type === 'callActivity' && node.subprocessFile === file
      );
      const processNodeForFile = Array.from(graph.allNodes.values()).find(
        node => node.type === 'process' && node.bpmnFile === file
      );
      const fileBaseName = file.replace('.bpmn', '');
      // VIKTIGT: Använd effectiveRootProcessId (med fallback) istället för rootProcessId direkt
      // Detta säkerställer att root-filen alltid identifieras korrekt även om bpmn-map är felaktig
      const isRootProcessFromMap = effectiveRootProcessId && (fileBaseName === effectiveRootProcessId || file === `${effectiveRootProcessId}.bpmn`);
      const isSubprocessFile = (hasCallActivityPointingToFile || !!processNodeForFile) && !isRootProcessFromMap;
      
      // Räkna Process Feature Goal om:
      // 1. Det är en subprocess-fil (isSubprocessFile = true)
      // 2. Den har en process node av typ 'process'
      // OBS: Process Feature Goal genereras för ALLA subprocess-filer (med eller utan callActivities),
      // eftersom CallActivities i parent-processer behöver dokumentation att länka till
      // Detta matchar EXAKT logiken i rad 1935-1937: shouldGenerateProcessFeatureGoal
      if (isSubprocessFile && processNodeForFile && processNodeForFile.type === 'process') {
        processNodesToGenerate++;
        const reason = `subprocess file with process node (hasCallActivity: ${hasCallActivityPointingToFile}, isRootProcess: ${isRootProcessFromMap})`;
        processNodesToGenerateDetails.push({ file, reason });
        if (import.meta.env.DEV) {
          console.log(`[bpmnGenerators] 📊 Counting Process Feature Goal for progress: ${file} (${reason})`);
        }
      } else if (import.meta.env.DEV) {
        // Debug: Logga varför Process Feature Goal INTE räknas
        console.log(`[bpmnGenerators] ⚠️ NOT counting Process Feature Goal for ${file}:`, {
          isSubprocessFile,
          hasProcessNode: !!processNodeForFile,
          processNodeType: processNodeForFile?.type,
          isRootProcessFromMap,
          hasCallActivityPointingToFile,
        });
      }
    }
    
    // VIKTIGT: Räkna Root Process Feature Goal om det ska genereras
    // Detta måste matcha exakt logiken för när Root Process Feature Goal faktiskt genereras (rad 1658-1664)
    let rootFeatureGoalCount = 0;
    if (useHierarchy && isActualRootFile && isRootFileGeneration) {
      // Kolla om bpmnFileName är root-processen
      // VIKTIGT: Använd effectiveRootProcessId (med fallback) istället för rootProcessId direkt
      const rootFileBaseName = bpmnFileName.replace('.bpmn', '');
      const isRootProcessFromMap = effectiveRootProcessId && (rootFileBaseName === effectiveRootProcessId || bpmnFileName === `${effectiveRootProcessId}.bpmn`);
      const hasCallActivityPointingToRootFile = Array.from(testableNodes.values()).some(
        node => node.type === 'callActivity' && node.subprocessFile === bpmnFileName
      );
      const processNodeForRootFile = Array.from(graph.allNodes.values()).find(
        node => node.type === 'process' && node.bpmnFile === bpmnFileName
      );
      const isSubprocessFile = (hasCallActivityPointingToRootFile || !!processNodeForRootFile) && !isRootProcessFromMap;
      // OBS: isIsolatedSubprocessFile använder !useHierarchy, men vi är redan i en useHierarchy=true block
      // Så isIsolatedSubprocessFile kommer alltid vara false här, vilket är korrekt
      const isIsolatedSubprocessFile = false; // useHierarchy är true i denna block, så isolerad generering är omöjlig
      
      // Samma logik som shouldGenerateRootFeatureGoal (rad 1658-1664)
      // OBS: isIsolatedSubprocessFile är alltid false här eftersom useHierarchy är true
        const shouldGenerateRootFeatureGoal = useHierarchy && 
        isActualRootFile && 
        isRootFileGeneration && 
        !isSubprocessFile &&
        (isRootProcessFromMap || (!effectiveRootProcessId && isRootFileGeneration && graphFileScope.length > 1));
      
      if (shouldGenerateRootFeatureGoal && processNodeForRootFile) {
        rootFeatureGoalCount = 1;
        if (import.meta.env.DEV) {
          console.log(`[bpmnGenerators] 📊 Counting Root Process Feature Goal for progress: ${bpmnFileName}`);
        }
      }
    }
    
    // VIKTIGT: Skicka total:init med korrekt antal filer och noder för progress-räkning
    // Använd nodesToGenerate.length (faktiskt antal noder som genereras) istället för totalNodesFromFiles
    // Detta säkerställer att progress visar korrekt antal, exkluderar noder som hoppas över
    // (t.ex. call activities med saknade subprocess-filer, redan genererade noder, nodeFilter)
    // 
    // För filräkning: Använd graphFileScope.length (antal filer som analyseras) istället för analyzedFiles.length
    // För subprocess-generering analyseras fler filer (parent + subprocess + siblings) än vad som genereras dokumentation för
    // Användaren förväntar sig att se antal filer som analyseras, inte bara antal filer som genereras dokumentation för
    // 
    // VIKTIGT: File-level documentation genereras för filer som faktiskt får dokumentation genererad
    // Om nodeFilter används, kan analyzedFiles innehålla fler filer än vad som faktiskt genereras
    // Räkna bara filer som har noder som ska genereras ELLER som behöver Process Feature Goals
    // (filesWithNodesToGenerate är redan beräknat ovan)
    // Lägg till filer som behöver Process Feature Goals
    for (const detail of processNodesToGenerateDetails) {
      filesWithNodesToGenerate.add(detail.file);
    }
    // Lägg till root-filen om Root Process Feature Goal ska genereras
    if (rootFeatureGoalCount > 0) {
      filesWithNodesToGenerate.add(bpmnFileName);
    }
    // Om ingen nodeFilter används, använd analyzedFiles (alla filer ska genereras)
    // Om nodeFilter används, använd bara filer som faktiskt har noder som ska genereras
    const fileLevelDocsCount = nodeFilter 
      ? filesWithNodesToGenerate.size 
      : analyzedFiles.length; // En file-level doc per fil
    
    // Debug logging för progress-räkning
    if (import.meta.env.DEV) {
      const nodesToGenerateBreakdown = {
        total: nodesToGenerate.length,
        byType: {
          serviceTask: nodesToGenerate.filter(n => n.type === 'serviceTask').length,
          userTask: nodesToGenerate.filter(n => n.type === 'userTask').length,
          businessRuleTask: nodesToGenerate.filter(n => n.type === 'businessRuleTask').length,
          callActivity: nodesToGenerate.filter(n => n.type === 'callActivity').length,
        },
        byFile: {} as Record<string, number>,
        details: nodesToGenerate.map(n => ({
          type: n.type,
          name: n.name || n.bpmnElementId,
          bpmnFile: n.bpmnFile,
          elementId: n.bpmnElementId,
          subprocessFile: n.type === 'callActivity' ? n.subprocessFile : undefined,
        })),
      };
      
      // Räkna noder per fil
      for (const node of nodesToGenerate) {
        nodesToGenerateBreakdown.byFile[node.bpmnFile] = 
          (nodesToGenerateBreakdown.byFile[node.bpmnFile] || 0) + 1;
      }
      
      console.log(`[bpmnGenerators] 📊 Progress breakdown:`, {
        nodesToGenerate: nodesToGenerateBreakdown,
        processNodesToGenerate: {
          count: processNodesToGenerate,
          details: processNodesToGenerateDetails,
        },
        fileLevelDocsCount: {
          count: fileLevelDocsCount,
          files: analyzedFiles,
        },
        rootFeatureGoalCount,
        totalNodesToGenerate: nodesToGenerate.length + processNodesToGenerate + fileLevelDocsCount + rootFeatureGoalCount,
        breakdown: {
          nodesToGenerate: nodesToGenerate.length,
          processNodesToGenerate,
          fileLevelDocsCount,
          rootFeatureGoalCount,
          sum: nodesToGenerate.length + processNodesToGenerate + fileLevelDocsCount + rootFeatureGoalCount,
        },
        analyzedFiles,
        graphFileScopeLength: graphFileScope.length,
        existingBpmnFilesLength: existingBpmnFiles.length,
      });
    }
    
    const totalNodesToGenerate = nodesToGenerate.length + processNodesToGenerate + fileLevelDocsCount + rootFeatureGoalCount;
    await reportProgress(
      'total:init',
      'Initierar generering',
      JSON.stringify({
        files: graphFileScope.length, // ✅ Använd antal filer som analyseras (parent + subprocess + siblings)
        nodes: totalNodesToGenerate, // ✅ Använd faktiskt antal noder som genereras (inkluderar Root Process Feature Goal)
      }),
    );

    // Beräkna depth för varje nod (för hierarkisk generering: leaf nodes först)
    // OBS: Använd nodesToGenerate (filtrerade noder) för depth-beräkning
    const nodeDepthMap = new Map<string, number>();
    const calculateNodeDepth = (node: BpmnProcessNode, visited = new Set<string>()): number => {
      if (visited.has(node.id)) return 0; // Avoid cycles
      visited.add(node.id);
      
      if (!node.children || node.children.length === 0) {
        nodeDepthMap.set(node.id, 0);
        return 0;
      }
      
      const maxChildDepth = Math.max(
        ...node.children.map(child => calculateNodeDepth(child, visited))
      );
      const depth = maxChildDepth + 1;
      nodeDepthMap.set(node.id, depth);
      return depth;
    };
    
    // Beräkna depth för alla noder som ska genereras
    for (const node of nodesToGenerate) {
      if (!nodeDepthMap.has(node.id)) {
        calculateNodeDepth(node);
      }
    }

    // Generera artefakter från grafen
    const result: GenerationResult = {
      tests: new Map(),
      docs: new Map(),
      subprocessMappings: new Map(),
      metadata: {
        hierarchyUsed: true,
        totalFilesAnalyzed: totalAnalyzed,
        filesIncluded: analyzedFiles,
        hierarchyDepth: summary.hierarchyDepth,
        missingDependencies: graph.missingDependencies,
        skippedSubprocesses: Array.from(
          new Set(graph.missingDependencies.map((dep) => dep.childProcess)),
        ),
      },
    };
    const hierarchicalNodeArtifacts: NodeArtifactEntry[] = [];
    result.nodeArtifacts = hierarchicalNodeArtifacts;
    // Track LLM provider fallback usage (when first provider fails and alternative provider is used)
    // Note: This is NOT the same as template fallback (fallback() function) which is used when ALL LLM fails
    // llmFallbackUsed = true means: LLM worked but had to fallback from one provider to another (e.g. local → cloud)
    let llmFallbackUsed = false;
    let llmFinalProvider: LlmProvider | undefined = undefined;
    const plannedScenarioMap: PlannedScenarioMap = new Map();
    const setScenarioEntry = (
      key: string,
      provider: PlannedScenarioProvider,
      scenarios: TestScenario[],
    ) => {
      if (!plannedScenarioMap.has(key)) {
        plannedScenarioMap.set(key, new Map());
      }
      plannedScenarioMap.get(key)!.set(provider, scenarios);
    };
    const hydrateScenarioMapFromRows = (rows: PlannedScenarioRow[]) => {
      rows.forEach((row) => {
        const provider = row.provider as PlannedScenarioProvider;
        setScenarioEntry(`${row.bpmn_file}::${row.bpmn_element_id}`, provider, row.scenarios);
      });
    };

    // === TESTGENERERING HAR FLYTTATS TILL SEPARAT STEG ===
    // Testfiler och testscenarion genereras inte längre i dokumentationssteget.
    // Använd separat testgenereringsfunktion istället.

    // === SUBPROCESS MAPPINGS ===
    // Testbara noder från hela grafen (för subprocess mappings)
    await reportProgress('node-analysis:start', 'Analyserar noder för artefakter', `${testableNodes.length} noder`);
    
    for (const node of testableNodes) {
      if (!node.element) continue;
      await reportProgress('node-analysis:node', 'Analyserar nod', node.name || node.bpmnElementId);
      
      // Subprocess mappings
      // VIKTIGT: Visa bara mappningar för filer som faktiskt finns i existingBpmnFiles
      // Om filen saknas (t.ex. från bpmn-map.json men inte uppladdad), ska den INTE visas
      if (node.type === 'callActivity' && node.subprocessFile) {
        const childFile = node.subprocessFile;
        // Verifiera att filen faktiskt finns i existingBpmnFiles innan vi visar mappningen
        // Detta förhindrar att vi visar felaktiga mappningar när filer saknas
        if (childFile && graphFileScope.includes(childFile)) {
          result.subprocessMappings.set(node.bpmnElementId, childFile);
        } else if (import.meta.env.DEV && childFile) {
          console.warn(
            `[bpmnGenerators] Skipping subprocess mapping for ${node.bpmnElementId} → ${childFile} ` +
            `because file is not in graphFileScope (file may be missing or not uploaded)`
          );
        }
      }
    }
    // Använd nodesToGenerate.length för att visa korrekt antal noder som ska genereras
    await reportProgress('node-analysis:complete', 'Nodanalyser klara', `${nodesToGenerate.length} noder`);

    // Seed node_planned_scenarios med bas-scenarion (legacy - används inte längre)
    // OBS: Dessa är endast fallback-scenarion. Nya scenarion genereras från BPMN-filerna
    // via LLM eller från dokumentationen, och prioriteras över dessa.
    // OBS: Använd nodesToGenerate (filtrerade noder) för att bara skapa scenarion för noder som genereras
    // 
    // VIKTIGT: Hoppa över detta när man bara genererar dokumentation - planned scenarios
    // ska bara skapas när man faktiskt genererar testinformation, inte när man bara genererar dokumentation.
    // Detta undviker förvirring och onödig databasaktivitet.
    // 
    // Om du vill skapa planned scenarios, gör det i testgenereringssteget istället.
    // REMOVED: Planned scenario creation during documentation generation
    // Feature Goal tests are now generated directly from documentation via featureGoalTestGeneratorDirect.ts

    // OBS: total:init har flyttats till EFTER nodesToGenerate beräkning (se rad ~1636)
    // Detta säkerställer att progress visar korrekt antal noder som faktiskt genereras,
    // exkluderar noder som hoppas över (saknade subprocesser, redan genererade, nodeFilter)

    // Generera dokumentation per fil (inte per element)
    // STRATEGI: Två-pass generering för bättre kontext
    // Pass 1: Leaf nodes först (högst depth) - genererar dokumentation för epics/tasks
    // Pass 2: Parent nodes (lägst depth) - genererar Feature Goals med kunskap om child epics
    // NOTE: Dokumentation använder nodesToGenerate (filtrerade noder) för korrekt progress-räkning
    await reportProgress('docgen:start', 'Genererar dokumentation', `${analyzedFiles.length} filer`);
    const buildMatchWarning = (node: typeof testableNodes[number]) => {
      const reasons: string[] = [];
      if (node.subprocessMatchStatus && node.subprocessMatchStatus !== 'matched') {
        reasons.push(`Subprocess match: ${node.subprocessMatchStatus}`);
      }
      if (node.subprocessDiagnostics?.length) {
        reasons.push(...node.subprocessDiagnostics);
      }
      const reasonText = reasons.length ? reasons.join(' • ') : 'Okänd orsak';
      return `<p>Subprocess-kopplingen är inte bekräftad. Följande diagnostik finns:</p><p>${reasonText}</p>`;
    };

    // Map för att spara genererad dokumentation från child nodes (används i Pass 2)
    const generatedChildDocs = new Map<string, {
      summary: string;
      flowSteps: string[];
      inputs?: string[];
      outputs?: string[];
      scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
    }>();
    
    // Global Set för att spåra vilka noder som redan har genererat dokumentation
    // Key format: för callActivities: `subprocess:${subprocessFile}`, för tasks/epics: `${bpmnFile}::${bpmnElementId}`
    const globalProcessedDocNodes = new Set<string>();

    // VIKTIGT: Sortera filer baserat på hur de visas i ProcessExplorer/test-coverage
    // Ordningen ska matcha när callActivities anropas i root-processen (mortgage.bpmn)
    // Samma logik som sortCallActivities: visualOrderIndex → orderIndex → branchId → alfabetisk
    
    const fileOrder: string[] = [];
    const visitedFiles = new Set<string>();
    
    // Steg 1: Hitta alla callActivities i root-processen och sortera dem med samma logik som UI:n
    const rootCallActivities = graph.root.children.filter(
      (child): child is BpmnProcessNode => 
        child.type === 'callActivity' && 
        child.subprocessFile !== undefined && 
        !child.missingDefinition &&
        analyzedFiles.includes(child.subprocessFile)
    );
    
    // Sortera root callActivities med samma logik som sortCallActivities (visualOrderIndex → orderIndex → branchId)
    const sortedRootCallActivities = [...rootCallActivities].sort((a, b) => 
      compareNodesByVisualOrder(a, b, true) // isRoot = true för root-processen
    );
    
    // Debug: Visa root callActivities ordning
    if (import.meta.env.DEV && sortedRootCallActivities.length > 0) {
      console.log('\n[bpmnGenerators] 📋 Root callActivities ordning (samma som UI:n):');
      sortedRootCallActivities.forEach((ca, idx) => {
        console.log(`  ${idx + 1}. ${ca.name || ca.bpmnElementId} → ${ca.subprocessFile} (visual:${ca.visualOrderIndex ?? 'N/A'}, order:${ca.orderIndex ?? 'N/A'})`);
      });
    }
    
    // Steg 2: För varje callActivity i root (i sorterad ordning), lägg till dess subprocess-fil FÖRE parent
    // VIKTIGT: Varje root callActivity och dess subprocesser ska processas i sin tur
    // Ordningen ska matcha UI:n: Application subprocesser → Application → Credit Evaluation subprocesser → Credit Evaluation, etc.
    const processFile = (callActivity: BpmnProcessNode) => {
      if (!callActivity.subprocessFile || visitedFiles.has(callActivity.subprocessFile)) {
        return;
      }
      
      // VIKTIGT: Lägg till filen i visitedFiles INNAN rekursion för att undvika oändlig rekursion
      // vid cirkulära referenser (t.ex. A → B → C → A)
      visitedFiles.add(callActivity.subprocessFile);
      
      // Hitta subprocess-noden
      const subprocessNodes = graph.fileNodes.get(callActivity.subprocessFile) || [];
      const subprocessProcessNode = subprocessNodes.find(n => n.type === 'process');
      
      if (subprocessProcessNode) {
        // Rekursivt: processera subprocessens callActivities först (topologisk ordning)
        const subprocessCallActivities = subprocessProcessNode.children.filter(
          (child): child is BpmnProcessNode => 
            child.type === 'callActivity' && 
            child.subprocessFile !== undefined && 
            !child.missingDefinition &&
            analyzedFiles.includes(child.subprocessFile)
        );
        
        // Sortera subprocess callActivities (isRoot = false för subprocesser)
        const sortedSubprocessCallActivities = [...subprocessCallActivities].sort((a, b) => 
          compareNodesByVisualOrder(a, b, false)
        );
        
        // Processera subprocessens callActivities rekursivt
        for (const subCa of sortedSubprocessCallActivities) {
          processFile(subCa);
        }
        
        // Lägg till subprocess-filen i fileOrder EFTER att dess subprocesser har processats
        fileOrder.push(callActivity.subprocessFile);
      }
    };
    
    // Processera alla root callActivities i sorterad ordning (samma ordning som UI:n visar)
    // Detta säkerställer att Application och dess subprocesser kommer FÖRE Credit Evaluation, etc.
    // Ordningen: Application subprocesser → Application → Credit Evaluation subprocesser → Credit Evaluation, etc.
    for (const callActivity of sortedRootCallActivities) {
      processFile(callActivity);
    }
    
    // Lägg till root-processen sist (efter alla subprocesser)
    if (!visitedFiles.has(graph.root.bpmnFile) && analyzedFiles.includes(graph.root.bpmnFile)) {
      fileOrder.push(graph.root.bpmnFile);
      visitedFiles.add(graph.root.bpmnFile);
    }
    
    // Lägg till eventuella filer som inte hittades i traversal (säkerhetsåtgärd)
    for (const fileName of analyzedFiles) {
      if (!visitedFiles.has(fileName)) {
        fileOrder.push(fileName);
        visitedFiles.add(fileName);
      }
    }
    
    const sortedAnalyzedFiles = fileOrder;
    
    // Debug-logging: Visa filordning (endast i DEV)
    if (import.meta.env.DEV && sortedAnalyzedFiles.length > 0) {
      console.log('\n[bpmnGenerators] 📋 Filordning för dokumentationsgenerering (traversal-order):');
      sortedAnalyzedFiles.forEach((fileName, index) => {
        console.log(`  ${index + 1}. ${fileName}`);
      });
      console.log('');
    }
    
    if (import.meta.env.DEV && sortedAnalyzedFiles.length !== analyzedFiles.length) {
      console.warn(
        `[bpmnGenerators] ⚠️ File order changed: ${analyzedFiles.length} → ${sortedAnalyzedFiles.length} files`
      );
    }

    for (const file of sortedAnalyzedFiles) {
      await reportProgress('docgen:file', 'Genererar dokumentation/testinstruktioner', file);
      const docFileName = file.replace('.bpmn', '.html');
      
      // Samla alla noder från denna fil för dokumentation
      // OBS: Använd nodesToGenerate (redan filtrerade) istället för testableNodes
      // VIKTIGT: Filtrera bort callActivities med missingDefinition eller saknade subprocess-filer
      const nodesInFile = nodesToGenerate.filter(node => {
        if (node.bpmnFile !== file) return false;
        
        // Ytterligare säkerhetskontroll: hoppa över callActivities med saknade subprocess-filer
        if (node.type === 'callActivity') {
          if (node.missingDefinition) {
            if (import.meta.env.DEV) {
              console.warn(
                `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} (${node.name}) in file ${file} ` +
                `- missingDefinition=true (should have been filtered in nodesToGenerate)`
              );
            }
            return false;
          }
          if (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile)) {
            if (import.meta.env.DEV) {
              console.warn(
                `[bpmnGenerators] ⚠️ Skipping callActivity ${node.bpmnElementId} (${node.name}) in file ${file} ` +
                `- subprocess file ${node.subprocessFile} not in existingBpmnFiles (should have been filtered in nodesToGenerate)`
              );
            }
            return false;
          }
        }
        return true;
      });
      
      // Debug-logging endast om inga noder hittades (för att identifiera problem)
      // KRITISKT: Detta är viktigt för att identifiera filer som bara har process-noder
      if (nodesInFile.length === 0) {
        const processNodeForFile = Array.from(graph.allNodes.values()).find(
          node => node.type === 'process' && node.bpmnFile === file
        );
        if (processNodeForFile) {
          console.warn(`[bpmnGenerators] ⚠️ No tasks/callActivities found for ${file}, but process node exists: ${processNodeForFile.id}`);
        } else {
          console.warn(`[bpmnGenerators] ⚠️ No nodes found for ${file} (no process node either)`);
        }
      }
      
      if (nodesInFile.length > 0) {
        // Sortera noder baserat på anropsordning (samma som test-coverage sidan visar från vänster till höger)
        // Primärt: orderIndex (exekveringsordning från sequence flows)
        // Sekundärt: visualOrderIndex (visuell ordning från BPMN-diagrammet)
        // Tertiärt: node type (tasks/epics före callActivities för att säkerställa leaf nodes före Feature Goals)
        // Kvartärt: depth (lägre depth först, för att säkerställa subprocesser före parent)
        // Detta säkerställer att dokumentation genereras i samma ordning som noder anropas i BPMN-filerna
        const sortedNodesInFile = [...nodesInFile].sort((a, b) => {
          // Primär sortering: orderIndex (anropsordning från sequence flows)
          // Detta matchar hur test-coverage sidan visar ordningen (från vänster till höger)
          const orderA = a.orderIndex ?? a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.orderIndex ?? b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
          
          if (orderA !== orderB) {
            return orderA - orderB; // Lägre orderIndex först (tidigare i anropsordningen)
          }
          
          // Sekundär sortering: visualOrderIndex (visuell ordning från BPMN-diagrammet)
          // Detta säkerställer konsistens med test-coverage sidan som använder visualOrderIndex som primär sortering
          const visualA = a.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
          const visualB = b.visualOrderIndex ?? Number.MAX_SAFE_INTEGER;
          
          if (visualA !== visualB) {
            return visualA - visualB;
          }
          
          // Tertiär sortering: node type (tasks/epics före callActivities)
          // Detta säkerställer att leaf nodes (epics) genereras FÖRE Feature Goals
          // även om de har samma orderIndex (vilket kan hända om de är i olika filer)
          const typeOrder: Record<string, number> = {
            'userTask': 1,
            'serviceTask': 1,
            'businessRuleTask': 1,
            'callActivity': 2,
            'process': 3,
          };
          const typeOrderA = typeOrder[a.type as keyof typeof typeOrder] ?? 99;
          const typeOrderB = typeOrder[b.type as keyof typeof typeOrder] ?? 99;
          
          if (typeOrderA !== typeOrderB) {
            return typeOrderA - typeOrderB; // Tasks/epics (1) före callActivities (2)
          }
          
          // Kvartär sortering: depth (lägre depth först)
          // Detta säkerställer att subprocesser genereras FÖRE parent nodes
          // (användbart när orderIndex/visualOrderIndex saknas eller är samma)
          const depthA = nodeDepthMap.get(a.id) ?? 0;
          const depthB = nodeDepthMap.get(b.id) ?? 0;
          
          if (depthA !== depthB) {
            return depthA - depthB; // Lägre depth först (subprocesser före parent)
          }
          
          // Kvintär sortering: alfabetiskt för determinism
          return (a.name || a.bpmnElementId || '').localeCompare(b.name || b.bpmnElementId || '');
        });
        
        // Skapa en sammanslagen dokumentation för hela filen – med fokus på innehåll.
        // Själva app-layouten hanteras i DocViewer och den gemensamma wrappern.
        let combinedBody = `<h1>Dokumentation för ${file}</h1>
`;
        
        // Samla JSON-data för file-level dokumentation (används för E2E-scenarier)
        // Vi behöver summary, flowSteps, userStories, dependencies
        const fileLevelDocData: {
          summary: string;
          flowSteps: string[];
          userStories?: Array<{
            id: string;
            role: string;
            goal: string;
            value: string;
            acceptanceCriteria: string[];
          }>;
          dependencies?: string[];
        } = {
          summary: '',
          flowSteps: [],
          userStories: [],
          dependencies: [],
        };
        
        // Lokal Set för att spåra processade noder i denna fil (används för combinedBody)
        // Men vi använder globalProcessedDocNodes för att avgöra om dokumentation ska genereras
        const processedDocNodesInFile = new Set<string>();
        
        // PASS 1: Generera subprocesser först (lägre depth), sedan parent nodes (högre depth)
        // Detta säkerställer att child documentation sparas i generatedChildDocs innan parent Feature Goal genereras
        // Spara dokumentation från child nodes för att använda när parent nodes genereras
        // För callActivities: använd subprocessFile som key för att undvika duplicering av återkommande subprocesser
        for (const node of sortedNodesInFile) {
          if (!node.element || !node.bpmnElementId) continue;
          
          // Apply node filter if provided (for selective regeneration based on diff)
          // NOTE: nodeFilter result is also checked in Storage existence check below
          // If nodeFilter says to generate, we override Storage check
          const shouldGenerateByFilter = nodeFilter ? nodeFilter(node) : true;
          if (!shouldGenerateByFilter) {
            continue;
          }
          
          
          // För callActivities, använd subprocessFile som key (unik per subprocess-fil)
          // För tasks/epics, använd nodeKey (unik per instans)
          const docKey = node.type === 'callActivity' && node.subprocessFile
            ? `subprocess:${node.subprocessFile}` // Unik per subprocess-fil
            : `${node.bpmnFile}::${node.bpmnElementId}`; // Unik per instans för tasks
          
          // VIKTIGT: För återkommande noder (subprocesser, tasks, epics):
          // - Dokumentation (summary, flowSteps, scenarios, etc.) genereras PER INSTANS
          //   eftersom kontexten kan vara annorlunda för varje användning
          const nodeKey = `${node.bpmnFile}::${node.bpmnElementId}`;
          
          // Kolla om dokumentation redan genererats globalt
          const alreadyProcessedGlobally = globalProcessedDocNodes.has(docKey);
          
          // För callActivities: vi genererar alltid Feature Goal-dokumentation (instans-specifik)
          // För tasks/epics: hoppa över om redan processad
          const skipDocGeneration = node.type === 'callActivity'
            ? false // För callActivities: generera alltid (instans-specifik Feature Goal)
            : alreadyProcessedGlobally; // För tasks/epics: hoppa över om redan processad
          
          // (Instance-specific documentation generation continues silently)
          
          // VIKTIGT: För callActivities, kolla om subprocess-filen finns innan vi visar progress
          // Om missingDefinition är true eller subprocessFile saknas, hoppa över progress-meddelandet
          // (noden kommer att hoppas över senare i Feature Goal-genereringen)
          if (node.type === 'callActivity') {
            if (node.missingDefinition || !node.subprocessFile || 
                (node.subprocessFile && !existingBpmnFiles.includes(node.subprocessFile))) {
              // Subprocess-filen saknas - hoppa över progress-meddelandet och dokumentationsgenerering
              if (import.meta.env.DEV) {
                console.warn(
                  `[bpmnGenerators] ⚠️ Skipping progress message for callActivity ${node.bpmnElementId} (${node.name}) ` +
                  `- missingDefinition: ${node.missingDefinition}, subprocessFile: ${node.subprocessFile || 'undefined'}`
                );
              }
              continue;
            }
          }
          
          // Bygg ett tydligt meddelande med nodtyp och namn
          const nodeTypeLabelForProgress = 
            node.type === 'serviceTask' ? 'service tasken' :
            node.type === 'userTask' ? 'user tasken' :
            node.type === 'businessRuleTask' ? 'business rule tasken' :
            node.type === 'callActivity' ? 'call activityn' :
            'noden';
          const nodeName = node.name || node.bpmnElementId || 'Okänd nod';
          const detailMessage = `${nodeTypeLabelForProgress}: ${nodeName}${node.type === 'callActivity' && node.subprocessFile ? ` (subprocess: ${node.subprocessFile})` : ''}`;
          
          await reportProgress(
            'docgen:file',
            'Genererar dokumentation',
            detailMessage,
          );

          const docFileKey = getNodeDocFileKey(node.bpmnFile, node.bpmnElementId);
          const nodeContext = buildNodeDocumentationContext(graph, node.id);
          const docLinks = {
            bpmnViewerLink: `#/bpmn/${node.bpmnFile}`,
            dorLink: undefined,
            testLink: undefined, // Testfiler genereras inte längre i dokumentationssteget
          };

          let nodeDocContent: string;
          let lastDocJson: unknown | undefined;

          // VIKTIGT: För callActivities måste vi ALLTID generera Feature Goal-dokumentation,
          // även om noden redan har processats globalt. Detta säkerställer att alla callActivities får dokumentation.
          // För tasks/epics: hoppa över om redan processad (för att undvika dubbelgenerering).
          if (!nodeContext) {
            console.warn(`[bpmnGenerators] ⚠️ No nodeContext found for ${node.bpmnElementId} (${node.type}), skipping`);
            continue;
          }
          
          // För callActivities: generera alltid Feature Goal, även om alreadyProcessedGlobally är true
          // För tasks/epics: hoppa över om alreadyProcessedGlobally är true (för att undvika dubbelgenerering)
          if (node.type !== 'callActivity' && alreadyProcessedGlobally) {
            continue; // Hoppa över tasks/epics som redan processats
          }

          // VIKTIGT: Kolla om dokumentation redan finns i Storage för leaf nodes (tasks/epics)
          // Om den finns, hoppa över regenerering för att spara tid och pengar
          // Men för callActivities genererar vi alltid (de behöver uppdateras när subprocesser ändras)
          // 
          // Storage-check respekterar:
          // 1. forceRegenerate flag (om true, hoppa över check)
          // 2. nodeFilter resultat (om nodeFilter säger generera, generera även om fil finns)
          let docExists = false; // Default: assume doc doesn't exist
          let modePath: string | undefined = undefined;
          if (node.type !== 'callActivity' && !forceRegenerate) {
            const versionHash = versionHashes.get(node.bpmnFile) || null;
            
            // Version hash is required - check only versioned path
            if (!versionHash) {
              console.warn(`[bpmnGenerators] No version hash for ${node.bpmnFile}, cannot check if doc exists`);
              docExists = false;
            } else {
              // Claude-only: Always use 'cloud' provider (maps to 'claude' in storage paths)
              const pathResult = buildDocStoragePaths(
                docFileKey,
                generationSourceLabel?.includes('slow') ? 'slow' : null,
                'cloud', // Claude-only: always use cloud provider
                node.bpmnFile,
                versionHash
              );
              modePath = pathResult.modePath;
              docExists = await storageFileExists(modePath);
            }
            
            // If nodeFilter says to generate this node, override Storage check
            // (shouldGenerateByFilter is already computed above)
            if (docExists && !shouldGenerateByFilter) {
              // VIKTIGT: Validera dokumentationskvalitet innan vi hoppar över regenerering
              // Om dokumentationen är minimal (från en tidigare generering när LLM misslyckades),
              // måste vi regenerera för att få korrekt innehåll
              const existingDocInfo = await loadChildDocFromStorage(
                node.bpmnFile,
                node.bpmnElementId,
                docFileKey,
                versionHash,
                generationSourceLabel
              );
              
              // Validera kvalitet: om dokumentationen saknar summary eller flowSteps, är den minimal
              const isMinimalDoc = !existingDocInfo || 
                !existingDocInfo.summary || 
                existingDocInfo.summary.trim().length < 50 ||
                !existingDocInfo.flowSteps || 
                existingDocInfo.flowSteps.length === 0;
              
              if (isMinimalDoc) {
                if (import.meta.env.DEV) {
                  console.log(`[bpmnGenerators] ⚠️  Existing doc for ${node.bpmnElementId} is minimal/incomplete - forcing regeneration`);
                }
                docExists = false; // Tvinga regenerering
              } else {
                if (import.meta.env.DEV) {
                  console.log(`[bpmnGenerators] ⏭️  Skipping regeneration for ${node.bpmnElementId} (${node.type}) - documentation already exists in Storage: ${modePath || 'unknown path'}`);
                }
                
                // Spara i generatedChildDocs så att Feature Goals kan använda den
                generatedChildDocs.set(docKey, existingDocInfo);
                if (import.meta.env.DEV) {
                  console.log(`[bpmnGenerators] ✅ Loaded existing child doc for ${node.bpmnElementId} from Storage`);
                }
              }
              
              // Markera som processad så att den inte genereras igen
              processedDocNodesInFile.add(docKey);
              // For callActivities: always add to globalProcessedDocNodes (we always generate instance-specific)
              // For other node types: add if not already processed
              const isCallActivity = (node.type as string) === 'callActivity';
              if (isCallActivity || !alreadyProcessedGlobally) {
                globalProcessedDocNodes.add(docKey);
              }
              
              // Fortsätt till nästa nod
              continue;
            }
          }

          if (nodeContext) {
            // Samla dokumentation från child nodes rekursivt (för Feature Goals behöver vi alla descendant nodes)
            // För callActivities: samla från alla descendant nodes (inklusive nested subprocesser och leaf nodes)
            // För tasks/epics: samla bara från direkta children (de har normalt inga children)
            const childDocsForNode = new Map<string, {
              summary: string;
              flowSteps: string[];
              inputs?: string[];
              outputs?: string[];
              scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
            }>();
            
            // Rekursiv funktion för att samla dokumentation från alla descendant nodes
            const collectChildDocsRecursively = (currentNode: BpmnProcessNode) => {
              if (currentNode.children && Array.isArray(currentNode.children) && currentNode.children.length > 0) {
                for (const child of currentNode.children) {
                  // För callActivities, använd subprocessFile som key för att hitta dokumentation
                  // även om child är en annan instans av samma subprocess
                  const childDocKey = child.type === 'callActivity' && child.subprocessFile
                    ? `subprocess:${child.subprocessFile}`
                    : `${child.bpmnFile}::${child.bpmnElementId}`;
                  
                  const childDoc = generatedChildDocs.get(childDocKey);
                  if (childDoc) {
                    childDocsForNode.set(child.id, childDoc);
                  }
                  
                  // Rekursivt samla från nested children (för nested subprocesser)
                  if (child.children && Array.isArray(child.children) && child.children.length > 0) {
                    collectChildDocsRecursively(child);
                  }
                }
              }
            };
            
            // För callActivities: samla dokumentation från subprocess-filen
            // VIKTIGT: Epics i subprocess-filen är INTE children till callActivity-noden
            // De är children till process-noden i subprocess-filen
            // Därför måste vi hämta alla noder i subprocess-filen från graph.fileNodes
            if (node.type === 'callActivity' && node.subprocessFile) {
              // Hitta alla noder i subprocess-filen
              const subprocessNodes = graph.fileNodes.get(node.subprocessFile) || [];
              
              // Samla dokumentation från alla noder i subprocess-filen (epics, tasks)
              for (const subprocessNode of subprocessNodes) {
                // Hoppa över process-noden (den har ingen epic-dokumentation)
                if (subprocessNode.type === 'process') continue;
                
                // Hitta dokumentation för noden
                const subprocessDocKey = `${subprocessNode.bpmnFile}::${subprocessNode.bpmnElementId}`;
                let subprocessDoc = generatedChildDocs.get(subprocessDocKey);
                
                // VIKTIGT: Om subprocess-filen inte är med i analyzedFiles, kan epic-docs saknas i generatedChildDocs
                // Försök ladda från Storage om dokumentation saknas
                if (!subprocessDoc && subprocessNode.bpmnFile && subprocessNode.bpmnElementId) {
                  const subprocessVersionHash = versionHashes.get(subprocessNode.bpmnFile) || null;
                  const subprocessDocFileKey = getNodeDocFileKey(subprocessNode.bpmnFile, subprocessNode.bpmnElementId);
                  
                  const loadedDoc = await loadChildDocFromStorage(
                    subprocessNode.bpmnFile,
                    subprocessNode.bpmnElementId,
                    subprocessDocFileKey,
                    subprocessVersionHash,
                    generationSourceLabel
                  );
                  
                  if (loadedDoc) {
                    subprocessDoc = loadedDoc;
                    // Spara i generatedChildDocs för framtida användning
                    generatedChildDocs.set(subprocessDocKey, loadedDoc);
                    if (import.meta.env.DEV) {
                      console.log(`[bpmnGenerators] ✅ Loaded subprocess child doc from Storage for ${subprocessNode.bpmnElementId} in ${subprocessNode.bpmnFile}`);
                    }
                  }
                }
                
                if (subprocessDoc) {
                  childDocsForNode.set(subprocessNode.id, subprocessDoc);
                }
              }
              
              // Också samla rekursivt från node.children (för nested subprocesser)
              // Detta säkerställer att vi får dokumentation från alla descendant nodes
              collectChildDocsRecursively(node);
            } else {
              // För tasks/epics: samla bara från direkta children (de har normalt inga children)
              if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                  const childDocKey = child.type === 'callActivity' && child.subprocessFile
                    ? `subprocess:${child.subprocessFile}`
                    : `${child.bpmnFile}::${child.bpmnElementId}`;
                  
                  const childDoc = generatedChildDocs.get(childDocKey);
                  if (childDoc) {
                    childDocsForNode.set(child.id, childDoc);
                  }
                }
              }
            }
            
            // Convert childDocsForNode to ChildNodeDocumentation format
            // VIKTIGT: För callActivities, inkludera noder från subprocess-filen, inte bara node.children
            const convertedChildDocs = childDocsForNode.size > 0 
              ? new Map<string, ChildNodeDocumentation>() 
              : undefined;
            if (convertedChildDocs) {
              // För callActivities: använd noder från subprocess-filen
              if (node.type === 'callActivity' && node.subprocessFile) {
                const subprocessNodes = graph.fileNodes.get(node.subprocessFile) || [];
                for (const subprocessNode of subprocessNodes) {
                  // Hoppa över process-noden (den har ingen epic-dokumentation)
                  if (subprocessNode.type === 'process') continue;
                  
                  const childDoc = childDocsForNode.get(subprocessNode.id);
                  if (childDoc) {
                    convertedChildDocs.set(subprocessNode.id, {
                      id: subprocessNode.bpmnElementId || subprocessNode.id,
                      name: subprocessNode.name || subprocessNode.bpmnElementId || subprocessNode.id,
                      type: subprocessNode.type,
                      summary: childDoc.summary,
                      flowSteps: childDoc.flowSteps,
                      inputs: childDoc.inputs,
                      outputs: childDoc.outputs,
                    });
                  }
                }
              }
              
              // För tasks/epics: använd node.children (direkta children)
              if (node.type !== 'callActivity' && node.children) {
                for (const child of node.children) {
                  const childDoc = childDocsForNode.get(child.id);
                  if (childDoc) {
                    convertedChildDocs.set(child.id, {
                      id: child.bpmnElementId || child.id,
                      name: child.name || child.bpmnElementId || child.id,
                      type: child.type,
                      summary: childDoc.summary,
                      flowSteps: childDoc.flowSteps,
                      inputs: childDoc.inputs,
                      outputs: childDoc.outputs,
                    });
                  }
                }
              }
            }
            
            // VIKTIGT: CallActivity Feature Goals genereras INTE längre
            // Process Feature Goals genereras istället för subprocess-filer (se rad 2221)
            // CallActivities används bara för att samla child documentation för Process Feature Goals
            if (node.type === 'callActivity') {
              // Hoppa över - Process Feature Goal genereras senare för subprocess-filen
              continue;
            } else if (node.type === 'businessRuleTask') {
              try {
                nodeDocContent = await renderDocWithLlm(
                  'businessRule',
                  nodeContext,
                  docLinks,
                  useLlm,
                  llmProvider,
                  async (provider, fallbackUsed, docJson) => {
                    if (fallbackUsed) {
                      llmFallbackUsed = true;
                      llmFinalProvider = provider;
                    }
                    const scenarioProvider = mapProviderToScenarioProvider(
                      provider,
                      fallbackUsed,
                    );
                    if (docJson) {
                      lastDocJson = docJson;
                      
                      // Spara child node dokumentation för att använda i parent node prompts
                      // För callActivities: använd subprocessFile som key (för återkommande subprocesser)
                      // För tasks/epics: använd node.id som key
                      // VIKTIGT: För återkommande noder sparar vi bara första gången
                      // (för att använda i parent node prompts), men genererar dokumentation per instans
                      if (docJson && typeof docJson === 'object') {
                        const childDocKey = node.type === 'callActivity' && node.subprocessFile
                          ? `subprocess:${node.subprocessFile}`
                          : node.id;
                        
                        // Spara bara om det inte redan finns (första gången noden genereras)
                        if (!generatedChildDocs.has(childDocKey)) {
                          const childDocInfo: {
                            summary: string;
                            flowSteps: string[];
                            inputs?: string[];
                            outputs?: string[];
                            scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
                            userStories?: Array<{
                              id: string;
                              role: string;
                              goal: string;
                              value: string;
                              acceptanceCriteria: string[];
                            }>;
                          } = {
                            summary: (docJson as any).summary || '',
                            flowSteps: Array.isArray((docJson as any).decisionLogic) ? (docJson as any).decisionLogic : [],
                            inputs: Array.isArray((docJson as any).inputs) ? (docJson as any).inputs : [],
                            outputs: Array.isArray((docJson as any).outputs) ? (docJson as any).outputs : [],
                            scenarios: Array.isArray((docJson as any).scenarios) ? (docJson as any).scenarios : [],
                          };
                          // Lägg till userStories om de finns (för Epic-dokumentation)
                          if (Array.isArray((docJson as any).userStories)) {
                            childDocInfo.userStories = (docJson as any).userStories.map((us: any) => ({
                              id: us.id || '',
                              role: us.role || 'Kund',
                              goal: us.goal || '',
                              value: us.value || '',
                              acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria : [],
                            }));
                          }
                          generatedChildDocs.set(childDocKey, childDocInfo);
                        }
                      }
                    }
                    // OBS: Testscenarion (scenarios) genereras inte längre i dokumentationssteget.
                    // Testinformation genereras i ett separat steg och ska inte sparas här.
                  },
                  undefined, // childrenDocumentation (not applicable for businessRule/epic)
                  undefined, // structuralInfo (not applicable for businessRule)
                  checkCancellation,
                  abortSignal,
                );
                if (!(docLinks as any).dmnLink) {
                  nodeDocContent +=
                    '\n<p>Ingen DMN-länk konfigurerad ännu – lägg till beslutstabell när den finns.</p>';
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(
                  `[bpmnGenerators] LLM documentation generation failed for ${node.bpmnElementId} (${node.type}):`,
                  errorMessage
                );
                // Don't silently fallback - this is a critical error
                // Re-throw the error so the user knows LLM generation failed
                throw new Error(
                  `Failed to generate ${node.type} documentation for ${node.bpmnElementId}: ${errorMessage}. ` +
                  `Please ensure LLM is enabled (VITE_USE_LLM=true and VITE_ANTHROPIC_API_KEY is set).`
                );
              }
            } else {
              // Epic documentation (userTask, serviceTask)
              try {
                nodeDocContent = await renderDocWithLlm(
                  'epic',
                  nodeContext,
                  docLinks,
                  useLlm,
                  llmProvider,
                  async (provider, fallbackUsed, docJson) => {
                    if (fallbackUsed) {
                      llmFallbackUsed = true;
                      llmFinalProvider = provider;
                    }
                    const scenarioProvider = mapProviderToScenarioProvider(
                      provider,
                      fallbackUsed,
                    );
                    if (docJson) {
                      lastDocJson = docJson;
                      
                      // Spara child node dokumentation för att använda i parent node prompts
                      // För callActivities: använd subprocessFile som key (för återkommande subprocesser)
                      // För tasks/epics: använd node.id som key
                      // VIKTIGT: För återkommande subprocesser sparar vi bara första gången
                      // (för att använda i parent node prompts), men genererar dokumentation per instans
                      if (docJson && typeof docJson === 'object') {
                        const childDocKey = node.type === 'callActivity' && node.subprocessFile
                          ? `subprocess:${node.subprocessFile}`
                          : node.id;
                        
                        // Spara bara om det inte redan finns (första gången subprocessen genereras)
                        if (!generatedChildDocs.has(childDocKey)) {
                          const childDocInfo: {
                            summary: string;
                            flowSteps: string[];
                            inputs?: string[];
                            outputs?: string[];
                            scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
                            userStories?: Array<{
                              id: string;
                              role: string;
                              goal: string;
                              value: string;
                              acceptanceCriteria: string[];
                            }>;
                          } = {
                            summary: (docJson as any).summary || '',
                            flowSteps: Array.isArray((docJson as any).flowSteps) ? (docJson as any).flowSteps : [],
                            inputs: Array.isArray((docJson as any).inputs) ? (docJson as any).inputs : [],
                            outputs: Array.isArray((docJson as any).outputs) ? (docJson as any).outputs : [],
                            scenarios: Array.isArray((docJson as any).scenarios) ? (docJson as any).scenarios : [],
                          };
                          // Lägg till userStories om de finns (för Epic-dokumentation)
                          if (Array.isArray((docJson as any).userStories)) {
                            childDocInfo.userStories = (docJson as any).userStories.map((us: any) => ({
                              id: us.id || '',
                              role: us.role || 'Kund',
                              goal: us.goal || '',
                              value: us.value || '',
                              acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria : [],
                            }));
                          }
                          generatedChildDocs.set(childDocKey, childDocInfo);
                        }
                      }
                    }
                    // OBS: Testscenarion (scenarios) genereras inte längre i dokumentationssteget.
                    // Testinformation genereras i ett separat steg och ska inte sparas här.
                  },
                  undefined, // childrenDocumentation (not applicable for epic)
                  undefined, // structuralInfo (not applicable for epic)
                  checkCancellation,
                  abortSignal,
                );
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(
                  `[bpmnGenerators] LLM documentation generation failed for ${node.bpmnElementId} (${node.type}):`,
                  errorMessage
                );
                // Don't silently fallback - this is a critical error
                // Re-throw the error so the user knows LLM generation failed
                throw new Error(
                  `Failed to generate ${node.type} documentation for ${node.bpmnElementId}: ${errorMessage}. ` +
                  `Please ensure LLM is enabled (VITE_USE_LLM=true and VITE_ANTHROPIC_API_KEY is set).`
                );
              }
            }
          } else {
            // useLlm is false - use template-based documentation
            nodeDocContent = generateDocumentationHTML(node.element, undefined, undefined);
          }

          // VIKTIGT: callActivities har redan lagts till med Feature Goal-path (rad 2006-2009)
          // Så vi ska INTE lägga till dem igen med Epic-path här
          // Endast userTasks, serviceTasks och businessRuleTasks ska läggas till här
          if (node.type !== 'callActivity') {
            result.docs.set(
              docFileKey,
              insertGenerationMeta(nodeDocContent, generationSourceLabel),
            );
          }

          // === TESTGENERERING HAR FLYTTATS TILL SEPARAT STEG ===
          // Testfiler och testscenarion genereras inte längre i dokumentationssteget.
          // Scenarion från dokumentationen sparas fortfarande i node_planned_scenarios
          // (se renderDocWithLlm callback ovan) eftersom de är del av dokumentationen.

          hierarchicalNodeArtifacts.push({
            bpmnFile: node.bpmnFile,
            elementId: node.bpmnElementId,
            elementName: node.name || node.bpmnElementId,
            docFileName: docFileKey,
            testFileName: undefined, // Testfiler genereras inte längre här
          });
          // Markera som processad både lokalt (för combinedBody) och globalt (för dubbelgenerering)
          processedDocNodesInFile.add(docKey);
          // För callActivities: markera med docKey (subprocess:file) för att undvika dubbelgenerering av base doc
          // För tasks/epics: markera med docKey (file::elementId) för att undvika dubbelgenerering
          // Men vi tillåter fortfarande instans-specifik dokumentation för återkommande noder
          // För callActivities: alltid lägg till i globalProcessedDocNodes (vi genererar alltid instans-specifik)
          // För tasks/epics: lägg till om inte redan processad
          if (node.type === 'callActivity' || !alreadyProcessedGlobally) {
            globalProcessedDocNodes.add(docKey);
          }

          // För file-level documentation: bara inkludera länkar och översikt, inte hela dokumentationen
          // Användare kan klicka på länken för att se fullständig dokumentation
          // Detta gäller för ALLA noder (inklusive callActivities)
          let nodeDocUrl: string;
          let nodeTypeLabel: string;
          
          if (node.type === 'callActivity') {
            // För callActivities: Feature Goal-dokumentation använder hierarchical naming
            // URL:en ska peka på Feature Goal-dokumentationen
            const bpmnFileForFeatureGoal = node.subprocessFile || node.bpmnFile;
            const parentBpmnFile = node.bpmnFile; // parent file där callActivity är definierad
            const featureGoalPath = getFeatureGoalDocFileKey(
              bpmnFileForFeatureGoal,
              node.bpmnElementId,
              undefined,
              parentBpmnFile,
            );
            // Feature Goal paths är: feature-goals/{parent}-{elementId}.html
            // DocViewer förväntar sig: feature-goals/{parent}-{elementId} (utan .html)
            const featureGoalViewerPath = featureGoalPath.replace('.html', '');
            nodeDocUrl = `#/doc-viewer/${encodeURIComponent(featureGoalViewerPath)}`;
            nodeTypeLabel = 'Feature Goal';
          } else {
            // För Epics och Business Rules: använd vanlig node-dokumentation
            nodeDocUrl = getDocumentationUrl(node.bpmnFile, node.bpmnElementId);
            nodeTypeLabel = node.type === 'serviceTask' ? 'Service Task' 
              : node.type === 'userTask' ? 'User Task'
              : node.type === 'businessRuleTask' ? 'Business Rule'
              : node.type;
          }
          
          // Extrahera en kort sammanfattning från dokumentationen (första paragrafen eller summary)
          let summaryText = '';
          try {
            // Försök extrahera summary från JSON om den finns
            const nodeDocKey = node.type === 'callActivity' && node.subprocessFile
              ? `subprocess:${node.subprocessFile}`
              : `${node.bpmnFile}::${node.bpmnElementId}`;
            const nodeDocInfo = generatedChildDocs.get(nodeDocKey);
            if (nodeDocInfo?.summary) {
              summaryText = nodeDocInfo.summary;
              // Begränsa till första meningen eller max 200 tecken
              const firstSentence = summaryText.split('.')[0];
              summaryText = firstSentence.length < 200 ? firstSentence + '.' : summaryText.substring(0, 197) + '...';
            } else {
              // Fallback: extrahera från HTML om JSON inte finns
              const summaryMatch = nodeDocContent.match(/<section[^>]*data-source-summary[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
              if (summaryMatch) {
                summaryText = summaryMatch[1].replace(/<[^>]*>/g, '').trim();
                // Begränsa till första meningen eller max 200 tecken
                const firstSentence = summaryText.split('.')[0];
                summaryText = firstSentence.length < 200 ? firstSentence + '.' : summaryText.substring(0, 197) + '...';
              }
            }
          } catch (error) {
            // Om extraktion misslyckas, använd tom sträng
            summaryText = '';
          }
          
          // Inkludera hela dokumentationen direkt på sidan
          // Extrahera body-innehållet från nodeDocContent (ta bort <html>, <head>, <body> tags)
          let fullDocContent = nodeDocContent;
          const bodyMatch = nodeDocContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            fullDocContent = bodyMatch[1];
          } else {
            // Om ingen body-tag finns, ta bort html/head tags om de finns
            fullDocContent = nodeDocContent
              .replace(/<html[^>]*>/i, '')
              .replace(/<\/html>/i, '')
              .replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
              .trim();
          }
          
          combinedBody += `<div class="node-section">
  <span class="node-type">${nodeTypeLabel}</span>
  <h2>${node.name || node.bpmnElementId}</h2>
  ${fullDocContent}
</div>
`;
          
          // Samla data från node-dokumentationen för file-level JSON (används av E2E-generering)
          // Försök hämta från lastDocJson eller generatedChildDocs
          const nodeDocKey = node.type === 'callActivity' && node.subprocessFile
            ? `subprocess:${node.subprocessFile}`
            : `${node.bpmnFile}::${node.bpmnElementId}`;
          
          const nodeDocInfo = generatedChildDocs.get(nodeDocKey);
          if (nodeDocInfo) {
            // Samla summaries från alla noder (används för att bygga process-sammanfattning)
            if (nodeDocInfo.summary) {
              fileLevelDocData.summary = fileLevelDocData.summary 
                ? `${fileLevelDocData.summary}\n\n${nodeDocInfo.summary}`
                : nodeDocInfo.summary;
            }
            
            // Samla flowSteps från alla noder (sorteras senare baserat på processens flöde)
            if (Array.isArray(nodeDocInfo.flowSteps) && nodeDocInfo.flowSteps.length > 0) {
              // Lägg till node-kontext till varje flowStep för att förstå ordningen
              fileLevelDocData.flowSteps.push(...nodeDocInfo.flowSteps.map(step => 
                `${node.name || node.bpmnElementId}: ${step}`
              ));
            }
            
            // Samla userStories från Epic-dokumentationen (om de finns i nodeDocInfo)
            // OBS: userStories kan finnas i nodeDocInfo om de har samlats från Epic-dokumentationen
            const nodeDocInfoWithStories = nodeDocInfo as typeof nodeDocInfo & { userStories?: Array<{
              id: string;
              role: string;
              goal: string;
              value: string;
              acceptanceCriteria: string[];
            }> };
            if (nodeDocInfoWithStories.userStories && Array.isArray(nodeDocInfoWithStories.userStories) && nodeDocInfoWithStories.userStories.length > 0) {
              if (!fileLevelDocData.userStories) {
                fileLevelDocData.userStories = [];
              }
              // Lägg till userStories från denna nod (de är redan i rätt format)
              fileLevelDocData.userStories.push(...nodeDocInfoWithStories.userStories);
            }
            
            // Samla dependencies (inputs + outputs)
            const deps: string[] = [];
            if (Array.isArray(nodeDocInfo.inputs)) {
              deps.push(...nodeDocInfo.inputs.map(input => `Input: ${input}`));
            }
            if (Array.isArray(nodeDocInfo.outputs)) {
              deps.push(...nodeDocInfo.outputs.map(output => `Output: ${output}`));
            }
            if (deps.length > 0) {
              fileLevelDocData.dependencies = [...(fileLevelDocData.dependencies || []), ...deps];
            }
          }
        }
        
        // Ta bort duplicerade dependencies (behåll flowSteps med kontext för nu)
        fileLevelDocData.dependencies = [...new Set(fileLevelDocData.dependencies || [])];
        
        // Generera combined file-level documentation för både root-processer och subprocesser
        // Root-processer behöver combined doc som en samlad översikt över alla noder
        // Subprocesser får också file-level docs (ersätter Process Feature Goals)
        // En fil är en root-fil om:
        // 1. Den är den faktiska root-filen i hierarkin (bpmnFileName === file OCH isRootFileGeneration = true), ELLER
        // 2. Den är root-processen enligt bpmn-map.json (orchestration.root_process)
        //    Om bpmn-map inte kan laddas, använd fallback: filen är root om den INTE är en subprocess-fil
        // VIKTIGT: Använd effectiveRootProcessId (med fallback) istället för rootProcessId direkt
        const fileBaseNameForRoot = file.replace('.bpmn', '');
        const isRootProcessFromMapForRoot = effectiveRootProcessId && (fileBaseNameForRoot === effectiveRootProcessId || file === `${effectiveRootProcessId}.bpmn`);
        const hasCallActivityPointingToFileForRoot = Array.from(testableNodes.values()).some(
          node => node.type === 'callActivity' && node.subprocessFile === file
        );
        const processNodeForFileForRoot = Array.from(graph.allNodes.values()).find(
          node => node.type === 'process' && node.bpmnFile === file
        );
        // VIKTIGT: För att avgöra om en fil är en subprocess-fil när den laddas upp isolerat:
        // - Om det finns en process node men INGEN callActivity pekar på filen, kan det fortfarande vara en subprocess-fil
        // - Vi måste kolla bpmn-map för att säkerställa att filen INTE är root-processen
        // - Om bpmn-map inte kan laddas, använd fallback: om filen har en process node men INGEN callActivity pekar på den,
        //   och det är isolerad generering (useHierarchy = false), är det troligen en subprocess-fil
        const isSubprocessFileForRoot = (hasCallActivityPointingToFileForRoot || !!processNodeForFileForRoot) && !isRootProcessFromMapForRoot;
        
        // YTTERLIGARE KONTROLL: Om filen laddas upp isolerat (useHierarchy = false) och det finns en process node
        // men filen INTE är root-processen enligt bpmn-map, är det en subprocess-fil
        // VIKTIGT: Om bpmn-map inte kan laddas (rootProcessId = null), använd fallback:
        // - Om filen har en process node men INGEN callActivity pekar på den, är det troligen en subprocess-fil
        // - Men om det är isolerad generering (useHierarchy = false) och filen är den enda filen (graphFileScope.length === 1),
        //   är det troligen en subprocess-fil som laddas upp isolerat
        const isIsolatedSubprocessFile = !useHierarchy && 
          !!processNodeForFileForRoot && 
          file === bpmnFileName && // Det är den fil som genereras
          (
            // Antingen är filen INTE root-processen enligt bpmn-map
            !isRootProcessFromMapForRoot ||
            // ELLER bpmn-map saknas och filen har en process node men INGEN callActivity pekar på den
            (!effectiveRootProcessId && !hasCallActivityPointingToFileForRoot && graphFileScope.length === 1)
          );
        
        const isRootFile = isRootProcessFromMapForRoot || (isRootFileGeneration && file === bpmnFileName) || (!isSubprocessFileForRoot && !effectiveRootProcessId);
        
        // Generera file-level docs för både root och subprocesser
        if (combinedBody.trim().length > 0) {
          // VIKTIGT: Alltid skapa enhancedJsonData även om fileLevelDocData är tom
          // Detta säkerställer att JSON alltid embeddas i file-level dokumentationen
          // (används av E2E-scenariogenerering)
          let enhancedJsonData: {
            summary: string;
            flowSteps: string[];
            userStories?: Array<{
              id: string;
              role: string;
              goal: string;
              value: string;
              acceptanceCriteria: string[];
            }>;
            dependencies?: string[];
          };
          
          if (fileLevelDocData.summary || fileLevelDocData.flowSteps.length > 0) {
            // Vi har data från noder - använd den
            enhancedJsonData = {
              summary: fileLevelDocData.summary || `Dokumentation för ${file}`,
              flowSteps: fileLevelDocData.flowSteps,
              userStories: fileLevelDocData.userStories || [],
              dependencies: fileLevelDocData.dependencies || [],
            };
          } else {
            // Ingen data från noder - skapa minimal JSON-struktur
            // Detta säkerställer att JSON alltid embeddas (krävs för E2E-scenariogenerering)
            enhancedJsonData = {
              summary: `Dokumentation för ${file}`,
              flowSteps: [],
              userStories: [],
              dependencies: [],
            };
          }
          
          // Om vi har noder och LLM är aktiverat, förbättra sammanfattningen med processens struktur
          if (useLlm && isLlmEnabled() && sortedNodesInFile.length > 0) {
            try {
              // Bygg flow graph för filen för att förstå processens struktur
              const fileUrl = `/bpmn/${file}`;
              const fileVersionHash = versionHashes.get(file) || null;
              const parseResult = await parseBpmnFile(fileUrl, fileVersionHash);
              const flowGraph = buildFlowGraph(parseResult);
              const startEvents = findStartEvents(flowGraph);
              const paths = startEvents.length > 0 
                ? findPathsThroughProcess(flowGraph, startEvents[0].id)
                : [];
              
              // Samla alla noders dokumentation med kontext från processens struktur
              const nodesWithDocs: Array<{
                name: string;
                type: string;
                orderIndex?: number;
                summary?: string;
                flowSteps?: string[];
                inputs?: string[];
                outputs?: string[];
              }> = [];
              
              for (const node of sortedNodesInFile) {
                const nodeDocKey = node.type === 'callActivity' && node.subprocessFile
                  ? `subprocess:${node.subprocessFile}`
                  : `${node.bpmnFile}::${node.bpmnElementId}`;
                const nodeDocInfo = generatedChildDocs.get(nodeDocKey);
                
                if (nodeDocInfo) {
                  nodesWithDocs.push({
                    name: node.name || node.bpmnElementId,
                    type: node.type,
                    orderIndex: node.orderIndex,
                    summary: nodeDocInfo.summary,
                    flowSteps: nodeDocInfo.flowSteps,
                    inputs: nodeDocInfo.inputs,
                    outputs: nodeDocInfo.outputs,
                  });
                }
              }
              
              // Bygg en intelligent sammanfattning baserat på processens struktur och alla noders dokumentation
              if (nodesWithDocs.length > 0) {
                const processName = processNodeForFileForRoot?.name || file.replace('.bpmn', '');
                
                // Skapa en sammanfattning av processen baserat på alla noders summaries
                // Sortera noder efter orderIndex för att få rätt ordning
                const sortedNodes = [...nodesWithDocs].sort((a, b) => {
                  const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
                  const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
                  return orderA - orderB;
                });
                
                // Bygg process-sammanfattning från alla noders summaries
                const nodeSummaries = sortedNodes
                  .filter(n => n.summary && n.summary.trim().length > 0)
                  .map(n => n.summary)
                  .join(' ');
                
                // Skapa en process-sammanfattning
                let processSummary = '';
                if (nodeSummaries.length > 0) {
                  // Ta första 500 tecknen från kombinerade summaries som process-sammanfattning
                  processSummary = nodeSummaries.substring(0, 500);
                  if (nodeSummaries.length > 500) {
                    processSummary += '...';
                  }
                } else {
                  // Fallback: skapa en enkel sammanfattning baserat på processens struktur
                  processSummary = `Processen "${processName}" består av ${sortedNodes.length} steg: ${sortedNodes.map(n => n.name).join(', ')}.`;
                  if (paths.length > 0) {
                    processSummary += ` Processen har ${paths.length} möjliga flödesvägar genom systemet.`;
                  }
                }
                
                // Sortera flowSteps baserat på processens struktur (orderIndex)
                // Ta bort node-kontext från flowSteps och sortera dem i rätt ordning
                const flowStepsByNode = new Map<string, string[]>();
                for (const node of sortedNodes) {
                  if (node.flowSteps && node.flowSteps.length > 0) {
                    // Ta bort node-kontext från flowSteps (om de har det)
                    const cleanSteps = node.flowSteps.map(step => 
                      step.includes(': ') ? step.split(': ').slice(1).join(': ') : step
                    );
                    flowStepsByNode.set(node.name, cleanSteps);
                  }
                }
                
                // Bygg flowSteps i rätt ordning baserat på processens struktur
                const orderedFlowSteps: string[] = [];
                for (const node of sortedNodes) {
                  const steps = flowStepsByNode.get(node.name);
                  if (steps) {
                    orderedFlowSteps.push(...steps);
                  }
                }
                
                // Ta bort duplicerade flowSteps (behåll ordningen)
                const uniqueFlowSteps = Array.from(new Set(orderedFlowSteps));
                
                enhancedJsonData = {
                  summary: processSummary,
                  flowSteps: uniqueFlowSteps.length > 0 ? uniqueFlowSteps : enhancedJsonData.flowSteps,
                  userStories: enhancedJsonData.userStories || [],
                  dependencies: enhancedJsonData.dependencies || [],
                };
              }
            } catch (error) {
              // Om flow graph-byggning misslyckas, använd fallback-data
              if (import.meta.env.DEV) {
                console.warn(`[bpmnGenerators] Failed to build flow graph for ${file}, using fallback data:`, error);
              }
            }
          }
          
          // File-level docs behålls bara för E2E-scenarier (JSON-data)
          // Användaren ser Process Feature Goal istället (genereras nedan för subprocess-filer)
          const finalHtml = insertGenerationMeta(
            wrapLlmContentAsDocument(combinedBody, `Dokumentation - ${file}`, { jsonData: enhancedJsonData }),
            generationSourceLabel,
          );
          
          result.docs.set(docFileName, finalHtml);
        }
        
        // VIKTIGT: Generera Feature Goal för root-processen (mortgage.bpmn)
        // Detta görs endast för root-processen när isActualRootFile = true
        // VIKTIGT: Använd samma logik som ovan (isSubprocessFileForRoot) för att avgöra om filen är subprocess
        // Generera Root Process Feature Goal ENDAST om:
        // 1. Filen är root-filen (file === bpmnFileName)
        // 2. Det är faktiskt root-fil-generering (isActualRootFile && isRootFileGeneration)
        // 3. Filen INTE är en subprocess-fil (ingen callActivity pekar på den, eller den är root-processen enligt bpmn-map)
        // 4. Filen är root-processen enligt bpmn-map.json ELLER rootProcessId saknas (fallback för batch-generering)
        // 5. Filen är INTE en isolerad subprocess-fil (isIsolatedSubprocessFile = false)
        // 
        // VIKTIGT: Om en subprocess-fil laddas upp isolerat, finns det ingen callActivity som pekar på den,
        // men det finns en process node. I så fall är filen fortfarande en subprocess-fil och ska INTE få Root Process Feature Goal.
        // Använd isRootProcessFromMapForRoot för att avgöra om det är root-processen enligt bpmn-map.
        // 
        // YTTERLIGARE SÄKERHETSKONTROLL: Om filen är en subprocess-fil (isSubprocessFileForRoot = true),
        // generera INTE Root Process Feature Goal, även om isRootProcessFromMapForRoot är true.
        // Detta förhindrar att subprocess-filer får Root Process Feature Goal när de laddas upp isolerat.
        // 
        // FALLBACK FÖR BATCH-GENERERING: Om rootProcessId saknas men isRootFileGeneration = true och file === bpmnFileName,
        // generera Root Process Feature Goal ändå (för batch-generering när bpmn-map inte kan laddas)
        // MEN ENDAST om det INTE är en isolerad subprocess-fil
        // KRITISKT: Förhindra generering av Root Process Feature Goal för isolerade subprocess-filer
        // 
        // REGEL 1: Om useHierarchy = false (isolerad generering), generera ALDRIG Root Process Feature Goal
        // Detta är den viktigaste kontrollen - isolerad generering betyder att vi bara genererar för en fil,
        // och subprocess-filer ska INTE få Root Process Feature Goal när de laddas upp isolerat.
        // 
        // REGEL 2: Root Process Feature Goal genereras ENDAST när:
        // - useHierarchy = true (hierarkisk generering)
        // - isActualRootFile = true (det är faktiskt root-filen)
        // - isRootFileGeneration = true (hela hierarkin genereras)
        // - Filen är root-processen enligt bpmn-map ELLER det är batch-generering (många filer)
        // 
        // REGEL 3: Subprocess-filer ska ALDRIG få Root Process Feature Goal, även om de är den enda filen
        const shouldGenerateRootFeatureGoal = useHierarchy && // KRITISKT: Kräv useHierarchy = true
          file === bpmnFileName && 
          isActualRootFile && 
          isRootFileGeneration && 
          !isSubprocessFileForRoot &&
          !isIsolatedSubprocessFile && // VIKTIGT: Förhindra generering för isolerade subprocess-filer
          (isRootProcessFromMapForRoot || (!effectiveRootProcessId && isRootFileGeneration && !isIsolatedSubprocessFile && graphFileScope.length > 1)); // Fallback för batch-generering (många filer), men INTE för isolerade subprocess-filer (1 fil)
        
        if (shouldGenerateRootFeatureGoal) {
          const fileBaseName = file.replace('.bpmn', '');
          
          // Generera Feature Goal för root-processen (redan verifierat att det är root-processen via isRootProcessFromMapForRoot)
            const processNodeForRoot = Array.from(graph.allNodes.values()).find(
              node => node.type === 'process' && node.bpmnFile === file
            );
            
            if (processNodeForRoot) {
              // Bygg kontext för root-processen
              const rootContext = buildNodeDocumentationContext(graph, processNodeForRoot.id);
              if (!rootContext) {
                console.warn(`[bpmnGenerators] ⚠️ No rootContext found for root process ${processNodeForRoot.id}, skipping Feature Goal generation`);
              } else {
                // Hämta child documentation för root-processen
                const rootChildDocs = new Map<string, {
                  summary: string;
                  flowSteps: string[];
                  inputs?: string[];
                  outputs?: string[];
                  scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
                }>();
                
                // Samla child documentation från alla callActivities i root-processen
                for (const childNode of processNodeForRoot.children || []) {
                  if (childNode.type === 'callActivity' && childNode.subprocessFile) {
                    const childDocKey = `subprocess:${childNode.subprocessFile}`;
                    const childDoc = generatedChildDocs.get(childDocKey);
                    if (childDoc) {
                      rootChildDocs.set(childNode.bpmnElementId, childDoc);
                    }
                  }
                }
                
                // Konvertera rootChildDocs till Map<string, ChildNodeDocumentation> format
                const convertedRootChildDocs = rootChildDocs.size > 0
                  ? new Map<string, ChildNodeDocumentation>(
                      Array.from(rootChildDocs.entries()).map(([elementId, doc]) => [
                        elementId,
                        {
                          id: elementId,
                          name: elementId,
                          type: 'unknown',
                          summary: doc.summary,
                          flowSteps: doc.flowSteps,
                          inputs: doc.inputs,
                          outputs: doc.outputs,
                        }
                      ])
                    )
                  : undefined;
                
                // Generera Feature Goal för root-processen
                const fileVersionHash = getVersionHashForFile ? await getVersionHashForFile(file) : null;
                const rootFeatureGoalContent = await renderDocWithLlm(
                  'feature',
                  rootContext,
                  {
                    bpmnViewerLink: await getBpmnFileUrl(file, fileVersionHash),
                    dmnLink: undefined,
                  },
                  useLlm,
                  llmProvider,
                  async (provider, fallbackUsed, docJson) => {
                    if (fallbackUsed) {
                      llmFallbackUsed = true;
                      llmFinalProvider = provider;
                    }
                    // lastDocJson är redan definierad i scopet ovanför
                    if (docJson) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const _ = docJson; // Spara för framtida användning om behövs
                    }
                  },
                  convertedRootChildDocs,
                  undefined, // structuralInfo
                  checkCancellation,
                  abortSignal,
                );
                
                // Skapa Feature Goal-sida för root-processen (non-hierarchical naming)
                // VIKTIGT: Sätt isRootProcess = true för att ange att det är root-processen
                const rootFeatureDocPath = getFeatureGoalDocFileKey(
                  file,
                  processNodeForRoot.bpmnElementId || fileBaseName,
                  undefined, // no version suffix
                  undefined, // no parent (root process)
                  true, // isRootProcess = true (detta är root-processen)
                );
                
                if (!result.docs.has(rootFeatureDocPath)) {
                  result.docs.set(
                    rootFeatureDocPath,
                    insertGenerationMeta(rootFeatureGoalContent, generationSourceLabel),
                  );
                }
              }
            }
        }
        
        // VIKTIGT: Generera Process Feature Goal för ALLA subprocess-filer
        // Detta är vad användaren ska se i doc-viewer för subprocess-filer
        // File-level docs behålls bara för E2E-scenarier (JSON-data)
        // OBS: Process Feature Goal genereras även för subprocess-filer MED callActivities,
        // eftersom CallActivities i parent-processer behöver dokumentation att länka till
        const shouldGenerateProcessFeatureGoal = isSubprocessFileForRoot && 
          !!processNodeForFileForRoot && 
          processNodeForFileForRoot.type === 'process';
        
        // Debug logging för Process Feature Goal-generering
        if (import.meta.env.DEV) {
          console.log(`[bpmnGenerators] Process Feature Goal check for ${file}:`, {
            isSubprocessFileForRoot,
            hasProcessNode: !!processNodeForFileForRoot,
            processNodeType: processNodeForFileForRoot?.type,
            processNodeId: processNodeForFileForRoot?.id,
            processNodeElementId: processNodeForFileForRoot?.bpmnElementId,
            hasCallActivities: sortedNodesInFile.some(n => n.type === 'callActivity'),
            callActivityNodes: sortedNodesInFile.filter(n => n.type === 'callActivity').map(n => n.bpmnElementId),
            shouldGenerate: shouldGenerateProcessFeatureGoal,
            sortedNodesInFileLength: sortedNodesInFile.length,
            sortedNodesInFile: sortedNodesInFile.map(n => ({ type: n.type, id: n.bpmnElementId, name: n.name })),
          });
        }
        
        if (shouldGenerateProcessFeatureGoal) {
          const fileBaseName = file.replace('.bpmn', '');
          
          // Bygg kontext för subprocess-processen
          const subprocessContext = buildNodeDocumentationContext(graph, processNodeForFileForRoot.id);
          if (!subprocessContext) {
            console.warn(`[bpmnGenerators] ⚠️ No subprocessContext found for subprocess ${processNodeForFileForRoot.id}, skipping Process Feature Goal generation`);
          } else {
            // VIKTIGT: Samla usage cases (parent callActivities) för att identifiera skillnader
            // Hitta alla callActivities som anropar denna subprocess-fil
            // VIKTIGT: Filtrera bort callActivities från filer som inte finns (saknade BPMN-filer)
            const parentCallActivities = Array.from(graph.allNodes.values())
              .filter(node => 
                node.type === 'callActivity' && 
                node.subprocessFile === file &&
                existingBpmnFiles.includes(node.bpmnFile) // ✅ Bara inkludera callActivities från filer som faktiskt finns
              );
            
            // Samla information om varje parent callActivity för att identifiera skillnader
            const usageCasesData: Array<{
              parentBpmnFile: string;
              parentProcessName: string;
              callActivityName: string;
              callActivityId: string;
              conditions: string[];
            }> = [];
            
            for (const ca of parentCallActivities) {
              // Hitta parent-process-noden (process-noden i samma fil som callActivity)
              const parentProcessNode = Array.from(graph.allNodes.values()).find(
                n => n.type === 'process' && n.bpmnFile === ca.bpmnFile
              );
              
              const parentProcessName = parentProcessNode?.name || ca.bpmnFile.replace('.bpmn', '');
              
              // Extrahera gateway-conditions från incoming flows
              const conditions: string[] = [];
              if (ca.element?.businessObject?.incoming) {
                const incoming = Array.isArray(ca.element.businessObject.incoming)
                  ? ca.element.businessObject.incoming
                  : [ca.element.businessObject.incoming];
                
                for (const flow of incoming) {
                  if (flow?.conditionExpression) {
                    const condition = flow.conditionExpression.body || flow.conditionExpression.text;
                    if (condition) {
                      // Ta bort ${ och } från condition
                      const cleanCondition = condition.replace(/\$\{|\}/g, '').trim();
                      if (cleanCondition && !conditions.includes(cleanCondition)) {
                        conditions.push(cleanCondition);
                      }
                    }
                  }
                }
              }
              
              usageCasesData.push({
                parentBpmnFile: ca.bpmnFile,
                parentProcessName,
                callActivityName: ca.name || ca.bpmnElementId,
                callActivityId: ca.bpmnElementId,
                conditions,
              });
            }
            
            // Identifiera skillnader: visa usage cases ENDAST om det finns flera parent-processer OCH skillnader
            // VIKTIGT: Deduplicera baserat på parentProcessName för att undvika duplicering
            // när samma parent process har flera call activities som anropar samma subprocess
            const uniqueUsageCasesMap = new Map<string, {
              parentBpmnFile: string;
              parentProcessName: string;
              callActivityName: string;
              callActivityId: string;
              conditions: string[];
            }>();
            
            for (const uc of usageCasesData) {
              // VIKTIGT: Använd parentBpmnFile som unik nyckel (inte parentProcessName)
              // Detta säkerställer att flera callActivities från samma fil räknas som en parent-process
              const uniqueKey = uc.parentBpmnFile;
              if (!uniqueUsageCasesMap.has(uniqueKey)) {
                uniqueUsageCasesMap.set(uniqueKey, uc);
              } else {
                // Om det redan finns en usage case för denna parent process, samla conditions
                const existing = uniqueUsageCasesMap.get(uniqueKey)!;
                // Kombinera conditions (ta bort duplicering)
                const combinedConditions = [...new Set([...existing.conditions, ...uc.conditions])];
                uniqueUsageCasesMap.set(uniqueKey, {
                  ...existing,
                  conditions: combinedConditions,
                });
              }
            }
            
            const uniqueUsageCasesData = Array.from(uniqueUsageCasesMap.values());
            // VIKTIGT: Räkna unika parent-filer (inte parent-processer), eftersom samma fil kan ha flera callActivities
            const hasMultipleParents = uniqueUsageCasesData.length > 1;
            
            // Kolla om det finns skillnader mellan parent-processer
            // Detta kräver att det finns flera parent-processer OCH att de har olika conditions
            const hasDifferentConditions = hasMultipleParents && 
                                          uniqueUsageCasesData.some(uc => uc.conditions.length > 0) && 
                                          !uniqueUsageCasesData.every(uc => 
                                            uc.conditions.length === uniqueUsageCasesData[0].conditions.length &&
                                            uc.conditions.every((c, i) => c === uniqueUsageCasesData[0].conditions[i])
                                          );
            
            // Lägg till usageCases i context ENDAST om det finns flera parent-processer OCH skillnader
            // VIKTIGT: Om det bara finns en parent-process (en fil), visa INTE "Användningsfall"-sektionen
            // OBS: hasDifferentConditions kräver redan hasMultipleParents, så vi behöver bara kolla hasMultipleParents
            const usageCases = hasMultipleParents && hasDifferentConditions
              ? uniqueUsageCasesData.map(uc => ({
                  parentProcess: uc.parentProcessName,
                  conditions: uc.conditions.length > 0 ? uc.conditions : undefined,
                }))
              : undefined;
            
            // Berika subprocessContext med usageCases
            const enrichedSubprocessContext = usageCases
              ? {
                  ...subprocessContext,
                  usageCases,
                }
              : subprocessContext;
            // Hämta child documentation för subprocess-processen (från tasks/epics)
            const subprocessChildDocs = new Map<string, {
              summary: string;
              flowSteps: string[];
              inputs?: string[];
              outputs?: string[];
            }>();
            
            // Samla child documentation från alla tasks/epics i subprocess-processen
            for (const childNode of processNodeForFileForRoot.children || []) {
              if (childNode.type !== 'callActivity' && childNode.type !== 'process') {
                const childDocKey = `${childNode.bpmnFile}::${childNode.bpmnElementId}`;
                const childDoc = generatedChildDocs.get(childDocKey);
                if (childDoc) {
                  subprocessChildDocs.set(childNode.bpmnElementId, childDoc);
                }
              }
            }
            
            // Konvertera subprocessChildDocs till Map<string, ChildNodeDocumentation> format
            const convertedSubprocessChildDocs = subprocessChildDocs.size > 0
              ? new Map<string, ChildNodeDocumentation>(
                  Array.from(subprocessChildDocs.entries()).map(([elementId, doc]) => [
                    elementId,
                    {
                      id: elementId,
                      name: elementId,
                      type: 'unknown',
                      summary: doc.summary,
                      flowSteps: doc.flowSteps,
                      inputs: doc.inputs,
                      outputs: doc.outputs,
                    }
                  ])
                )
              : undefined;
            
            // Generera Process Feature Goal för subprocess-processen
            const fileVersionHash = getVersionHashForFile ? await getVersionHashForFile(file) : null;
            const processFeatureGoalContent = await renderDocWithLlm(
              'feature',
              enrichedSubprocessContext,
              {
                bpmnViewerLink: await getBpmnFileUrl(file, fileVersionHash),
                dmnLink: undefined,
              },
              useLlm,
              llmProvider,
              async (provider, fallbackUsed, docJson) => {
                if (fallbackUsed) {
                  llmFallbackUsed = true;
                  llmFinalProvider = provider;
                }
                if (docJson) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const _ = docJson; // Spara för framtida användning om behövs
                }
              },
              convertedSubprocessChildDocs,
              undefined, // structuralInfo
              checkCancellation,
              abortSignal,
            );
            
            // Skapa Process Feature Goal-sida för subprocess-processen (non-hierarchical naming, ingen parent)
            const processFeatureDocPath = getFeatureGoalDocFileKey(
              file,
              processNodeForFileForRoot.bpmnElementId || fileBaseName,
              undefined, // no version suffix
              undefined, // no parent (non-hierarchical)
              false, // isRootProcess = false (detta är en subprocess)
            );
            
            if (import.meta.env.DEV) {
              console.log(`[bpmnGenerators] ✓ Generated Process Feature Goal for ${file}:`, {
                processFeatureDocPath,
                processNodeId: processNodeForFileForRoot.id,
                processNodeElementId: processNodeForFileForRoot.bpmnElementId,
                fileBaseName,
              });
            }
            
            if (!result.docs.has(processFeatureDocPath)) {
              result.docs.set(
                processFeatureDocPath,
                insertGenerationMeta(processFeatureGoalContent, generationSourceLabel),
              );
            } else {
              if (import.meta.env.DEV) {
                console.warn(`[bpmnGenerators] ⚠️ Process Feature Goal already exists for ${file}, skipping: ${processFeatureDocPath}`);
              }
            }
          }
        }
      } else {
        // Om inga noder hittades, skapa en tom dokumentationsfil för både root-processer och subprocesser
        // Generera tom dokumentation för både root och subprocesser
        const emptyDoc = insertGenerationMeta(
          wrapLlmContentAsDocument(
            `<h1>Dokumentation för ${file}</h1><p>Inga genererbara noder hittades i denna fil.</p>`,
            `Dokumentation - ${file}`
          ),
          generationSourceLabel,
        );
        result.docs.set(docFileName, emptyDoc);
        console.warn(`[bpmnGenerators] ⚠️ No nodes found for ${file}, created empty documentation file`);
      }
    }
    await reportProgress('docgen:complete', 'Dokumentation klara');

    if (result.metadata) {
      result.metadata.llmFallbackUsed = llmFallbackUsed;
      result.metadata.llmFinalProvider = llmFinalProvider;
    }

    return result;
  } catch (error) {
    if (!useHierarchy) {
      console.warn(
        '[generateAllFromBpmnWithGraph] Hierarchical pipeline failed, falling back to legacy generator',
        error,
      );
      const fileUrl = `/bpmn/${bpmnFileName}`;
      const parseResult = await parseBpmnFile(fileUrl);
      
      return generateAllFromBpmn(
        parseResult.elements,
        parseResult.subprocesses,
        existingBpmnFiles,
        existingDmnFiles,
        bpmnFileName,
        useLlm,
        generationSourceLabel,
        llmProvider,
      );
    }
    throw error;
  }
}

// Legacy generator moved to bpmnGenerators/legacyGenerator.ts
import { generateAllFromBpmn, getDesignScenariosForElement } from './bpmnGenerators/legacyGenerator';

export { generateAllFromBpmn, getDesignScenariosForElement };

// Process Tree generators have been moved to bpmnGenerators/processTreeGenerators.ts
// Import and re-export for backward compatibility
import {
  generateHierarchicalTestFileFromTree,
  generateDocumentationFromTree,
} from './bpmnGenerators/processTreeGenerators';

export { generateHierarchicalTestFileFromTree, generateDocumentationFromTree };

// Process Tree generators implementation moved to bpmnGenerators/processTreeGenerators.ts
