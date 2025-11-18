import BpmnModeler from 'bpmn-js/lib/Modeler';
import { BpmnMeta } from '@/types/bpmnMeta';

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
      const metaCallActivities: BpmnMeta['callActivities'] = [];
      const metaTasks: BpmnMeta['tasks'] = [];
      const metaSubprocesses: BpmnMeta['subprocesses'] = [];

      allElements.forEach((element: any) => {
        const bo = element.businessObject;
        if (!bo) return;

        // Extract process info
        if (bo.$type === 'bpmn:Process') {
          processId = bo.id || element.id;
          processName = bo.name || processId;
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
        } else if (bo.$type === 'bpmn:ServiceTask') {
          serviceTasks.push(bpmnElement);
          metaTasks.push({
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
        } else if (bo.$type === 'bpmn:BusinessRuleTask') {
          businessRuleTasks.push(bpmnElement);
          metaTasks.push({
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

      const meta: BpmnMeta = {
        processId,
        name: processName,
        callActivities: metaCallActivities,
        tasks: metaTasks,
        subprocesses: metaSubprocesses,
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

export async function parseBpmnFile(bpmnFilePath: string): Promise<BpmnParseResult> {
  // Check cache
  if (parseCache.has(bpmnFilePath)) {
    return parseCache.get(bpmnFilePath)!;
  }

  try {
    const response = await fetch(bpmnFilePath);
    if (!response.ok) {
      throw new Error(`Failed to load BPMN file: ${bpmnFilePath}`);
    }
    
    const bpmnXml = await response.text();
    const parser = new BpmnParser();
    const result = await parser.parse(bpmnXml);
    parser.destroy();

    // Extract filename from path
    const fileName = bpmnFilePath.split('/').pop() || bpmnFilePath;
    
    // Add filename to result
    const resultWithFileName = {
      ...result,
      fileName
    };

    // Cache result
    parseCache.set(bpmnFilePath, resultWithFileName);
    
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
