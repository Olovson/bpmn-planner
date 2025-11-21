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

    console.log(`Building process tree for root file: ${rootFile}`);

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

      // Extract CallActivity/SubProcess elements from BPMN metadata
      const callActivities = extractCallActivitiesFromMeta(fileName);
      for (const ca of callActivities) {
        const link = matchCallActivity({
          id: ca.id,
          name: ca.name || ca.id,
          calledElement: metaByFile.get(fileName)?.callActivities?.find((entry: any) => entry.id === ca.id)?.calledElement ?? null,
        });
        const subprocessFile = link.matchedFile && fileNames.has(link.matchedFile)
          ? link.matchedFile
          : null;

        // Always create a CallActivity node in the parent context with artifacts
        const caNode: ProcessTreeNode = {
          id: `${fileName}:${ca.id}`,
          label: ca.name,
          type: 'callActivity',
          bpmnFile: fileName,
          bpmnElementId: ca.id,
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
      const tasks = parseTaskNodesFromMeta(fileName);
      for (const t of tasks) {
        const artifacts = buildArtifacts(fileName, t.id);
        const taskNode: ProcessTreeNode = {
          id: `${fileName}:${t.id}`,
          label: t.name,
          type: t.type,
          bpmnFile: fileName,
          bpmnElementId: t.id,
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

    console.log(`Process tree built successfully with ${processedFiles.size} files`);

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
