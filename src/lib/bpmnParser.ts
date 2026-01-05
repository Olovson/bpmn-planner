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
        } else if (bo.$type === 'bpmn:UserTask') {
          userTasks.push(bpmnElement);
          metaTasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'UserTask',
          });
          const owningProcessId = findOwningProcessId(bo) || firstProcessId || processId;
          const owningProcess = ensureProcessMeta(owningProcessId, processName);
          if (owningProcess) {
            owningProcess.tasks.push({
              id: element.id,
              name: bo.name || element.id,
              type: 'UserTask',
            });
          }
        } else if (bo.$type === 'bpmn:ServiceTask') {
          serviceTasks.push(bpmnElement);
          metaTasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'ServiceTask',
          });
          const owningProcessId = findOwningProcessId(bo) || firstProcessId || processId;
          const owningProcess = ensureProcessMeta(owningProcessId, processName);
          if (owningProcess) {
            owningProcess.tasks.push({
              id: element.id,
              name: bo.name || element.id,
              type: 'ServiceTask',
            });
          }
        } else if (bo.$type === 'bpmn:BusinessRuleTask') {
          businessRuleTasks.push(bpmnElement);
          metaTasks.push({
            id: element.id,
            name: bo.name || element.id,
            type: 'BusinessRuleTask',
          });
          const owningProcessId = findOwningProcessId(bo) || firstProcessId || processId;
          const owningProcess = ensureProcessMeta(owningProcessId, processName);
          if (owningProcess) {
            owningProcess.tasks.push({
              id: element.id,
              name: bo.name || element.id,
              type: 'BusinessRuleTask',
            });
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
      // För test-filer, hoppa över /bpmn/ endpoint (test-filer finns alltid i Storage)
      // Detta förhindrar 400 Bad Request fel när test-filer försöker laddas från /bpmn/
      if (fileUrl.includes('/bpmn/test-')) {
        return null; // Silent fail, Storage will handle it
      }
      
      // ✅ Add timeout to prevent hanging on missing files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(fileUrl, { 
          cache: 'no-store',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.toLowerCase().includes('xml')) {
          const xml = await response.text();
          return { xml, cacheKey };
        }
        return null;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // If aborted due to timeout or other network error, return null to try Storage
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          if (import.meta.env.DEV) {
            console.warn(`[bpmnParser] Timeout loading ${fileUrl}, trying Storage fallback`);
          }
        }
        return null;
      }
    } catch (error) {
      // I Node.js kastar fetch ett fel för relativa URLs - returnera null så tryStorage kan köras
      // För test-filer, hoppa över fel-logging (Storage fallback hanterar det)
      if (fileUrl.includes('/bpmn/test-')) {
        return null; // Silent fail, Storage will handle it
      }
      return null;
    }
  };

  const tryStorage = async () => {
    // Om filen har mappstruktur (t.ex. /bpmn/... eller en ren storage‑path),
    // försök först hitta den med den fulla sökvägen.
    const isRelativePath =
      fileUrl.includes('/') && !fileUrl.startsWith('http') && !fileUrl.startsWith('data:');

    if (isRelativePath) {
      // Hantera två fall:
      // 1) /bpmn/...  (lokala projektfiler)
      // 2) direkt storage‑path, t.ex. "mortgage-se/processes/.../mortgage.bpmn"
      let fullPath: string | null = null;
      const pathMatch = fileUrl.match(/\/bpmn\/(.+)$/);

      if (pathMatch && pathMatch[1]) {
        fullPath = pathMatch[1];
      } else if (fileUrl.endsWith('.bpmn')) {
        // Använd den normaliserade sökvägen som storage‑path
        fullPath = normalized;
      }

      if (fullPath) {
        // Försök först hitta filen i databasen med storage_path eller file_name som matchar fullPath
        // Använd separata queries istället för .or() för bättre kompatibilitet
        let storageRecord: { storage_path: string } | null = null;

        // Försök först med storage_path
        const { data: storagePathRecord } = await supabase
          .from('bpmn_files')
          .select('storage_path')
          .eq('storage_path', fullPath)
          .maybeSingle();

        if (storagePathRecord) {
          storageRecord = storagePathRecord;
        } else {
          // Om inte hittad med storage_path, försök med file_name
          const { data: fileNameRecord } = await supabase
            .from('bpmn_files')
            .select('storage_path')
            .eq('file_name', fullPath)
            .maybeSingle();

          if (fileNameRecord) {
            storageRecord = fileNameRecord;
          }
        }

        // Om filen finns i databasen, använd storage_path
        if (storageRecord?.storage_path) {
          const { data, error } = await supabase.storage
            .from('bpmn-files')
            .download(storageRecord.storage_path);

          if (!error && data) {
            const xml = await data.text();
            if (xml && xml.includes('<bpmn:definitions')) {
              return { xml, cacheKey };
            }
          } else if (error && (error.statusCode === 400 || error.message?.includes('400'))) {
            // Filen finns i databasen men inte i Storage - detta är ett verkligt problem
            if (import.meta.env.DEV) {
              console.warn(
                `[bpmnParser] File ${fullPath} exists in database but not in Storage (likely deleted from Storage but not from database)`,
              );
            }
            return null;
          }
        }

        // Fallback: Försök ladda direkt med fullPath (om filen inte finns i databasen ännu)
        const { data: pathData, error: pathError } = await supabase.storage
          .from('bpmn-files')
          .download(fullPath);

        if (!pathError && pathData) {
          const xml = await pathData.text();
          if (xml && xml.includes('<bpmn:definitions')) {
            return { xml, cacheKey };
          }
        }
        // Om pathError är 400 och filen inte finns i databasen, är det ok - fortsätt med andra försök
        // Vi loggar inte här eftersom filen kan finnas med bara filnamnet
      }
    }

    // Försök hitta filen i databasen med file_name (bara filnamnet)
    const { data: storageRecord } = await supabase
      .from('bpmn_files')
      .select('storage_path')
      .eq('file_name', cacheKey)
      .maybeSingle();

    // Om filen finns i databasen, använd storage_path
    if (storageRecord?.storage_path) {
      const { data, error } = await supabase.storage
        .from('bpmn-files')
        .download(storageRecord.storage_path);

      // Hantera 400-fel gracefully (filen finns inte i Storage)
      if (error) {
        // 400 Bad Request betyder att filen inte finns i Storage
        // Detta kan hända när filer raderats men queries fortfarande försöker ladda dem
        if (error.statusCode === 400 || error.message?.includes('400')) {
          // Filen finns i databasen men inte i Storage - detta är ett verkligt problem
          if (import.meta.env.DEV) {
            console.warn(`[bpmnParser] File ${cacheKey} exists in database but not in Storage (likely deleted from Storage but not from database)`);
          }
          return null; // Return null instead of throwing, let caller handle it
        }
        // För andra fel, logga men returnera null
        if (import.meta.env.DEV) {
          console.warn(`[bpmnParser] Error loading ${cacheKey} from Storage:`, error.message);
        }
        return null;
      }

      if (data) {
        const xml = await data.text();
        if (xml && xml.includes('<bpmn:definitions')) {
          return { xml, cacheKey };
        }
      }
    }

    // Fallback: Försök ladda direkt med cacheKey (för filer som inte har storage_path satt ännu)
    // Detta kan hända när filer precis laddats upp och databasen inte hunnit uppdateras
    const { data: directData, error: directError } = await supabase.storage
      .from('bpmn-files')
      .download(cacheKey);

    // Hantera 400-fel gracefully
    if (directError) {
      if (directError.statusCode === 400 || directError.message?.includes('400')) {
        // Filen finns inte i Storage - detta är ok om filen inte finns i databasen heller
        // Vi loggar inte här eftersom det kan vara en normal situation (filen har inte laddats upp ännu)
        return null;
      }
      if (import.meta.env.DEV) {
        console.warn(`[bpmnParser] Error loading ${cacheKey} directly from Storage:`, directError.message);
      }
      return null;
    }

    if (directData) {
      const xml = await directData.text();
      if (xml && xml.includes('<bpmn:definitions')) {
        return { xml, cacheKey };
      }
    }

    return null;
  };

  const localResult = await tryLocal();
  if (localResult) return localResult;

  const storageResult = await tryStorage();
  if (storageResult) return storageResult;

  // Filen hittades inte - returnera null istället för att kasta error
  // Detta gör att queries kan hantera saknade filer gracefully
  // Vi loggar bara om filen faktiskt finns i databasen (vilket indikerar ett problem)
  // Annars kan det vara en normal situation (filen har inte laddats upp ännu)
  let fileExistsInDb = false;
  
  // Kolla om filen finns i databasen med file_name
  const { data: fileNameCheck } = await supabase
    .from('bpmn_files')
    .select('id')
    .eq('file_name', cacheKey)
    .maybeSingle();
  
  if (fileNameCheck) {
    fileExistsInDb = true;
  } else {
    // Kolla om filen finns i databasen med storage_path
    const { data: storagePathCheck } = await supabase
      .from('bpmn_files')
      .select('id')
      .eq('storage_path', cacheKey)
      .maybeSingle();
    
    if (storagePathCheck) {
      fileExistsInDb = true;
    }
  }
  
  if (fileExistsInDb && import.meta.env.DEV) {
    // Filen finns i databasen men inte i Storage - detta är ett verkligt problem
    console.warn(`[bpmnParser] File ${cacheKey} exists in database but not in Storage (likely deleted from Storage but not from database)`);
  }
  // Om filen inte finns i databasen, loggar vi inte - det är en normal situation
  
  return null;
}

export async function parseBpmnFile(bpmnFilePath: string, versionHash?: string | null): Promise<BpmnParseResult> {
  // Check cache (include version hash in cache key if provided)
  const cacheKey = bpmnFilePath.split('/').pop() || bpmnFilePath;
  const cacheKeyWithVersion = versionHash ? `${cacheKey}:${versionHash}` : cacheKey;
  
  if (parseCache.has(cacheKeyWithVersion)) {
    return parseCache.get(cacheKeyWithVersion)!;
  }

  try {
    const loadResult = await loadBpmnXml(bpmnFilePath, versionHash);
    
    // Om filen inte hittades (loadBpmnXml returnerade null), hantera detta gracefully
    if (!loadResult) {
      const cacheKey = bpmnFilePath.split('/').pop() || bpmnFilePath;
      if (import.meta.env.DEV) {
        const isTestFile = cacheKey.startsWith('test-');
        if (isTestFile) {
          console.warn(`[bpmnParser] Test file ${cacheKey} not found (likely deleted), skipping parse`);
        } else {
          console.warn(`[bpmnParser] File ${cacheKey} not found (likely deleted), skipping parse`);
        }
      }
      // Kasta ett error så att callers kan hantera det, men med ett tydligt meddelande
      throw new Error(`File not found: ${cacheKey} (likely deleted from Storage)`);
    }
    
    const { xml: bpmnXml, cacheKey: key } = loadResult;
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
    // För testfiler eller filer med mappstruktur som saknas, logga bara i dev
    // Detta förhindrar spam i konsolen från gamla testfiler eller filer som precis laddats upp
    const cacheKey = bpmnFilePath.split('/').pop() || bpmnFilePath;
    const isTestFile = cacheKey.startsWith('test-');
    const hasFolderStructure = bpmnFilePath.includes('/') && bpmnFilePath.split('/').length > 2;
    const isMissingFile = error instanceof Error && 
      (error.message.includes('Failed to load') || 
       error.message.includes('400') ||
       error.message.includes('Bad Request') ||
       error.message.includes('File not found'));
    
    if (isTestFile && isMissingFile) {
      // Testfiler som saknas är troligen gamla testfiler som inte rensats
      // Logga bara i dev
      if (import.meta.env.DEV) {
        console.warn(`[bpmnParser] Test file ${cacheKey} not found in Storage (likely old test file)`);
      }
    } else if (hasFolderStructure && isMissingFile) {
      // Filer med mappstruktur kan saknas om de precis laddats upp
      // Logga bara i dev som warning
      if (import.meta.env.DEV) {
        console.warn(`[bpmnParser] File with folder structure ${bpmnFilePath} not found in Storage, may need to wait for database update`);
      }
    } else {
      // För produktionsfiler eller andra fel, logga som vanligt
      console.error(`Error parsing BPMN file ${bpmnFilePath}:`, error);
    }
    throw error;
  }
}

/**
 * Parse BPMN content directly from a string (for local file analysis)
 * This is used when analyzing files from a local folder without uploading them
 */
export async function parseBpmnFileContent(
  bpmnXml: string,
  fileName?: string
): Promise<BpmnParseResult> {
  const parser = new BpmnParser();
  try {
    const result = await parser.parse(bpmnXml);
    return {
      ...result,
      fileName: fileName || result.fileName,
    };
  } finally {
    parser.destroy();
  }
}

// Clear cache if needed
export function clearBpmnParseCache() {
  parseCache.clear();
}
