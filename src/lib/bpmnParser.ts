import BpmnModeler from 'bpmn-js/lib/Modeler';
import { BpmnMeta, BpmnProcessMeta } from '@/types/bpmnMeta';
import { supabase } from '@/integrations/supabase/client';

export interface BpmnElement {
  id: string;
  name: string;
  type: string;
  businessObject: any;
  /** Visual coordinates from BPMN DI (Diagram Interchange) */
  x?: number;
  y?: number;
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
      // VIKTIGT: bpmn-js importXML kan hantera både ren XML och data URLs
      // Men för vår workaround behöver vi ren XML-text, så dekoda data URL om det behövs
      let xmlText = bpmnXml;
      if (bpmnXml.startsWith('data:application/xml;base64,')) {
        const base64 = bpmnXml.split(',')[1];
        // Use Buffer in Node.js, atob in browser
        if (typeof Buffer !== 'undefined') {
          xmlText = Buffer.from(base64, 'base64').toString('utf-8');
        } else {
          xmlText = atob(base64);
        }
      }
      
      // DEBUG: Verify XML text contains callActivities
      const hasObjectControl = xmlText.includes('object-control');
      const hasManualCreditEval = xmlText.includes('mortgage-se-manual-credit-evaluation');
      if (import.meta.env.DEV && hasManualCreditEval && !hasObjectControl) {
        // Check what process IDs are in the XML
        const processMatches = xmlText.match(/<bpmn:process[^>]*id="([^"]+)"[^>]*>/g);
        console.log(`[bpmnParser] DEBUG: xmlText for manual-credit-evaluation does NOT contain 'object-control'`);
        console.log(`[bpmnParser] DEBUG: Process IDs in XML:`, processMatches?.map(m => m.match(/id="([^"]+)"/)?.[1]));
        // Check all callActivity IDs in XML
        const allCallActivityMatches = xmlText.match(/<(?:bpmn:)?callActivity[^>]*id="([^"]+)"[^>]*>/g);
        console.log(`[bpmnParser] DEBUG: All callActivity IDs in XML:`, allCallActivityMatches?.map(m => m.match(/id="([^"]+)"/)?.[1]));
      }
      
      await this.modeler.importXML(xmlText);
      
      const elementRegistry = this.modeler.get('elementRegistry') as any;
      const allElements = elementRegistry.getAll();
      
      // WORKAROUND: Parse callActivities directly from XML if they're missing from elementRegistry
      // This handles cases where bpmn-js doesn't include certain callActivities (e.g., object-control)
      // Use regex to find callActivities in XML (works in both browser and Node.js)
      // Match opening tag - handle both single-line and attributes on same line
      const callActivityRegex = /<(?:bpmn:)?callActivity[^>]*id="([^"]+)"[^>]*(?:name="([^"]*)")?[^>]*(?:calledElement="([^"]*)")?[^>]*>/g;
      const xmlCallActivityIds = new Set<string>();
      const xmlCallActivityData = new Map<string, { name: string; calledElement: string | null }>();
      let match;
      let matchCount = 0;
      while ((match = callActivityRegex.exec(xmlText)) !== null) {
        matchCount++;
        const id = match[1];
        // Extract name from full match (may not be in capture group if attributes are in different order)
        const fullMatch = match[0];
        const nameMatch = fullMatch.match(/name="([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : (match[2] || id);
        const calledElement = match[3] || null;
        xmlCallActivityIds.add(id);
        xmlCallActivityData.set(id, { name, calledElement });
      }
      
      if (import.meta.env.DEV) {
        console.log(`[bpmnParser] DEBUG: Regex matched ${matchCount} times, found ${xmlCallActivityIds.size} unique callActivities in XML:`, Array.from(xmlCallActivityIds));
      }
      
      // Check if any callActivities from XML are missing from elementRegistry
      // NOTE: bpmn-js may use calledElement as the ID for some callActivities (e.g., Activity_1gzlxx4 -> credit-evaluation)
      // So we need to check both the actual ID and the calledElement
      const registryCallActivityIds = new Set(
        allElements
          .filter((e: any) => e.businessObject?.$type === 'bpmn:CallActivity')
          .flatMap((e: any) => {
            const ids = [e.id];
            // Also check if calledElement matches any XML callActivity ID
            if (e.businessObject?.calledElement) {
              ids.push(e.businessObject.calledElement);
            }
            return ids;
          })
      );
      
      const missingCallActivityIds = Array.from(xmlCallActivityIds).filter(
        id => !registryCallActivityIds.has(id)
      );
      
      // Always log in test environment for debugging
      if (missingCallActivityIds.length > 0) {
        console.warn(
          `[bpmnParser] Found ${missingCallActivityIds.length} callActivities in XML but not in elementRegistry:`,
          missingCallActivityIds
        );
        console.log(`[bpmnParser] XML callActivity IDs:`, Array.from(xmlCallActivityIds));
        console.log(`[bpmnParser] Registry callActivity IDs:`, Array.from(registryCallActivityIds));
      }

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

      // DEBUG: Log all callActivity elements found in elementRegistry
      // Note: This runs in test environment too, so we check for both DEV and test
      const allCallActivityElements = allElements.filter((e: any) => 
        e.businessObject?.$type === 'bpmn:CallActivity'
      );
      if (allCallActivityElements.length > 0) {
        console.log(`[bpmnParser] Found ${allCallActivityElements.length} CallActivity elements in elementRegistry:`);
        allCallActivityElements.forEach((e: any) => {
          const owningProcess = e.businessObject?.$parent;
          const processId = owningProcess?.id || 'unknown';
          console.log(`  - ${e.id} (${e.businessObject?.name || 'no name'}) - calledElement: ${e.businessObject?.calledElement || 'none'} - process: ${processId}`);
        });
      }
      
      // DEBUG: Check if object-control exists in allElements with any type
      const objectControlAny = allElements.find((e: any) => e.id === 'object-control');
      if (!objectControlAny && allCallActivityElements.length > 0) {
        // Check if this file contains manual-credit-evaluation process
        const hasManualCreditEval = allElements.some((e: any) => 
          e.businessObject?.id === 'mortgage-se-manual-credit-evaluation' ||
          e.id === 'mortgage-se-manual-credit-evaluation'
        );
        if (hasManualCreditEval || processId === 'mortgage-se-manual-credit-evaluation') {
          console.log(`[bpmnParser] ⚠️ object-control NOT found in elementRegistry for process ${processId}`);
          console.log(`[bpmnParser] Total elements in registry: ${allElements.length}`);
          // Check if there are any elements with "object" in the id
          const objectRelated = allElements.filter((e: any) => 
            e.id?.toLowerCase().includes('object') || 
            e.businessObject?.name?.toLowerCase().includes('object')
          );
          console.log(`[bpmnParser] Elements with "object" in id/name: ${objectRelated.length}`);
          objectRelated.forEach((e: any) => {
            console.log(`  - ${e.id} (${e.businessObject?.name || 'no name'}) - type: ${e.businessObject?.$type}`);
          });
        }
      }
      
      allElements.forEach((element: any) => {
        const bo = element.businessObject;
        if (!bo) return;

        // Extract DI (Diagram Interchange) coordinates for visual ordering
        // bpmn-js stores DI info in element.di or element.gfx
        let x: number | undefined;
        let y: number | undefined;
        
        // Try to get coordinates from element's diagram info
        if (element.di) {
          // For shapes (tasks, callActivities, etc.)
          if (element.di.bounds) {
            x = element.di.bounds.x;
            y = element.di.bounds.y;
          }
          // For waypoints (sequence flows) we don't need coordinates
        } else if (element.gfx) {
          // Alternative location for diagram info
          if (element.gfx.bounds) {
            x = element.gfx.bounds.x;
            y = element.gfx.bounds.y;
          }
        }

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
          x,
          y,
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
        }
      });
      
      // WORKAROUND: Add missing callActivities from XML directly
      if (missingCallActivityIds.length > 0) {
        for (const missingId of missingCallActivityIds) {
          const callActivityData = xmlCallActivityData.get(missingId);
          if (callActivityData) {
            const { name, calledElement } = callActivityData;
            
            // Create a synthetic BpmnElement for the missing callActivity
            const syntheticElement: BpmnElement = {
              id: missingId,
              name,
              type: 'bpmn:CallActivity',
              businessObject: {
                $type: 'bpmn:CallActivity',
                id: missingId,
                name,
                calledElement,
                $parent: allElements.find((e: any) => 
                  e.businessObject?.$type === 'bpmn:Process'
                )?.businessObject,
              },
            };
            
            callActivities.push(syntheticElement);
            elements.push(syntheticElement);
            
            subprocesses.push({
              id: missingId,
              name,
              file: calledElement ? `/bpmn/mortgage-se-${calledElement}.bpmn` : undefined,
            });
            
            metaCallActivities.push({
              id: missingId,
              name,
              calledElement,
            });
            
            // Add to process meta
            const owningProcess = ensureProcessMeta(firstProcessId || processId, processName);
            if (owningProcess) {
              owningProcess.callActivities.push({
                id: missingId,
                name,
                calledElement,
              });
              if (!owningProcess.subprocessCandidates) {
                owningProcess.subprocessCandidates = [];
              }
              owningProcess.subprocessCandidates.push({
                id: missingId,
                name,
                kind: 'callActivity',
              });
            }
            
            if (import.meta.env.DEV) {
              console.log(`[bpmnParser] ✅ Added missing callActivity ${missingId} from XML`);
            }
          }
        }
      }

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

async function loadBpmnXml(fileUrl: string, versionHash?: string | null): Promise<{ xml: string; cacheKey: string }> {
  const normalized = fileUrl.split('?')[0] || fileUrl;
  const cacheKey = normalized.split('/').pop() || normalized;

  // If version hash is provided, try to load from version table first
  if (versionHash) {
    try {
      const { getBpmnXmlFromVersion } = await import('@/hooks/useDynamicBpmnFiles');
      const xml = await getBpmnXmlFromVersion(cacheKey, versionHash);
      if (xml) {
        return { xml, cacheKey };
      }
    } catch (error) {
      console.warn(`[bpmnParser] Failed to load version ${versionHash.substring(0, 8)}... for ${cacheKey}, falling back to current version:`, error);
    }
  }

  const tryLocal = async () => {
    try {
      // Handle data URLs directly (used in tests and for versioned files)
      if (fileUrl.startsWith('data:application/xml;base64,')) {
        const base64 = fileUrl.split(',')[1];
        const xml = atob(base64);
        return { xml, cacheKey };
      }
      
      // I Node.js-miljö fungerar inte relativa URLs - hoppa över tryLocal
      // Tester använder data URLs direkt (samma approach som appen använder för versioned files)
      if (typeof window === 'undefined' && !fileUrl.startsWith('http') && !fileUrl.startsWith('data:')) {
        return null;
      }
      const response = await fetch(fileUrl, { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.toLowerCase().includes('xml')) {
        const xml = await response.text();
        return { xml, cacheKey };
      }
      return null;
    } catch (error) {
      // I Node.js kastar fetch ett fel för relativa URLs - returnera null så tryStorage kan köras
      return null;
    }
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

export async function parseBpmnFile(bpmnFilePath: string, versionHash?: string | null): Promise<BpmnParseResult> {
  // Check cache (include version hash in cache key if provided)
  const cacheKey = bpmnFilePath.split('/').pop() || bpmnFilePath;
  const cacheKeyWithVersion = versionHash ? `${cacheKey}:${versionHash}` : cacheKey;
  
  if (parseCache.has(cacheKeyWithVersion)) {
    return parseCache.get(cacheKeyWithVersion)!;
  }

  try {
    const { xml: bpmnXml, cacheKey: key } = await loadBpmnXml(bpmnFilePath, versionHash);
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

    // Cache result (with version hash in key)
    parseCache.set(cacheKeyWithVersion, resultWithFileName);
    
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
