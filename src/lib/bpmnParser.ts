import BpmnModeler from 'bpmn-js/lib/Modeler';
import { BpmnMeta, BpmnProcessMeta } from '@/types/bpmnMeta';
import { supabase } from '@/integrations/supabase/client';

export interface BpmnElement {
  id: string;
  name: string;
  type: string;
  businessObject: any;
}

export interface BpmnSubprocess {
  id: string;
  name: string;
  file?: string;
}

export interface BpmnSequenceFlow {
  id: string;
  name: string;
  sourceRef: string;
  targetRef: string;
}

export interface BpmnParseResult {
  elements: BpmnElement[];
  subprocesses: BpmnSubprocess[];
  sequenceFlows: BpmnSequenceFlow[];
  callActivities: BpmnElement[];
  serviceTasks: BpmnElement[];
  userTasks: BpmnElement[];
  businessRuleTasks: BpmnElement[];
  fileName?: string;
  meta: BpmnMeta; // Canonical metadata for consistent parsing
}

export class BpmnParser {
  private modeler: BpmnModeler;

  constructor() {
    this.modeler = new BpmnModeler();
  }

  async parse(bpmnXml: string): Promise<BpmnParseResult> {
    try {
      await this.modeler.importXML(bpmnXml);
      
      const elementRegistry = this.modeler.get('elementRegistry') as any;
      const allElements = elementRegistry.getAll();

      const elements: BpmnElement[] = [];
      const subprocesses: BpmnSubprocess[] = [];
      const sequenceFlows: BpmnSequenceFlow[] = [];
      const callActivities: BpmnElement[] = [];
      const serviceTasks: BpmnElement[] = [];
      const userTasks: BpmnElement[] = [];
      const businessRuleTasks: BpmnElement[] = [];

      // Build canonical BpmnMeta
      let processId = '';
      let processName = '';
      let firstProcessId: string | null = null;
      const metaCallActivities: BpmnMeta['callActivities'] = [];
      const metaTasks: BpmnMeta['tasks'] = [];
      const metaSubprocesses: BpmnMeta['subprocesses'] = [];
      const processMetaMap = new Map<string, BpmnProcessMeta>();
      const processOrder: string[] = [];

      const ensureProcessMeta = (id: string | undefined, nameHint?: string): BpmnProcessMeta | null => {
        if (!id) return null;
        if (!processMetaMap.has(id)) {
          const entry: BpmnProcessMeta = {
            id,
            name: nameHint || id,
            callActivities: [],
            tasks: [],
            subprocessCandidates: [],
            parseDiagnostics: [],
          };
          processMetaMap.set(id, entry);
          processOrder.push(id);
        } else if (nameHint) {
          const entry = processMetaMap.get(id)!;
          if (!entry.name || entry.name === entry.id) {
            entry.name = nameHint;
          }
        }
        return processMetaMap.get(id)!;
      };

      const findOwningProcessId = (bo: any): string | undefined => {
        let current = bo;
        while (current) {
          if (current.$type === 'bpmn:Process') {
            return current.id || current.name;
          }
          current = current.$parent;
        }
        return undefined;
      };

      const timestamp = () => new Date().toISOString();

      allElements.forEach((element: any) => {
        const bo = element.businessObject;
        if (!bo) return;

        // Extract process info
        if (bo.$type === 'bpmn:Process') {
          processId = bo.id || element.id;
          processName = bo.name || processId;
          if (!firstProcessId) {
            firstProcessId = processId;
          }
          ensureProcessMeta(processId, processName);
        }

        const bpmnElement: BpmnElement = {
          id: element.id,
          name: bo.name || element.id,
          type: bo.$type,
          businessObject: bo,
        };

        elements.push(bpmnElement);

        // Categorize by type and build meta
        if (bo.$type === 'bpmn:SubProcess') {
          subprocesses.push({
            id: element.id,
            name: bo.name || element.id,
          });
          metaSubprocesses.push({
            id: element.id,
            name: bo.name || element.id,
          });
          const owningProcessId = findOwningProcessId(bo) || firstProcessId || processId;
          const owningProcess = ensureProcessMeta(owningProcessId, processName);
          if (owningProcess) {
            owningProcess.subprocessCandidates ??= [];
            owningProcess.subprocessCandidates.push({
              id: element.id,
              name: bo.name || element.id,
              kind: 'subProcess',
            });
          }
        } else if (bo.$type === 'bpmn:CallActivity') {
          callActivities.push(bpmnElement);
          const calledElement = bo.calledElement || null;
          subprocesses.push({
            id: element.id,
            name: bo.name || element.id,
            file: calledElement ? `/bpmn/mortgage-se-${calledElement}.bpmn` : undefined,
          });
          metaCallActivities.push({
            id: element.id,
            name: bo.name || element.id,
            calledElement,
          });
          const owningProcessId = findOwningProcessId(bo) || firstProcessId || processId;
          const owningProcess = ensureProcessMeta(owningProcessId, processName);
          if (owningProcess) {
            owningProcess.callActivities.push({
              id: element.id,
              name: bo.name || element.id,
              calledElement,
            });
            if (!owningProcess.subprocessCandidates) {
              owningProcess.subprocessCandidates = [];
            }
            owningProcess.subprocessCandidates.push({
              id: element.id,
              name: bo.name || element.id,
              kind: 'callActivity',
            });
          } else {
            const fallback = ensureProcessMeta(processId || firstProcessId || element.id);
            if (fallback) {
              fallback.callActivities.push({
                id: element.id,
                name: bo.name || element.id,
                calledElement,
              });
              if (!fallback.subprocessCandidates) {
                fallback.subprocessCandidates = [];
              }
              fallback.subprocessCandidates.push({
                id: element.id,
                name: bo.name || element.id,
                kind: 'callActivity',
              });
              fallback.parseDiagnostics?.push({
                severity: 'warning',
                code: 'PROCESS_ASSIGNMENT_FAILED',
                message: 'Kunde inte koppla Call Activity till en specifik process. Använder filens huvudprocess.',
                context: { elementId: element.id },
                timestamp: timestamp(),
              });
            }
          }
        } else if (bo.$type === 'bpmn:ServiceTask') {
          serviceTasks.push(bpmnElement);
          metaTasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'ServiceTask',
          });
          const owningProcessId = findOwningProcessId(bo) || firstProcessId || processId;
          ensureProcessMeta(owningProcessId, processName)?.tasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'ServiceTask',
          });
        } else if (bo.$type === 'bpmn:UserTask') {
          userTasks.push(bpmnElement);
          metaTasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'UserTask',
          });
          ensureProcessMeta(findOwningProcessId(bo) || firstProcessId || processId, processName)?.tasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'UserTask',
          });
        } else if (bo.$type === 'bpmn:BusinessRuleTask') {
          businessRuleTasks.push(bpmnElement);
          metaTasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'BusinessRuleTask',
          });
          ensureProcessMeta(findOwningProcessId(bo) || firstProcessId || processId, processName)?.tasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'BusinessRuleTask',
          });
        } else if (bo.$type === 'bpmn:SequenceFlow') {
          sequenceFlows.push({
            id: element.id,
            name: bo.name || '',
            sourceRef: bo.sourceRef?.id || '',
            targetRef: bo.targetRef?.id || '',
          });
        }
      });

      const orderedProcesses = processOrder
        .map((id) => processMetaMap.get(id)!)
        .filter(Boolean);

      const primaryProcess = orderedProcesses[0];

      const meta: BpmnMeta = {
        processId: primaryProcess?.id || processId,
        name: primaryProcess?.name || processName,
        callActivities: metaCallActivities,
        tasks: metaTasks,
        subprocesses: metaSubprocesses,
        processes: orderedProcesses,
      };

      return {
        elements,
        subprocesses,
        sequenceFlows,
        callActivities,
        serviceTasks,
        userTasks,
        businessRuleTasks,
        meta,
      };
    } catch (error) {
      console.error('Error parsing BPMN:', error);
      throw error;
    }
  }

  destroy() {
    this.modeler.destroy();
  }
}

// Cache parsed results
const parseCache = new Map<string, BpmnParseResult>();

async function loadBpmnXml(fileUrl: string): Promise<{ xml: string; cacheKey: string }> {
  const normalized = fileUrl.split('?')[0] || fileUrl;
  const cacheKey = normalized.split('/').pop() || normalized;

  const tryLocal = async () => {
    const response = await fetch(fileUrl, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.toLowerCase().includes('xml')) {
      const xml = await response.text();
      return { xml, cacheKey };
    }
    return null;
  };

  const tryStorage = async () => {
    const { data: storageRecord } = await supabase
      .from('bpmn_files')
      .select('storage_path')
      .eq('file_name', cacheKey)
      .maybeSingle();

    const storagePath = storageRecord?.storage_path || cacheKey;
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(storagePath);

    if (error || !data) {
      return null;
    }

    const xml = await data.text();
    if (!xml || !xml.includes('<bpmn:definitions')) {
      return null;
    }

    return { xml, cacheKey };
  };

  const localResult = await tryLocal();
  if (localResult) return localResult;

  const storageResult = await tryStorage();
  if (storageResult) return storageResult;

  throw new Error(`Failed to load BPMN file: ${cacheKey}`);
}

export async function parseBpmnFile(bpmnFilePath: string): Promise<BpmnParseResult> {
  // Check cache
  const cacheKey = bpmnFilePath.split('/').pop() || bpmnFilePath;
  if (parseCache.has(cacheKey)) {
    return parseCache.get(cacheKey)!;
  }

  try {
    const { xml: bpmnXml, cacheKey: key } = await loadBpmnXml(bpmnFilePath);
    const parser = new BpmnParser();
    const result = await parser.parse(bpmnXml);
    parser.destroy();

    // Extract filename from path
    const fileName = key;
    
    // Add filename to result
    const resultWithFileName = {
      ...result,
      fileName
    };

    // Cache result
    parseCache.set(key, resultWithFileName);
    
    return resultWithFileName;
  } catch (error) {
    console.error(`Error parsing BPMN file ${bpmnFilePath}:`, error);
    throw error;
  }
}

// Clear cache if needed
export function clearBpmnParseCache() {
  parseCache.clear();
}
