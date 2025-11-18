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

    // List documentation files present in Storage (docs/*.html)
    let docsFilesSet = new Set<string>();
    try {
      const { data: docsList } = await supabase.storage
        .from('bpmn-files')
        .list('docs', { limit: 1000 });
      if (docsList && docsList.length > 0) {
        docsFilesSet = new Set(docsList.map((d: any) => d.name));
      }
    } catch (_) {
      // ignore storage listing errors; we'll rely on bpmn_docs table only
    }

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

    // Match subprocess name to existing file (same logic as frontend matchSubprocessFile)
    const matchSubprocessFile = (callActivityName: string): string | null => {
      const normalized = callActivityName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-');

      // Try exact match
      const exactMatch = Array.from(fileNames).find(f => 
        f.toLowerCase().includes(normalized)
      );
      if (exactMatch) return exactMatch;

      // Try partial match - match significant parts of the name
      const nameParts = normalized.split('-').filter(p => p.length > 3);
      for (const file of Array.from(fileNames)) {
        const fileLower = file.toLowerCase();
        const matchedParts = nameParts.filter(part => fileLower.includes(part));
        // If more than half of the significant parts match, consider it a match
        if (matchedParts.length >= Math.ceil(nameParts.length / 2)) {
          return file;
        }
      }

      return null; // Not found
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
      
      return meta.tasks.map((task: any) => ({
        id: task.id,
        name: task.name || task.id,
        type: task.type.toLowerCase() as ProcessTreeNode['type'], // Convert 'UserTask' -> 'userTask'
      }));
    };

    // Helper to build artifacts array for a node
    // NOTE: Process tree only shows BPMN structure + documentation
    // DoR/DoD and test artifacts are excluded from the tree view
    const buildArtifacts = (bpmnFile: string, elementId: string) => {
      const artifacts: Array<{
        id: string;
        type: 'doc';
        label: string;
        href?: string;
      }> = [];

      // Documentation link - use Supabase Storage public URL
      // Documentation is generated per BPMN file, not per element
      {
        // Extract base name from BPMN file (e.g., 'mortgage-se-application' from 'mortgage-se-application.bpmn')
        const baseName = bpmnFile.replace('.bpmn', '');
        const docFileName = `${baseName}.html`;
        const docExistsInStorage = docsFilesSet.has(docFileName);
        
        if (docExistsInStorage) {
          // Get public URL from Supabase Storage
          const { data: publicUrl } = supabase.storage
            .from('bpmn-files')
            .getPublicUrl(`docs/${docFileName}`);
          
          artifacts.push({
            id: `${bpmnFile}:${elementId}:doc`,
            type: 'doc',
            label: `Dokumentation`,
            href: publicUrl.publicUrl,
          });
        }
      }

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
        const subprocessFile = matchSubprocessFile(ca.name);

        // Always create a CallActivity node in the parent context with artifacts
        const caNode: ProcessTreeNode = {
          id: `${fileName}:${ca.id}`,
          label: ca.name,
          type: 'callActivity',
          bpmnFile: fileName,
          bpmnElementId: ca.id,
          children: [],
          artifacts: buildArtifacts(fileName, ca.id),
        };

        if (subprocessFile && fileNames.has(subprocessFile)) {
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
