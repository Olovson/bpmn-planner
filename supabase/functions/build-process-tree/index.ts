import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessTreeNode {
  id: string;
  label: string;
  type: 'process' | 'subProcess' | 'callActivity' | 'userTask' | 'serviceTask' | 'businessRuleTask' | 'dmnDecision' | 'gateway' | 'event';
  bpmnFile: string | null;
  bpmnElementId?: string;
  /** Optional execution ordering metadata */
  orderIndex?: number;
  branchId?: string | null;
  scenarioPath?: string[];
  missingDefinition?: boolean;
  subprocessDiagnostics?: Array<{
    severity: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    context?: Record<string, unknown>;
  }>;
  children: ProcessTreeNode[];
  artifacts?: Array<{
    id: string;
    type: 'doc'; // Only documentation artifacts in process tree
    label: string;
    href?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const url = new URL(req.url);
    const rootFile = url.searchParams.get('rootFile') || 'mortgage.bpmn';
    const debugMode = url.searchParams.get('debug');

    const startTime = Date.now();

    console.log(JSON.stringify({
      level: 'info',
      event: 'build-process-tree.start',
      rootFile,
      timestamp: new Date().toISOString(),
    }));

    // Fetch all BPMN files with storage paths and metadata
    const { data: bpmnFiles, error: filesError } = await supabase
      .from('bpmn_files')
      .select('file_name, file_type, storage_path, meta')
      .eq('file_type', 'bpmn');

    if (filesError) throw filesError;

    // Fetch documentation status
    const { data: bpmnDocs, error: docsError } = await supabase
      .from('bpmn_docs')
      .select('bpmn_file');

    if (docsError) throw docsError;

    // Build storage path lookup, file names, and metadata lookup
    const storagePathByFile = new Map<string, string>();
    const fileNames = new Set<string>();
    const metaByFile = new Map<string, any>();
    (bpmnFiles || []).forEach((f: any) => {
      storagePathByFile.set(f.file_name, f.storage_path);
      fileNames.add(f.file_name);
      if (f.meta) {
        metaByFile.set(f.file_name, f.meta);
      }
    });


    // Cache for BPMN XML content
    const bpmnCache = new Map<string, string>();

    // Download and cache BPMN XML
    const getBpmnXml = async (fileName: string): Promise<string | null> => {
      if (bpmnCache.has(fileName)) return bpmnCache.get(fileName)!;
      const storagePath = storagePathByFile.get(fileName);
      if (!storagePath) return null;
      try {
        const { data, error } = await supabase.storage.from('bpmn-files').download(storagePath);
        if (error || !data) return null;
        const text = await new Response(data as any).text();
        bpmnCache.set(fileName, text);
        return text;
      } catch {
        return null;
      }
    };

    type ProcessDefinition = {
      id: string;
      name?: string;
      fileName: string;
      callActivities: Array<{ id: string; name?: string; calledElement?: string | null }>;
      tasks: Array<{ id: string; name?: string; type?: string }>;
    };

    const processDefinitions: ProcessDefinition[] = [];
    metaByFile.forEach((meta, fileName) => {
      if (!meta) return;
      if (Array.isArray(meta.processes) && meta.processes.length > 0) {
        meta.processes.forEach((proc: any) => {
          if (proc?.id) {
            processDefinitions.push({
              id: proc.id,
              name: proc.name,
              fileName,
              callActivities:
                proc.callActivities?.map((ca: any) => ({
                  id: ca.id,
                  name: ca.name,
                  calledElement: ca.calledElement ?? null,
                })) ?? [],
              tasks:
                proc.tasks?.map((task: any) => ({
                  id: task.id,
                  name: task.name,
                  type: task.type,
                })) ?? [],
            });
          }
        });
      } else if (meta.processId) {
        processDefinitions.push({
          id: meta.processId,
          name: meta.name,
          fileName,
          callActivities:
            meta.callActivities?.map((ca: any) => ({
              id: ca.id,
              name: ca.name,
              calledElement: ca.calledElement ?? null,
            })) ?? [],
          tasks:
            meta.tasks?.map((task: any) => ({
              id: task.id,
              name: task.name,
              type: task.type,
            })) ?? [],
        });
      }
    });

    type SubprocessMatchStatus = 'matched' | 'ambiguous' | 'lowConfidence' | 'unresolved';
    type Diagnostic = {
      severity: 'info' | 'warning' | 'error';
      code: string;
      message: string;
      context?: Record<string, unknown>;
    };

    const matchCallActivityToProcesses = (
      callActivity: { id: string; name?: string; calledElement?: string | null },
      candidates: ProcessDefinition[],
    ): { matchStatus: SubprocessMatchStatus; matchedProcessId?: string; diagnostics: Diagnostic[] } => {
      const diagnostics: Diagnostic[] = [];
      const evaluated = candidates
        .map((candidate) => evaluateCandidate(callActivity, candidate))
        .filter((candidate): candidate is { processId: string; score: number } => candidate.score > 0)
        .sort((a, b) => b.score - a.score);

      const best = evaluated[0];
      const second = evaluated[1];

      if (!best) {
        diagnostics.push({
          severity: 'warning',
          code: 'NO_MATCH',
          message: 'Inga potentiella subprocesser hittades för Call Activity.',
          context: {
            callActivityId: callActivity.id,
            calledElement: callActivity.calledElement,
          },
        });
        return { matchStatus: 'unresolved', diagnostics };
      }

      if (second && second.score >= best.score - 0.1) {
        diagnostics.push({
          severity: 'warning',
          code: 'AMBIGUOUS_MATCH',
          message: 'Flera subprocesser matchar nästan lika bra.',
          context: {
            callActivityId: callActivity.id,
            bestScore: best.score,
            secondScore: second.score,
          },
        });
        return { matchStatus: 'ambiguous', matchedProcessId: best.processId, diagnostics };
      }
      if (best.score < 0.75) {
        diagnostics.push({
          severity: 'warning',
          code: 'LOW_CONFIDENCE_MATCH',
          message: 'Endast lågkonfidensmatchning hittades för Call Activity.',
          context: {
            callActivityId: callActivity.id,
            score: best.score,
            threshold: 0.75,
          },
        });
        return { matchStatus: 'lowConfidence', matchedProcessId: best.processId, diagnostics };
      }
      return { matchStatus: 'matched', matchedProcessId: best.processId, diagnostics };
    };

    const evaluateCandidate = (
      callActivity: { id: string; name?: string; calledElement?: string | null },
      candidate: ProcessDefinition,
    ): { processId: string; score: number } => {
      const reasons: string[] = [];
      let score = 0;

      score = pickBestScore(
        score,
        reasons,
        () => equals(callActivity.calledElement, candidate.id) ? 1 : 0,
      );

      score = pickBestScore(
        score,
        reasons,
        () => normalizedEquals(callActivity.calledElement, candidate.name) ? 0.96 : 0,
      );

      score = pickBestScore(
        score,
        reasons,
        () => equals(callActivity.id, candidate.id) ? 0.9 : 0,
      );

      score = pickBestScore(
        score,
        reasons,
        () => normalizedEquals(callActivity.name, candidate.name) ? 0.85 : 0,
      );

      const callActivityName = normalize(callActivity.name);
      const calledElement = normalize(callActivity.calledElement);
      const candidateProcessName = normalize(candidate.name);
      const candidateProcessId = normalize(candidate.id);
      const candidateFileBase = normalize(stripBpmnExtension(candidate.fileName));

      score = pickBestScore(
        score,
        reasons,
        () =>
          (callActivityName && callActivityName === candidateFileBase) ||
          (calledElement && calledElement === candidateFileBase)
            ? 0.8
            : 0,
      );

      const fuzzyTargets = [candidateProcessName, candidateFileBase, candidateProcessId].filter(Boolean) as string[];
      const fuzzyScore = computeFuzzyScore(callActivityName || calledElement || '', fuzzyTargets);

      score = pickBestScore(
        score,
        reasons,
        () => fuzzyScore,
      );

      return {
        processId: candidate.id,
        score,
      };
    };

    const matchCallActivity = (
      callActivity: { id: string; name: string; calledElement?: string | null },
    ): { status: SubprocessMatchStatus; matchedFile?: string; diagnostics: Diagnostic[] } => {
      if (processDefinitions.length === 0) {
        return {
          status: 'unresolved',
          diagnostics: [
            {
              severity: 'warning',
              code: 'NO_PROCESSES',
              message: 'Inga processdefinitioner tillgängliga för matchning.',
              context: { callActivityId: callActivity.id },
            },
          ],
        };
      }

      const result = matchCallActivityToProcesses(callActivity, processDefinitions);
      const matchedFile = result.matchedProcessId
        ? processDefinitions.find((p) => p.id === result.matchedProcessId)?.fileName
        : undefined;

      if (result.diagnostics.length) {
        console.log('[build-process-tree] Subprocess match diagnostics', {
          callActivityId: callActivity.id,
          diagnostics: result.diagnostics,
          status: result.matchStatus,
        });
      }

      return {
        status: result.matchStatus,
        matchedFile: matchedFile && fileNames.has(matchedFile) ? matchedFile : undefined,
        diagnostics: result.diagnostics,
      };
    };

    const pickBestScore = (
      currentScore: number,
      _reasons: string[],
      scorer: () => number | false,
    ): number => {
      const result = scorer();
      if (typeof result === 'number' && result > currentScore) {
        return result;
      }
      return currentScore;
    };

    const equals = (a?: string | null, b?: string | null): boolean => Boolean(a) && Boolean(b) && a === b;
    const normalizedEquals = (a?: string | null, b?: string | null): boolean => normalize(a) === normalize(b);
    const normalize = (value?: string | null): string => (value ?? '').toLowerCase().trim().replace(/[\s_]+/g, '-');
    const stripBpmnExtension = (fileName: string): string => fileName.replace(/\.bpmn$/i, '').replace(/^\/?public\//, '');
    const computeFuzzyScore = (source: string, targets: string[]): number => {
      if (!source || targets.length === 0) return 0;
      const sourceNorm = normalize(source);
      if (!sourceNorm) return 0;

      const diceCoefficient = (a: string, b: string): number => {
        if (!a || !b) return 0;
        if (a === b) return 1;
        const bigrams = (str: string) => {
          const grams = new Map<string, number>();
          for (let i = 0; i < str.length - 1; i += 1) {
            const gram = str.slice(i, i + 2);
            grams.set(gram, (grams.get(gram) ?? 0) + 1);
          }
          return grams;
        };
        const aBigrams = bigrams(a);
        const bBigrams = bigrams(b);
        let intersection = 0;
        aBigrams.forEach((count, gram) => {
          if (bBigrams.has(gram)) {
            intersection += Math.min(count, bBigrams.get(gram)!);
          }
        });
        const total = a.length - 1 + (b.length - 1);
        return total === 0 ? 0 : (2 * intersection) / total;
      };

      const best = targets.reduce((max, target) => {
        const value = diceCoefficient(sourceNorm, target);
        return value > max ? value : max;
      }, 0);

      return best * 0.7;
    };

    // Extract CallActivity/SubProcess elements from BpmnMeta
    // This replaces the old regex-based extraction
    const extractCallActivitiesFromMeta = (fileName: string): Array<{ id: string; name: string }> => {
      const meta = metaByFile.get(fileName);
      if (!meta) return [];
      
      const results: Array<{ id: string; name: string }> = [];
      
      // Add CallActivities
      if (meta.callActivities && Array.isArray(meta.callActivities)) {
        meta.callActivities.forEach((ca: any) => {
          if (ca.id) {
            results.push({ id: ca.id, name: ca.name || ca.id });
          }
        });
      }
      
      // Add SubProcesses
      if (meta.subprocesses && Array.isArray(meta.subprocesses)) {
        meta.subprocesses.forEach((sp: any) => {
          if (sp.id) {
            results.push({ id: sp.id, name: sp.name || sp.id });
          }
        });
      }
      
      return results;
    };

    // Helper: extract task nodes from BpmnMeta (replaces regex parsing)
    const parseTaskNodesFromMeta = (fileName: string): Array<{ id: string; name: string; type: ProcessTreeNode['type'] }> => {
      const meta = metaByFile.get(fileName);
      if (!meta || !meta.tasks || !Array.isArray(meta.tasks)) return [];

      const typeMap: Record<string, ProcessTreeNode['type']> = {
        UserTask: 'userTask',
        ServiceTask: 'serviceTask',
        BusinessRuleTask: 'businessRuleTask',
      };

      return meta.tasks
        .map((task: any) => ({
          id: task.id,
          name: task.name || task.id,
          type: typeMap[task.type] || 'userTask',
        }))
        .filter(task => Boolean(task.id));
    };

    // Parse sequence flows from BPMN XML
    const parseSequenceFlows = (xml: string): Array<{ sourceRef: string; targetRef: string }> => {
      const flows: Array<{ sourceRef: string; targetRef: string }> = [];
      const regex = /<bpmn:sequenceFlow[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"[^>]*>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        flows.push({ sourceRef: match[1], targetRef: match[2] });
      }
      return flows;
    };

    // Calculate orderIndex based on sequence flows
    const calculateOrderIndex = (
      tasks: Array<{ id: string }>,
      callActivities: Array<{ id: string }>,
      sequenceFlows: Array<{ sourceRef: string; targetRef: string }>
    ): Map<string, { orderIndex: number; branchId: string; scenarioPath: string[] }> => {
      const orderMap = new Map<string, { orderIndex: number; branchId: string; scenarioPath: string[] }>();
      const visited = new Set<string>();
      let globalOrder = 0;
      
      // Combine tasks and callActivities for ordering
      const allNodes = [
        ...tasks.map(t => ({ id: t.id, isTask: true })),
        ...callActivities.map(ca => ({ id: ca.id, isTask: false }))
      ];
      
      // Find start nodes (nodes without incoming edges)
      const allTargets = new Set(sequenceFlows.map(f => f.targetRef));
      const startNodes = allNodes.filter(n => !allTargets.has(n.id));
      
      // Also check for StartEvent elements
      const startEventRegex = /<bpmn:startEvent[^>]*id="([^"]+)"[^>]*>/g;
      const startEvents: string[] = [];
      let startMatch;
      // We'll need XML for this, so we'll handle it in buildTree
      
      function visit(nodeId: string, branchId: string, scenarioPath: string[]) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        orderMap.set(nodeId, {
          orderIndex: globalOrder++,
          branchId,
          scenarioPath,
        });
        
        // Visit successors
        const successors = sequenceFlows
          .filter(f => f.sourceRef === nodeId)
          .map(f => f.targetRef);
        
        if (successors.length === 0) {
          // Leaf node
          return;
        }
        
        if (successors.length === 1) {
          // Single successor - continue same branch
          visit(successors[0], branchId, scenarioPath);
        } else {
          // Multiple successors - create branches
          const [first, ...others] = successors;
          
          // First branch continues main branch
          visit(first, branchId, scenarioPath);
          
          // Other branches get new branch IDs
          others.forEach((target, idx) => {
            const newBranchId = `${branchId}-branch-${idx + 1}`;
            const newScenarioPath = [...scenarioPath, newBranchId];
            visit(target, newBranchId, newScenarioPath);
          });
        }
      }
      
      // Start from start nodes or first node if no start nodes found
      if (startNodes.length > 0) {
        startNodes.forEach((startNode, index) => {
          const branchId = index === 0 ? 'main' : `entry-${index + 1}`;
          const scenarioPath = [branchId];
          visit(startNode.id, branchId, scenarioPath);
        });
      } else if (allNodes.length > 0) {
        // Fallback: start from first node
        visit(allNodes[0].id, 'main', ['main']);
      }
      
      // Ensure all nodes have an order (for nodes not in sequence flows)
      allNodes.forEach(node => {
        if (!visited.has(node.id)) {
          orderMap.set(node.id, {
            orderIndex: globalOrder++,
            branchId: 'main',
            scenarioPath: ['main'],
          });
        }
      });
      
      return orderMap;
    };

    // Helper to build artifacts array for a node
    // NOTE: Process tree only shows BPMN structure + documentation
    // DoR/DoD and test artifacts are excluded from the tree view
    const sanitizeElementId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

    const buildArtifacts = (bpmnFile: string, elementId: string) => {
      const artifacts: Array<{
        id: string;
        type: 'doc';
        label: string;
        href?: string;
      }> = [];

      const baseName = bpmnFile.replace('.bpmn', '');
      const safeId = sanitizeElementId(elementId);
      const docPath = elementId
        ? `nodes/${baseName}/${safeId}`
        : baseName;

      artifacts.push({
        id: `${bpmnFile}:${elementId}:doc`,
        type: 'doc',
        label: `Dokumentation`,
        href: `#/doc-viewer/${encodeURIComponent(docPath)}`,
      });

      return artifacts.length > 0 ? artifacts : undefined;
    };

    // Recursive function to build tree
    const processedFiles = new Set<string>();
    
    const buildTree = async (fileName: string, elementId?: string, isRoot = false): Promise<ProcessTreeNode | null> => {
      // Prevent cycles
      if (!isRoot && processedFiles.has(fileName)) {
        console.warn(`Cycle detected: ${fileName} already processed`);
        return null;
      }

      if (!isRoot) {
        processedFiles.add(fileName);
      }

      const xml = await getBpmnXml(fileName);
      if (!xml) {
        console.error(`Could not load XML for ${fileName}`);
        return null;
      }

      const children: ProcessTreeNode[] = [];

      // Parse sequence flows for ordering
      const sequenceFlows = parseSequenceFlows(xml);

      // Extract CallActivity/SubProcess elements from BPMN metadata
      const callActivities = extractCallActivitiesFromMeta(fileName);
      
      // Calculate orderIndex for all nodes in this file
      const tasks = parseTaskNodesFromMeta(fileName);
      const orderMap = calculateOrderIndex(tasks, callActivities, sequenceFlows);
      for (const ca of callActivities) {
        const link = matchCallActivity({
          id: ca.id,
          name: ca.name || ca.id,
          calledElement: metaByFile.get(fileName)?.callActivities?.find((entry: any) => entry.id === ca.id)?.calledElement ?? null,
        });
        const subprocessFile = link.matchedFile && fileNames.has(link.matchedFile)
          ? link.matchedFile
          : null;

        // Get order info for this callActivity
        const orderInfo = orderMap.get(ca.id) || { orderIndex: undefined, branchId: 'main', scenarioPath: ['main'] };
        
        // Always create a CallActivity node in the parent context with artifacts
        const caNode: ProcessTreeNode = {
          id: `${fileName}:${ca.id}`,
          label: ca.name,
          type: 'callActivity',
          bpmnFile: fileName,
          bpmnElementId: ca.id,
          orderIndex: orderInfo.orderIndex,
          branchId: orderInfo.branchId,
          scenarioPath: orderInfo.scenarioPath,
          children: [],
          subprocessDiagnostics: link.diagnostics,
          artifacts: buildArtifacts(fileName, ca.id),
        };

        if (link.status === 'matched' && subprocessFile) {
          // Subprocess file found - attach its subtree under the call activity
          const childSubTree = await buildTree(subprocessFile, undefined, false);
          if (childSubTree) {
            caNode.children.push(childSubTree);
          }
        } else {
          // Subprocess file not found - flag missing definition
          caNode.missingDefinition = true;
        }

        children.push(caNode);
      }

      // Add task-level nodes from BPMN metadata
      for (const t of tasks) {
        // Get order info for this task
        const orderInfo = orderMap.get(t.id) || { orderIndex: undefined, branchId: 'main', scenarioPath: ['main'] };
        
        const artifacts = buildArtifacts(fileName, t.id);
        const taskNode: ProcessTreeNode = {
          id: `${fileName}:${t.id}`,
          label: t.name,
          type: t.type,
          bpmnFile: fileName,
          bpmnElementId: t.id,
          orderIndex: orderInfo.orderIndex,
          branchId: orderInfo.branchId,
          scenarioPath: orderInfo.scenarioPath,
          children: [],
          artifacts,
        };
        children.push(taskNode);
      }

      const artifacts = elementId ? buildArtifacts(fileName, elementId) : undefined;

      return {
        id: elementId ? `${fileName}:${elementId}` : fileName,
        label: elementId || fileName.replace('.bpmn', ''),
        type: isRoot ? 'process' : 'subProcess',
        bpmnFile: fileName,
        bpmnElementId: elementId,
        children,
        artifacts,
      };
    };

    // Check if root file exists
    const rootExists = bpmnFiles?.some(f => f.file_name === rootFile);
    
    if (!rootExists) {
      return new Response(
        JSON.stringify({ 
          error: `Root file ${rootFile} not found in database`,
          availableFiles: bpmnFiles?.map(f => f.file_name) || []
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build the tree
    const tree = await buildTree(rootFile, undefined, true);

    const durationMs = Date.now() - startTime;

    // Helper functions for logging
    const countTreeNodes = (node: ProcessTreeNode): number => {
      return 1 + node.children.reduce((sum, c) => sum + countTreeNodes(c), 0);
    };

    const summarizeDiagnostics = (root: ProcessTreeNode): Record<string, number> => {
      const counts: Record<string, number> = {};

      function visit(node: ProcessTreeNode) {
        const diags = node.subprocessDiagnostics || [];
        diags.forEach((d) => {
          const key = `${d.severity}:${d.code}`;
          counts[key] = (counts[key] ?? 0) + 1;
        });
        node.children.forEach(visit);
      }

      visit(root);
      return counts;
    };

    const totalNodes = countTreeNodes(tree);
    const diagnosticsSummary = summarizeDiagnostics(tree);

    // Calculate graph metrics (if we had built a graph, we'd include node/edge counts)
    // For now, we log tree metrics
    console.log(JSON.stringify({
      level: 'info',
      event: 'build-process-tree.treeBuilt',
      rootLabel: tree.label,
      totalNodes,
      fileCount: processedFiles.size,
      durationMs,
      diagnosticsSummary,
      // Size metrics for monitoring
      size: {
        treeNodes: totalNodes,
        filesProcessed: processedFiles.size,
      },
    }));

    // Debug mode: return graph structure or raw tree
    if (debugMode === 'graph') {
      // For debug mode, we'd need to build a graph representation
      // Since this function builds tree directly, we'll return tree structure info
      return new Response(
        JSON.stringify({
          tree: {
            root: tree.label,
            totalNodes,
            fileCount: processedFiles.size,
          },
          diagnostics: diagnosticsSummary,
          durationMs,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (debugMode === 'tree') {
      return new Response(
        JSON.stringify(tree),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify(tree),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error building process tree:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
